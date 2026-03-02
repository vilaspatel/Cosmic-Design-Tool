import React from 'react';
import type { NodeType } from '../app_types';
import {
    Building2, LayoutGrid, Layers, Server, Database,
    MessageSquare, Zap, Monitor, Cpu, Terminal,
    Box, Globe, Shield, MapPin, HardDrive, Network
} from 'lucide-react';

const categories: { name: string; types: { type: NodeType; icon: React.ReactNode }[] }[] = [
    {
        name: 'Business',
        types: [
            { type: 'Organization', icon: <Building2 size={14} /> },
            { type: 'Program', icon: <LayoutGrid size={14} /> },
            { type: 'Application', icon: <Layers size={14} /> },
        ]
    },
    {
        name: 'Logical',
        types: [
            { type: 'Service', icon: <Server size={14} /> },
            { type: 'ExternalSystem', icon: <Globe size={14} /> },
        ]
    },
    {
        name: 'Compute',
        types: [
            { type: 'VirtualMachine', icon: <Monitor size={14} /> },
            { type: 'KubernetesCluster', icon: <Box size={14} /> },
            { type: 'AppService', icon: <Cpu size={14} /> },
            { type: 'FunctionApp', icon: <Terminal size={14} /> },
            { type: 'OnPremServer', icon: <HardDrive size={14} /> },
        ]
    },
    {
        name: 'Data',
        types: [
            { type: 'Database', icon: <Database size={14} /> },
            { type: 'Cache', icon: <Zap size={14} /> },
            { type: 'Queue', icon: <MessageSquare size={14} /> },
        ]
    },
    {
        name: 'Cloud',
        types: [
            { type: 'CloudProvider', icon: <Shield size={14} /> },
            { type: 'Subscription', icon: <Shield size={14} /> },
            { type: 'Region', icon: <MapPin size={14} /> },
            { type: 'DataCenter', icon: <Network size={14} /> },
        ]
    }
];

export const Sidebar: React.FC = () => {
    const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside style={{
            width: '220px',
            borderRight: '1px solid #ddd',
            padding: '15px',
            background: '#f8f9fa',
            overflowY: 'auto'
        }}>
            <h3 style={{ marginBottom: '15px', fontSize: '14px' }}>Components</h3>

            {categories.map(cat => (
                <div key={cat.name} style={{ marginBottom: '20px' }}>
                    <div style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#888',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '8px'
                    }}>
                        {cat.name}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {cat.types.map((nt) => (
                            <div
                                key={nt.type}
                                onDragStart={(event) => onDragStart(event, nt.type)}
                                draggable
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '6px',
                                    cursor: 'grab',
                                    background: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '12px',
                                    transition: 'border-color 0.2s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3498db')}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e0e0e0')}
                            >
                                <span style={{ color: '#555' }}>{nt.icon}</span>
                                {nt.type}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div style={{ marginTop: '20px', fontSize: '11px', color: '#999', lineHeight: '1.4' }}>
                Drag and drop components to model your topology.
            </div>
        </aside>
    );
};
