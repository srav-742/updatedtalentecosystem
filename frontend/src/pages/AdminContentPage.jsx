import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, RefreshCw, Layers, Settings, Briefcase, CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { getAllContent, generateContent } from "../services/contentService";
import ContentList from "../components/ContentList";
import ContentDetail from "../components/ContentDetail";
import CommunitySettingsModal from "../components/CommunitySettingsModal";
import axios from "axios";
import { API_URL } from "../firebase";

// ─── Job Approval Panel ──────────────────────────────────────────────────────
const JobRequestsPanel = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedJobId, setExpandedJobId] = useState(null);
    const [rejectingJobId, setRejectingJobId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [actionLoading, setActionLoading] = useState(null);
    const [statusMsg, setStatusMsg] = useState("");

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/jobs/admin/all`);
            setJobs(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("[ADMIN] Failed to fetch jobs:", err);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchJobs(); }, []);

    const handleApprove = async (jobId) => {
        setActionLoading(jobId + "_approve");
        try {
            await axios.patch(`${API_URL}/jobs/${jobId}/approve`);
            setStatusMsg("✅ Job approved and now live!");
            await fetchJobs();
        } catch (err) {
            setStatusMsg("❌ Failed to approve job.");
        } finally {
            setActionLoading(null);
            setTimeout(() => setStatusMsg(""), 3000);
        }
    };

    const handleReject = async (jobId) => {
        if (!rejectReason.trim()) {
            setStatusMsg("❌ Please enter a rejection reason.");
            setTimeout(() => setStatusMsg(""), 3000);
            return;
        }
        setActionLoading(jobId + "_reject");
        try {
            await axios.patch(`${API_URL}/jobs/${jobId}/reject`, { reason: rejectReason });
            setStatusMsg("Job rejected with reason sent to recruiter.");
            setRejectingJobId(null);
            setRejectReason("");
            await fetchJobs();
        } catch (err) {
            setStatusMsg("❌ Failed to reject job.");
        } finally {
            setActionLoading(null);
            setTimeout(() => setStatusMsg(""), 3000);
        }
    };

    const pendingJobs = jobs.filter(j => j.status === 'pending_approval');
    const reviewedJobs = jobs.filter(j => j.status !== 'pending_approval');

    const StatusBadge = ({ status }) => {
        if (status === 'approved') return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                <CheckCircle size={10} /> Approved
            </span>
        );
        if (status === 'rejected') return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest">
                <XCircle size={10} /> Rejected
            </span>
        );
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                <Clock size={10} /> Pending Review
            </span>
        );
    };

    const JobCard = ({ job }) => {
        const isExpanded = expandedJobId === job._id;
        const isRejectingThis = rejectingJobId === job._id;

        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border transition-all ${job.status === 'pending_approval'
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : job.status === 'approved'
                        ? 'border-emerald-500/10 bg-emerald-500/5'
                        : 'border-red-500/10 bg-red-500/5'}`}
            >
                {/* Header */}
                <div className="p-5 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <StatusBadge status={job.status} />
                            <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                                {new Date(job.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <h3 className="text-white font-black text-lg leading-tight truncate">{job.title}</h3>
                        <p className="text-gray-500 text-xs font-medium mt-0.5">
                            {job.company || "—"} · {job.location || "—"} · {job.type || "—"}
                        </p>
                        {job.recruiter && (
                            <p className="text-gray-600 text-[11px] mt-1">
                                Posted by: <span className="text-gray-400 font-semibold">{job.recruiter.name || job.recruiterId}</span>
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setExpandedJobId(isExpanded ? null : job._id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 transition-all"
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                                {/* Job Description */}
                                {job.description && (
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Description</p>
                                        <p className="text-gray-300 text-sm leading-relaxed max-h-32 overflow-y-auto">{job.description}</p>
                                    </div>
                                )}

                                {/* Skills */}
                                {job.skills?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Required Skills</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {job.skills.map(s => (
                                                <span key={s} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-[11px] font-bold">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Configuration Summary */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Experience</p>
                                        <p className="text-white text-xs font-bold">{job.experienceLevel || "Any"}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Resume Match</p>
                                        <p className="text-emerald-400 text-xs font-bold">{job.minPercentage || 60}%</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Assessment</p>
                                        <p className={`text-xs font-bold ${job.assessment?.enabled ? 'text-orange-400' : 'text-gray-600'}`}>
                                            {job.assessment?.enabled ? `${job.assessment.totalQuestions || 10} Qs` : 'Off'}
                                        </p>
                                    </div>
                                </div>

                                {/* Special Instructions */}
                                {job.specialInstructions && (
                                    <div>
                                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2">Special AI Instructions</p>
                                        <p className="text-blue-300/70 text-xs leading-relaxed bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">{job.specialInstructions}</p>
                                    </div>
                                )}

                                {/* Existing rejection reason (if already rejected) */}
                                {job.status === 'rejected' && job.adminFeedback?.reason && (
                                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-0.5">Rejection Reason</p>
                                            <p className="text-red-300/80 text-xs">{job.adminFeedback.reason}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons — only for pending jobs */}
                                {job.status === 'pending_approval' && (
                                    <div className="pt-2 space-y-3">
                                        {!isRejectingThis ? (
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleApprove(job._id)}
                                                    disabled={!!actionLoading}
                                                    className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {actionLoading === job._id + "_approve" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                    Approve & Publish
                                                </button>
                                                <button
                                                    onClick={() => setRejectingJobId(job._id)}
                                                    disabled={!!actionLoading}
                                                    className="flex-1 py-3 rounded-2xl bg-red-600/80 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                                                <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Enter rejection reason (required):</p>
                                                <textarea
                                                    value={rejectReason}
                                                    onChange={(e) => setRejectReason(e.target.value)}
                                                    placeholder="e.g. Job description is too vague. Please add more details about the role and responsibilities..."
                                                    rows={3}
                                                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-red-500/30 focus:border-red-500/60 outline-none text-gray-300 text-sm resize-none transition-all"
                                                />
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleReject(job._id)}
                                                        disabled={!!actionLoading}
                                                        className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                    >
                                                        {actionLoading === job._id + "_reject" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                                        Confirm Rejection
                                                    </button>
                                                    <button
                                                        onClick={() => { setRejectingJobId(null); setRejectReason(""); }}
                                                        className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white text-xs font-bold transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Status Message */}
            <AnimatePresence>
                {statusMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-300 text-sm font-bold"
                    >
                        {statusMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Pending Review", count: pendingJobs.length, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                    { label: "Approved & Live", count: jobs.filter(j => j.status === 'approved').length, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                    { label: "Rejected", count: jobs.filter(j => j.status === 'rejected').length, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
                ].map(stat => (
                    <div key={stat.label} className={`p-4 rounded-2xl border ${stat.bg} text-center`}>
                        <p className={`text-3xl font-black ${stat.color}`}>{stat.count}</p>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-500">
                    <Loader2 className="animate-spin mr-3" size={20} />
                    <span className="font-bold">Loading job requests...</span>
                </div>
            ) : (
                <>
                    {/* Pending Jobs */}
                    {pendingJobs.length > 0 && (
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                                <Clock size={12} /> Awaiting Review ({pendingJobs.length})
                            </h3>
                            <div className="space-y-3">
                                {pendingJobs.map(job => <JobCard key={job._id} job={job} />)}
                            </div>
                        </div>
                    )}

                    {/* Reviewed Jobs */}
                    {reviewedJobs.length > 0 && (
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                                <CheckCircle size={12} /> Previously Reviewed ({reviewedJobs.length})
                            </h3>
                            <div className="space-y-3">
                                {reviewedJobs.map(job => <JobCard key={job._id} job={job} />)}
                            </div>
                        </div>
                    )}

                    {jobs.length === 0 && (
                        <div className="text-center py-20 text-gray-600">
                            <Briefcase className="mx-auto mb-4 opacity-30" size={48} />
                            <p className="font-bold text-lg">No job posting requests yet</p>
                            <p className="text-sm mt-1">When recruiters submit jobs, they'll appear here for review.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

const AdminContentPage = () => {
    const [activeTab, setActiveTab] = useState("content"); // "content" | "jobs"
    const [content, setContent] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");
    const [showCommunitySettings, setShowCommunitySettings] = useState(false);

    const fetchContent = async () => {
        try {
            const data = await getAllContent();
            if (Array.isArray(data)) {
                setContent(data);
            } else {
                console.error("Fetched data is not an array:", data);
                setContent([]);
            }
        } catch (error) {
            console.error("Failed to fetch content from backend:", error);
            setContent([]);
        }
    };

    useEffect(() => {
        fetchContent();
    }, []);

    const handleGenerate = async () => {
        setLoading(true);
        setStatusMsg("Scanning news & Hacker News...");
        try {
            await generateContent();
            await fetchContent();
        } catch (err) {
            console.error("Generation failed:", err);
        } finally {
            setLoading(false);
            setStatusMsg("");
        }
    };

    return (
        <div className="min-h-screen bg-[#0c0f16] text-white font-sans overflow-x-hidden">
            <main className="container mx-auto px-6 pt-16 pb-20">
                {/* ── Header ─────────────────────────────────────────────── */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <Layers size={18} />
                            </div>
                            <span className="text-blue-400 font-bold uppercase tracking-widest text-[10px]">Admin Dashboard</span>
                        </div>
                        <h1 className="text-4xl font-black uppercase tracking-tight">
                            {activeTab === "content"
                                ? <>Content <span className="text-teal-400">Dashboard</span></>
                                : <>Job <span className="text-amber-400">Approvals</span></>
                            }
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">
                            {activeTab === "content"
                                ? "Manage AI-generated viral content for multi-channel growth."
                                : "Review, approve, or reject recruiter job posting requests."
                            }
                        </p>
                    </div>

                    {activeTab === "content" && (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowCommunitySettings(true)}
                                className="p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-teal-400 hover:border-teal-500/30 transition-all shadow-xl"
                                title="Community Settings"
                            >
                                <Settings size={20} />
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="group relative overflow-hidden px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-500 font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-500/20"
                            >
                                <div className="flex items-center gap-2 relative z-10">
                                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                                    {loading ? (statusMsg || "Processing...") : "Generate Daily Batch"}
                                </div>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </button>
                        </div>
                    )}
                </header>

                {/* ── Tab Navigation ──────────────────────────────────────── */}
                <div className="flex items-center gap-3 mb-10 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab("content")}
                        className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === "content"
                            ? "bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-lg"
                            : "text-gray-500 hover:text-gray-300"}`}
                    >
                        <Layers size={14} />
                        News & LinkedIn Posts
                    </button>
                    <button
                        onClick={() => setActiveTab("jobs")}
                        className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === "jobs"
                            ? "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-lg"
                            : "text-gray-500 hover:text-gray-300"}`}
                    >
                        <Briefcase size={14} />
                        Job Posting Requests
                    </button>
                </div>

                {/* ── Tab Content ─────────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {activeTab === "content" ? (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                <div className="lg:col-span-5">
                                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl h-[700px] overflow-hidden flex flex-col">
                                        <div className="flex items-center justify-between mb-6 px-4">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Content Feed</h3>
                                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-500">
                                                {content.length} Items
                                            </span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                            <ContentList content={content} onSelect={setSelected} selectedId={selected?._id} />
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-7">
                                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl min-h-[700px] flex flex-col relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                                        <ContentDetail selected={selected} refresh={fetchContent} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="jobs"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="max-w-3xl mx-auto">
                                <JobRequestsPanel />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {showCommunitySettings && <CommunitySettingsModal onClose={() => setShowCommunitySettings(false)} />}
        </div>
    );
};

export default AdminContentPage;
