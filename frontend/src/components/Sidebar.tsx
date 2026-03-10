import React from 'react';
import type { NodeType } from '../app_types';
import { Layers, Server, Database, Cpu, Box, Globe, HardDrive, Activity, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const categories: { name: string; types: { type: NodeType; icon: React.ReactNode }[] }[] = [
    {
        name: 'Business',
        types: [
            { type: 'Organization', icon: <Globe size={14} /> },
            { type: 'Program', icon: <Layers size={14} /> },
            { type: 'Application', icon: <Box size={14} /> },
        ]
    },
    {
        name: 'Logical',
        types: [
            { type: 'Service', icon: <Activity size={14} /> },
        ]
    },
    {
        name: 'External',
        types: [
            { type: 'ExternalSystem', icon: <Globe size={14} /> },
        ]
    },
    {
        name: 'Compute',
        types: [
            { type: 'VirtualMachine', icon: <Server size={14} /> },
            { type: 'KubernetesCluster', icon: <Layers size={14} /> },
            { type: 'AppService', icon: <Cpu size={14} /> },
            { type: 'FunctionApp', icon: <Activity size={14} /> },
            { type: 'OnPremServer', icon: <Server size={14} /> },
        ]
    },
    {
        name: 'Data',
        types: [
            { type: 'Database', icon: <Database size={14} /> },
            { type: 'Cache', icon: <HardDrive size={14} /> },
            { type: 'Queue', icon: <Layers size={14} /> },
        ]
    },
    {
        name: 'Cloud',
        types: [
            { type: 'CloudProvider', icon: <Globe size={14} /> },
            { type: 'Subscription', icon: <Box size={14} /> },
            { type: 'Region', icon: <Globe size={14} /> },
            { type: 'DataCenter', icon: <Server size={14} /> },
        ]
    }
];

interface SidebarProps {
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggleCollapse }) => {
    const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside style={{
            width: collapsed ? '64px' : '240px',
            borderRight: '1px solid #2d3748',
            padding: '20px',
            background: '#1a202c',
            overflowY: 'auto',
            color: '#e2e8f0',
            fontFamily: '"Inter", -apple-system, sans-serif',
            transition: 'width 0.2s ease'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', marginBottom: '20px' }}>
                {!collapsed && <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px', color: '#cbd5e1', textTransform: 'uppercase' }}>Library</h3>}
                <button
                    onClick={onToggleCollapse}
                    style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', color: '#cbd5e1', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    title={collapsed ? 'Expand Library' : 'Collapse Library'}
                >
                    {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                </button>
            </div>

            {categories.map(cat => (
                <div key={cat.name} style={{ marginBottom: '24px' }}>
                    {!collapsed && (
                        <div style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#718096',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '10px'
                        }}>
                            {cat.name}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {cat.types.map((nt) => (
                            <div
                                key={nt.type}
                                onDragStart={(event) => onDragStart(event, nt.type)}
                                draggable
                                style={{
                                    padding: collapsed ? '10px' : '10px 12px',
                                    border: '1px solid #2d3748',
                                    borderRadius: '6px',
                                    cursor: 'grab',
                                    background: '#2d3748',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    gap: '12px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    transition: 'all 0.2s',
                                    color: '#e2e8f0'
                                }}
                                title={nt.type}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#4a5568';
                                    e.currentTarget.style.background = '#4a5568';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#2d3748';
                                    e.currentTarget.style.background = '#2d3748';
                                }}
                            >
                                <span style={{ color: '#a0aec0', display: 'flex' }}>{nt.icon}</span>
                                {!collapsed && nt.type}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </aside>
    );
};
