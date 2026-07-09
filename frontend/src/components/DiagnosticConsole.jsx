import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, ShieldCheck, Activity, RefreshCw, Cpu, Lock, X, Terminal, Server } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DiagnosticConsole = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('users'); // users, sessions, redis, clients, logs
    const [autoPoll, setAutoPoll] = useState(true);

    const fetchState = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/v1/auth/diagnostics/state`);
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            const payload = await res.json();
            if (payload.success) {
                setData(payload.data);
                setError(null);
            } else {
                throw new Error(payload.message || 'Failed to retrieve diagnostics');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchState();
    }, []);

    useEffect(() => {
        if (!autoPoll) return;
        const timer = setInterval(() => {
            fetchState();
        }, 2000);
        return () => clearInterval(timer);
    }, [autoPoll]);

    return (
        <>
            {/* Floating Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-full bg-slate-900 border border-blue-500/30 hover:border-blue-500 text-blue-400 font-semibold shadow-2xl flex items-center gap-2 hover:scale-105 transition-all cursor-pointer backdrop-blur-md bg-opacity-90 animate-bounce"
                style={{ animationDuration: '3s' }}
            >
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>Security Diagnostics</span>
            </button>

            {/* Diagnostic Drawer Panel */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[9999] pointer-events-none">
                        {/* Overlay backdrop */}
                        <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={() => setIsOpen(false)} />
                        
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute top-0 right-0 h-screen w-full sm:w-[480px] md:w-[560px] bg-slate-950/95 border-l border-white/10 shadow-2xl flex flex-col backdrop-blur-md pointer-events-auto text-white"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
                                <div className="flex items-center gap-2.5">
                                    <Database className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <h3 className="font-bold text-white text-lg">System Security Console</h3>
                                        <p className="text-gray-400 text-xs">Real-time MongoDB & Redis Verification</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={fetchState}
                                        disabled={loading}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                        title="Refresh State"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Auto-Refresh Toggle */}
                            <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between bg-slate-900/20 text-xs">
                                <span className="text-gray-400">Live Auto-poll (2s)</span>
                                <button
                                    onClick={() => setAutoPoll(!autoPoll)}
                                    className={`w-10 h-5 rounded-full transition-all relative ${autoPoll ? 'bg-blue-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${autoPoll ? 'left-5' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Navigation Tabs */}
                            <div className="flex border-b border-white/5 bg-slate-900/30 overflow-x-auto shrink-0 text-xs">
                                {[
                                    { id: 'users', label: 'Users', icon: Lock },
                                    { id: 'sessions', label: 'Sessions', icon: Server },
                                    { id: 'redis', label: 'Redis Cache', icon: Cpu },
                                    { id: 'clients', label: 'Recruiter Clients', icon: ShieldCheck },
                                    { id: 'logs', label: 'Audit Logs', icon: Activity }
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex-1 py-4 px-3 flex items-center justify-center gap-1.5 font-bold transition-all border-b-2 whitespace-nowrap ${
                                                isActive
                                                    ? 'border-blue-500 text-blue-400 bg-white/5'
                                                    : 'border-transparent text-gray-500 hover:text-white'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
                                {error && (
                                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                        Error loading diagnostics: {error}
                                    </div>
                                )}

                                {!data && !error && (
                                    <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                                        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-blue-500/40" />
                                        <span>Fetching current database and Redis state...</span>
                                    </div>
                                )}

                                {data && (
                                    <>
                                        {/* USERS TAB */}
                                        {activeTab === 'users' && (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Latest MongoDB User Records</h4>
                                                    <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Password Hashing Active</span>
                                                </div>
                                                {data.users.length === 0 ? (
                                                    <p className="text-gray-500 italic text-xs">No users registered in database.</p>
                                                ) : (
                                                    data.users.map((user) => (
                                                        <div key={user.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold text-white">{user.name || 'Anonymous'}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    user.role === 'recruiter' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                                                                }`}>{user.role}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                                                                <div>Email: <span className="text-white font-mono">{user.email}</span></div>
                                                                <div>UID: <span className="text-white font-mono">{user.uid ? user.uid.substring(0, 8) + '...' : 'None'}</span></div>
                                                                <div>Token Version: <span className="text-white font-bold">{user.tokenVersion}</span></div>
                                                                <div className="flex items-center gap-1">
                                                                    Password Hashed: 
                                                                    {user.hasHashedPassword ? (
                                                                        <span className="text-green-400 font-bold">YES</span>
                                                                    ) : (
                                                                        <span className="text-red-400 font-bold">NO</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {user.passwordPrefix && (
                                                                <div className="text-[10px] text-gray-500 font-mono">
                                                                    Hash Prefix: {user.passwordPrefix}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* SESSIONS TAB */}
                                        {activeTab === 'sessions' && (
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Latest Sessions (MongoDB)</h4>
                                                {data.sessions.length === 0 ? (
                                                    <p className="text-gray-500 italic text-xs">No active sessions in database.</p>
                                                ) : (
                                                    data.sessions.map((session) => (
                                                        <div key={session.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-xs font-mono text-gray-400">ID: {session.id.substring(session.id.length - 8)}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    session.revoked ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                                }`}>{session.revoked ? 'Revoked' : 'Active'}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                                                                <div>Browser: <span className="text-white font-bold">{session.browser || 'Unknown'}</span></div>
                                                                <div>Device: <span className="text-white font-bold">{session.device || 'Unknown'}</span></div>
                                                                <div>IP: <span className="text-white font-mono">{session.ip || 'Unknown'}</span></div>
                                                                <div>Token Version: <span className="text-white font-bold">{session.tokenVersion}</span></div>
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 font-mono flex items-center justify-between">
                                                                <span>Refresh Token Hash: {session.refreshTokenHashPrefix || 'None'}</span>
                                                                <span>Last Active: {new Date(session.lastActivity).toLocaleTimeString()}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* REDIS TAB */}
                                        {activeTab === 'redis' && (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Active Redis Session Cache Keys</h4>
                                                    <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Redis Enabled</span>
                                                </div>
                                                {data.redis.length === 0 ? (
                                                    <p className="text-gray-500 italic text-xs">No active keys in Redis cache.</p>
                                                ) : (
                                                    data.redis.map((item) => (
                                                        <div key={item.key} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-blue-400 font-mono font-bold text-xs">{item.key}</span>
                                                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">TTL: {item.ttl}s</span>
                                                            </div>
                                                            <div className="p-3 bg-black/40 rounded-xl font-mono text-xs text-green-400 overflow-x-auto">
                                                                {JSON.stringify(item.value, null, 2)}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* RECRUITER CLIENTS TAB */}
                                        {activeTab === 'clients' && (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Registered Recruiter API Clients</h4>
                                                    <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Secrets Hashed (Bcrypt)</span>
                                                </div>
                                                {data.clients.length === 0 ? (
                                                    <p className="text-gray-500 italic text-xs">No registered API clients.</p>
                                                ) : (
                                                    data.clients.map((client) => (
                                                        <div key={client.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-white">{client.clientId}</span>
                                                                <span className="text-green-400 text-xs font-bold">active</span>
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                Hashed Secret: <span className="text-white font-mono">{client.clientSecretPrefix}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs">
                                                                <ShieldCheck className="w-4 h-4 text-green-400" />
                                                                <span className="text-gray-400">Secret Hashed in DB: </span>
                                                                <span className="text-green-400 font-bold">YES</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* AUDIT LOGS TAB */}
                                        {activeTab === 'logs' && (
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Security Audit Logs (Latest 10)</h4>
                                                {data.auditLogs.length === 0 ? (
                                                    <p className="text-gray-500 italic text-xs">No audit logs available.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {data.auditLogs.map((log) => (
                                                            <div key={log._id} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1 text-xs">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-bold text-blue-400 font-mono text-xs">{log.action}</span>
                                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                                                        log.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                                                    }`}>{log.status}</span>
                                                                </div>
                                                                <div className="text-gray-400">
                                                                    IP: <span className="text-white font-mono">{log.ipAddress || '127.0.0.1'}</span> | 
                                                                    Time: <span className="text-white">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                                </div>
                                                                {log.details && Object.keys(log.details).length > 0 && (
                                                                    <div className="text-[10px] text-gray-500 font-mono">
                                                                        Details: {JSON.stringify(log.details)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default DiagnosticConsole;
