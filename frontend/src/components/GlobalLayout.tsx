import React from 'react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Blocks, ShieldAlert, Compass, Search, Settings, HelpCircle, Bell, Command, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface GlobalLayoutProps {
    children: React.ReactNode;
}

export const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
    const [workspaceNavCollapsed, setWorkspaceNavCollapsed] = useState(false);
    const navItems = [
        { to: '/', label: 'Architecture Designer', hint: 'Build architecture models', icon: Blocks },
        { to: '/impact', label: 'Impact Viewer', hint: 'Analyze incidents and blast radius', icon: ShieldAlert },
        { to: '/explorer', label: 'Architecture Explorer', hint: 'Explore topology and dependencies', icon: Compass },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#0b1020', color: '#e2e8f0', fontFamily: '"Inter", -apple-system, sans-serif' }}>
            <div style={{
                height: '56px',
                background: '#0f172a',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 18px',
                boxSizing: 'border-box'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg, #6366f1, #22d3ee)', borderRadius: '7px' }} />
                    <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.3px' }}>Topology Studio</span>
                </div>

                <div style={{ flexGrow: 1, maxWidth: '620px', margin: '0 24px', position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        placeholder="Command bar: search, jump to node, run action..."
                        style={{
                            width: '100%',
                            background: '#111827',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '8px 82px 8px 34px',
                            color: '#e2e8f0',
                            fontSize: '13px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                    <div style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#94a3b8',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        fontSize: '11px'
                    }}>
                        <Command size={12} />
                        K
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#a0aec0' }}>
                    <Bell size={16} cursor="pointer" />
                    <HelpCircle size={16} cursor="pointer" />
                    <Settings size={16} cursor="pointer" />
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4a5568', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: '#fff', marginLeft: '8px', cursor: 'pointer' }}>
                        US
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                <div style={{
                    width: workspaceNavCollapsed ? '64px' : '240px',
                    background: '#0f172a',
                    borderRight: '1px solid #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '14px',
                    gap: '8px',
                    transition: 'width 0.2s ease'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: workspaceNavCollapsed ? 'center' : 'space-between', margin: '6px 4px' }}>
                        {!workspaceNavCollapsed && (
                            <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Workspaces
                            </div>
                        )}
                        <button
                            onClick={() => setWorkspaceNavCollapsed((prev) => !prev)}
                            style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', color: '#cbd5e1', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            title={workspaceNavCollapsed ? 'Expand Workspaces' : 'Collapse Workspaces'}
                        >
                            {workspaceNavCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                        </button>
                    </div>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                title={item.label}
                                style={({ isActive }) => ({
                                    color: isActive ? '#f8fafc' : '#94a3b8',
                                    background: isActive ? '#1e293b' : 'transparent',
                                    border: isActive ? '1px solid #334155' : '1px solid transparent',
                                    padding: '10px',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s',
                                    textDecoration: 'none'
                                })}
                            >
                                <Icon size={18} />
                                {!workspaceNavCollapsed && (
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.label}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{item.hint}</div>
                                    </div>
                                )}
                            </NavLink>
                        );
                    })}
                </div>

                <div style={{ flexGrow: 1, background: '#020617', position: 'relative', display: 'flex', overflow: 'hidden' }}>
                    {children}
                </div>

            </div>
        </div>
    );
};
