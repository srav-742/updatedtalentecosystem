import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Briefcase, Loader2, ChevronDown, ChevronUp } from "lucide-react";

const AnalyticsPanel = () => {
    const [data, setData] = useState({ recruiters: [], candidates: [], stats: { totalRecruiters: 0, totalCandidates: 0 } });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("recruiters");
    const [expandedId, setExpandedId] = useState(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const headers = await getAuthHeaders();
            const res = await axios.get(`${API_URL}/admin/analytics`, { headers });
            setData(res.data);
        } catch (err) {
            console.error("[ADMIN] Failed to fetch analytics:", err);
            setError("Failed to load analytics data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const UserCard = ({ user, isRecruiter }) => {
        const isExpanded = expandedId === user._id;

        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-black/10 bg-white transition-all overflow-hidden"
            >
                <div className="p-5 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isRecruiter ? 'bg-purple-500/15 text-purple-600' : 'bg-blue-500/15 text-blue-600'}`}>
                                {isRecruiter ? 'Recruiter' : 'Candidate'}
                            </span>
                            {user.isPro && isRecruiter && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-black uppercase tracking-widest">
                                    Premium
                                </span>
                            )}
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                Joined {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <h3 className="text-gray-900 font-black text-lg leading-tight truncate mt-2">{user.name || "Unknown User"}</h3>
                        <p className="text-gray-500 text-xs font-medium mt-0.5">
                            {user.email}
                        </p>
                        {isRecruiter && user.company?.name && (
                            <p className="text-gray-600 text-[11px] mt-1">
                                Company: <span className="text-gray-800 font-semibold">{user.company.name}</span>
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setExpandedId(isExpanded ? null : user._id)}
                        className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 transition-all"
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4 bg-gray-50/50">
                                <div className="grid grid-cols-2 gap-4">
                                    {isRecruiter ? (
                                        <>
                                            <div>
                                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Designation</p>
                                                <p className="text-gray-800 text-sm">{user.designation || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Phone</p>
                                                <p className="text-gray-800 text-sm">{user.phone || "N/A"}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="col-span-2">
                                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Skills</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {user.skills && user.skills.length > 0 ? (
                                                        user.skills.map((s, idx) => (
                                                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 text-[11px] font-bold shadow-sm">
                                                                {s}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400 text-xs italic">No skills listed</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Phone</p>
                                                <p className="text-gray-800 text-sm">{user.phone || "N/A"}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 className="animate-spin mb-3" size={24} />
                <span className="font-bold text-sm uppercase tracking-widest">Loading Analytics...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-10 text-red-500 bg-red-50 rounded-2xl border border-red-100">
                <p className="font-bold">{error}</p>
            </div>
        );
    }

    const currentList = activeTab === "recruiters" ? data.recruiters : data.candidates;

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 flex items-center justify-between">
                    <div>
                        <p className="text-purple-600 text-[10px] font-black uppercase tracking-widest mb-1">Total Recruiters</p>
                        <p className="text-4xl font-black text-purple-700">{data.stats.totalRecruiters}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-600">
                        <Briefcase size={24} />
                    </div>
                </div>
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 flex items-center justify-between">
                    <div>
                        <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest mb-1">Total Candidates</p>
                        <p className="text-4xl font-black text-blue-700">{data.stats.totalCandidates}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-600">
                        <Users size={24} />
                    </div>
                </div>
            </div>

            {/* List Toggle */}
            <div className="flex p-1 bg-gray-100/50 rounded-2xl border border-gray-200/50 w-fit">
                <button
                    onClick={() => setActiveTab("recruiters")}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "recruiters" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    Recruiters
                </button>
                <button
                    onClick={() => setActiveTab("candidates")}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "candidates" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    Candidates
                </button>
            </div>

            {/* User List */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {currentList.length > 0 ? (
                        currentList.map(user => (
                            <UserCard key={user._id} user={user} isRecruiter={activeTab === "recruiters"} />
                        ))
                    ) : (
                        <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                            <Users className="mx-auto mb-3 opacity-20" size={40} />
                            <p className="font-bold text-sm">No {activeTab} found</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AnalyticsPanel;
