import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    MarkerType,
    BaseEdge,
    EdgeLabelRenderer
} from 'reactflow';
import type {
    Connection,
    Edge,
    Node,
    ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { NodeType, EdgeType, NodeData } from '../app_types';
import { NodeProperties } from './NodeProperties';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getRulesForConnection } from '../topology_rules';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const MultiEdge = ({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, label, data }: any) => {
    const offset = data?.offset || 0;

    // Default React Flow control point calculation
    const isVertical = Math.abs(targetY - sourceY) > Math.abs(targetX - sourceX);
    const d = isVertical ? Math.max(Math.abs(targetY - sourceY) * 0.5, 50) : Math.max(Math.abs(targetX - sourceX) * 0.5, 50);

    let cp1x = sourceX;
    let cp1y = sourceY;
    let cp2x = targetX;
    let cp2y = targetY;

    if (sourcePosition === 'bottom') cp1y += d;
    else if (sourcePosition === 'top') cp1y -= d;
    else if (sourcePosition === 'right') cp1x += d;
    else if (sourcePosition === 'left') cp1x -= d;

    if (targetPosition === 'bottom') cp2y += d;
    else if (targetPosition === 'top') cp2y -= d;
    else if (targetPosition === 'right') cp2x += d;
    else if (targetPosition === 'left') cp2x -= d;

    if (offset !== 0) {
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / length;
        const ny = dx / length;

        // Shift alternating sides: 40, -40, 80, -80...
        const shift = (offset % 2 === 1 ? -1 : 1) * Math.ceil(offset / 2) * 50;

        cp1x += nx * shift;
        cp1y += ny * shift;
        cp2x += nx * shift;
        cp2y += ny * shift;
    }

    const path = `M ${sourceX},${sourceY} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${targetX},${targetY}`;

    // Label position at t=0.5 of cubic bezier
    const labelX = 0.125 * sourceX + 0.375 * cp1x + 0.375 * cp2x + 0.125 * targetX;
    const labelY = 0.125 * sourceY + 0.375 * cp1y + 0.375 * cp2y + 0.125 * targetY;

    return (
        <>
            <BaseEdge path={path} markerEnd={markerEnd} style={style} />
            {label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            background: '#eee',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            pointerEvents: 'all',
                        }}
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

const edgeTypes = {
    multi: MultiEdge,
};

const hierarchyEdgeTypes: (EdgeType | string)[] = [
    'OWNS', 'CONTAINS', 'HAS_SERVICE', 'HAS_SUBSCRIPTION', 'HAS_REGION',
    'HAS_PROGRAM', 'HAS_APPLICATION', 'PART_OF'
];

interface ParentRequest {
    type: NodeType;
    position: { x: number; y: number };
}

export const Designer: React.FC = () => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [parentRequest, setParentRequest] = useState<ParentRequest | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Relationship Rule Engine (now using external rules)
    const getRelationshipRules = (src: NodeType, tgt: NodeType): EdgeType[] => {
        return getRulesForConnection(src, tgt);
    };

    const onConnect = useCallback((params: Connection) => {
        const { source, target, sourceHandle, targetHandle } = params;
        if (!source || !target) return;

        const nodeA = nodes.find(n => n.id === source);
        const nodeB = nodes.find(n => n.id === target);

        if (!nodeA || !nodeB) {
            console.error('[Designer] Connection Failed: Node not found', { source, target });
            return;
        }

        const typeA = nodeA.data.type as NodeType;
        const typeB = nodeB.data.type as NodeType;

        console.log(`[Designer] Attempting: ${typeA} (${source}) -> ${typeB} (${target})`);

        let allowedEdges = getRelationshipRules(typeA, typeB);
        let actualSourceId = source;
        let actualTargetId = target;
        let finalSourceHandle = sourceHandle;
        let finalTargetHandle = targetHandle;
        let isFlipped = false;

        // Symmetric check
        if (allowedEdges.length === 0) {
            const flippedEdges = getRelationshipRules(typeB, typeA);
            if (flippedEdges.length > 0) {
                allowedEdges = flippedEdges;
                actualSourceId = target;
                actualTargetId = source;
                finalSourceHandle = targetHandle;
                finalTargetHandle = sourceHandle;
                isFlipped = true;
                console.log(`[Designer] Symmetric rule match found. Connecting ${typeB} -> ${typeA}`);
            }
        }

        if (allowedEdges.length === 0) {
            const msg = `Validation Error: Invalid Relationship\n\n` +
                `Source: ${typeA}\n` +
                `Target: ${typeB}\n\n` +
                `Strict modeling rules do not allow a connection from ${typeA} to ${typeB}. ` +
                `Please refer to the Enterprise Topology documentation for valid connection patterns.`;
            alert(msg);
            return;
        }

        const samePairEdges = edges.filter(e =>
            (e.source === actualSourceId && e.target === actualTargetId)
        );

        // Find first allowed edge type that doesn't exist yet
        const edgeType = allowedEdges.find(type => !samePairEdges.some(e => e.label === type));
        if (!edgeType) {
            console.warn('[Designer] Multi-Edge Blocked: All allowed types already exist', allowedEdges);
            alert(`A connection already exists between these nodes for all allowed types: ${allowedEdges.join(', ')}`);
            return;
        }

        const sourceType = isFlipped ? typeB : typeA;
        const targetType = isFlipped ? typeA : typeB;
        const maxOffset = samePairEdges.reduce((max, e) => Math.max(max, e.data?.offset ?? -1), -1);
        const offset = maxOffset + 1;

        console.log(`[Designer] Creating Edge: ${sourceType} -> ${targetType} Type: ${edgeType} Offset: ${offset}`);

        const isCrossProgram = sourceType === 'Service' && targetType === 'Service' &&
            nodeA.data.properties.program_id !== nodeB.data.properties.program_id &&
            nodeA.data.properties.program_id && nodeB.data.properties.program_id;

        const edgeParams: Edge = {
            id: uuidv4(), // Use stable UUID to avoid semantic ID issues
            source: actualSourceId,
            target: actualTargetId,
            sourceHandle: finalSourceHandle,
            targetHandle: finalTargetHandle,
            type: 'multi',
            label: edgeType,
            data: {
                type: edgeType,
                cross_program: isCrossProgram,
                offset: offset
            },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: isCrossProgram ? '#e67e22' : '#2c3e50'
            },
            style: {
                stroke: isCrossProgram ? '#e67e22' : '#2c3e50',
                strokeWidth: 2,
                strokeDasharray: isCrossProgram ? '5,5' : '0'
            },
            animated: edgeType === 'CALLS',
        };

        // Do not use addEdge, it filters out multiple connections between same nodes
        setEdges((eds) => eds.concat(edgeParams));

        // Auto-update parent_id for hierarchy edges
        const isHierarchyEdge = hierarchyEdgeTypes.includes(edgeType);
        if (isHierarchyEdge) {
            setNodes((nds) => nds.map(node => {
                if (node.id === actualTargetId) {
                    return {
                        ...node,
                        data: { ...node.data, parent_id: actualSourceId }
                    };
                }
                return node;
            }));
        }
    }, [nodes, edges, setEdges, setNodes]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            if (!reactFlowWrapper.current || !reactFlowInstance) return;

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const type = event.dataTransfer.getData('application/reactflow') as NodeType;

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            // Check if this type requires a parent
            const needsParent = ['Program', 'Application', 'Service'].includes(type);

            if (needsParent) {
                setParentRequest({ type, position });
            } else {
                createNode(type, position);
            }
        },
        [reactFlowInstance, nodes]
    );

    const createNode = (type: NodeType, position: { x: number; y: number }, parentId: string = '') => {
        const newNodeId = uuidv4();
        const color = nodeColorMap[type] || { bg: '#fff', border: '#ccc', text: '#333' };

        // Calculate a unique default name (e.g., Service 1)
        const typeCount = nodes.filter(n => n.data.type === type).length + 1;
        const defaultName = `${type} ${typeCount}`;

        const newNode: Node = {
            id: newNodeId,
            type: 'default',
            position,
            style: {
                background: color.bg,
                color: color.text,
                border: `1px solid ${color.border}`,
                borderRadius: '5px',
                padding: '10px',
                fontSize: '12px',
                fontWeight: 'bold',
                width: '150px'
            },
            data: {
                label: defaultName,
                type,
                name: defaultName,
                parent_id: parentId,
                properties: {
                    resource_name: defaultName, // Default resource name to the node name
                    program_id: '',
                    application_id: '',
                    environment: 'none',
                    is_active: false // False until published
                }
            },
        };

        setNodes((nds) => nds.concat(newNode));

        // If it has a parent, create the HAS_ edge automatically
        if (parentId) {
            const parentNode = nodes.find(n => n.id === parentId);
            if (parentNode) {
                const rules = getRelationshipRules(parentNode.data.type as NodeType, type);
                if (rules.length > 0) {
                    const edgeType = rules[0];
                    const edgeParams: Edge = {
                        id: uuidv4(),
                        source: parentId,
                        target: newNodeId,
                        type: 'multi',
                        label: edgeType,
                        data: { type: edgeType, offset: 0 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#2c3e50' },
                        style: { stroke: '#2c3e50', strokeWidth: 2 }
                    };
                    setEdges((eds) => eds.concat(edgeParams));
                }
            }
        }

        setSelectedNodeId(newNodeId);
    };

    const onNodeClick = (_: any, node: Node) => {
        setSelectedNodeId(node.id);
    };

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    const onDeleteNode = useCallback((id: string) => {
        console.log('[Designer] Deleting node:', id);
        if (!id) return;

        setNodes((nds) => {
            const newNds = nds.filter((node) => node.id !== id);
            console.log('[Designer] Nodes after deletion:', newNds.length);
            return newNds;
        });
        setEdges((eds) => {
            const newEds = eds.filter((edge) => edge.source !== id && edge.target !== id);
            console.log('[Designer] Edges after deletion:', newEds.length);
            return newEds;
        });
        setSelectedNodeId(null);
    }, [setNodes, setEdges]);

    const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
        deletedEdges.forEach(edge => {
            if (edge.label && hierarchyEdgeTypes.includes(edge.label as string)) {
                setNodes((nds) => nds.map(node => {
                    if (node.id === edge.target && node.data.parent_id === edge.source) {
                        return {
                            ...node,
                            data: { ...node.data, parent_id: '' }
                        };
                    }
                    return node;
                }));
            }
        });
    }, [setNodes]);

    const onEdgeClick = useCallback((_: any, edge: Edge) => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;

        const sourceType = sourceNode.data.type as NodeType;
        const targetType = targetNode.data.type as NodeType;

        let allowedTypes = getRulesForConnection(sourceType, targetType);
        if (allowedTypes.length === 0) {
            allowedTypes = getRulesForConnection(targetType, sourceType);
        }

        if (allowedTypes.length <= 1) return;

        const currentType = edge.label as EdgeType;
        const currentIndex = allowedTypes.indexOf(currentType);

        let nextIndex = (currentIndex + 1) % allowedTypes.length;
        let nextType = allowedTypes[nextIndex];

        const otherEdges = edges.filter(e => e.id !== edge.id && e.source === edge.source && e.target === edge.target);

        let attempts = 0;
        while (otherEdges.some(e => e.label === nextType) && attempts < allowedTypes.length) {
            nextIndex = (nextIndex + 1) % allowedTypes.length;
            nextType = allowedTypes[nextIndex];
            attempts++;
        }

        if (nextType === currentType) return;

        console.log(`[Designer] Toggling Edge ${edge.id}: ${currentType} -> ${nextType}`);

        setEdges((eds) => eds.map(e => {
            if (e.id === edge.id) {
                return {
                    ...e,
                    // DO NOT change id to maintain stable rendering
                    label: nextType,
                    animated: nextType === 'CALLS',
                    data: { ...e.data, type: nextType }
                };
            }
            return e;
        }));

        if (hierarchyEdgeTypes.includes(nextType)) {
            setNodes(nds => nds.map(n => n.id === edge.target ? { ...n, data: { ...n.data, parent_id: edge.source } } : n));
        } else if (hierarchyEdgeTypes.includes(currentType)) {
            setNodes(nds => nds.map(n => n.id === edge.target ? { ...n, data: { ...n.data, parent_id: '' } } : n));
        }
    }, [nodes, edges, setEdges, setNodes]);


    const updateNodeData = (id: string, partialData: Partial<NodeData>) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    const newData = { ...node.data, ...partialData };
                    if (partialData.name) {
                        newData.label = partialData.name;
                    }
                    return { ...node, data: newData };
                }
                return node;
            })
        );
    };

    const onSave = async () => {
        const errors: string[] = [];
        const programs = nodes.filter(n => n.data.type === 'Program');
        const applications = nodes.filter(n => n.data.type === 'Application');
        const services = nodes.filter(n => n.data.type === 'Service');

        // Hierarchy Validations
        programs.forEach(prog => {
            const hasApp = applications.some(app => app.data.parent_id === prog.id);
            if (!hasApp) errors.push(`Program "${prog.data.name || prog.id}": Must have at least one Application`);
        });

        applications.forEach(app => {
            const hasService = services.some(srv => srv.data.parent_id === app.id);
            if (!hasService) errors.push(`Application "${app.data.name || app.id}": Must have at least one Service`);
        });

        // Unique Name Validation
        const allNames = nodes.map(n => (n.data.name || '').toLowerCase().trim());
        const uniqueNames = new Set(allNames);
        if (uniqueNames.size !== allNames.length) {
            errors.push("Validation Error: All nodes must have a unique name.");
        }

        nodes.forEach(node => {
            const d = node.data as NodeData;

            if (!d.name) errors.push(`Node ${node.id}: Missing name`);

            // Orphan Checks
            if (['Service', 'VirtualMachine', 'KubernetesCluster', 'AppService', 'FunctionApp', 'OnPremServer'].includes(d.type)) {
                if (!d.parent_id && !edges.some(e => e.target === node.id || e.source === node.id)) {
                    errors.push(`Orphan ${d.type} "${d.name || node.id}": Must be connected or have a parent`);
                }
            }

            if (['Database', 'Queue', 'Cache'].includes(d.type)) {
                const isConnected = edges.some(e => e.target === node.id || e.source === node.id);
                if (!isConnected) {
                    errors.push(`Orphan ${d.type} "${d.name || node.id}": Must be connected to a Service`);
                }
            }

            // Infrastructure Validation (Mandatory Identifiers)
            if (['VirtualMachine', 'KubernetesCluster', 'AppService', 'FunctionApp', 'OnPremServer', 'Database', 'Queue', 'Cache'].includes(d.type)) {
                if (!d.properties.resource_name) errors.push(`${d.type} "${d.name || node.id}": Missing Resource Name`);
                if (!d.properties.datadog_service) errors.push(`${d.type} "${d.name || node.id}": Missing Service Identifier`);
            }
        });

        if (errors.length > 0) {
            alert(`Validation failed:\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...and more' : ''}`);
            return;
        }

        // Use the first program ID as scope for this publish (simpler for POC)
        // In a real app, we'd probably have a program selector.
        const targetProgramId = nodes.find(n => n.data.type === 'Program')?.data.properties.program_id;

        const architecture = {
            program_id: targetProgramId, // Scoped publish
            nodes: nodes.map(n => ({
                id: n.id,
                type: n.data.type,
                name: n.data.name,
                parent_id: n.data.parent_id,
                properties: { ...n.data.properties, is_active: true } // Mark active on publish
            })),
            edges: edges.map(e => ({
                from: e.source,
                to: e.target,
                type: (e.label as string) || 'CALLS',
                properties: e.data || {}
            }))
        };

        try {
            await axios.post('http://localhost:8000/publish', architecture);
            alert('Architecture published successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to publish architecture');
        }
    };

    const handleExport = () => {
        const data = {
            nodes,
            edges,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `architecture-copy-${new Date().getTime()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (json.nodes && json.edges) {
                    setNodes(json.nodes);
                    setEdges(json.edges);
                    alert('Local copy loaded successfully!');
                } else {
                    alert('Invalid architecture file format');
                }
            } catch (err) {
                console.error(err);
                alert('Failed to parse architecture file');
            }
        };
        reader.readAsText(file);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

    return (
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px', background: '#eee', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc' }}>
                <strong>Architecture Designer</strong>
                <div>
                    <span style={{ marginRight: '15px', fontSize: '12px', color: '#666' }}>Click node to edit properties</span>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                        style={{ display: 'none' }}
                        accept=".json"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{ padding: '5px 15px', cursor: 'pointer', marginRight: '5px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                    >
                        Import Local
                    </button>
                    <button
                        onClick={handleExport}
                        style={{ padding: '5px 15px', cursor: 'pointer', marginRight: '5px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                    >
                        Export Local
                    </button>
                    <button
                        onClick={onSave}
                        style={{ padding: '5px 15px', cursor: 'pointer', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                        Publish to Engine
                    </button>
                </div>
            </div>
            <div style={{ flexGrow: 1, display: 'flex' }}>
                <div style={{ flexGrow: 1 }} ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onNodeClick={onNodeClick}
                        onEdgeClick={onEdgeClick}
                        onPaneClick={onPaneClick}
                        onEdgesDelete={onEdgesDelete}
                        edgeTypes={edgeTypes}
                        fitView
                    >
                        <Background />
                        <Controls />
                    </ReactFlow>
                </div>
                {selectedNode && (
                    <NodeProperties
                        selectedNode={selectedNode}
                        nodes={nodes}
                        onUpdate={updateNodeData}
                        onDelete={onDeleteNode}
                        onClose={() => setSelectedNodeId(null)}
                    />
                )}
                {parentRequest && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                        zIndex: 1000,
                        width: '350px'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0' }}>Select Parent for {parentRequest.type}</h3>
                        <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                            Every {parentRequest.type} must belong to a parent node within the platform hierarchy.
                        </p>
                        <select
                            style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #ccc' }}
                            onChange={(e) => {
                                if (e.target.value) {
                                    createNode(parentRequest.type, parentRequest.position, e.target.value);
                                    setParentRequest(null);
                                }
                            }}
                            defaultValue=""
                        >
                            <option value="" disabled>-- Choose Parent Node --</option>
                            {nodes.filter(n => {
                                if (parentRequest.type === 'Program') return n.data.type === 'Organization';
                                if (parentRequest.type === 'Application') return n.data.type === 'Program';
                                if (parentRequest.type === 'Service') return n.data.type === 'Application';
                                return false;
                            }).map(n => (
                                <option key={n.id} value={n.id}>
                                    {n.data.name || 'Unnamed'} ({n.data.type})
                                </option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setParentRequest(null)}
                                style={{ padding: '8px 15px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
