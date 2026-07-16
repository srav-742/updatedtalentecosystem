import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Filter, MoreVertical, CheckCircle2, Eye, Video, Github, Linkedin, Sparkles, XCircle, UploadCloud, Wallet, Plus, Share2 } from 'lucide-react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../../firebase';
import { ApplicantsSkeleton } from '../../components/Skeleton';
import AssessmentDetail from './AssessmentDetail';
import InterviewDetail from './InterviewDetail';
import ProctoringDetail from './ProctoringDetail';
import GeneratedResumeModal from './GeneratedResumeModal';
import TeamFitBadge from '../../components/TeamFitBadge';
import BulkUploadModal from '../../components/BulkUploadModal';
import TopUpModal from '../../components/TopUpModal';
import ShareModal from '../../components/ShareModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Applicants = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [isPro, setIsPro] = useState(() => {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return u.hiringPattern === "Premium Recruiter" || u.isPro === true;
    });
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [unlockingItem, setUnlockingItem] = useState(null); // { id, type, cost }
    const [unlockingInProgress, setUnlockingInProgress] = useState(false);
    const [unlockError, setUnlockError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchParams] = useSearchParams();
    const targetJobId = searchParams.get('jobId');

    const userId = user.uid || user._id || user.id;

    // Fetch wallet balance
    const { data: walletBalance = user.walletBalance || 0 } = useQuery({
        queryKey: ['wallet', 'balance', userId],
        queryFn: async () => {
            if (!userId) return 0;
            const res = await axios.get(`${API_URL}/wallet/balance/${userId}`);
            return res.data?.success ? res.data.balance : 0;
        },
        enabled: !!userId
    });

    // Fetch fresh recruiter profile to check isPro status
    const { data: profile = null } = useQuery({
        queryKey: ['recruiter', 'profile', userId],
        queryFn: async () => {
            if (!userId) return null;
            const res = await axios.get(`${API_URL}/profile/${userId}`);
            if (res.data) {
                const isPremium = res.data.hiringPattern === "Premium Recruiter" || res.data.isPro === true;
                setIsPro(isPremium);
                const updatedUser = { ...user, ...res.data, isPro: isPremium, role: user.role };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
            return res.data;
        },
        enabled: !!userId
    });

    // Fetch applicants list using React Query
    const { data: rawApplicants = [], isLoading: loading } = useQuery({
        queryKey: ['applicants', userId],
        queryFn: async () => {
            if (!userId) return [];
            const res = await axios.get(`${API_URL}/applications/recruiter/${userId}`);
            return res.data;
        },
        enabled: !!userId
    });

    const applicants = useMemo(() => {
        let mapped = rawApplicants.map((app, index) => ({
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
            ownershipScore: app.metrics?.ownershipMindset || 0,
            githubUrl: app.user?.githubUrl,
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
        return mapped;
    }, [rawApplicants, targetJobId]);

    // Mutation for unlocking applicant details
    const unlockMutation = useMutation({
        mutationFn: async ({ applicationId, itemType }) => {
            const recruiterId = user.uid || user._id || user.id;
            const res = await axios.post(`${API_URL}/wallet/unlock`, {
                recruiterId,
                applicationId,
                itemType
            });
            return res.data;
        },
        onMutate: () => {
            setUnlockError('');
            setUnlockingInProgress(true);
        },
        onSuccess: (data) => {
            if (data && typeof data.balance === 'number') {
                queryClient.setQueryData(['wallet', 'balance', userId], data.balance);
                try {
                    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                    storedUser.walletBalance = data.balance;
                    localStorage.setItem('user', JSON.stringify(storedUser));
                } catch (e) {}
            }
            queryClient.invalidateQueries({ queryKey: ['wallet', 'balance', userId] });
            queryClient.invalidateQueries({ queryKey: ['applicants', userId] });
            window.dispatchEvent(new Event('wallet-update'));
            setUnlockingItem(null);
        },

        onError: (err) => {
            const msg = err.response?.data?.message || "Failed to unlock applicant.";
            setUnlockError(msg);
        },
        onSettled: () => {
            setUnlockingInProgress(false);
        }
    });

    const handleUnlockApplicant = async (applicationId, itemType) => {
        unlockMutation.mutate({ applicationId, itemType });
    };

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser.role !== 'recruiter' && storedUser.role !== 'admin') {
            navigate('/login');
            return;
        }

        const handleWalletUpdate = () => {
            queryClient.invalidateQueries({ queryKey: ['wallet', 'balance', userId] });
        };
        window.addEventListener('wallet-update', handleWalletUpdate);
        return () => {
            window.removeEventListener('wallet-update', handleWalletUpdate);
        };
    }, [userId, queryClient]);

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

    // Proctoring Detail Modal
    const [showProctoringDetail, setShowProctoringDetail] = useState(false);
    const [selectedProctoringApplicationId, setSelectedProctoringApplicationId] = useState(null);

    // Video Intro Modal
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);
    const [selectedVideoApplicationId, setSelectedVideoApplicationId] = useState(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareApplicationId, setShareApplicationId] = useState(null);
    const [shareCandidateName, setShareCandidateName] = useState('');

    const handleShareInterview = (applicationId, candidateName) => {
        if (!applicationId) return;
        const shareUrl = `${window.location.origin}/public/interview/${applicationId}`;
        const formattedCandidate = candidateName || 'Candidate';

        if (navigator.share) {
            navigator.share({
                title: `AI Interview Review: ${formattedCandidate}`,
                text: `Review candidate ${formattedCandidate}'s AI interview recording on hire1percent:`,
                url: shareUrl
            })
            .then(() => console.log('Native share successful'))
            .catch((err) => {
                // If sharing was aborted/cancelled by user, ignore. Otherwise, fall back.
                if (err.name !== 'AbortError') {
                    console.error('Native share failed:', err);
                    setShareApplicationId(applicationId);
                    setShareCandidateName(formattedCandidate);
                    setIsShareModalOpen(true);
                }
            });
        } else {
            setShareApplicationId(applicationId);
            setShareCandidateName(formattedCandidate);
            setIsShareModalOpen(true);
        }
    };

    // Generated Resume Modal
    const [showGeneratedResumeModal, setShowGeneratedResumeModal] = useState(false);
    const [selectedResumeUserId, setSelectedResumeUserId] = useState(null);

    // Bulk Resume Upload Modal
    const [uploadModalOpen, setUploadModalOpen] = useState(false);

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
            // Optimistic update using React Query's cache (setApplicants doesn't exist)
            queryClient.setQueryData(['applicants', userId], (old) =>
                (old || []).map(a => a._id === id ? { ...a, status: newStatus } : a)
            );

            await axios.put(`${API_URL}/applications/${id}/status`, { status: newStatus });
        } catch (error) {
            console.error("Failed to update status:", error);
            // Revert on error by refetching
            queryClient.invalidateQueries({ queryKey: ['applicants', userId] });
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

    // Handle View Proctoring Details
    const handleViewProctoring = (applicationId) => {
        setSelectedProctoringApplicationId(applicationId);
        setShowProctoringDetail(true);
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
                        
                        <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl overflow-visible relative">
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
                                                <td className="py-5 text-center" style={{ whiteSpace: 'nowrap' }}>
                                                     <div className="flex items-center justify-center">
                                                         <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 font-extrabold text-base shadow-sm">
                                                             <span>{app.proctoringScore}</span>
                                                             <button
                                                                 onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     handleViewProctoring(app.id);
                                                                 }}
                                                                 className="p-0.5 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                                 title="View Proctoring Report"
                                                             >
                                                                 <Eye size={15} />
                                                             </button>
                                                         </div>
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
                                                                        className="w-full text-left px-4 py-3 text-xs font-bold text-emerald-600 hover:bg-emerald-50/50 flex items-center gap-2"
                                                                    >
                                                                        <CheckCircle2 size={14} /> Mark Shortlisted
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusUpdate(app.id, 'REJECTED')}
                                                                        className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50/50 flex items-center gap-2"
                                                                    >
                                                                        <CheckCircle2 size={14} className="rotate-45" /> Mark Rejected
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusUpdate(app.id, 'HIRED')}
                                                                        className="w-full text-left px-4 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50/50 flex items-center gap-2 border-t border-gray-100"
                                                                    >
                                                                        <Sparkles size={14} /> Mark Hired (AI Learn)
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusUpdate(app.id, 'ELIGIBLE')}
                                                                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-100/50 flex items-center gap-2 border-t border-gray-100"
                                                                    >
                                                                        <Filter size={14} /> Reset Status
                                                                    </button>
                                                                    {interviewMeta.canView && (
                                                                        <button
                                                                            onClick={() => handleShareInterview(app.id, app.name)}
                                                                            className="w-full text-left px-4 py-3 text-xs font-bold text-purple-400 hover:bg-white/[0.02] flex items-center gap-2 border-t border-white/5"
                                                                        >
                                                                            <Share2 size={14} /> Share Interview
                                                                        </button>
                                                                    )}
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

            {/* Proctoring Detail Modal */}
            {showProctoringDetail && (
                <ProctoringDetail
                    applicationId={selectedProctoringApplicationId}
                    onClose={() => {
                        setShowProctoringDetail(false);
                        setSelectedProctoringApplicationId(null);
                    }}
                />
            )}

            {/* Video Intro Modal */}
            {showVideoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-4xl bg-[#1a1d24] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold uppercase tracking-tight">Candidate Introduction</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleShareInterview(selectedVideoApplicationId, jobApplicants.find(a => a.id === selectedVideoApplicationId)?.name)}
                                    className="bg-white/5 hover:bg-white/10 text-purple-400 border border-purple-500/25 px-4 py-2 rounded-xl font-bold text-xs transition-all hover:scale-102 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Share2 size={13} />
                                    Share Interview
                                </button>
                                <button
                                    onClick={() => {
                                        setShowVideoModal(false);
                                        setSelectedVideoApplicationId(null);
                                    }}
                                    className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>
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
                onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['applicants', userId] })}
            />

            {/* Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => {
                    setIsShareModalOpen(false);
                    setShareApplicationId(null);
                    setShareCandidateName('');
                }}
                applicationId={shareApplicationId}
                candidateName={shareCandidateName}
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
                    queryClient.setQueryData(['wallet', 'balance', userId], newBal);
                    queryClient.invalidateQueries({ queryKey: ['wallet', 'balance', userId] });
                    window.dispatchEvent(new Event('wallet-update'));
                }}
                currentBalance={walletBalance}
            />
        </div>

    );
};

export default Applicants;
