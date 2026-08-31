import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
    ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';
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

    return [
        {
            label: 'Submitted',
            description: 'Application received',
            completed: true,
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
    const queryClient = useQueryClient();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [selectedTab, setSelectedTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

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
            await axios.delete(`${API_URL}/applications/${appId}`);
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
                                {isSaved ? (
                                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-black/[0.06] bg-[#fbf8f3] p-4">
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
                                    </div>
                                )}
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
        </div>
    );
};

export default MyApplications;
