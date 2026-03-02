from .graph_service import GraphService
import sys
import os

# Adjust path to import models from parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ArchitectureModel

class ArchitectureService:
    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    def save_architecture(self, arch: ArchitectureModel):
        with self.graph_service.get_session() as session:
            # 1. Deactivate previous version for program
            if arch.program_id:
                session.run(
                    """
                    MATCH (p:Node {type: 'Program'})
                    WHERE p.program_id = $pid OR p.id = $pid
                    MATCH (p)-[:HAS_CHILD*0..3]->(descendant)
                    SET descendant.is_active = false
                    """,
                    pid=arch.program_id
                )
                # Then delete to "Overwrite" as per requirement (or keep for history if preferred, 
                # but "Overwrite" was explicit earlier)
                session.run(
                    """
                    MATCH (p:Node {type: 'Program'})
                    WHERE p.program_id = $pid OR p.id = $pid
                    MATCH (p)-[:HAS_CHILD*0..3]->(descendant)
                    DETACH DELETE descendant
                    """,
                    pid=arch.program_id
                )
            else:
                session.run("MATCH (n) DETACH DELETE n")
            
            # 2. Persist new nodes
            for node in arch.nodes:
                props = {
                    "id": node.id,
                    "name": node.name,
                    "type": node.type,
                    "parent_id": node.parent_id or "",
                    "is_active": True # Mark active on publish
                }
                props.update(node.properties)
                
                session.run("CREATE (n:Node) SET n = $props", props=props)
            
            # 3. Create hierarchy
            session.run(
                """
                MATCH (p:Node), (c:Node)
                WHERE c.parent_id = p.id AND c.parent_id <> ""
                CREATE (p)-[:HAS_CHILD]->(c)
                """
            )
            
            # 4. Create edges
            for edge in arch.edges:
                props = edge.properties or {}
                session.run(
                    f"""
                    MATCH (a:Node {{id: $source}}), (b:Node {{id: $target}})
                    CREATE (a)-[r:{edge.type}]->(b)
                    SET r = $props
                    """,
                    source=edge.from_id,
                    target=edge.to_id,
                    props=props
                )

    def get_nodes_by_type(self, node_type: str):
        with self.graph_service.get_session() as session:
            res = session.run("MATCH (n:Node {type: $type}) RETURN n", type=node_type)
            return [dict(r["n"]) for r in res]

    def get_nodes_by_parent(self, parent_id: str, node_type: str):
        with self.graph_service.get_session() as session:
            res = session.run(
                "MATCH (p:Node {id: $pid})-[:HAS_CHILD]->(c:Node {type: $type}) RETURN c",
                pid=parent_id, type=node_type
            )
            return [dict(r["c"]) for r in res]
