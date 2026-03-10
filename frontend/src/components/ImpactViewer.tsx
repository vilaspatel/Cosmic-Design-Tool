import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MarkerType, ReactFlowProvider, type Edge, type Node, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import dagre from 'dagre';
import { AlertTriangle, Search, Server, Layout, Database, Layers, Globe, GitBranch, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import type { ImpactAnalysis } from '../app_types';
import CardNode from './CardNode';

const normalizeNodeId = (id: string | number | null | undefined): string => String(id ?? '');

const panelStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px'
};

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: 'LR', ranksep: 130, nodesep: 90 });

    nodes.forEach((node) => graph.setNode(node.id, { width: 240, height: 110 }));
    edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
    dagre.layout(graph);

    return nodes.map((node) => {
        const layout = graph.node(node.id);
        return {
            ...node,
            position: { x: layout.x - 120, y: layout.y - 55 }
        };
    });
};

const FlowView = ({ nodes, edges, onNodeClick, onPaneClick }: { nodes: Node[]; edges: Edge[]; onNodeClick: (node: Node) => void; onPaneClick: () => void }) => {
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
            panOnScroll
            zoomOnScroll
            panOnDrag
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            nodesConnectable={false}
        >
            <Background color="#1e293b" gap={24} size={1.2} />
            <Controls />
        </ReactFlow>
    );
};

export const ImpactViewer: React.FC = () => {
    const [serviceName, setServiceName] = useState('');
    const [loading, setLoading] = useState(false);
    const [impactData, setImpactData] = useState<ImpactAnalysis | null>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);

    const analyzeImpact = async () => {
        if (!serviceName.trim()) return;
        setLoading(true);
        setSelectedNodeId(null);
        try {
            const res = await axios.get(`http://localhost:8000/impact/${serviceName.trim()}`);
            const data: ImpactAnalysis = res.data;
            const impactedDepth = new Map(
                data.impacted_nodes.map((node) => [normalizeNodeId(node.id as unknown as string | number), node.depth])
            );

            const flowNodes: Node[] = data.nodes.map((node) => {
                const nodeId = normalizeNodeId(node.id as unknown as string | number);
                const depth = impactedDepth.get(nodeId);
                const isImpacted = depth !== undefined;
                const borderColor = depth === 0 ? '#ef4444' : depth === 1 ? '#f59e0b' : isImpacted ? '#eab308' : '#334155';
                return {
                    id: nodeId,
                    type: 'default',
                    position: { x: 0, y: 0 },
                    data: {
                        id: nodeId,
                        type: node.type,
                        name: node.name,
                        properties: node.properties,
                        rawNode: node,
                        impactStyle: {
                            borderColor,
                            boxShadow: isImpacted ? `0 0 0 2px ${borderColor}44` : '0 6px 14px rgba(0, 0, 0, 0.35)'
                        }
                    },
                    style: { width: 240, background: 'transparent', border: 'none' }
                };
            });

            const impacted = new Set(
                data.impacted_nodes.map((item) => normalizeNodeId(item.id as unknown as string | number))
            );
            const flowEdges: Edge[] = data.edges.map((edge) => {
                const fromId = normalizeNodeId(edge.from as unknown as string | number);
                const toId = normalizeNodeId(edge.to as unknown as string | number);
                const isImpactPath = impacted.has(fromId) && impacted.has(toId);
                const color = isImpactPath ? '#ef4444' : '#64748b';
                return {
                    id: `edge-${edge.from}-${edge.to}-${edge.type}`,
                    source: fromId,
                    target: toId,
                    type: 'smoothstep',
                    label: edge.type,
                    labelStyle: { fill: '#cbd5e1', fontSize: 10, fontWeight: 700 },
                    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95, stroke: '#334155', strokeWidth: 1, rx: 8, ry: 8 },
                    labelBgPadding: [8, 4],
                    animated: isImpactPath,
                    style: { stroke: color, strokeWidth: isImpactPath ? 2.6 : 1.5, opacity: isImpactPath ? 1 : 0.55 },
                    markerEnd: { type: MarkerType.ArrowClosed, color }
                };
            });

            setNodes(getLayoutedElements(flowNodes, flowEdges));
            setEdges(flowEdges);
            setImpactData(data);
        } catch (error) {
            console.error(error);
            alert('Service not found or impact analysis failed.');
        } finally {
            setLoading(false);
        }
    };

    const selectedNode = useMemo(
        () => impactData?.nodes.find((node) => normalizeNodeId(node.id as unknown as string | number) === selectedNodeId) || null,
        [impactData, selectedNodeId]
    );
    const summary = impactData?.summary;
    const impactTree = useMemo(() => {
        if (!impactData) return [];
        return [...impactData.impacted_nodes].sort((a, b) => a.depth - b.depth).map((item) => ({
            ...item,
            node: impactData.nodes.find((n) => normalizeNodeId(n.id as unknown as string | number) === normalizeNodeId(item.id as unknown as string | number))
        }));
    }, [impactData]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0, background: '#020617' }}>
            <div style={{ borderBottom: '1px solid #1e293b', background: '#0f172a', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 700 }}>Impact Viewer</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>Incident summary, blast radius graph, impact tree, and node inspection.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '440px', maxWidth: '50%' }}>
                    <div style={{ position: 'relative', flexGrow: 1 }}>
                        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            value={serviceName}
                            onChange={(event) => setServiceName(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && analyzeImpact()}
                            placeholder="Enter service identifier"
                            style={{ width: '100%', background: '#111827', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '8px', padding: '8px 10px 8px 32px', fontSize: '13px' }}
                        />
                    </div>
                    <button onClick={analyzeImpact} disabled={loading} style={{ background: '#dc2626', border: '1px solid #b91c1c', color: 'white', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}>
                        {loading ? 'Analyzing...' : 'Analyze Impact'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
                <aside style={{ width: leftCollapsed ? '56px' : '300px', transition: 'width 0.2s ease', borderRight: '1px solid #1e293b', padding: '14px', overflowY: 'auto', background: '#0b1226', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: leftCollapsed ? 'center' : 'flex-end' }}>
                        <button
                            onClick={() => setLeftCollapsed((prev) => !prev)}
                            style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', color: '#cbd5e1', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            title={leftCollapsed ? 'Expand Panel' : 'Collapse Panel'}
                        >
                            {leftCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                        </button>
                    </div>
                    {!leftCollapsed && <div style={{ ...panelStyle, padding: '12px' }}>
                        <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={16} color="#f59e0b" />
                            Incident Summary
                        </div>
                        {summary ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '8px' }}>
                                {[
                                    { icon: Server, label: 'Services', value: summary.services },
                                    { icon: Layout, label: 'Apps', value: summary.applications },
                                    { icon: Database, label: 'DBs', value: summary.databases },
                                    { icon: Layers, label: 'Queues', value: summary.queues },
                                    { icon: Globe, label: 'External', value: summary.external_systems },
                                    { icon: GitBranch, label: 'Programs', value: summary.programs }
                                ].map((item) => (
                                    <div key={item.label} style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', padding: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px' }}><item.icon size={13} /> {item.label}</div>
                                        <div style={{ color: '#f8fafc', fontSize: '17px', fontWeight: 700, marginTop: '2px' }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ color: '#64748b', fontSize: '12px' }}>Run an analysis to see incident summary.</div>
                        )}
                    </div>}

                    {!leftCollapsed && <div style={{ ...panelStyle, padding: '12px' }}>
                        <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>Impact Tree</div>
                        {!impactTree.length ? (
                            <div style={{ color: '#64748b', fontSize: '12px' }}>No impact chain loaded.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {impactTree.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedNodeId(normalizeNodeId(item.id as unknown as string | number))}
                                        style={{
                                            textAlign: 'left',
                                            width: '100%',
                                            background: selectedNodeId === normalizeNodeId(item.id as unknown as string | number) ? '#1e293b' : '#111827',
                                            border: selectedNodeId === normalizeNodeId(item.id as unknown as string | number) ? '1px solid #475569' : '1px solid #334155',
                                            borderRadius: '8px',
                                            padding: '8px',
                                            color: '#e2e8f0'
                                        }}
                                    >
                                        <div style={{ color: '#f8fafc', fontSize: '12px', fontWeight: 600, paddingLeft: `${item.depth * 12}px` }}>
                                            {item.node?.name || item.id}
                                        </div>
                                        <div style={{ color: '#94a3b8', fontSize: '11px', paddingLeft: `${item.depth * 12}px` }}>
                                            depth {item.depth} · {item.node?.type || 'unknown'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>}
                </aside>

                <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <ReactFlowProvider>
                        <FlowView nodes={nodes} edges={edges} onNodeClick={(node) => setSelectedNodeId(normalizeNodeId(node.id as unknown as string | number))} onPaneClick={() => setSelectedNodeId(null)} />
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
                    {!rightCollapsed && <div style={{ ...panelStyle, padding: '12px' }}>
                        <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>Node Inspector</div>
                        {!selectedNode ? (
                            <div style={{ color: '#64748b', fontSize: '12px' }}>Select a node from the graph or impact tree.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>Type</div>
                                    <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 700 }}>{selectedNode.type}</div>
                                </div>
                                <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>Name</div>
                                    <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 700 }}>{selectedNode.name}</div>
                                </div>
                                <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '6px' }}>Properties</div>
                                    {Object.entries(selectedNode.properties || {}).map(([key, value]) => (
                                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>{key}</span>
                                            <span style={{ color: '#cbd5e1', fontSize: '11px', textAlign: 'right' }}>{String(value)}</span>
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
