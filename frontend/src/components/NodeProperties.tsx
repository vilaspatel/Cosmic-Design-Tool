import React from 'react';
import type { Node } from 'reactflow';
import { X } from 'lucide-react';
import type { NodeData } from '../app_types';

interface NodePropertiesProps {
    selectedNode: Node | null;
    nodes: Node[];
    onUpdate: (id: string, data: Partial<NodeData>) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export const NodeProperties: React.FC<NodePropertiesProps> = ({ selectedNode, nodes, onUpdate, onDelete, onClose }) => {
    if (!selectedNode) return null;

    const data = selectedNode.data as NodeData;
    const properties = data.properties || {};

    const handleDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onUpdate(selectedNode.id, { [name]: value });
    };

    const handlePropertyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onUpdate(selectedNode.id, {
            properties: { ...properties, [name]: value }
        });
    };

    const getParentOptions = () => {
        switch (data.type) {
            case 'Program': return nodes.filter(n => n.data.type === 'Organization');
            case 'Application': return nodes.filter(n => n.data.type === 'Program');
            case 'Service': return nodes.filter(n => n.data.type === 'Application');
            case 'ExternalSystem': return nodes.filter(n => n.data.type === 'Application');
            case 'VirtualMachine':
            case 'KubernetesCluster':
            case 'AppService':
            case 'FunctionApp':
            case 'OnPremServer':
                return nodes.filter(n => ['Region', 'DataCenter'].includes(n.data.type));
            case 'Region': return nodes.filter(n => n.data.type === 'Subscription');
            case 'Subscription': return nodes.filter(n => n.data.type === 'CloudProvider');
            case 'DataCenter': return nodes.filter(n => n.data.type === 'Organization');
            default: return [];
        }
    };

    const parentOptions = getParentOptions();

    return (
        <div style={{
            width: '320px',
            borderLeft: '1px solid #ddd',
            padding: '20px',
            background: '#f8f9fa',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            overflowY: 'auto'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{data.type} Properties</h3>
                <X size={20} cursor="pointer" onClick={onClose} />
            </div>

            {/* Core Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>NAME *</label>
                <input
                    name="name"
                    value={data.name || ''}
                    onChange={handleDataChange}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
            </div>

            {/* Mandatory Enterprise Properties */}
            <div style={{ padding: '10px', background: '#fff', border: '1px solid #eee', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Mandatory Properties</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#888' }}>PROGRAM ID *</label>
                    <input
                        name="program_id"
                        value={properties.program_id || ''}
                        onChange={handlePropertyChange}
                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#888' }}>APPLICATION ID</label>
                    <input
                        name="application_id"
                        value={properties.application_id || ''}
                        onChange={handlePropertyChange}
                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#888' }}>ENVIRONMENT *</label>
                    <select
                        name="environment"
                        value={properties.environment || 'none'}
                        onChange={handlePropertyChange}
                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }}
                    >
                        <option value="none">None</option>
                        <option value="dev">Development</option>
                        <option value="stage">Staging</option>
                        <option value="prod">Production</option>
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#888' }}>IS ACTIVE</label>
                    <input
                        type="checkbox"
                        name="is_active"
                        checked={properties.is_active !== false}
                        onChange={(e) => onUpdate(selectedNode.id, {
                            properties: { ...properties, is_active: e.target.checked }
                        })}
                    />
                </div>
            </div>

            {/* Hierarchy */}
            {parentOptions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>PARENT (OPTIONAL)</label>
                    <select
                        name="parent_id"
                        value={data.parent_id || ''}
                        onChange={handleDataChange}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">-- No Parent (Global) --</option>
                        {parentOptions.map(p => (
                            <option key={p.id} value={p.id}>{p.data.name || p.id} ({p.data.type})</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Type-Specific Properties */}
            {data.type === 'Service' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>SERVICE IDENTIFIER</label>
                    <input
                        name="datadog_service"
                        value={properties.datadog_service || ''}
                        onChange={handlePropertyChange}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </div>
            )}

            {['VirtualMachine', 'KubernetesCluster', 'AppService', 'FunctionApp', 'OnPremServer', 'Database', 'Queue', 'Cache', 'ExternalSystem'].includes(data.type) && (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>RESOURCE NAME</label>
                        <input
                            name="resource_name"
                            value={properties.resource_name || ''}
                            onChange={handlePropertyChange}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>SERVICE IDENTIFIER</label>
                        <input
                            name="datadog_service"
                            value={properties.datadog_service || ''}
                            onChange={handlePropertyChange}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                </>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <button
                    onClick={() => onDelete(selectedNode.id)}
                    style={{
                        padding: '10px',
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Delete Node
                </button>
                <div>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '5px' }}>UUID: {selectedNode.id}</div>
                </div>
            </div>
        </div>
    );
};
