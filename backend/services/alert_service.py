from .graph_service import GraphService
import sys
import os

# Adjust path to import models from parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import AlertModel

class AlertService:
    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    def get_impact_analysis(self, service_id: str, environment: str = None):
        with self.graph_service.get_session() as session:
            # 1. Find the root service (must be active)
            query = "MATCH (n:Node {is_active: true}) WHERE (n.id = $sid OR n.name = $sid OR n.datadog_service = $sid)"
            params = {"sid": service_id}
            if environment:
                query += " AND n.environment = $env"
                params["env"] = environment
            query += " RETURN n.id as id"
            
            root = session.run(query, **params).single()
            if not root:
                return {"error": "Active service not found"}
            
            root_id = root["id"]

            # 2. Optimized Subgraph Retrieval using APOC
            # Retrieves all nodes and relationships within distance 6 in a single go
            subgraph_query = """
            MATCH (start:Node {id: $root_id})
            CALL apoc.path.subgraphAll(start, {
                maxLevel: 6,
                relationshipFilter: "CALLS|CALLS_EXTERNAL|RUNS_ON|READS_FROM|WRITES_TO|PUBLISHES_TO|SUBSCRIBES_TO|USES_CACHE|HOSTED_IN|LOCATED_IN|CONTAINS|OWNS|HAS_SERVICE|HAS_SUBSCRIPTION|HAS_REGION|DEPENDS_ON|DEPENDS_ON_APP|USES_EXTERNAL|REPLICATES_TO",
                filterStartNode: false
            })
            YIELD nodes, relationships
            RETURN nodes, relationships
            """
            res = session.run(subgraph_query, root_id=root_id).single()
            if not res:
                return {"error": "Graph traversal failed"}

            nodes = res["nodes"]
            rels = res["relationships"]

            # 3. In-Memory Impact Tracing
            # We trace reachability from root_id via specific rel types
            adj = {} # node_id -> list of (neighbor_id, rel_type, direction)
            nodes_data = {}
            for n in nodes:
                nodes_data[n["id"]] = dict(n)
                adj[n["id"]] = []

            for r in rels:
                s = r.start_node["id"]
                t = r.end_node["id"]
                if s in adj: adj[s].append((t, r.type, "out"))
                if t in adj: adj[t].append((s, r.type, "in"))

            # BFS for impact tracing
            impacted_map = {root_id: 0} # id -> depth
            queue = [(root_id, 0)]
            
            while queue:
                u, d = queue.pop(0)
                if d >= 6: continue
                
                for v, r_type, direction in adj.get(u, []):
                    if v in impacted_map: continue
                    
                    # Traversal rules:
                    # - CALLS / CALLS_EXTERNAL: follow both directions
                    # - Infrastructure / Persistence: follow both directions (Resource failure impacts Service)
                    # - Hierarchy / Replication: follow specifically
                    should_follow = False
                    if r_type in ["CALLS", "CALLS_EXTERNAL", "DEPENDS_ON", "DEPENDS_ON_APP"]:
                        should_follow = True
                    elif r_type in ["RUNS_ON", "READS_FROM", "WRITES_TO", "PUBLISHES_TO", "SUBSCRIBES_TO", "USES_CACHE", "USES_EXTERNAL"]:
                        should_follow = True # Resource failure impacts Service, Service failure impacts Resource (context)
                    elif r_type == "REPLICATES_TO":
                        should_follow = True
                    
                    if should_follow:
                        impacted_map[v] = d + 1
                        queue.append((v, d + 1))

            # 4. Context Graph & Rollups
            edges_result = []
            for r in rels:
                edges_result.append({
                    "from": r.start_node["id"],
                    "to": r.end_node["id"],
                    "type": r.type,
                    "properties": dict(r)
                })

            # Rollup summary for impacted set
            # Applications/Programs impacted are those that host an impacted node
            impacted_apps = set()
            impacted_progs = set()
            
            for node_id in impacted_map:
                curr_node = nodes_data.get(node_id)
                if not curr_node: continue
                
                # Walk up HAS_CHILD tree
                # Note: apoc.path.subgraphAll includes HAS_CHILD rels
                parent_id = curr_node.get("parent_id")
                while parent_id:
                    parent = nodes_data.get(parent_id)
                    if not parent: break
                    if parent["type"] == "Application":
                        impacted_apps.add(parent["id"])
                    elif parent["type"] == "Program":
                        impacted_progs.add(parent["id"])
                    parent_id = parent.get("parent_id")

            return {
                "root_cause": nodes_data[root_id].get("name") or root_id,
                "nodes": [
                    {
                        "id": n_id,
                        "name": n.get("name", ""),
                        "type": n.get("type", ""),
                        "parent_id": n.get("parent_id", ""),
                        "properties": n
                    } for n_id, n in nodes_data.items()
                ],
                "edges": edges_result,
                "impacted_nodes": [{"id": k, "depth": v} for k, v in impacted_map.items()],
                "summary": {
                    "services": sum(1 for nid in impacted_map if nodes_data.get(nid, {}).get("type") == "Service"),
                    "applications": len(impacted_apps),
                    "programs": len(impacted_progs)
                }
            }
