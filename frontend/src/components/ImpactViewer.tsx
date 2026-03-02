import React, { useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    type Node,
    type Edge,
    ReactFlowProvider,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import type { ImpactAnalysis, NodeType } from '../app_types';
import { AlertCircle, Search } from 'lucide-react';

const nodeColorMap: Record<NodeType, { bg: string; border: string; text: string }> = {
    Organization: { bg: '#2c3e50', border: '#1a252f', text: 'white' },
    Program: { bg: '#34495e', border: '#2c3e50', text: 'white' },
    Application: { bg: '#3498db', border: '#2980b9', text: 'white' },
    Service: { bg: '#2ecc71', border: '#27ae60', text: 'white' },
    ExternalSystem: { bg: '#95a5a6', border: '#7f8c8d', text: 'white' },
    VirtualMachine: { bg: '#7f8c8d', border: '#34495e', text: 'white' },
    KubernetesCluster: { bg: '#34495e', border: '#2c3e50', text: 'white' },
    AppService: { bg: '#16a085', border: '#1abc9c', text: 'white' },
    FunctionApp: { bg: '#27ae60', border: '#2ecc71', text: 'white' },
    OnPremServer: { bg: '#2c3e50', border: '#1a252f', text: 'white' },
    Database: { bg: '#9b59b6', border: '#8e44ad', text: 'white' },
    Cache: { bg: '#f1c40f', border: '#f39c12', text: '#333' },
    Queue: { bg: '#e67e22', border: '#d35400', text: 'white' },
    CloudProvider: { bg: '#2980b9', border: '#3498db', text: 'white' },
    Subscription: { bg: '#2980b9', border: '#3498db', text: 'white' },
    Region: { bg: '#2980b9', border: '#3498db', text: 'white' },
    DataCenter: { bg: '#2980b9', border: '#3498db', text: 'white' }
};

export const ImpactViewer: React.FC = () => {
    const [serviceName, setServiceName] = useState('');
    const [loading, setLoading] = useState(false);
    const [impactData, setImpactData] = useState<ImpactAnalysis | null>(null);

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const analyzeImpact = async () => {
        if (!serviceName) return;
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:8000/impact/${serviceName}`);
            const data: ImpactAnalysis = res.data;

            if (data.nodes) {
                const impactedIds = data.impacted_nodes.map(inode => inode.id);

                // Map nodes with specialized styling
                const flowNodes = data.nodes.map((n, index) => {
                    const impactInfo = data.impacted_nodes.find(inode => inode.id === n.id);
                    // Use depth 0 for root cause styling
                    const isRoot = impactInfo?.depth === 0;
                    const isDirect = impactInfo?.depth === 1;
                    const isIndirect = impactInfo ? impactInfo.depth > 1 : false;

                    const color = nodeColorMap[n.type] || { bg: '#fff', border: '#ccc', text: '#333' };

                    let style: any = {
                        background: color.bg,
                        color: color.text,
                        border: `2px solid ${color.border}`,
                        borderRadius: '5px',
                        padding: '10px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        width: '180px',
                        transition: 'all 0.3s ease'
                    };

                    if (isRoot) {
                        style.boxShadow = '0 0 25px 5px rgba(231, 76, 60, 0.8)';
                        style.border = '3px solid #e74c3c';
                        style.background = '#e74c3c';
                        style.color = 'white';
                    } else if (isDirect) {
                        style.border = '2px solid #e74c3c';
                        style.background = '#e74c3c';
                        style.color = 'white';
                    } else if (isIndirect) {
                        style.border = '2px solid #f39c12';
                        style.background = '#f39c12';
                        style.color = 'white';
                    } else {
                        style.opacity = 0.4;
                    }

                    return {
                        id: n.id,
                        type: 'default',
                        position: { x: (index % 4) * 250, y: Math.floor(index / 4) * 150 }, // Basic auto-layout
                        data: { label: `${n.name}\n(${n.type})` },
                        style
                    };
                });

                const flowEdges = data.edges.map(e => {
                    const isCrossProgram = e.properties?.cross_program === true;
                    const isImpactPath = impactedIds.includes(e.from) && impactedIds.includes(e.to);

                    return {
                        id: `e-${e.from}-${e.to}-${e.type}`,
                        source: e.from,
                        target: e.to,
                        label: e.type,
                        type: 'smoothstep',
                        animated: isImpactPath,
                        style: {
                            stroke: isImpactPath ? (isCrossProgram ? '#e74c3c' : '#e74c3c') : '#ccc',
                            strokeWidth: isImpactPath ? 3 : 1,
                            strokeDasharray: isCrossProgram ? '5,5' : '0'
                        },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: isImpactPath ? '#e74c3c' : '#ccc'
                        }
                    };
                });

                setNodes(flowNodes);
                setEdges(flowEdges);
                setImpactData(data);
            }
        } catch (error) {
            console.error(error);
            alert('Service not found or analysis failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f0f2f5' }}>
            {/* Sidebar for Controls & Summary */}
            <div style={{
                width: '320px',
                background: 'white',
                borderRight: '1px solid #ddd',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e74c3c' }}>
                    <AlertCircle size={24} />
                    <h2 style={{ margin: 0, fontSize: '18px' }}>Impact Workspace</h2>
                </div>

                <div style={{ position: 'relative' }}>
                    <input
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && analyzeImpact()}
                        placeholder="Target Service Identifier..."
                        style={{
                            width: '100%',
                            padding: '12px 40px 12px 12px',
                            borderRadius: '8px',
                            border: '2px solid #eee',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                        }}
                    />
                    <Search
                        size={18}
                        style={{ position: 'absolute', right: '12px', top: '12px', color: '#999', cursor: 'pointer' }}
                        onClick={analyzeImpact}
                    />
                </div>

                {loading && <div style={{ textAlign: 'center', color: '#666' }}>Traversing graph...</div>}

                {impactData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ padding: '15px', background: '#fdf0f0', borderLeft: '4px solid #e74c3c', borderRadius: '4px' }}>
                            <div style={{ fontSize: '12px', color: '#e74c3c', fontWeight: 'bold', marginBottom: '5px' }}>BLAST RADIUS SUMMARY</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{impactData.summary.services}</div>
                                    <div style={{ fontSize: '10px', color: '#666' }}>SERVICES</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{impactData.summary.applications}</div>
                                    <div style={{ fontSize: '10px', color: '#666' }}>APPS</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{impactData.summary.programs}</div>
                                    <div style={{ fontSize: '10px', color: '#666' }}>PROGRAMS</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px' }}>LEGEND</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#e74c3c', boxShadow: '0 0 5px red' }} />
                                    <span>Root Cause / Direct Impact</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#f39c12' }} />
                                    <span>Indirect Impact</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#ccc', opacity: 0.4 }} />
                                    <span>Context (Non-impacted)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '20px', borderTop: '2px dashed #e74c3c' }} />
                                    <span>Cross-Program Link</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Canvas */}
            <div style={{ flexGrow: 1, height: '100%', position: 'relative' }}>
                <ReactFlowProvider>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodesDraggable={false}
                        nodesConnectable={false}
                        elementsSelectable={false}
                        fitView
                    >
                        <Background color="#aaa" gap={20} />
                        <Controls />
                    </ReactFlow>
                </ReactFlowProvider>
            </div>
        </div>
    );
};
