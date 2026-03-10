import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import dagre from 'dagre';
import ReactFlow, { Background, Controls, MarkerType, ReactFlowProvider, type Edge, type Node, useReactFlow } from 'reactflow';
import type { NodeData } from '../app_types';
import { Search, Compass, Database, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import CardNode from './CardNode';

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: 'LR', ranksep: 120, nodesep: 80 });
    nodes.forEach((node) => graph.setNode(node.id, { width: 240, height: 110 }));
    edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
    dagre.layout(graph);

    return nodes.map((node) => {
        const layout = graph.node(node.id);
        return { ...node, position: { x: layout.x - 120, y: layout.y - 55 } };
    });
};

const ExplorerFlow = ({ nodes, edges, onNodeClick, onPaneClick }: { nodes: Node[]; edges: Edge[]; onNodeClick: (node: Node) => void; onPaneClick: () => void }) => {
    const { fitView } = useReactFlow();

    useEffect(() => {
        if (!nodes.length) return;
        const timer = setTimeout(() => fitView({ padding: 0.2, duration: 700 }), 80);
        return () => clearTimeout(timer);
    }, [nodes, fitView]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={{ default: CardNode }}
            onNodeClick={(_, node) => onNodeClick(node)}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            panOnScroll
            panOnDrag
            zoomOnScroll
            minZoom={0.2}
            maxZoom={2}
            nodesConnectable={false}
        >
            <Background color="#1e293b" gap={24} size={1.2} />
            <Controls />
        </ReactFlow>
    );
};

export const ArchitectureExplorer: React.FC = () => {
    const [registryNodes, setRegistryNodes] = useState<NodeData[]>([]);
    const [registryEdges, setRegistryEdges] = useState<{ from: string; to: string; type: string }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const res = await axios.get('http://localhost:8000/impact/all').catch(() => null);
                if (res?.data?.nodes) {
                    setRegistryNodes(res.data.nodes);
                    setRegistryEdges(res.data.edges || []);
                }
            } catch {
                // Graceful empty state for unavailable backend.
            }
        };
        fetchAll();
    }, []);

    const filteredNodes = useMemo(
        () => registryNodes.filter((node) => (node.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || node.type.toLowerCase().includes(searchTerm.toLowerCase())),
        [registryNodes, searchTerm]
    );

    const graphNodes = useMemo(() => {
        return filteredNodes.map((node) => ({
            id: node.id,
            type: 'default',
            position: { x: 0, y: 0 },
            data: {
                id: node.id,
                type: node.type,
                name: node.name,
                properties: node.properties,
                rawNode: node
            },
            style: {
                width: 240,
                background: 'transparent',
                border: selectedNodeId === node.id ? '1px solid #475569' : 'none',
                borderRadius: '10px'
            }
        })) as Node[];
    }, [filteredNodes, selectedNodeId]);

    const graphEdges = useMemo(() => {
        const ids = new Set(filteredNodes.map((node) => node.id));
        return registryEdges
            .filter((edge) => ids.has(edge.from) && ids.has(edge.to))
            .map((edge) => ({
                id: `${edge.from}-${edge.to}-${edge.type}`,
                source: edge.from,
                target: edge.to,
                type: 'smoothstep',
                label: edge.type,
                labelStyle: { fill: '#cbd5e1', fontSize: 10, fontWeight: 700 },
                labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9, stroke: '#334155', strokeWidth: 1, rx: 8, ry: 8 },
                labelBgPadding: [8, 4],
                style: { stroke: '#64748b', strokeWidth: 1.5 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
            })) as Edge[];
    }, [filteredNodes, registryEdges]);

    const layoutNodes = useMemo(() => getLayoutedElements(graphNodes, graphEdges), [graphNodes, graphEdges]);
    const selectedNode = useMemo(() => registryNodes.find((node) => node.id === selectedNodeId) || null, [registryNodes, selectedNodeId]);
    const connectedEdges = useMemo(() => registryEdges.filter((edge) => edge.from === selectedNodeId || edge.to === selectedNodeId), [registryEdges, selectedNodeId]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0, background: '#020617' }}>
            <div style={{ borderBottom: '1px solid #1e293b', background: '#0f172a', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Compass size={18} color="#38bdf8" />
                    <div>
                        <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 700 }}>Architecture Explorer</div>
                        <div style={{ color: '#94a3b8', fontSize: '12px' }}>Visual dependency explorer with node-card rendering and deep inspection.</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
                <aside style={{ width: leftCollapsed ? '56px' : '300px', transition: 'width 0.2s ease', borderRight: '1px solid #1e293b', background: '#0b1226', padding: '14px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: leftCollapsed ? 'center' : 'flex-end', marginBottom: leftCollapsed ? 0 : '10px' }}>
                        <button
                            onClick={() => setLeftCollapsed((prev) => !prev)}
                            style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', color: '#cbd5e1', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            title={leftCollapsed ? 'Expand Library' : 'Collapse Library'}
                        >
                            {leftCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                        </button>
                    </div>
                    {!leftCollapsed && <div style={{ position: 'relative', marginBottom: '12px' }}>
                        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            placeholder="Filter by node name or type..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            style={{ width: '100%', background: '#111827', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '8px', padding: '8px 10px 8px 32px', fontSize: '13px' }}
                        />
                    </div>}
                    {!leftCollapsed && <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '10px' }}>
                        {!filteredNodes.length ? (
                            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '26px 8px' }}>
                                <Database size={22} style={{ marginBottom: '8px' }} />
                                No nodes available.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {filteredNodes.map((node) => (
                                    <button
                                        key={node.id}
                                        onClick={() => setSelectedNodeId(node.id)}
                                        style={{
                                            textAlign: 'left',
                                            width: '100%',
                                            background: selectedNodeId === node.id ? '#1e293b' : '#111827',
                                            border: selectedNodeId === node.id ? '1px solid #475569' : '1px solid #334155',
                                            borderRadius: '8px',
                                            padding: '8px'
                                        }}
                                    >
                                        <div style={{ color: '#f8fafc', fontSize: '12px', fontWeight: 600 }}>{node.name || '(Unnamed)'}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '11px' }}>{node.type}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>}
                </aside>

                <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <ReactFlowProvider>
                        <ExplorerFlow nodes={layoutNodes} edges={graphEdges} onNodeClick={(node) => setSelectedNodeId(node.id)} onPaneClick={() => setSelectedNodeId(null)} />
                    </ReactFlowProvider>
                </div>

                <aside style={{ width: rightCollapsed ? '56px' : '340px', transition: 'width 0.2s ease', borderLeft: '1px solid #1e293b', background: '#0b1226', padding: '14px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: rightCollapsed ? 'center' : 'flex-end', marginBottom: rightCollapsed ? 0 : '10px' }}>
                        <button
                            onClick={() => setRightCollapsed((prev) => !prev)}
                            style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', color: '#cbd5e1', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            title={rightCollapsed ? 'Expand Inspector' : 'Collapse Inspector'}
                        >
                            {rightCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
                        </button>
                    </div>
                    {!rightCollapsed && <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                        <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>Node Inspector</div>
                        {!selectedNode ? (
                            <div style={{ color: '#64748b', fontSize: '12px' }}>Select a node from the list or graph.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>Name</div>
                                    <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 700 }}>{selectedNode.name}</div>
                                </div>
                                <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>Type</div>
                                    <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 700 }}>{selectedNode.type}</div>
                                </div>
                                <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '6px' }}>Connections</div>
                                    <div style={{ color: '#cbd5e1', fontSize: '12px', marginBottom: '8px' }}>{connectedEdges.length} relationship(s)</div>
                                    {connectedEdges.map((edge) => (
                                        <div key={`${edge.from}-${edge.to}-${edge.type}`} style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
                                            {edge.from === selectedNode.id ? 'Outbound' : 'Inbound'} · {edge.type}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>}
                </aside>
            </div>
        </div>
    );
};
