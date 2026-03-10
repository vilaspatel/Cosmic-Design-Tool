import React, { useState, useCallback, useRef, useEffect } from 'react';
import CardNode from './CardNode';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    MarkerType,
    BaseEdge,
    EdgeLabelRenderer
} from 'reactflow';
import { PanelLeftOpen, PanelRightClose } from 'lucide-react';
import type {
    Connection,
    Edge,
    Node,
    ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { NodeType, EdgeType, NodeData } from '../app_types';
import { NodeProperties } from './NodeProperties';
import { EdgeProperties } from './EdgeProperties';
import { Sidebar } from './Sidebar';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getRulesForConnection } from '../topology_rules';
import dagre from 'dagre';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const MultiEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, label, data }: any) => {
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
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('delete-edge-event', { detail: id }));
                        }}
                        title="Right-click to delete"
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                            display: 'flex',
                            alignItems: 'center',
                            background: '#0f172a',
                            color: '#e2e8f0',
                            border: '1px solid #334155',
                            padding: '3px 7px',
                            borderRadius: '999px',
                            gap: '4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            cursor: 'context-menu'
                        }}
                    >
                        <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.4px' }}>
                            {label}
                        </div>
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
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [parentRequest, setParentRequest] = useState<ParentRequest | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [libraryCollapsed, setLibraryCollapsed] = useState(false);
    const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

    const onLayout = useCallback(() => {
        if (!nodes.length) return;

        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));

        const nodeWidth = 170;
        const nodeHeight = 60;

        dagreGraph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 50 });

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        const newNodes = nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            return {
                ...node,
                position: {
                    x: nodeWithPosition.x - nodeWidth / 2,
                    y: nodeWithPosition.y - nodeHeight / 2,
                },
            };
        });

        setNodes(newNodes);

        window.requestAnimationFrame(() => {
            if (reactFlowInstance) {
                reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
            }
        });
    }, [nodes, edges, setNodes, reactFlowInstance]);

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
        // Calculate a unique default name (e.g., Service 1)
        const typeCount = nodes.filter(n => n.data.type === type).length + 1;
        const defaultName = `${type} ${typeCount}`;

        const newNode: Node = {
            id: newNodeId,
            type: 'default',
            position,
            style: { width: '240px', border: 'none', background: 'transparent' },
            data: {
                label: defaultName,
                id: newNodeId,
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
        setSelectedEdgeId(null);
        setSelectedNodeId(node.id);
    };

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
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
        setSelectedEdgeId(null);
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

    useEffect(() => {
        const handleEdgeDelete = (e: Event) => {
            const customEvent = e as CustomEvent;
            const edgeId = customEvent.detail;
            setEdges((eds) => {
                const edgeToDelete = eds.find(x => x.id === edgeId);
                if (edgeToDelete) {
                    onEdgesDelete([edgeToDelete]);
                    return eds.filter(x => x.id !== edgeId);
                }
                return eds;
            });
        };
        window.addEventListener('delete-edge-event', handleEdgeDelete);
        return () => window.removeEventListener('delete-edge-event', handleEdgeDelete);
    }, [setEdges, onEdgesDelete]);

    const onEdgeClick = useCallback((_: any, edge: Edge) => {
        setSelectedNodeId(null);
        setSelectedEdgeId(edge.id);
    }, []);

    const onUpdateEdge = useCallback((edgeId: string, newSource: string, newTarget: string, newType: EdgeType) => {
        setEdges((eds) => eds.map(e => {
            if (e.id === edgeId) {
                const updatedEdge = {
                    ...e,
                    source: newSource,
                    target: newTarget,
                    label: newType,
                    animated: newType === 'CALLS',
                    data: { ...e.data, type: newType }
                };
                
                // Handle hierarchy node updates if applicable
                const currentType = e.label as string;
                if (hierarchyEdgeTypes.includes(newType) && !hierarchyEdgeTypes.includes(currentType)) {
                    setNodes(nds => nds.map(n => n.id === e.target ? { ...n, data: { ...n.data, parent_id: e.source } } : n));
                } else if (!hierarchyEdgeTypes.includes(newType) && hierarchyEdgeTypes.includes(currentType)) {
                    setNodes(nds => nds.map(n => n.id === e.target ? { ...n, data: { ...n.data, parent_id: '' } } : n));
                }

                return updatedEdge;
            }
            return e;
        }));
    }, [setEdges, setNodes]);


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
                if (!d.properties.service_identifier) errors.push(`${d.type} "${d.name || node.id}": Missing Service Identifier`);
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
    const selectedEdge = edges.find(e => e.id === selectedEdgeId) || null;

    return (
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', background: '#020617' }}>
            <div style={{ padding: '12px 14px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>Architecture Designer</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Drag components, connect edges, and validate architecture intent.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ marginRight: '10px', fontSize: '11px', color: '#94a3b8' }}>Edge labels: CALLS, READS_FROM, WRITES_TO, RUNS_ON</span>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                        style={{ display: 'none' }}
                        accept=".json"
                    />
                    <button onClick={onLayout} style={{ padding: '6px 12px', cursor: 'pointer', background: '#2563eb', color: 'white', border: '1px solid #1d4ed8', borderRadius: '7px', fontSize: '12px' }}>Auto Arrange</button>
                    <button onClick={() => fileInputRef.current?.click()} style={{ padding: '6px 12px', cursor: 'pointer', background: '#111827', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '7px', fontSize: '12px' }}>Import</button>
                    <button onClick={handleExport} style={{ padding: '6px 12px', cursor: 'pointer', background: '#111827', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '7px', fontSize: '12px' }}>Export</button>
                    <button onClick={onSave} style={{ padding: '6px 12px', cursor: 'pointer', background: '#059669', color: 'white', border: '1px solid #047857', borderRadius: '7px', fontSize: '12px' }}>Publish</button>
                </div>
            </div>
            <div style={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
                <Sidebar collapsed={libraryCollapsed} onToggleCollapse={() => setLibraryCollapsed((prev) => !prev)} />
                <div style={{ flexGrow: 1, position: 'relative' }} ref={reactFlowWrapper}>
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
                        nodeTypes={{ default: CardNode }}
                        fitView
                        fitViewOptions={{ padding: 0.2, duration: 600 }}
                        minZoom={0.25}
                        maxZoom={2.2}
                        zoomOnScroll={true}
                        panOnScroll={true}
                        zoomOnPinch={true}
                        panOnDrag={true}
                    >
                        <Background color="#1e293b" gap={24} size={1.2} />
                        <Controls />
                    </ReactFlow>
                </div>
                <div style={{ width: inspectorCollapsed ? '56px' : '320px', transition: 'width 0.2s ease', borderLeft: '1px solid #1e293b', background: '#0f172a', overflow: 'hidden' }}>
                    <div style={{ padding: '10px', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid #1e293b' }}>
                        <button
                            onClick={() => setInspectorCollapsed((prev) => !prev)}
                            style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', color: '#cbd5e1', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            title={inspectorCollapsed ? 'Expand Inspector' : 'Collapse Inspector'}
                        >
                            {inspectorCollapsed ? <PanelLeftOpen size={14} /> : <PanelRightClose size={14} />}
                        </button>
                    </div>
                    {!inspectorCollapsed && (selectedNode ? (
                        <NodeProperties
                            selectedNode={selectedNode}
                            nodes={nodes}
                            onUpdate={updateNodeData}
                            onDelete={onDeleteNode}
                            onClose={() => setSelectedNodeId(null)}
                        />
                    ) : selectedEdge ? (
                        <EdgeProperties
                            selectedEdge={selectedEdge}
                            nodes={nodes}
                            edges={edges}
                            onUpdateConnection={onUpdateEdge}
                            onDelete={(id) => {
                                const e = edges.find(x => x.id === id);
                                if (e) onEdgesDelete([e]);
                                setEdges(eds => eds.filter(x => x.id !== id));
                                setSelectedEdgeId(null);
                            }}
                            onClose={() => setSelectedEdgeId(null)}
                        />
                    ) : (
                        <div style={{ width: '100%', padding: '18px', color: '#94a3b8' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>Inspector</div>
                            <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
                                Select a node or connection to inspect and edit its metadata, hierarchy, and relationship rules.
                            </div>
                        </div>
                    ))}
                </div>
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
