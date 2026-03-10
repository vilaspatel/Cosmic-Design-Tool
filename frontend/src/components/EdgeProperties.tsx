import React from 'react';
import type { Edge, Node } from 'reactflow';
import type { NodeType, EdgeType } from '../app_types';
import { getRulesForConnection } from '../topology_rules';

interface EdgePropertiesProps {
    selectedEdge: Edge;
    nodes: Node[];
    edges: Edge[];
    onUpdateConnection: (id: string, newSource: string, newTarget: string, newType: EdgeType) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export const EdgeProperties: React.FC<EdgePropertiesProps> = ({
    selectedEdge,
    nodes,
    edges,
    onUpdateConnection,
    onDelete,
    onClose
}) => {
    const sourceNode = nodes.find(n => n.id === selectedEdge.source);
    const targetNode = nodes.find(n => n.id === selectedEdge.target);

    if (!sourceNode || !targetNode) return null;

    const sourceType = sourceNode.data.type as NodeType;
    const targetType = targetNode.data.type as NodeType;

    const allowedTypes = getRulesForConnection(sourceType, targetType);

    // Filter out types that already have an edge between these nodes, EXCEPT the current type
    const otherEdges = edges.filter(e => e.id !== selectedEdge.id && e.source === selectedEdge.source && e.target === selectedEdge.target);
    const availableTypes = allowedTypes.filter(t => t === selectedEdge.label || !otherEdges.some(e => e.label === t));

    // Valid Sources & Targets
    const validSourceNodes = nodes.filter(n => {
        if (n.id === targetNode.id) return false;
        return getRulesForConnection(n.data.type as NodeType, targetType).length > 0;
    });

    const validTargetNodes = nodes.filter(n => {
        if (n.id === sourceNode.id) return false;
        return getRulesForConnection(sourceType, n.data.type as NodeType).length > 0;
    });

    const handleSourceChange = (newSourceId: string) => {
        const newSourceNode = nodes.find(n => n.id === newSourceId);
        if (!newSourceNode) return;
        const newTypes = getRulesForConnection(newSourceNode.data.type as NodeType, targetType);
        let nextType = selectedEdge.label as EdgeType;
        if (!newTypes.includes(nextType)) nextType = newTypes[0];
        onUpdateConnection(selectedEdge.id, newSourceId, selectedEdge.target, nextType);
    };

    const handleTargetChange = (newTargetId: string) => {
        const newTargetNode = nodes.find(n => n.id === newTargetId);
        if (!newTargetNode) return;
        const newTypes = getRulesForConnection(sourceType, newTargetNode.data.type as NodeType);
        let nextType = selectedEdge.label as EdgeType;
        if (!newTypes.includes(nextType)) nextType = newTypes[0];
        onUpdateConnection(selectedEdge.id, selectedEdge.source, newTargetId, nextType);
    };

    return (
        <aside style={{
            width: '300px',
            borderLeft: '1px solid #1e293b',
            padding: '20px',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        }}>
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#94a3b8'
                }}
            >
                &times;
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '10px', color: '#f8fafc' }}>
                Connection Properties
            </h3>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#94a3b8' }}>From Node</label>
                <select
                    value={sourceNode.id}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #334155', fontSize: '13px', background: '#111827', color: '#e2e8f0' }}
                >
                    {validSourceNodes.map(n => (
                        <option key={n.id} value={n.id}>{n.data.name} ({n.data.type})</option>
                    ))}
                </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#94a3b8' }}>To Node</label>
                <select
                    value={targetNode.id}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #334155', fontSize: '13px', background: '#111827', color: '#e2e8f0' }}
                >
                    {validTargetNodes.map(n => (
                        <option key={n.id} value={n.id}>{n.data.name} ({n.data.type})</option>
                    ))}
                </select>
            </div>

            <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#94a3b8' }}>Connection Type</label>
                <select
                    value={selectedEdge.label as string}
                    onChange={(e) => onUpdateConnection(selectedEdge.id, selectedEdge.source, selectedEdge.target, e.target.value as EdgeType)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #334155', fontSize: '13px', background: '#111827', color: '#e2e8f0' }}
                >
                    {availableTypes.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
                {availableTypes.length === 1 && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '5px' }}>
                        Only one relationship type is valid between these nodes.
                    </div>
                )}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #1e293b' }}>
                <button
                    onClick={() => onDelete(selectedEdge.id)}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '13px'
                    }}
                >
                    Delete Connection
                </button>
            </div>
        </aside>
    );
};
