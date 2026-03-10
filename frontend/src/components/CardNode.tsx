import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeType } from '../app_types';
import { Server, Database, Globe, Box, Cpu, HardDrive, Layers, Activity } from 'lucide-react';

const nodeConfig: Record<NodeType, { icon: any, color: string, border: string }> = {
    Organization: { icon: Globe, color: '#334155', border: '#475569' },
    Program: { icon: Layers, color: '#3b82f6', border: '#60a5fa' },
    Application: { icon: Box, color: '#6366f1', border: '#818cf8' },
    Service: { icon: Activity, color: '#10b981', border: '#34d399' },
    ExternalSystem: { icon: Globe, color: '#64748b', border: '#94a3b8' },
    VirtualMachine: { icon: Server, color: '#8b5cf6', border: '#a78bfa' },
    KubernetesCluster: { icon: Layers, color: '#ec4899', border: '#f472b6' },
    AppService: { icon: Cpu, color: '#14b8a6', border: '#2dd4bf' },
    FunctionApp: { icon: Activity, color: '#84cc16', border: '#a3e635' },
    OnPremServer: { icon: Server, color: '#1e293b', border: '#334155' },
    Database: { icon: Database, color: '#f43f5e', border: '#fb7185' },
    Cache: { icon: HardDrive, color: '#f59e0b', border: '#fbbf24' },
    Queue: { icon: Layers, color: '#ea580c', border: '#f97316' },
    CloudProvider: { icon: Globe, color: '#0284c7', border: '#38bdf8' },
    Subscription: { icon: Box, color: '#0e7490', border: '#22d3ee' },
    Region: { icon: Globe, color: '#0284c7', border: '#38bdf8' },
    DataCenter: { icon: Server, color: '#475569', border: '#64748b' }
};

interface CardNodeData {
    label: string | React.ReactNode;
    id?: string;
    type?: NodeType;
    name?: string;
    properties?: any;
    rawNode?: {
        type: NodeType;
        name: string;
        id: string;
        properties: any;
    };
    impactStyle?: any; // To pass in blast radius styling
}

const CardNode = ({ data, selected }: { data: CardNodeData, selected?: boolean }) => {
    const raw = data.rawNode || {
        id: data.id || '',
        type: (data.type || 'Service') as NodeType,
        name: data.name || (typeof data.label === 'string' ? data.label : 'Untitled Node'),
        properties: data.properties || {}
    };

    const config = nodeConfig[raw.type] || { icon: Box, color: '#718096', border: '#a0aec0' };
    const Icon = config.icon;
    
    // Impact styles override selection styles if provided
    const dynamicBorder = data.impactStyle?.borderColor || (selected ? '#6366f1' : '#2d3748');
    const dynamicBoxShadow = data.impactStyle?.boxShadow || (selected ? '0 0 0 2px rgba(99, 102, 241, 0.4)' : '0 4px 6px -1px rgba(0,0,0,0.3)');

    return (
        <div style={{
            background: '#1a202c',
            borderRadius: '8px',
            border: `2px solid ${dynamicBorder}`,
            boxShadow: dynamicBoxShadow,
            width: '240px',
            overflow: 'hidden',
            fontFamily: '"Inter", -apple-system, sans-serif',
            color: '#e2e8f0',
            transition: 'all 0.2s ease',
            ...data.impactStyle
        }}>
            <Handle type="target" position={Position.Top} style={{ background: '#718096', width: '8px', height: '8px', border: 'none' }} />
            
            {/* Header (Type & Icon) */}
            <div style={{
                background: '#2d3748',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: '1px solid #4a5568'
            }}>
                <Icon size={14} color={config.color} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#a0aec0', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {raw.type}
                </span>
                
                {/* Active Indicator */}
                {raw.properties?.is_active !== false && (
                    <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                )}
            </div>

            {/* Body (Name) */}
            <div style={{ padding: '12px', minHeight: '36px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.3, wordBreak: 'break-word' }}>
                    {raw.name || '(Unnamed Node)'}
                </span>
            </div>

            {/* Footer / Meta (Environment, optional tags) */}
            {raw.properties?.environment && raw.properties.environment !== 'none' && (
                <div style={{ padding: '4px 12px 8px', display: 'flex', gap: '6px' }}>
                    <span style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        background: '#2d3748',
                        color: '#cbd5e1',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                    }}>
                        {raw.properties.environment}
                    </span>
                </div>
            )}

            <Handle type="source" position={Position.Bottom} style={{ background: '#718096', width: '8px', height: '8px', border: 'none' }} />
        </div>
    );
};

export default memo(CardNode);
