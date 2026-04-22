import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    TrendingUp, 
    AlertTriangle, 
    Github, 
    Calendar, 
    ExternalLink, 
    CheckCircle2, 
    ArrowUpRight, 
    Activity,
    User,
    BarChart3
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';

const PerformanceDashboard = () => {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedHire, setSelectedHire] = useState(null);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const userId = user.uid || user._id || user.id;
                const res = await axios.get(`${API_URL}/insights/recruiter/${userId}`);
                setInsights(res.data);
            } catch (err) {
                console.error("Failed to fetch performance insights:", err);
            } finally {
                setLoading(false);
            }
        };

        if (user.uid || user._id || user.id) fetchInsights();
    }, [user.uid, user._id, user.id]);

    const getRiskStyles = (risk) => {
        switch (risk) {
            case 'High': return 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
            case 'Medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-blue-400 gap-4">
                <Activity size={48} className="animate-spin" />
                <p className="font-bold uppercase tracking-widest text-xs">Syncing Performance Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight mb-2 flex items-center gap-3">
                        Performance Insights <TrendingUp className="text-blue-500" />
                    </h1>
                    <p className="text-gray-400 font-medium">Post-hiring performance tracking and attrition risk monitoring.</p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <Calendar size={18} className="text-blue-400" />
                    <span className="text-xs font-black uppercase tracking-widest">Report Cycle: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
            </header>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Active Hires', value: insights.length, icon: <User />, color: 'blue' },
                    { label: 'Avg Productivity', value: `${Math.round(insights.reduce((acc, i) => acc + i.score, 0) / (insights.length || 1))}%`, icon: <Activity />, color: 'teal' },
                    { label: 'At Risk', value: insights.filter(i => i.risk !== 'Low').length, icon: <AlertTriangle />, color: 'red' },
                    { label: 'Top Performance', value: insights.filter(i => i.score > 80).length, icon: <CheckCircle2 />, color: 'emerald' },
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-6 rounded-[2rem] bg-white/5 border border-white/10 relative overflow-hidden group"
                    >
                        <div className={`absolute top-0 right-0 p-6 text-${stat.color}-500/10 group-hover:text-${stat.color}-500/20 transition-all`}>
                            {React.cloneElement(stat.icon, { size: 48 })}
                        </div>
                        <div className="relative z-10">
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                            <h3 className="text-3xl font-black">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Performance List */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        Member Activity <BarChart3 size={20} className="text-blue-400" />
                    </h2>

                    {insights.length > 0 ? (
                        <div className="space-y-4">
                            {insights.map((hire, idx) => (
                                <motion.div
                                    key={hire.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => setSelectedHire(hire)}
                                    className="p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 overflow-hidden border border-white/10">
                                            {hire.profilePic && <img src={hire.profilePic} alt={hire.candidateName} className="w-full h-full object-cover" />}
                                        </div>
                                        <div>
                                            <h4 className="font-black uppercase tracking-tight text-white group-hover:text-blue-400 transition-colors uppercase">{hire.candidateName}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{hire.jobTitle}</p>
                                        </div>
                                    </div>

                                    <div className="hidden md:flex items-center gap-8">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Productivity</span>
                                            <span className="text-lg font-black text-white">{hire.score}%</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Risk Status</span>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getRiskStyles(hire.risk)}`}>
                                                {hire.risk} Risk
                                            </span>
                                        </div>
                                        <ArrowUpRight size={20} className="text-gray-700 group-hover:text-blue-400 transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-[3rem] opacity-40">
                            <User size={48} className="mx-auto mb-4" />
                            <p className="text-lg font-black uppercase tracking-widest">No Active Hires Tracked</p>
                            <p className="text-xs mt-2 font-medium">Insights will appear here once you mark candidates as HIRED.</p>
                        </div>
                    )}
                </div>

                {/* Risk Feed / Alerts */}
                <div className="lg:col-span-4 space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        Risk Alerts <AlertTriangle size={20} className="text-red-400" />
                    </h2>

                    <div className="space-y-4">
                        {insights.filter(i => i.risk !== 'Low').map((hire, idx) => (
                            <motion.div
                                key={`alert-${hire.id}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`p-6 rounded-[2rem] border ${getRiskStyles(hire.risk)} relative overflow-hidden`}
                            >
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">System Warning</span>
                                    </div>
                                    <p className="text-sm font-bold text-white mb-2">{hire.candidateName}</p>
                                    <p className="text-[11px] leading-relaxed opacity-80 mb-4">{hire.analysis}</p>
                                    <button 
                                        onClick={() => setSelectedHire(hire)}
                                        className="text-[10px] font-black uppercase tracking-widest underline decoration-2 underline-offset-4 hover:opacity-70 transition-opacity"
                                    >
                                        Initiate Review
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                        
                        {insights.filter(i => i.risk !== 'Low').length === 0 && (
                            <div className="p-10 text-center bg-white/5 rounded-[2.5rem] border border-white/5 opacity-30">
                                <CheckCircle2 size={32} className="mx-auto mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest">All hires stable</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detail Report Modal */}
            <AnimatePresence>
                {selectedHire && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-2xl bg-[#13171e] rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden p-10"
                        >
                            <button
                                onClick={() => setSelectedHire(null)}
                                className="absolute top-8 right-8 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all"
                            >
                                <Users className="rotate-45" size={24} />
                            </button>

                            <div className="flex items-center gap-6 mb-10">
                                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-500 to-teal-400 p-1">
                                    <div className="w-full h-full rounded-[1.8rem] bg-[#1a1d24] overflow-hidden">
                                        {selectedHire.profilePic && <img src={selectedHire.profilePic} alt={selectedHire.candidateName} className="w-full h-full object-cover" />}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1 block">Monthly Performance Report</span>
                                    <h3 className="text-3xl font-black uppercase tracking-tight">{selectedHire.candidateName}</h3>
                                    <p className="text-gray-500 font-medium">{selectedHire.jobTitle} • Active since {selectedHire.month}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-10">
                                <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                                        <Github size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Commit Activity</span>
                                    </div>
                                    <p className="text-2xl font-black">{selectedHire.stats.commits}</p>
                                    <p className="text-[10px] text-emerald-400 mt-1 font-bold">↑ Healthy engagement</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                                        <Activity size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Daily Pace</span>
                                    </div>
                                    <p className="text-2xl font-black">{selectedHire.stats.avgDailyActivity}</p>
                                    <p className="text-[10px] text-gray-400 mt-1 font-bold">Actions / day</p>
                                </div>
                            </div>

                            <div className="p-8 rounded-[2rem] bg-blue-500/5 border border-blue-500/10 mb-10">
                                <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                                    System Summary <Sparkles size={14} />
                                </h4>
                                <p className="text-gray-300 leading-relaxed font-medium italic italic">
                                    "{selectedHire.analysis}"
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => window.print()}
                                    className="flex-1 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-blue-400 hover:text-white transition-all shadow-xl"
                                >
                                    Download PDF Report
                                </button>
                                <button
                                    className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                >
                                    <ExternalLink size={16} /> View Profile
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Internal replacement icon for 'X' button since I used Users rotate
const Users = (props) => (
    <svg 
        {...props} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
    >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const Sparkles = (props) => (
    <svg 
        {...props} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
    >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
    </svg>
);

export default PerformanceDashboard;
