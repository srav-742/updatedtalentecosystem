import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Briefcase,
    BriefcaseBusiness,
    CheckCircle2,
    ChevronRight,
    Circle,
    CircleDot,
    Clock3,
    FileText,
    MapPin,
    Search,
    Sparkles,
    Trash2,
    Zap,
    Bookmark,
    Layers,
    ArrowRight,
    RotateCcw,
    Code2,
    Brain,
    Video,
    AlertCircle,
    X,
    Check
} from 'lucide-react';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../../firebase';
import { ApplicationTrackerSkeleton } from '../../components/Skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Color palettes for company avatars
const AVATAR_GRADIENTS = [
    'from-blue-600 to-indigo-700 text-white',
    'from-violet-600 to-purple-700 text-white',
    'from-emerald-600 to-teal-800 text-white',
    'from-amber-500 to-orange-600 text-white',
    'from-rose-500 to-pink-600 text-white',
    'from-cyan-600 to-blue-700 text-white',
    'from-fuchsia-600 to-indigo-700 text-white',
    'from-teal-600 to-emerald-700 text-white'
];

const getCompanyMeta = (job, index = 0) => {
    const companyName = job?.company || job?.recruiterId?.company?.name || job?.recruiter?.company?.name || 'hire1percent Partner';
    const logoUrl = job?.companyLogo || job?.recruiter?.profilePic || job?.recruiterId?.profilePic;
    const hash = companyName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradient = AVATAR_GRADIENTS[(hash + index) % AVATAR_GRADIENTS.length];
    
    let initials = 'HP';
    const cleanName = companyName.trim();
    const lowerName = cleanName.toLowerCase();

    if (lowerName.includes('hire1percent') || lowerName.includes('hire 1 percent') || lowerName.startsWith('hire1') || lowerName.startsWith('hire')) {
        initials = 'HP';
    } else {
        const words = cleanName.split(/\s+/);
        if (words.length > 1) {
            initials = `${words[0][0]}${words[1][0]}`.toUpperCase();
        } else {
            const capitals = cleanName.match(/[A-Z]/g);
            if (capitals && capitals.length >= 2) {
                initials = `${capitals[0]}${capitals[1]}`.toUpperCase();
            } else {
                initials = (cleanName.slice(0, 2) || 'CO').toUpperCase();
            }
        }
    }

    return { companyName, logoUrl, gradient, initials };
};

const getStatusBadge = (status) => {
    switch (status) {
        case 'SHORTLISTED':
            return {
                label: 'Shortlisted',
                className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
                dot: 'bg-emerald-500'
            };
        case 'HIRED':
        case 'ELIGIBLE':
            return {
                label: status === 'HIRED' ? 'Hired' : 'Eligible',
                className: 'bg-blue-50 text-blue-700 border-blue-200/80',
                dot: 'bg-blue-500'
            };
        case 'REJECTED':
            return {
                label: 'Closed / Not Selected',
                className: 'bg-red-50 text-red-700 border-red-200/80',
                dot: 'bg-red-500'
            };
        case 'SAVED':
            return {
                label: 'Saved Role',
                className: 'bg-amber-50 text-amber-700 border-amber-200/80',
                dot: 'bg-amber-500'
            };
        case 'APPLIED':
        default:
            return {
                label: 'Pending Review',
                className: 'bg-gray-100 text-gray-700 border-black/10',
                dot: 'bg-gray-400'
            };
    }
};

const getTimelineSteps = (status) => {
    const isShortlisted = ['SHORTLISTED', 'ELIGIBLE', 'HIRED'].includes(status);
    const isSelected = ['ELIGIBLE', 'HIRED'].includes(status);
    const isHired = status === 'HIRED';
    const isRejected = status === 'REJECTED';
    const isSaved = status === 'SAVED';

    return [
        {
            label: 'Submitted',
            description: 'Application received',
            completed: !isSaved,
            active: false
        },
        {
            label: isRejected ? 'Reviewed' : 'Review & Match',
            description: 'AI resume parsing',
            completed: isShortlisted || isSelected || isRejected || isHired,
            active: status === 'APPLIED'
        },
        {
            label: isRejected ? 'Not Shortlisted' : 'Assessment',
            description: isRejected ? 'Process concluded' : 'Interview round',
            completed: isShortlisted || isSelected || isRejected || isHired,
            active: status === 'SHORTLISTED'
        },
        {
            label: isRejected ? 'Closed' : isHired ? 'Hired' : 'Selection',
            description: isRejected ? 'Role closed' : 'Final offer stage',
            completed: isSelected || isRejected || isHired,
            active: isSelected || isHired
        }
    ];
};

const MyApplications = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [selectedTab, setSelectedTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Retest state
    const [retestModalOpen, setRetestModalOpen] = useState(false);
    const [selectedRetestApp, setSelectedRetestApp] = useState(null);
    const [selectedRound, setSelectedRound] = useState('coding');
    const [retesting, setRetesting] = useState(false);
    const [retestError, setRetestError] = useState(null);
    const [retestSuccess, setRetestSuccess] = useState(null);

    const userId = user.uid || user._id || user.id;

    // React Query hook for fetching and caching seeker applications
    const { data: applications = [], isLoading: loading } = useQuery({
        queryKey: ['applications', userId],
        queryFn: async () => {
            if (!userId) return [];
            const res = await axios.get(`${API_URL}/applications/candidate/${userId}`);
            return res.data;
        },
        enabled: !!userId,
        staleTime: 60 * 1000
    });

    const activeApplications = useMemo(
        () => applications.filter((app) => app.status !== 'REJECTED' && app.status !== 'SAVED'),
        [applications]
    );

    const savedApplications = useMemo(
        () => applications.filter((app) => app.status === 'SAVED'),
        [applications]
    );

    const archivedApplications = useMemo(
        () => applications.filter((app) => app.status === 'REJECTED'),
        [applications]
    );

    // Filtered by active tab and search term
    const displayedApplications = useMemo(() => {
        let baseList = applications;
        if (selectedTab === 'active') baseList = activeApplications;
        else if (selectedTab === 'saved') baseList = savedApplications;
        else if (selectedTab === 'archived') baseList = archivedApplications;

        if (!searchTerm.trim()) return baseList;

        const term = searchTerm.toLowerCase();
        return baseList.filter((app) => {
            const title = app.jobId?.title || '';
            const company = app.jobId?.company || app.jobId?.recruiterId?.company?.name || '';
            return title.toLowerCase().includes(term) || company.toLowerCase().includes(term);
        });
    }, [applications, activeApplications, savedApplications, archivedApplications, selectedTab, searchTerm]);

    // Mutation for unsaving jobs
    const unsaveMutation = useMutation({
        mutationFn: async (appId) => {
            const headers = await getAuthHeaders().catch(() => ({}));
            await axios.delete(`${API_URL}/applications/${appId}`, { headers });
        },
        onSuccess: (_, appId) => {
            queryClient.setQueryData(['applications', userId], (oldApps) => {
                if (!oldApps) return [];
                return oldApps.filter((app) => app._id !== appId && app.id !== appId);
            });
            queryClient.invalidateQueries({ queryKey: ['applications', userId] });
        }
    });

    const handleUnsave = (appId) => {
        unsaveMutation.mutate(appId);
    };

    const handleOpenRetestModal = (app) => {
        setSelectedRetestApp(app);
        const job = app.jobId || {};
        if (job.codingAssessment?.enabled) {
            setSelectedRound('coding');
        } else if (job.assessment?.enabled) {
            setSelectedRound('assessment');
        } else if (job.mockInterview?.enabled) {
            setSelectedRound('interview');
        } else {
            setSelectedRound('coding');
        }
        setRetestError(null);
        setRetestSuccess(null);
        setRetestModalOpen(true);
    };

    const handleConfirmRetest = async () => {
        if (!selectedRetestApp) return;
        setRetesting(true);
        setRetestError(null);
        try {
            const headers = await getAuthHeaders().catch(() => ({}));
            const res = await axios.post(
                `${API_URL}/applications/${selectedRetestApp._id}/retest`,
                {
                    round: selectedRound,
                    reason: 'Candidate requested retest from dashboard'
                },
                { headers }
            );

            if (res.data?.success) {
                const roundName = selectedRound === 'coding' ? 'Coding Assessment' : selectedRound === 'assessment' ? 'Skill Assessment' : 'AI Interview';
                setRetestSuccess(`${roundName} reset successfully! Redirecting to test...`);
                queryClient.invalidateQueries({ queryKey: ['applications', userId] });

                setTimeout(() => {
                    setRetestModalOpen(false);
                    const targetJobId = selectedRetestApp.jobId?._id || selectedRetestApp.jobId;
                    navigate(`/candidate/apply/${targetJobId}?step=${selectedRound}&retest=true`);
                }, 900);
            } else {
                setRetestError(res.data?.message || 'Failed to initiate retest.');
            }
        } catch (err) {
            console.error('Retest error:', err);
            setRetestError(err.response?.data?.message || 'Failed to initiate retest. Please try again.');
        } finally {
            setRetesting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <header className="overflow-hidden rounded-3xl border border-black/10 bg-gradient-to-br from-white via-[#fcfaf6] to-[#f4eee4] px-7 py-7 shadow-[0_16px_50px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-[#f4efe6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-gray-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Application Tracker
                        </div>
                        <h1 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                            Track your applications & pipeline
                        </h1>
                        <p className="mt-1.5 max-w-2xl text-xs md:text-sm text-gray-500">
                            Follow each submitted application through resume screening, skill assessments, and recruiter decisions in real time.
                        </p>
                    </div>

                    <div className="relative min-w-full lg:min-w-[320px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Filter by role or company..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-2xl border border-black/10 bg-[#faf7f1] py-3 pl-11 pr-4 text-xs md:text-sm text-gray-700 outline-none transition focus:border-black/30 focus:bg-white"
                        />
                    </div>
                </div>
            </header>

            {/* Quick Stat Summary Pills */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                        <Layers size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Roles</p>
                        <p className="text-xl font-bold text-gray-900">{applications.length}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <Briefcase size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active In Review</p>
                        <p className="text-xl font-bold text-gray-900">{activeApplications.length}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                        <Bookmark size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Saved Roles</p>
                        <p className="text-xl font-bold text-gray-900">{savedApplications.length}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 border border-black/5">
                        <Clock3 size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Archived</p>
                        <p className="text-xl font-bold text-gray-900">{archivedApplications.length}</p>
                    </div>
                </div>
            </div>

            {/* Segmented Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-xs">
                {[
                    { id: 'all', label: 'All Applications', count: applications.length },
                    { id: 'active', label: 'Active Pipeline', count: activeApplications.length },
                    { id: 'saved', label: 'Saved Roles', count: savedApplications.length },
                    { id: 'archived', label: 'Archived', count: archivedApplications.length }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                            selectedTab === tab.id
                                ? 'bg-black text-white shadow-xs'
                                : 'text-gray-600 hover:bg-[#faf7f1] hover:text-gray-900'
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span
                            className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                                selectedTab === tab.id
                                    ? 'bg-white/20 text-white'
                                    : 'bg-black/5 text-gray-500'
                            }`}
                        >
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            {loading ? (
                <ApplicationTrackerSkeleton />
            ) : displayedApplications.length > 0 ? (
                <div className="space-y-4">
                    {displayedApplications.map((application, index) => {
                        const job = application.jobId || {};
                        const { companyName, logoUrl, gradient, initials } = getCompanyMeta(job, index);
                        const statusInfo = getStatusBadge(application.status);
                        const timeline = getTimelineSteps(application.status);
                        const isSaved = application.status === 'SAVED';

                        const isComplete = (
                            (!job.resumeAnalysis?.enabled || !!application.resumeMatchPercent) &&
                            (!job.mockInterview?.enabled || !!application.videoIntroUrl) &&
                            (!job.assessment?.enabled || !!application.assessmentScore) &&
                            (!job.codingAssessment?.enabled || (application.codingScore !== null && application.codingScore !== undefined)) &&
                            (!job.mockInterview?.enabled || !!application.interviewScore)
                        );

                        return (
                            <motion.article
                                key={application._id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="rounded-3xl border border-black/10 bg-white p-5 md:p-6 shadow-[0_12px_35px_rgba(15,23,42,0.03)] transition-all hover:border-black/20 hover:shadow-[0_16px_45px_rgba(15,23,42,0.06)]"
                            >
                                {/* Top Row: Company Avatar + Role info + Status badge */}
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex items-start gap-3.5 min-w-0">
                                        {/* Company Avatar */}
                                        <div className="relative shrink-0">
                                            {logoUrl ? (
                                                <div className="h-12 w-12 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xs">
                                                    <img src={logoUrl} alt={companyName} className="h-full w-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-xs font-bold text-sm tracking-wider`}>
                                                    {initials}
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <h2 className="text-base md:text-lg font-bold tracking-tight text-gray-900 leading-snug">
                                                {job.title || 'Untitled Role'}
                                            </h2>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                <span className="font-medium text-gray-700">{companyName}</span>
                                                <span className="text-gray-300">•</span>
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin size={12} className="text-gray-400" />
                                                    {job.location || 'Remote'}
                                                </span>
                                                <span className="text-gray-300">•</span>
                                                <span className="rounded-md bg-[#faf7f1] px-2 py-0.5 border border-black/[0.04] text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                                                    {job.type || 'Full-time'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusInfo.className}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Content Section: Saved role action OR Stage Timeline Stepper */}
                                <div className="mt-5 space-y-4">
                                    {/* Horizontal Stepper Progress Pipeline */}
                                    <div className="rounded-2xl border border-black/[0.06] bg-[#faf7f1] p-4 md:p-5">
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                            {timeline.map((step, idx) => (
                                                <div key={step.label} className="relative flex flex-col justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                                            step.completed
                                                                ? 'bg-black text-white'
                                                                : step.active
                                                                ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                                                                : 'border border-gray-300 bg-white text-gray-400'
                                                        }`}>
                                                            {step.completed ? (
                                                                <CheckCircle2 size={13} />
                                                            ) : step.active ? (
                                                                <CircleDot size={13} />
                                                            ) : (
                                                                <Circle size={13} />
                                                            )}
                                                        </div>
                                                        <span className={`text-xs font-bold leading-tight ${
                                                            step.completed || step.active ? 'text-gray-900' : 'text-gray-400'
                                                        }`}>
                                                            {step.label}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-gray-500 pl-8 leading-tight">
                                                        {step.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {isSaved ? (
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-black/[0.06] bg-[#fbf8f3] p-4">
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <Bookmark size={15} className="text-amber-500 shrink-0" />
                                                <span>This job is saved in your bookmark list. Ready to proceed with your application?</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleUnsave(application._id)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 transition hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                >
                                                    <Trash2 size={13} />
                                                    <span>Remove</span>
                                                </button>
                                                <Link
                                                    to={`/candidate/job/${job._id || application.jobId}`}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
                                                >
                                                    <span>Apply Now</span>
                                                    <ArrowRight size={13} />
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Assessment Rounds Breakdown & Retest Actions */}
                                        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-xs">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <Layers size={14} className="text-gray-500" />
                                                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Evaluation Rounds & Performance</span>
                                                </div>
                                                
                                                {/* Retest Action Button */}
                                                {(job.codingAssessment?.enabled || job.assessment?.enabled || job.mockInterview?.enabled) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenRetestModal(application)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100 hover:border-amber-400 cursor-pointer self-start sm:self-auto"
                                                        title="Faced technical issues or want to improve your score? Retake assessment"
                                                    >
                                                        <RotateCcw size={12} className="text-amber-700" />
                                                        <span>Retest Assessment</span>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Badges Grid for All Configured Modules */}
                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                                {/* Resume Analysis */}
                                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#faf7f1] border border-black/[0.04]">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <FileText size={14} className="text-gray-600 shrink-0" />
                                                        <span className="text-xs font-semibold text-gray-700 truncate">Resume Match</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-900 shrink-0">
                                                        {application.resumeMatchPercent !== null && application.resumeMatchPercent !== undefined
                                                            ? `${application.resumeMatchPercent}/10 (${Math.round(application.resumeMatchPercent * 10)}%)`
                                                            : 'Pending'}
                                                    </span>
                                                </div>

                                                {/* Skill Assessment (MCQ) */}
                                                {job.assessment?.enabled && (
                                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#faf7f1] border border-black/[0.04]">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Brain size={14} className="text-blue-600 shrink-0" />
                                                            <span className="text-xs font-semibold text-gray-700 truncate">Skill MCQ</span>
                                                        </div>
                                                        <span className={`text-xs font-bold shrink-0 ${
                                                            application.assessmentScore !== null && application.assessmentScore !== undefined
                                                                ? 'text-blue-900 font-black'
                                                                : 'text-gray-400 font-medium'
                                                        }`}>
                                                            {application.assessmentScore !== null && application.assessmentScore !== undefined
                                                                ? `${application.assessmentScore}/${job.assessment?.totalQuestions || 20}`
                                                                : 'Pending'}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Coding Assessment */}
                                                {job.codingAssessment?.enabled && (
                                                    <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                                                        application.codingScore !== null && application.codingScore !== undefined
                                                            ? application.codingScore >= (job.codingAssessment?.passingScore || 60)
                                                                ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                                                                : 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                                                            : 'bg-[#faf7f1] border-black/[0.04] text-gray-700'
                                                    }`}>
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Code2 size={14} className={
                                                                application.codingScore !== null && application.codingScore !== undefined
                                                                    ? application.codingScore >= (job.codingAssessment?.passingScore || 60)
                                                                        ? 'text-emerald-600 shrink-0'
                                                                        : 'text-amber-600 shrink-0'
                                                                    : 'text-teal-600 shrink-0'
                                                            } />
                                                            <span className="text-xs font-semibold truncate">Coding Challenge</span>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <span className="text-xs font-bold">
                                                                {application.codingScore !== null && application.codingScore !== undefined
                                                                    ? `${application.codingScore}/100`
                                                                    : 'Pending'}
                                                            </span>
                                                            <span className="block text-[9px] text-gray-500 font-medium">
                                                                Passing: {job.codingAssessment?.passingScore || 60}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Mock Interview / Candidate Deck */}
                                                {job.mockInterview?.enabled && (
                                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#faf7f1] border border-black/[0.04]">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Video size={14} className="text-purple-600 shrink-0" />
                                                            <span className="text-xs font-semibold text-gray-700 truncate">AI Interview</span>
                                                        </div>
                                                        <span className={`text-xs font-bold shrink-0 ${
                                                            application.interviewScore !== null && application.interviewScore !== undefined
                                                                ? 'text-purple-900 font-black'
                                                                : 'text-gray-400 font-medium'
                                                        }`}>
                                                            {application.interviewScore !== null && application.interviewScore !== undefined
                                                                ? `${application.interviewScore}/100`
                                                                : 'Pending'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action / Resume Pipeline bar if incomplete */}
                                        {!isComplete && (
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-purple-200/70 bg-purple-50/50 p-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
                                                        <Zap size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-purple-900">Application in Progress</p>
                                                        <p className="text-[11px] text-purple-700">Complete your remaining rounds to finalize your candidate profile for the recruiter.</p>
                                                    </div>
                                                </div>
                                                <Link
                                                    to={`/candidate/apply/${job._id || application.jobId}`}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-purple-800 shrink-0"
                                                >
                                                    <BriefcaseBusiness size={13} />
                                                    <span>Resume Application Flow</span>
                                                    <ChevronRight size={14} />
                                                </Link>
                                            </div>
                                        )}
                                        </>
                                    )}
                                </div>
                            </motion.article>
                        );
                    })}
                </div>
            ) : (
                /* Cohesive Modern Empty State */
                <div className="rounded-3xl border border-dashed border-black/10 bg-white px-8 py-16 text-center shadow-[0_16px_50px_rgba(15,23,42,0.03)]">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-500">
                        <FileText size={26} />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-gray-900">No applications found</h3>
                    <p className="mx-auto mt-1.5 max-w-md text-xs md:text-sm text-gray-500">
                        {searchTerm
                            ? `No results match "${searchTerm}". Try a different keyword.`
                            : selectedTab === 'saved'
                            ? 'You have not saved any jobs yet. Bookmark roles while browsing to track them here.'
                            : selectedTab === 'archived'
                            ? 'No archived or closed applications.'
                            : 'Explore our open opportunities and submit your first AI-evaluated application.'}
                    </p>
                    <Link
                        to="/candidate/jobs"
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800"
                    >
                        <span>Browse Open Roles</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>
            )}

            {/* Retest Assessment Modal */}
            <AnimatePresence>
                {retestModalOpen && selectedRetestApp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-black/10"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                                        <RotateCcw size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Retake Assessment</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {selectedRetestApp.jobId?.title || 'Application'} • {selectedRetestApp.jobId?.company || 'hire1percent Partner'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => !retesting && setRetestModalOpen(false)}
                                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Explanation */}
                            <div className="mt-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4 text-xs text-amber-900 leading-relaxed">
                                <p className="font-semibold">Faced technical glitches, proctoring issues, or want to improve your score?</p>
                                <p className="mt-1 text-amber-800">Select the round below to retake. Your previous submission for that round will be reset so you can begin a fresh evaluation.</p>
                            </div>

                            {/* Round Selector Options */}
                            <div className="mt-5 space-y-2.5">
                                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Round to Retake:</p>
                                
                                {/* Coding Round Option */}
                                {selectedRetestApp.jobId?.codingAssessment?.enabled && (
                                    <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                                        selectedRound === 'coding'
                                            ? 'border-teal-600 bg-teal-50/50 shadow-xs'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="retestRound"
                                                value="coding"
                                                checked={selectedRound === 'coding'}
                                                onChange={(e) => setSelectedRound(e.target.value)}
                                                className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                                            />
                                            <div>
                                                <div className="flex items-center gap-1.5 font-bold text-sm text-gray-900">
                                                    <Code2 size={16} className="text-teal-600" />
                                                    Coding Assessment
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Passing requirement: {selectedRetestApp.jobId?.codingAssessment?.passingScore || 60}%
                                                    {selectedRetestApp.codingScore !== null && selectedRetestApp.codingScore !== undefined && (
                                                        <span className="ml-1 text-amber-700 font-semibold">• Current Score: {selectedRetestApp.codingScore}/100</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </label>
                                )}

                                {/* Skill MCQ Option */}
                                {selectedRetestApp.jobId?.assessment?.enabled && (
                                    <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                                        selectedRound === 'assessment'
                                            ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="retestRound"
                                                value="assessment"
                                                checked={selectedRound === 'assessment'}
                                                onChange={(e) => setSelectedRound(e.target.value)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div>
                                                <div className="flex items-center gap-1.5 font-bold text-sm text-gray-900">
                                                    <Brain size={16} className="text-blue-600" />
                                                    Skill Assessment (MCQ)
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Total Questions: {selectedRetestApp.jobId?.assessment?.totalQuestions || 20}
                                                    {selectedRetestApp.assessmentScore !== null && selectedRetestApp.assessmentScore !== undefined && (
                                                        <span className="ml-1 text-blue-700 font-semibold">• Current Score: {selectedRetestApp.assessmentScore}</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </label>
                                )}

                                {/* AI Interview Option */}
                                {selectedRetestApp.jobId?.mockInterview?.enabled && (
                                    <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                                        selectedRound === 'interview'
                                            ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="retestRound"
                                                value="interview"
                                                checked={selectedRound === 'interview'}
                                                onChange={(e) => setSelectedRound(e.target.value)}
                                                className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                            />
                                            <div>
                                                <div className="flex items-center gap-1.5 font-bold text-sm text-gray-900">
                                                    <Video size={16} className="text-purple-600" />
                                                    AI Video Interview
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Proctored video dialogue & behavioral assessment
                                                    {selectedRetestApp.interviewScore !== null && selectedRetestApp.interviewScore !== undefined && (
                                                        <span className="ml-1 text-purple-700 font-semibold">• Current Score: {selectedRetestApp.interviewScore}/100</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </label>
                                )}
                            </div>

                            {/* Error / Success Feedback */}
                            {retestError && (
                                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
                                    <AlertCircle size={14} className="shrink-0 text-red-600" />
                                    <span>{retestError}</span>
                                </div>
                            )}
                            {retestSuccess && (
                                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium">
                                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                                    <span>{retestSuccess}</span>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="mt-6 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRetestModalOpen(false)}
                                    disabled={retesting}
                                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmRetest}
                                    disabled={retesting}
                                    className="inline-flex items-center gap-2 rounded-xl bg-black hover:bg-gray-800 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                                >
                                    {retesting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                                            <span>Resetting round...</span>
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw size={14} />
                                            <span>Start Retest Now</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MyApplications;
