import React from 'react';
import type { Node } from 'reactflow';
import { X, Settings } from 'lucide-react';
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

    // Reusable styling for form elements in dark mode
    const inputStyle = {
        width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #4a5568',
        background: '#1a202c', color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const
    };

    const labelStyle = { fontSize: '11px', fontWeight: 600, color: '#a0aec0', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' };

    return (
        <div style={{
            width: '320px',
            borderLeft: '1px solid #2d3748',
            background: '#181b21',
            display: 'flex',
            flexDirection: 'column',
            color: '#e2e8f0',
            fontFamily: '"Inter", -apple-system, sans-serif'
        }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #2d3748', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={18} color="#a0aec0" />
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Inspector</h3>
                </div>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#718096', cursor: 'pointer', padding: 0 }}>
                    <X size={18} />
                </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Core Header */}
                <div>
                    <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        {data.type}
                    </div>
                    <div style={{ fontSize: '12px', color: '#718096', fontFamily: 'monospace', marginBottom: '16px' }}>{selectedNode.id}</div>
                    
                    <label style={labelStyle}>NAME <span style={{ color: '#e53e3e' }}>*</span></label>
                    <input name="name" value={data.name || ''} onChange={handleDataChange} style={inputStyle} />
                </div>

                {/* Properties Box */}
                <div style={{ background: '#2d3748', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid #4a5568' }}>
                    
                    <div>
                        <label style={labelStyle}>PROGRAM ID <span style={{ color: '#e53e3e' }}>*</span></label>
                        <input name="program_id" value={properties.program_id || ''} onChange={handlePropertyChange} style={inputStyle} />
                    </div>

                    <div>
                        <label style={labelStyle}>APPLICATION ID</label>
                        <input name="application_id" value={properties.application_id || ''} onChange={handlePropertyChange} style={inputStyle} />
                    </div>

                    <div>
                        <label style={labelStyle}>ENVIRONMENT <span style={{ color: '#e53e3e' }}>*</span></label>
                        <select name="environment" value={properties.environment || 'none'} onChange={handlePropertyChange} style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option value="none">None</option>
                            <option value="dev">Development</option>
                            <option value="stage">Staging</option>
                            <option value="prod">Production</option>
                        </select>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#e2e8f0' }}>
                        <input type="checkbox" name="is_active" checked={properties.is_active !== false} onChange={(e) => onUpdate(selectedNode.id, { properties: { ...properties, is_active: e.target.checked } })} />
                        Active Component Status
                    </label>
                </div>

                {/* Hierarchy */}
                {parentOptions.length > 0 && (
                    <div>
                        <label style={labelStyle}>PARENT (OPTIONAL)</label>
                        <select name="parent_id" value={data.parent_id || ''} onChange={handleDataChange} style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option value="">-- No Parent (Global) --</option>
                            {parentOptions.map(p => (
                                <option key={p.id} value={p.id}>{p.data.name || p.id} ({p.data.type})</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Type-Specific Properties */}
                {data.type === 'Service' && (
                    <div>
                        <label style={labelStyle}>SERVICE IDENTIFIER (MONITORING)</label>
                        <input name="service_identifier" value={properties.service_identifier || ''} onChange={handlePropertyChange} style={inputStyle} placeholder="e.g., auth-service-prod" />
                    </div>
                )}

                {['VirtualMachine', 'KubernetesCluster', 'AppService', 'FunctionApp', 'OnPremServer', 'Database', 'Queue', 'Cache', 'ExternalSystem'].includes(data.type) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={labelStyle}>RESOURCE NAME</label>
                            <input name="resource_name" value={properties.resource_name || ''} onChange={handlePropertyChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>SERVICE IDENTIFIER</label>
                            <input name="service_identifier" value={properties.service_identifier || ''} onChange={handlePropertyChange} style={inputStyle} />
                        </div>
                    </div>
                )}

            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid #2d3748', background: '#1a202c' }}>
                <button
                    onClick={() => onDelete(selectedNode.id)}
                    style={{ width: '100%', padding: '10px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#c53030'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#e53e3e'}
                >
                    Delete Node
                </button>
            </div>
        </div>
    );
};
