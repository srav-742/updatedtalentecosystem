import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Users, FileText, ChevronRight, Search, Loader2, Award, CheckCircle2, XCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../../firebase';

const statusStyles = {
    SHORTLISTED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    HIRED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    REJECTED: 'bg-red-500/15 text-red-400 border-red-500/30',
    ELIGIBLE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    APPLIED: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

const ScorePill = ({ value, color, max = 100 }) => (
    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border ${color} font-black text-sm`}>
        {value !== null && value !== undefined ? `${Math.round(value)}/${max}` : <span className="text-[10px] font-bold text-gray-600">N/A</span>}
    </div>
);

const TranscriptListPanel = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [candidates, setCandidates] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const headers = await getAuthHeaders();
                const res = await axios.get(`${API_URL}/jobs/admin/all`, { headers });
                const approved = (Array.isArray(res.data) ? res.data : []).filter(j => j.status === 'approved');
                setJobs(approved);
                if (approved.length > 0) setSelectedJobId(approved[0]._id);
            } catch (err) {
                console.error('[TRANSCRIPT-PANEL] Failed to load jobs:', err);
            } finally {
                setLoadingJobs(false);
            }
        };
        fetchJobs();
    }, []);

    useEffect(() => {
        if (!selectedJobId) return;
        const fetchCandidates = async () => {
            setLoadingCandidates(true);
            setCandidates([]);
            try {
                const headers = await getAuthHeaders();
                const res = await axios.get(`${API_URL}/transcripts/job/${selectedJobId}`, { headers });
                setCandidates(res.data?.candidates || []);
            } catch (err) {
                console.error('[TRANSCRIPT-PANEL] Failed to load candidates:', err);
            } finally {
                setLoadingCandidates(false);
            }
        };
        fetchCandidates();
    }, [selectedJobId]);

    const filtered = candidates.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

    const selectedJob = jobs.find(j => j._id === selectedJobId);

    return (
        <div className="space-y-6">
            {/* Job Selector */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Select Job Role</label>
                    {loadingJobs ? (
                        <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 size={16} className="animate-spin" /> Loading jobs...</div>
                    ) : (
                        <select
                            value={selectedJobId}
                            onChange={e => setSelectedJobId(e.target.value)}
                            className="w-full md:w-96 px-4 py-3 rounded-2xl bg-black/20 border border-white/10 text-white text-sm font-semibold outline-none focus:border-blue-500/50 transition-all"
                        >
                            {jobs.map(j => (
                                <option key={j._id} value={j._id}>{j.title} {j.company ? `— ${j.company}` : ''}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search candidates..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none text-sm font-medium w-56 transition-all"
                    />
                </div>
            </div>

            {/* Stats */}
            {selectedJob && !loadingCandidates && candidates.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total Candidates', value: candidates.length, color: 'text-blue-400' },
                        { label: 'Avg Final Score', value: (() => { const v = candidates.filter(c => c.finalScore).map(c => c.finalScore); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) + '%' : 'N/A'; })(), color: 'text-emerald-400' },
                        { label: 'Shortlisted', value: candidates.filter(c => c.status === 'SHORTLISTED').length, color: 'text-amber-400' },
                    ].map(s => (
                        <div key={s.label} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Candidates List */}
            <div className="space-y-3">
                {loadingCandidates ? (
                    <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="font-bold">Loading candidates...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 opacity-40">
                        <Users size={48} className="mx-auto mb-4" />
                        <p className="font-bold text-lg uppercase tracking-widest">{search ? 'No matches' : 'No Candidates Yet'}</p>
                    </div>
                ) : filtered.map((c, i) => (
                    <motion.div
                        key={c.applicationId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all group"
                    >
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center font-black text-lg text-blue-400 shrink-0">
                            {c.name?.[0]?.toUpperCase() || '?'}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-sm uppercase tracking-tight truncate">{c.name}</p>
                            <p className="text-gray-500 text-xs font-medium truncate">{c.email}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusStyles[c.status] || statusStyles.APPLIED}`}>
                                    {c.status}
                                </span>
                                {c.hasInterview && <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">Interview ✓</span>}
                                {c.hasAssessment && <span className="text-[9px] text-orange-400 font-bold uppercase tracking-widest">Assessment ✓</span>}
                            </div>
                        </div>

                        {/* Scores */}
                        <div className="hidden lg:flex items-center gap-2">
                            <ScorePill value={c.resumeScore} color="bg-blue-500/5 border-blue-500/20 text-blue-400" max={20} />
                            <ScorePill value={c.assessmentScore} color="bg-orange-500/5 border-orange-500/20 text-orange-400" max={30} />
                            <ScorePill value={c.interviewScore} color="bg-purple-500/5 border-purple-500/20 text-purple-400" max={50} />
                            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/15 font-black text-white text-sm">
                                {c.finalScore ? `${Math.round(c.finalScore)}/100` : <span className="text-[10px] font-bold text-gray-600">N/A</span>}
                            </div>
                        </div>
                        <div className="hidden lg:flex flex-col gap-1 text-[9px] text-gray-600 font-black uppercase tracking-widest w-10 text-center">
                            <span className="text-blue-400">RES</span>
                            <span className="text-orange-400">ASS</span>
                            <span className="text-purple-400">INT</span>
                            <span className="text-white/40">FIN</span>
                        </div>

                        {/* View Button */}
                        <button
                            onClick={() => navigate(`/admin/transcript/${c.applicationId}`)}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20 shrink-0 group-hover:shadow-blue-500/30"
                        >
                            <FileText size={14} />
                            Transcript
                            <ChevronRight size={14} />
                        </button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default TranscriptListPanel;
