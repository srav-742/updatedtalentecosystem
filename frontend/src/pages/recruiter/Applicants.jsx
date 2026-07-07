import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Filter, MoreVertical, CheckCircle2, Eye, Video, Github, Linkedin, Sparkles, XCircle, UploadCloud, Wallet, Plus } from 'lucide-react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../../firebase';
import { ApplicantsSkeleton } from '../../components/Skeleton';
import AssessmentDetail from './AssessmentDetail';
import InterviewDetail from './InterviewDetail';
import GeneratedResumeModal from './GeneratedResumeModal';
import TeamFitBadge from '../../components/TeamFitBadge';
import BulkUploadModal from '../../components/BulkUploadModal';
import TopUpModal from '../../components/TopUpModal';

const Applicants = () => {
    const navigate = useNavigate();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [isPro, setIsPro] = useState(() => {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return u.hiringPattern === "Premium Recruiter" || u.isPro === true;
    });
    const [walletBalance, setWalletBalance] = useState(user.walletBalance || 0);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [unlockingItem, setUnlockingItem] = useState(null); // { id, type, cost }
    const [unlockingInProgress, setUnlockingInProgress] = useState(false);
    const [unlockError, setUnlockError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const targetJobId = searchParams.get('jobId');

    // Filter & Sorting State
    const [showFilters, setShowFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterVideo, setFilterVideo] = useState('All');
    const [minResumeScore, setMinResumeScore] = useState(0);
    const [minAssessmentScore, setMinAssessmentScore] = useState(0);
    const [sortBy, setSortBy] = useState('none');
    const [sortOrder, setSortOrder] = useState('desc');

    // Menu State
    const [activeMenuId, setActiveMenuId] = useState(null);

    // Assessment Detail Modal
    const [showAssessmentDetail, setShowAssessmentDetail] = useState(false);
    const [selectedApplicationId, setSelectedApplicationId] = useState(null);

    // Interview Detail Modal
    const [showInterviewDetail, setShowInterviewDetail] = useState(false);
    const [selectedInterviewApplicationId, setSelectedInterviewApplicationId] = useState(null);

    // Video Intro Modal
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);

    // Generated Resume Modal
    const [showGeneratedResumeModal, setShowGeneratedResumeModal] = useState(false);
    const [selectedResumeUserId, setSelectedResumeUserId] = useState(null);

    // Proctoring Violations Popover State
    const [expandedProctoringAppId, setExpandedProctoringAppId] = useState(null);

    // Bulk Resume Upload Modal
    const [uploadModalOpen, setUploadModalOpen] = useState(false);


    const fetchWalletBalance = async () => {
        const userId = user.uid || user._id || user.id;
        if (!userId) return;
        try {
            const res = await axios.get(`${API_URL}/wallet/balance/${userId}`);
            if (res.data && res.data.success) {
                setWalletBalance(res.data.balance);
            }
        } catch (err) {
            console.error("Failed to fetch wallet balance:", err);
        }
    };

    const handleUnlockApplicant = async (applicationId, itemType) => {
        setUnlockError('');
        setUnlockingInProgress(true);
        try {
            const recruiterId = user.uid || user._id || user.id;
            const res = await axios.post(`${API_URL}/wallet/unlock`, {
                recruiterId,
                applicationId,
                itemType
            });

            if (res.data && res.data.success) {
                setWalletBalance(res.data.balance);
                window.dispatchEvent(new Event('wallet-update'));
                setUnlockingItem(null);
                fetchApplicants();
            }
        } catch (err) {
            console.error("Unlock applicant error:", err);
            const msg = err.response?.data?.message || "Failed to unlock applicant.";
            setUnlockError(msg);
        } finally {
            setUnlockingInProgress(false);
        }
    };

    const fetchApplicants = async () => {
        setLoading(true);
        try {
            const userId = user.uid || user._id || user.id;
            
            // Fetch fresh recruiter profile to check isPro status
            try {
                const profileRes = await axios.get(`${API_URL}/profile/${userId}`);
                if (profileRes.data) {
                    const isPremium = profileRes.data.hiringPattern === "Premium Recruiter" || profileRes.data.isPro === true;
                    setIsPro(isPremium);
                    const updatedUser = { ...user, ...profileRes.data, isPro: isPremium, role: user.role };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }
            } catch (err) {
                console.error("Failed to fetch fresh recruiter profile:", err);
            }

            const res = await axios.get(`${API_URL}/applications/recruiter/${userId}`);
            let mapped = res.data.map((app, index) => ({
                id: app._id,
                userId: app.userId,
                isLocked: app.isLocked,
                isResumeLocked: app.isResumeLocked,
                isAssessmentLocked: app.isAssessmentLocked,
                isInterviewLocked: app.isInterviewLocked,
                jobId: app.jobId?._id?.toString() || app.jobId?.toString(),
                name: app.applicantName || app.user?.name || `Candidate ${index + 1}`,
                email: app.applicantEmail || 'No Email',
                job: app.jobId?.title || 'Unknown Job',
                resumeScore: app.resumeMatchPercent,
                assessmentScore: app.assessmentScore,
                interviewScore: app.interviewScore,
                ownershipScore: app.metrics?.ownershipMindset || 0, // ─── OWNERSHIP V VETTING SCORE
                githubUrl: app.user?.githubUrl, // ─── SOCIAL INTEGRATIONS
                linkedinUrl: app.user?.linkedinUrl,
                resumeUrl: app.user?.resumeUrl,
                finalScore: app.finalScore,
                proctoringScore: app.proctoringScore || 0,
                proctoringFlags: app.proctoringFlags || [],
                status: app.status,
                teamFit: app.teamFit,
                videoIntroUrl: app.videoIntroUrl,
                resultsVisibleAt: app.resultsVisibleAt,
                interviewAnswerCount: app.interviewAnswers?.length || 0,
                recordingStatus: app.recordingStatus || 'pending'
            }));

            if (targetJobId) {
                mapped = mapped.filter(app => String(app.jobId) === String(targetJobId));
            }
            setApplicants(mapped);
        } catch (error) {
            console.error("Failed to fetch applicants:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser.role !== 'recruiter' && storedUser.role !== 'admin') {
            navigate('/login');
            return;
        }
        fetchApplicants();
        fetchWalletBalance();

        const handleWalletUpdate = () => {
            fetchWalletBalance();
        };
        window.addEventListener('wallet-update', handleWalletUpdate);
        return () => {
            window.removeEventListener('wallet-update', handleWalletUpdate);
        };
    }, [targetJobId]);

    // Handle Filters and Sorting
    const filteredApplicants = applicants
        .filter(app => {
            // 1. Text Search Filter
            const term = searchTerm.toLowerCase();
            const matchesSearch = !term ||
                app.name.toLowerCase().includes(term) ||
                app.job.toLowerCase().includes(term) ||
                app.email.toLowerCase().includes(term);

            // 2. Status Filter
            const matchesStatus = filterStatus === 'All' || app.status === filterStatus;

            // 3. Video Intro Filter
            const matchesVideo = filterVideo === 'All' ||
                (filterVideo === 'Yes' && app.videoIntroUrl) ||
                (filterVideo === 'No' && !app.videoIntroUrl);

            // 5. Resume Score Filter
            const matchesResume = app.resumeScore >= minResumeScore;

            // 6. Assessment Score Filter
            const matchesAssessment = minAssessmentScore === 0 ||
                (app.assessmentScore !== null && app.assessmentScore !== undefined && app.assessmentScore >= minAssessmentScore);

            return matchesSearch && matchesStatus && matchesVideo && matchesResume && matchesAssessment;
        })
        .sort((a, b) => {
            if (sortBy === 'none') return 0;
            
            let valA = a[sortBy];
            let valB = b[sortBy];
            
            if (valA === null || valA === undefined) valA = -1;
            if (valB === null || valB === undefined) valB = -1;
            
            return sortOrder === 'desc' ? valB - valA : valA - valB;
        });

    // Group filtered applicants by job title
    const groupedApplicants = filteredApplicants.reduce((acc, app) => {
        const jobTitle = app.job || 'Unknown Job';
        if (!acc[jobTitle]) {
            acc[jobTitle] = [];
        }
        acc[jobTitle].push(app);
        return acc;
    }, {});

    // Handle Status Update
    const handleStatusUpdate = async (id, newStatus) => {
        try {
            setActiveMenuId(null);
            // Optimistic update
            setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));

            await axios.put(`${API_URL}/applications/${id}/status`, { status: newStatus });
        } catch (error) {
            console.error("Failed to update status:", error);
            // Revert on error (could fetch again, but alert for now)
            alert("Failed to update status. Please try again.");
        }
    };

    // Handle View Assessment
    const handleViewAssessment = (applicationId, isAssessmentLocked) => {
        if (isAssessmentLocked) {
            setUnlockingItem({ id: applicationId, type: 'assessment', cost: 5 });
            return;
        }
        setSelectedApplicationId(applicationId);
        setShowAssessmentDetail(true);
    };

    // Handle View Interview
    const handleViewInterview = (applicationId, isInterviewLocked) => {
        if (isInterviewLocked) {
            setUnlockingItem({ id: applicationId, type: 'interview', cost: 10 });
            return;
        }
        setSelectedInterviewApplicationId(applicationId);
        setShowInterviewDetail(true);
    };

    const getInterviewMeta = (app) => {
        if (app.interviewScore !== null && app.interviewScore !== undefined) {
            return {
                label: `${app.interviewScore}/70`,
                statusText: 'Completed',
                canView: true,
                pillClass: 'bg-purple-500/5 border-purple-500/10 text-purple-400'
            };
        }

        if (app.recordingStatus === 'uploaded') {
            return {
                label: 'Sync',
                statusText: 'Recording Saved',
                canView: true,
                pillClass: 'bg-amber-500/5 border-amber-500/10 text-amber-400'
            };
        }

        if (app.recordingStatus === 'recording') {
            return {
                label: 'Live',
                statusText: 'In Progress',
                canView: true,
                pillClass: 'bg-amber-500/5 border-amber-500/10 text-amber-400'
            };
        }

        if (app.recordingStatus === 'upload_failed') {
            return {
                label: 'Hold',
                statusText: 'Needs Retry',
                canView: true,
                pillClass: 'bg-red-500/5 border-red-500/10 text-red-400'
            };
        }

        return {
            label: '-',
            statusText: 'Not Started',
            canView: false,
            pillClass: 'bg-purple-500/5 border-purple-500/10 text-purple-400'
        };
    };

    return (
        <div className="space-y-8 min-h-[80vh]" onClick={() => setActiveMenuId(null)}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Applicants</h1>
                    <p className="text-gray-400">Review and shortlist candidates based on skill match scores.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search applicants..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all w-64 text-sm font-medium"
                        />
                    </div>
                    {targetJobId && (
                        <button
                            onClick={() => setUploadModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                            <UploadCloud size={16} />
                            Bulk Upload
                        </button>
                    )}
                    {/* Wallet balance display pill */}
                    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-lg shadow-black/5">
                        <Wallet size={16} className="text-blue-400" />
                        <div className="text-xs font-semibold text-gray-300">
                            Wallet: <span className="text-white font-extrabold">₹{walletBalance.toFixed(2)}</span>
                        </div>
                        <button 
                            onClick={() => setIsTopUpOpen(true)}
                            className="ml-1.5 p-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/20 cursor-pointer"
                            title="Top Up Wallet"
                        >
                            <Plus size={12} />
                        </button>
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm border transition-all ${
                            showFilters
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                    >
                        <Filter size={16} />
                        Filters
                    </button>
                </div>
            </div>

            {/* Expandable Filter Panel */}
            {showFilters && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="p-6 rounded-[2rem] bg-white/5 border border-white/10 shadow-xl overflow-hidden"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 1. Status Dropdown */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Application Status</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-[#1e222b] border border-white/10 focus:border-blue-500/50 outline-none text-sm text-white font-medium cursor-pointer"
                            >
                                <option value="All" className="bg-[#1a1d24] text-white">All Statuses</option>
                                <option value="ELIGIBLE" className="bg-[#1a1d24] text-white">Eligible</option>
                                <option value="SHORTLISTED" className="bg-[#1a1d24] text-white">Shortlisted</option>
                                <option value="HIRED" className="bg-[#1a1d24] text-white">Hired</option>
                                <option value="REJECTED" className="bg-[#1a1d24] text-white">Rejected</option>
                            </select>
                        </div>

                        {/* 2. Video Intro Dropdown */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Video Introduction</label>
                            <select
                                value={filterVideo}
                                onChange={(e) => setFilterVideo(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-[#1e222b] border border-white/10 focus:border-blue-500/50 outline-none text-sm text-white font-medium cursor-pointer"
                            >
                                <option value="All" className="bg-[#1a1d24] text-white">All Candidates</option>
                                <option value="Yes" className="bg-[#1a1d24] text-white">Has Video Introduction</option>
                                <option value="No" className="bg-[#1a1d24] text-white">No Video Introduction</option>
                            </select>
                        </div>

                        {/* 3. Sorting Options */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sort Candidates</label>
                            <div className="flex gap-2">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-[#1e222b] border border-white/10 focus:border-blue-500/50 outline-none text-sm text-white font-medium cursor-pointer"
                                >
                                    <option value="none" className="bg-[#1a1d24] text-white">None (Standard)</option>
                                    <option value="resumeScore" className="bg-[#1a1d24] text-white">Resume Score</option>
                                    <option value="assessmentScore" className="bg-[#1a1d24] text-white">Assessment Score</option>
                                    <option value="interviewScore" className="bg-[#1a1d24] text-white">Interview Score</option>
                                    <option value="proctoringScore" className="bg-[#1a1d24] text-white">Integrity Penalty Score</option>
                                    <option value="finalScore" className="bg-[#1a1d24] text-white">Final Score</option>
                                </select>
                                {sortBy !== 'none' && (
                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                        className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-bold text-gray-300 transition-colors"
                                        title={sortOrder === 'desc' ? 'Sorting Descending' : 'Sorting Ascending'}
                                    >
                                        {sortOrder === 'desc' ? '↓' : '↑'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 pt-6 border-t border-white/10 items-end">
                        {/* Minimum Resume Score Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Min Resume Score</label>
                                <span className="text-xs font-bold text-blue-400">{minResumeScore}/10</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={minResumeScore}
                                onChange={(e) => setMinResumeScore(Number(e.target.value))}
                                className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                            />
                        </div>

                        {/* Minimum Assessment Score Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Min Assessment Score</label>
                                <span className="text-xs font-bold text-orange-400">{minAssessmentScore}/20</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="20"
                                value={minAssessmentScore}
                                onChange={(e) => setMinAssessmentScore(Number(e.target.value))}
                                className="w-full accent-orange-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                            />
                        </div>

                        {/* Reset Filters & Count */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                                Found: <span className="text-white font-black">{filteredApplicants.length}</span> candidates
                            </div>
                            <button
                                onClick={() => {
                                    setFilterStatus('All');
                                    setFilterVideo('All');
                                    setMinResumeScore(0);
                                    setMinAssessmentScore(0);
                                    setSortBy('none');
                                    setSortOrder('desc');
                                    setSearchTerm('');
                                }}
                                className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {loading ? (
                <ApplicantsSkeleton />
            ) : filteredApplicants.length > 0 ? (
                Object.entries(groupedApplicants).map(([jobTitle, jobApplicants]) => (
                    <div key={jobTitle} className="space-y-4 mb-10">
                        <h2 className="text-xl font-bold uppercase tracking-tight text-white flex items-center gap-3">
                            <span className="w-2.5 h-6 bg-gradient-to-b from-blue-500 to-teal-500 rounded-full animate-pulse" />
                            {jobTitle}
                            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 px-3 py-1 rounded-xl border border-blue-500/20">
                                {jobApplicants.length} {jobApplicants.length === 1 ? 'Candidate' : 'Candidates'}
                            </span>
                        </h2>
                        
                        <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.01] pointer-events-none">
                                <Users size={150} />
                            </div>
                            <table className="w-full text-left relative z-10" style={{ tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: '5%' }} />
                                    <col style={{ width: '20%' }} />
                                    <col style={{ width: '8%' }} />
                                    <col style={{ width: '11%' }} />
                                    <col style={{ width: '11%' }} />
                                    <col style={{ width: '11%' }} />
                                    <col style={{ width: '11%' }} />
                                    <col style={{ width: '11%' }} />
                                    <col style={{ width: '7%' }} />
                                    <col style={{ width: '5%' }} />
                                </colgroup>
                                <thead>
                                    <tr className="border-b border-white/10 text-gray-500 text-[10px] uppercase font-bold tracking-wider bg-white/[0.01]">
                                        <th className="pb-4 pt-4 text-center">S.No</th>
                                        <th className="pb-4 pt-4 pl-4 text-left">Candidate Info</th>
                                        <th className="pb-4 pt-4 text-center">Video Intro</th>
                                        <th className="pb-4 pt-4 text-center">Resume Match</th>
                                        <th className="pb-4 pt-4 text-center">Assessment</th>
                                        <th className="pb-4 pt-4 text-center">Interview</th>
                                        <th className="pb-4 pt-4 text-center text-red-400">Proctoring Score</th>
                                        <th className="pb-4 pt-4 text-center">Final Score</th>
                                        <th className="pb-4 pt-4 text-center">Status</th>
                                        <th className="pb-4 pt-4 text-right pr-6">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {jobApplicants.map((app, index) => {
                                        const interviewMeta = getInterviewMeta(app);
                                        return (
                                            <tr key={app.id} className="group transition-all hover:bg-white/[0.03] border-b border-white/5 last:border-b-0" style={{ verticalAlign: 'middle' }}>
                                                <td className="py-5 text-center text-xs font-semibold text-gray-500">
                                                    {index + 1}
                                                </td>
                                                <td className="py-5 pl-4" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{app.name}</p>
                                                            {app.isResumeLocked && (
                                                                <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                                                                    Locked
                                                                </span>
                                                            )}
                                                            {/* ─── SOCIAL INTEGRATIONS ─── */}
                                                            {!app.isResumeLocked && app.githubUrl && (
                                                                <a href={app.githubUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-400 hover:text-teal-400 transition-colors" title="GitHub Profile">
                                                                    <Github size={14} />
                                                                </a>
                                                            )}
                                                            {!app.isResumeLocked && app.linkedinUrl && (
                                                                <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-400 hover:text-blue-400 transition-colors" title="LinkedIn Profile">
                                                                    <Linkedin size={14} />
                                                                </a>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-medium lowercase tracking-normal">{app.email}</p>
                                                    </div>
                                                </td>
                                                <td className="py-5 text-center" style={{ whiteSpace: 'nowrap' }}>
                                                    <div className="flex items-center justify-center">
                                                        {app.isInterviewLocked ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setUnlockingItem({ id: app.id, type: 'interview', cost: 10 });
                                                                }}
                                                                className="w-10 h-10 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer animate-pulse"
                                                                title="Unlock Candidate to Watch Video (₹10)"
                                                            >
                                                                <Video size={16} />
                                                            </button>
                                                        ) : app.videoIntroUrl ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedVideoUrl(app.videoIntroUrl);
                                                                    setShowVideoModal(true);
                                                                }}
                                                                className="w-10 h-10 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/5 group/video"
                                                                title="Watch Candidate Introduction"
                                                            >
                                                                <Video size={16} className="group-hover/video:scale-110 transition-transform" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-600 text-[10px] font-semibold uppercase tracking-widest bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">N/A</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-5 text-center" style={{ whiteSpace: 'nowrap' }}>
                                                     <div className="flex items-center justify-center">
                                                         <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-400 font-extrabold text-base shadow-sm">
                                                             <span>{app.resumeScore}/10</span>
                                                             {app.isResumeLocked ? (
                                                                 <button
                                                                     onClick={(e) => {
                                                                         e.stopPropagation();
                                                                         setUnlockingItem({ id: app.id, type: 'resume', cost: 3 });
                                                                     }}
                                                                     className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 p-0.5 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                                                     title="Unlock Candidate Resume (₹3)"
                                                                 >
                                                                     <Eye size={15} />
                                                                 </button>
                                                             ) : (
                                                                 <button
                                                                     onClick={(e) => {
                                                                         e.stopPropagation();
                                                                         setSelectedResumeUserId(app.userId);
                                                                         setShowGeneratedResumeModal(true);
                                                                     }}
                                                                     className="text-blue-400/80 hover:text-blue-300 hover:bg-blue-500/10 p-0.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                                                                     title="View AI Parsed Resume"
                                                                 >
                                                                     <Eye size={15} />
                                                                 </button>
                                                             )}
                                                         </div>
                                                     </div>
                                                 </td>
                                                <td className="py-5 text-center" style={{ whiteSpace: 'nowrap' }}>
                                                     <div className="flex items-center justify-center">
                                                         <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-400 font-extrabold text-base shadow-sm">
                                                             <span>{app.assessmentScore !== null && app.assessmentScore !== undefined ? `${app.assessmentScore}/20` : '-'}</span>
                                                             {app.assessmentScore !== null && app.assessmentScore !== undefined && (
                                                                 <button
                                                                     onClick={(e) => {
                                                                         e.stopPropagation();
                                                                         handleViewAssessment(app.id, app.isAssessmentLocked);
                                                                     }}
                                                                     className={`p-0.5 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${app.isAssessmentLocked ? 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10' : 'text-orange-400/80 hover:text-orange-300 hover:bg-orange-500/10'}`}
                                                                     title={app.isAssessmentLocked ? "Unlock Assessment Details (₹5)" : "View Assessment Details"}
                                                                 >
                                                                     <Eye size={15} />
                                                                 </button>
                                                             )}
                                                         </div>
                                                     </div>
                                                 </td>
                                                <td className="py-5 text-center" style={{ whiteSpace: 'nowrap' }}>
                                                     <div className="flex items-center justify-center">
                                                         <div className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border ${interviewMeta.pillClass} shadow-sm`}>
                                                             <span>{interviewMeta.label}</span>
                                                             {interviewMeta.canView && (
                                                                 <button
                                                                     onClick={(e) => {
                                                                         e.stopPropagation();
                                                                         handleViewInterview(app.id, app.isInterviewLocked);
                                                                     }}
                                                                     className={`p-0.5 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${app.isInterviewLocked ? 'text-amber-500 hover:bg-amber-500/10' : 'opacity-80 hover:opacity-100 hover:bg-white/5'}`}
                                                                     title={app.isInterviewLocked ? "Unlock Interview Status (₹10)" : "View Interview Status"}
                                                                 >
                                                                     <Eye size={15} />
                                                                 </button>
                                                             )}
                                                         </div>
                                                     </div>
                                                 </td>
                                                <td className="py-5 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-1.5 relative">
                                                        <div 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedProctoringAppId(expandedProctoringAppId === app.id ? null : app.id);
                                                            }}
                                                            className={`inline-flex items-center justify-center px-4 py-2 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 font-extrabold text-base shadow-sm cursor-pointer hover:bg-red-500/10 transition-all ${app.proctoringScore > 0 ? 'animate-pulse' : ''}`} 
                                                            title="Click to view violations"
                                                        >
                                                            <span>{app.proctoringScore}</span>
                                                        </div>
                                                        {expandedProctoringAppId === app.id && app.proctoringFlags && app.proctoringFlags.length > 0 && (
                                                            <div className="absolute top-full mt-2 w-48 bg-[#1a1d24] border border-white/10 p-3 rounded-xl shadow-2xl z-50 flex flex-col gap-1.5 items-center justify-center" onClick={e => e.stopPropagation()}>
                                                                <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest border-b border-white/5 pb-1 w-full text-center">Violations</p>
                                                                <div className="flex flex-wrap gap-1 justify-center mt-1 w-full max-h-[150px] overflow-y-auto pr-1">
                                                                    {app.proctoringFlags.map((flag) => {
                                                                        const displayFlag = flag.replace(/_/g, ' ');
                                                                        return (
                                                                            <span 
                                                                                key={flag} 
                                                                                className="px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20"
                                                                                title={displayFlag}
                                                                                style={{ whiteSpace: 'nowrap' }}
                                                                            >
                                                                                {displayFlag}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-5 text-center" style={{ whiteSpace: 'nowrap' }}>
                                                    <div className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600/10 to-teal-600/10 border border-teal-500/20 text-teal-300 font-extrabold text-sm shadow-md shadow-teal-500/5">
                                                        {app.finalScore !== null && app.finalScore !== undefined ? `${app.finalScore}/100` : '-'}
                                                    </div>
                                                </td>
                                                <td className="py-5 text-center" style={{ whiteSpace: 'nowrap' }}>
                                                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${app.status === 'SHORTLISTED'
                                                        ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5'
                                                        : app.status === 'REJECTED'
                                                            ? 'bg-red-500/5 text-red-400 border-red-500/20 shadow-sm shadow-red-500/5'
                                                            : app.status === 'HIRED'
                                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-sm shadow-blue-500/5'
                                                                : 'bg-gray-500/5 text-gray-400 border-gray-500/20'
                                                        }`}>
                                                        {app.status}
                                                    </span>
                                                </td>
                                                <td className="py-5 text-right pr-6 relative" style={{ whiteSpace: 'nowrap' }}>
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMenuId(activeMenuId === app.id ? null : app.id);
                                                            }}
                                                            className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 ${activeMenuId === app.id ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                        {activeMenuId === app.id && (
                                                            <div className="absolute right-0 mt-2 w-48 bg-[#1a1d24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                                                                <div className="py-1">
                                                                    <button
                                                                        onClick={() => handleStatusUpdate(app.id, 'SHORTLISTED')}
                                                                        className="w-full text-left px-4 py-3 text-xs font-bold text-emerald-400 hover:bg-white/5 flex items-center gap-2"
                                                                    >
                                                                        <CheckCircle2 size={14} /> Mark Shortlisted
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusUpdate(app.id, 'REJECTED')}
                                                                        className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:bg-white/5 flex items-center gap-2"
                                                                    >
                                                                        <CheckCircle2 size={14} className="rotate-45" /> Mark Rejected
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusUpdate(app.id, 'HIRED')}
                                                                        className="w-full text-left px-4 py-3 text-xs font-bold text-blue-400 hover:bg-white/5 flex items-center gap-2 border-t border-white/5"
                                                                    >
                                                                        <Sparkles size={14} /> Mark Hired (AI Learn)
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusUpdate(app.id, 'ELIGIBLE')}
                                                                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-400 hover:bg-white/5 flex items-center gap-2 border-t border-white/5"
                                                                    >
                                                                        <Filter size={14} /> Reset Status
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            ) : (
                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl overflow-hidden relative">
                    <div className="min-h-[400px] flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center opacity-40">
                            <Users size={48} className="mb-4" />
                            <p className="text-xl font-bold uppercase tracking-widest">{searchTerm ? 'No matches found' : 'No Applicants Yet'}</p>
                            <p className="text-xs mt-2 font-medium">{searchTerm ? 'Try adjusting your search criteria.' : 'Candidates will appear here once they apply to your jobs.'}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4 text-xs text-gray-500 italic">
                <CheckCircle2 size={16} className="text-emerald-500 flex-none" />
                <p>Status logic is automatically handled by the system based on matching score, but you can manually override decisions using the action menu.</p>
            </div>

            {/* Assessment Detail Modal */}
            {showAssessmentDetail && (
                <AssessmentDetail
                    applicationId={selectedApplicationId}
                    onClose={() => {
                        setShowAssessmentDetail(false);
                        setSelectedApplicationId(null);
                    }}
                />
            )}

            {/* Interview Detail Modal */}
            {showInterviewDetail && (
                <InterviewDetail
                    applicationId={selectedInterviewApplicationId}
                    onClose={() => {
                        setShowInterviewDetail(false);
                        setSelectedInterviewApplicationId(null);
                    }}
                />
            )}

            {/* Video Intro Modal */}
            {showVideoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-4xl bg-[#1a1d24] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold uppercase tracking-tight">Candidate Introduction</h3>
                            <button
                                onClick={() => setShowVideoModal(false)}
                                className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="aspect-video bg-black">
                            <video
                                src={selectedVideoUrl}
                                controls
                                playsInline
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="p-6 bg-white/5 text-center">
                            <p className="text-xs text-gray-500 font-medium italic">This 60-second introduction is mandatory for all applicants to this job.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Generated Resume Modal */}
            {showGeneratedResumeModal && (
                <GeneratedResumeModal
                    userId={selectedResumeUserId}
                    onClose={() => {
                        setShowGeneratedResumeModal(false);
                        setSelectedResumeUserId(null);
                    }}
                />
            )}

            {/* Bulk Resume Upload Modal */}
            <BulkUploadModal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                jobId={targetJobId}
                onUploadComplete={fetchApplicants}
            />

            {/* Unlock Confirmation Modal */}
            {unlockingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm bg-[#1a1d24] rounded-[2rem] border border-white/10 p-8 text-center shadow-2xl animate-in zoom-in duration-300">
                        <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 animate-bounce">
                            <Wallet size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">
                            Unlock {unlockingItem.type === 'resume' ? 'Resume' : unlockingItem.type === 'assessment' ? 'Skill Assessment' : 'Interview'}?
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed mb-6">
                            This will deduct <span className="text-white font-extrabold">₹{unlockingItem.cost.toFixed(2)} INR</span> from your wallet balance to unlock the candidate's {unlockingItem.type === 'resume' ? 'full profile & resume' : unlockingItem.type === 'assessment' ? 'detailed skill assessment logs' : 'video introduction & interview answers'}.
                        </p>

                        {unlockError && (
                            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-[11px] text-left">
                                {unlockError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setUnlockingItem(null);
                                    setUnlockError('');
                                }}
                                className="flex-1 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:bg-white/10 transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            {walletBalance < unlockingItem.cost ? (
                                <button
                                    onClick={() => {
                                        setUnlockingItem(null);
                                        setIsTopUpOpen(true);
                                    }}
                                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/10 active:scale-95 cursor-pointer"
                                >
                                    Top Up Wallet
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleUnlockApplicant(unlockingItem.id, unlockingItem.type)}
                                    disabled={unlockingInProgress}
                                    className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold rounded-xl text-xs transition shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    {unlockingInProgress ? (
                                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        "Unlock"
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <TopUpModal
                isOpen={isTopUpOpen}
                onClose={() => setIsTopUpOpen(false)}
                onSuccess={(newBal) => {
                    setWalletBalance(newBal);
                    window.dispatchEvent(new Event('wallet-update'));
                }}
                currentBalance={walletBalance}
            />
        </div>

    );
};

export default Applicants;
