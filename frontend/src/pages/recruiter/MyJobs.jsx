import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Briefcase, 
    MapPin, 
    Users, 
    Trash2, 
    Edit3, 
    ArrowUpRight, 
    Search, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    Share2, 
    Mail, 
    Linkedin, 
    Twitter, 
    Copy, 
    UploadCloud, 
    Code2,
    Plus,
    Check,
    Sparkles,
    Eye,
    TrendingUp,
    ArrowUpDown,
    Building2,
    Banknote,
    X,
    Filter,
    Layers,
    FileText,
    ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../../firebase';
import BulkUploadModal from '../../components/BulkUploadModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RecruiterJobCardSkeleton } from '../../components/Skeleton';
import './recruiter-theme.css';
import './MyJobs.css';

const MyJobs = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    // States
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'approved' | 'pending' | 'rejected'
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'applicants' | 'match' | 'alphabetical'
    const [copiedJobId, setCopiedJobId] = useState(null);
    const [activeShareJobId, setActiveShareJobId] = useState(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

    const userId = user.uid || user._id || user.id;

    // Handle outside clicks for the share popover
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeShareJobId && !event.target.closest('.share-container')) {
                setActiveShareJobId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeShareJobId]);

    // Fetch recruiter's jobs using React Query
    const { data: jobs = [], isLoading: loading } = useQuery({
        queryKey: ['jobs', 'recruiter', userId],
        queryFn: async () => {
            if (!userId) return [];
            const res = await axios.get(`${API_URL}/jobs/recruiter/${userId}`);
            return res.data;
        },
        enabled: !!userId,
        staleTime: 60 * 1000
    });

    // Delete job mutation
    const deleteJobMutation = useMutation({
        mutationFn: async (jobId) => {
            await axios.delete(`${API_URL}/jobs/${jobId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs', 'recruiter', userId] });
        }
    });

    const handleDelete = async (jobId) => {
        if (!window.confirm('Are you sure you want to permanently delete this job requisition? All active candidate progress for this posting will be removed.')) return;
        deleteJobMutation.mutate(jobId);
    };

    const toggleShareMenu = (jobId) => {
        setActiveShareJobId(activeShareJobId === jobId ? null : jobId);
    };

    const handleCopyLink = async (jobId) => {
        const shareUrl = `${window.location.origin}/candidate/job/${jobId}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedJobId(jobId);
            setTimeout(() => setCopiedJobId(null), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    const handleShareWhatsApp = (job) => {
        const shareUrl = `${window.location.origin}/candidate/job/${job._id}`;
        const text = `We are hiring! Check out the job requisition for ${job.title} at ${job.company || 'our company'}: ${shareUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleShareLinkedIn = (job) => {
        const shareUrl = `${window.location.origin}/candidate/job/${job._id}`;
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        window.open(linkedinUrl, '_blank');
    };

    const handleShareTwitter = (job) => {
        const shareUrl = `${window.location.origin}/candidate/job/${job._id}`;
        const text = `We are hiring for ${job.title}! Apply directly here:`;
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
    };

    const handleShareEmail = (job) => {
        const shareUrl = `${window.location.origin}/candidate/job/${job._id}`;
        const subject = `Job Opportunity: ${job.title}`;
        const body = `Hi,\n\nWe are looking for a ${job.title} in ${job.location}.\n\nView details and apply directly here:\n${shareUrl}\n\nBest regards,\n${user.name || 'Recruiter'}`;
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl, '_self');
    };

    // Calculate aggregated metrics for the KPI banner
    const metrics = useMemo(() => {
        const total = jobs.length;
        const active = jobs.filter(j => j.status === 'approved').length;
        const pending = jobs.filter(j => j.status !== 'approved' && j.status !== 'rejected').length;
        const rejected = jobs.filter(j => j.status === 'rejected').length;
        const candidates = jobs.reduce((sum, j) => sum + (j.applicantCount || 0), 0);

        return { total, active, pending, rejected, candidates };
    }, [jobs]);

    // Distinct job types available in recruiter's pool
    const availableTypes = useMemo(() => {
        const types = new Set();
        jobs.forEach(j => {
            if (j.type) types.add(j.type);
        });
        return Array.from(types);
    }, [jobs]);

    // Filter and sort jobs
    const filteredJobs = useMemo(() => {
        return jobs
            .filter(job => {
                // Search filter (title, location, company, or skills)
                if (searchTerm.trim()) {
                    const q = searchTerm.toLowerCase();
                    const titleMatch = (job.title || '').toLowerCase().includes(q);
                    const locationMatch = (job.location || '').toLowerCase().includes(q);
                    const companyMatch = (job.company || '').toLowerCase().includes(q);
                    const skillMatch = Array.isArray(job.skills) && job.skills.some(s => s.toLowerCase().includes(q));
                    if (!titleMatch && !locationMatch && !companyMatch && !skillMatch) {
                        return false;
                    }
                }

                // Status filter
                if (statusFilter === 'approved' && job.status !== 'approved') return false;
                if (statusFilter === 'pending' && (job.status === 'approved' || job.status === 'rejected')) return false;
                if (statusFilter === 'rejected' && job.status !== 'rejected') return false;

                // Job type filter
                if (typeFilter !== 'all' && job.type !== typeFilter) return false;

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'newest') {
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                }
                if (sortBy === 'oldest') {
                    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                }
                if (sortBy === 'applicants') {
                    return (b.applicantCount || 0) - (a.applicantCount || 0);
                }
                if (sortBy === 'match') {
                    return (b.minPercentage || 0) - (a.minPercentage || 0);
                }
                if (sortBy === 'alphabetical') {
                    return (a.title || '').localeCompare(b.title || '');
                }
                return 0;
            });
    }, [jobs, searchTerm, statusFilter, typeFilter, sortBy]);

    // Format relative creation date
    const formatPostedDate = (dateString) => {
        if (!dateString) return 'Recently';
        const date = new Date(dateString);
        const diffMs = Date.now() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Posted today';
        if (diffDays === 1) return 'Posted yesterday';
        if (diffDays < 30) return `Posted ${diffDays}d ago`;
        return `Posted ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const getStatusBadge = (job) => {
        if (job.status === 'approved') {
            return (
                <span className="rec-badge-emerald inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 rec-pulse-dot" />
                    Live & Active
                </span>
            );
        }
        if (job.status === 'rejected') {
            return (
                <span className="rec-badge-rose inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
                    <XCircle size={13} /> Rejected
                </span>
            );
        }
        // Default: pending_approval
        return (
            <span className="rec-badge-amber inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
                <Clock size={13} /> Pending Review
            </span>
        );
    };

    if (loading) {
        return (
            <div className="space-y-8 pb-12">
                <header className="rec-hero p-8 md:p-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="rec-badge-dark px-3 py-0.5 text-[10px] uppercase tracking-wider">
                                Requisition Management
                            </span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900">Job Campaigns</h1>
                        <p className="text-xs text-slate-500">Loading your active requisition pool...</p>
                    </div>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(n => (
                        <div key={n} className="h-24 rounded-2xl bg-white border border-slate-200/60 animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-6">
                    <RecruiterJobCardSkeleton />
                    <RecruiterJobCardSkeleton />
                    <RecruiterJobCardSkeleton />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-16">
            {/* 1. Executive Hero Header */}
            <header className="rec-hero p-8 md:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="rec-badge-dark px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                                Requisition Hub
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                                Real-time applicant screening & assessment configuration
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                            My Job <span className="rec-text-gradient">Postings</span>
                        </h1>
                        <p className="text-xs md:text-sm text-slate-600 max-w-2xl leading-relaxed">
                            Oversee active job requisitions, track candidate flow across automated AI screening stages, configure proctored rounds, and distribute public application links.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <Link 
                            to="/recruiter/post-job" 
                            className="rec-btn-primary px-6 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 shadow-md cursor-pointer group"
                        >
                            <Plus size={16} className="transition-transform group-hover:rotate-90 duration-200" />
                            <span>Post New Job</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* 2. Requisition KPI Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Requisitions */}
                <div 
                    onClick={() => setStatusFilter('all')}
                    className={`myjobs-kpi-card kpi-total ${statusFilter === 'all' ? 'active-kpi' : ''}`}
                    title="Filter by all requisitions"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Campaigns</span>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                            <Briefcase size={16} />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl md:text-3xl font-black text-slate-900">
                        {metrics.total}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <span>All recorded postings</span>
                    </div>
                </div>

                {/* Active & Published */}
                <div 
                    onClick={() => setStatusFilter('approved')}
                    className={`myjobs-kpi-card kpi-active ${statusFilter === 'approved' ? 'active-kpi' : ''}`}
                    title="Filter by live active jobs"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Live & Active</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl md:text-3xl font-black text-slate-900">
                        {metrics.active}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 rec-pulse-dot" />
                        <span>Accepting candidates</span>
                    </div>
                </div>

                {/* Pending Review */}
                <div 
                    onClick={() => setStatusFilter('pending')}
                    className={`myjobs-kpi-card kpi-pending ${statusFilter === 'pending' ? 'active-kpi' : ''}`}
                    title="Filter by pending approval"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Review</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl md:text-3xl font-black text-slate-900">
                        {metrics.pending}
                    </div>
                    <div className="mt-1 text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                        <span>Awaiting admin moderation</span>
                    </div>
                </div>

                {/* Total Pipeline Applicants */}
                <div 
                    onClick={() => navigate('/recruiter/applicants')}
                    className="myjobs-kpi-card kpi-candidates"
                    title="View candidate pipeline"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Candidate Pipeline</span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl md:text-3xl font-black text-slate-900">
                        {metrics.candidates}
                    </div>
                    <div className="mt-1 text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                        <TrendingUp size={12} />
                        <span>Total applicants across jobs</span>
                    </div>
                </div>
            </div>

            {/* 3. Search, Filter Tabs & Sort Controls Toolbar */}
            <div className="rec-card p-4 md:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                {/* Status Segmented Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 lg:pb-0">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`myjobs-filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
                    >
                        <span>All Requisitions</span>
                        <span className="myjobs-filter-badge">{metrics.total}</span>
                    </button>

                    <button
                        onClick={() => setStatusFilter('approved')}
                        className={`myjobs-filter-tab ${statusFilter === 'approved' ? 'active' : ''}`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span>Live & Active</span>
                        <span className="myjobs-filter-badge">{metrics.active}</span>
                    </button>

                    <button
                        onClick={() => setStatusFilter('pending')}
                        className={`myjobs-filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
                    >
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <span>Pending</span>
                        <span className="myjobs-filter-badge">{metrics.pending}</span>
                    </button>

                    {metrics.rejected > 0 && (
                        <button
                            onClick={() => setStatusFilter('rejected')}
                            className={`myjobs-filter-tab ${statusFilter === 'rejected' ? 'active' : ''}`}
                        >
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            <span>Action Needed</span>
                            <span className="myjobs-filter-badge">{metrics.rejected}</span>
                        </button>
                    )}
                </div>

                {/* Search & Sort Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Field */}
                    <div className="relative min-w-[240px] flex-1 lg:flex-none">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search by title, location, skill..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="rec-input pl-9 pr-8 py-2 text-xs w-full"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                title="Clear search"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Workplace Type Filter */}
                    {availableTypes.length > 1 && (
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="rec-select px-3 py-2 text-xs cursor-pointer"
                        >
                            <option value="all">All Workplace Types</option>
                            {availableTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    )}

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-1.5">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="rec-select px-3 py-2 text-xs font-semibold cursor-pointer"
                        >
                            <option value="newest">Sort: Newest First</option>
                            <option value="oldest">Sort: Oldest First</option>
                            <option value="applicants">Sort: Most Applicants</option>
                            <option value="match">Sort: Highest Match %</option>
                            <option value="alphabetical">Sort: Title (A-Z)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 4. Active Results Count Bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                    Showing <strong className="text-slate-800 font-bold">{filteredJobs.length}</strong> of {jobs.length} total requisitions
                    {searchTerm && ` matching "${searchTerm}"`}
                </span>
                {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                            setTypeFilter('all');
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                        Reset All Filters
                    </button>
                )}
            </div>

            {/* 5. Job Requisitions List */}
            <div className="grid grid-cols-1 gap-6">
                {filteredJobs.length > 0 ? (
                    filteredJobs.map((job) => {
                        const isShareOpen = activeShareJobId === job._id;
                        const cardStatusClass = job.status === 'approved' 
                            ? 'status-approved' 
                            : job.status === 'rejected' 
                                ? 'status-rejected' 
                                : 'status-pending';

                        return (
                            <React.Fragment key={job._id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`myjobs-card ${cardStatusClass} ${isShareOpen ? 'z-50' : 'z-0'}`}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                                        {/* Left Column: Job Identity & Details */}
                                        <div className="flex items-start gap-4 md:gap-5 flex-1 min-w-0">
                                            {/* Role Monogram Icon */}
                                            <div className="myjobs-role-icon">
                                                <Briefcase size={22} className="text-slate-800" />
                                            </div>

                                            <div className="space-y-3 flex-1 min-w-0">
                                                {/* Title & Status Badges */}
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h3 className="text-xl font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate max-w-xl">
                                                        {job.title}
                                                    </h3>
                                                    {getStatusBadge(job)}
                                                    <span className="text-[11px] font-medium text-slate-400">
                                                        {formatPostedDate(job.createdAt)}
                                                    </span>
                                                </div>

                                                {/* Metadata Information Row */}
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                                                    {job.company && (
                                                        <span className="myjobs-meta-item">
                                                            <Building2 size={13} className="text-slate-400" />
                                                            <strong className="text-slate-700">{job.company}</strong>
                                                        </span>
                                                    )}
                                                    {job.company && <span className="w-1 h-1 bg-slate-300 rounded-full" />}
                                                    
                                                    <span className="myjobs-meta-item">
                                                        <MapPin size={13} className="text-slate-400" />
                                                        <span>{job.location || 'Remote'}</span>
                                                    </span>
                                                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                    
                                                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200/50">
                                                        {job.type || 'Full-time'}
                                                    </span>
                                                    <span className="w-1 h-1 bg-slate-300 rounded-full" />

                                                    <span className="myjobs-meta-item">
                                                        <Clock size={13} className="text-slate-400" />
                                                        <span>{job.experienceLevel || `${job.minExperience || 0} Yrs`} Experience</span>
                                                    </span>

                                                    {job.salary && (
                                                        <>
                                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                            <span className="myjobs-meta-item text-emerald-700 font-semibold">
                                                                <Banknote size={13} className="text-emerald-500" />
                                                                <span>{job.salary}</span>
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Education Criteria Requirements */}
                                                {(job.education && job.education.length > 0) ? (
                                                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                                        {job.education.map((edu, idx) => (
                                                            <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/70 rounded-lg text-[11px] font-semibold text-slate-600">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                                {edu.qualification} • {edu.specialization}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    (job.qualification || job.specialization) && (
                                                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/70 rounded-lg text-[11px] font-semibold text-slate-600">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                                {job.qualification || 'Any'} • {job.specialization || 'Any'}
                                                            </span>
                                                        </div>
                                                    )
                                                )}

                                                {/* Automated Screening & Evaluation Pipeline Funnel */}
                                                <div className="space-y-1.5 pt-1">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                        <Sparkles size={11} className="text-indigo-500" />
                                                        <span>Automated AI Screening Funnel</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {/* Stage 1: Resume Match */}
                                                        <span 
                                                            className="myjobs-pipeline-badge rec-badge-emerald"
                                                            title="Minimum resume match score required for shortlisting"
                                                        >
                                                            <FileText size={12} />
                                                            <span>{job.minPercentage || 60}% Resume Match</span>
                                                        </span>

                                                        {/* Stage 2: MCQ Round */}
                                                        {job.assessment?.enabled && (
                                                            <span 
                                                                className="myjobs-pipeline-badge rec-badge-amber"
                                                                title="Technical MCQ evaluation benchmark"
                                                            >
                                                                <CheckCircle size={12} />
                                                                <span>{job.assessment.passingScore || 70}% MCQ Benchmark</span>
                                                            </span>
                                                        )}

                                                        {/* Stage 3: Coding Challenge */}
                                                        {job.codingAssessment?.enabled && (
                                                            <span 
                                                                className="myjobs-pipeline-badge rec-badge-blue"
                                                                title="Automated proctored coding challenge"
                                                            >
                                                                <Code2 size={12} />
                                                                <span>{job.codingAssessment.passingScore || 70}% Coding Challenge</span>
                                                            </span>
                                                        )}

                                                        {/* Stage 4: AI Mock Interview */}
                                                        {job.mockInterview?.enabled && (
                                                            <span 
                                                                className="myjobs-pipeline-badge rec-badge-purple"
                                                                title="AI-assisted automated video interview"
                                                            >
                                                                <Sparkles size={12} />
                                                                <span>{job.mockInterview.passingScore || 70}% AI Interview</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Skills Stack Chips */}
                                                {job.skills && job.skills.length > 0 && (
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                        {job.skills.slice(0, 8).map(skill => (
                                                            <span key={skill} className="myjobs-skill-chip">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {job.skills.length > 8 && (
                                                            <span className="text-[11px] font-semibold text-slate-400 pl-1">
                                                                +{job.skills.length - 8} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Column: Applicant Metrics & Action Hub */}
                                        <div className="flex flex-col lg:items-end justify-between gap-5 shrink-0 lg:min-w-[320px] pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                                            {/* Candidate Counter Widget */}
                                            <div className="myjobs-candidate-box w-full lg:w-auto">
                                                <div className="lg:text-right flex-1">
                                                    <div className="text-2xl font-black text-slate-900 leading-none">
                                                        {job.applicantCount || 0}
                                                    </div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                                                        Active Candidates
                                                    </div>
                                                </div>

                                                {job.applicantCount > 0 ? (
                                                    <>
                                                        <div className="w-px h-8 bg-slate-200" />
                                                        <div className="flex -space-x-2">
                                                            {[...Array(Math.min(job.applicantCount, 3))].map((_, i) => (
                                                                <div 
                                                                    key={i} 
                                                                    className="w-7 h-7 rounded-full bg-slate-800 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                                                                >
                                                                    {String.fromCharCode(65 + i)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-[11px] text-slate-400 italic">
                                                        Awaiting intake
                                                    </div>
                                                )}
                                            </div>

                                            {/* Primary & Secondary Actions Bar */}
                                            <div className="flex items-center gap-2 w-full">
                                                {/* Primary View Applicants Button */}
                                                <Link
                                                    to={`/recruiter/applicants?jobId=${job._id}`}
                                                    className="rec-btn-primary flex-1 py-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
                                                >
                                                    <span>View Pipeline</span>
                                                    <ArrowUpRight size={14} />
                                                </Link>

                                                {/* Share Menu Container */}
                                                <div className="share-container relative">
                                                    <button
                                                        onClick={() => toggleShareMenu(job._id)}
                                                        className={`myjobs-action-btn ${isShareOpen ? 'btn-active' : ''}`}
                                                        title="Share application link"
                                                    >
                                                        <Share2 size={15} />
                                                    </button>

                                                    <AnimatePresence>
                                                        {isShareOpen && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                                                className="myjobs-share-popover"
                                                            >
                                                                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                                                    <span>Distribute Job Link</span>
                                                                    <button 
                                                                        onClick={() => setActiveShareJobId(null)}
                                                                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                                
                                                                <div className="p-1 space-y-0.5">
                                                                    {/* 1-Click Copy Link */}
                                                                    <button
                                                                        onClick={() => handleCopyLink(job._id)}
                                                                        className="myjobs-share-item justify-between"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <Copy size={13} className="text-slate-500" />
                                                                            <span>Copy Link</span>
                                                                        </div>
                                                                        {copiedJobId === job._id && (
                                                                            <span className="rec-badge-emerald px-1.5 py-0.5 text-[9px] uppercase">
                                                                                Copied!
                                                                            </span>
                                                                        )}
                                                                    </button>

                                                                    {/* WhatsApp */}
                                                                    <button
                                                                        onClick={() => handleShareWhatsApp(job)}
                                                                        className="myjobs-share-item share-whatsapp"
                                                                    >
                                                                        <svg className="w-3.5 h-3.5 text-emerald-600 fill-current shrink-0" viewBox="0 0 24 24">
                                                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.99C16.558 1.874 14.088.843 11.45.843 6.012.843 1.587 5.263 1.584 10.707c-.001 1.677.447 3.312 1.3 4.747l-.996 3.636 3.727-.977zM17.47 14.8c-.322-.16-.1.9-.3-.54-.16-.32-.64-.515-.96-.68-.32-.16-1.9-.8-3.08-1.87-.92-.82-1.5-1.747-1.72-2.12-.22-.38-.02-.58.17-.77.17-.17.38-.44.57-.66.19-.22.25-.38.38-.63.13-.25.06-.47-.03-.66-.09-.19-.8-1.92-1.1-2.64-.29-.71-.59-.61-.8-.61-.2-.01-.44-.01-.68-.01-.24 0-.64.09-.98.47-.34.37-1.3 1.27-1.3 3.1 0 1.83 1.33 3.6 1.51 3.85.19.25 2.62 4.003 6.35 5.61.89.38 1.58.61 2.12.78.89.28 1.7.24 2.34.14.71-.1 1.47-.61 1.68-1.2.21-.59.21-1.09.15-1.2-.06-.11-.22-.2-.54-.36z" />
                                                                        </svg>
                                                                        <span>WhatsApp</span>
                                                                    </button>

                                                                    {/* LinkedIn */}
                                                                    <button
                                                                        onClick={() => handleShareLinkedIn(job)}
                                                                        className="myjobs-share-item share-linkedin"
                                                                    >
                                                                        <Linkedin size={13} className="text-blue-600 shrink-0" />
                                                                        <span>LinkedIn</span>
                                                                    </button>

                                                                    {/* Twitter / X */}
                                                                    <button
                                                                        onClick={() => handleShareTwitter(job)}
                                                                        className="myjobs-share-item share-twitter"
                                                                    >
                                                                        <Twitter size={13} className="text-sky-500 shrink-0" />
                                                                        <span>Twitter / X</span>
                                                                    </button>

                                                                    {/* Email */}
                                                                    <button
                                                                        onClick={() => handleShareEmail(job)}
                                                                        className="myjobs-share-item share-email"
                                                                    >
                                                                        <Mail size={13} className="text-purple-600 shrink-0" />
                                                                        <span>Email Notice</span>
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                {/* Candidate Preview View */}
                                                <a
                                                    href={`/candidate/job/${job._id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="myjobs-action-btn action-preview"
                                                    title="Preview Candidate Portal View (Opens in new tab)"
                                                >
                                                    <Eye size={15} />
                                                </a>

                                                {/* Configure Coding Round (if enabled) */}
                                                {job.codingAssessment?.enabled && (
                                                    <button
                                                        onClick={() => navigate(`/recruiter/custom-coding-assessment/${job._id}`)}
                                                        className="myjobs-action-btn action-coding"
                                                        title="Configure Custom Coding Round"
                                                    >
                                                        <Code2 size={15} />
                                                    </button>
                                                )}

                                                {/* Bulk Upload Resumes */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedJobId(job._id);
                                                        setUploadModalOpen(true);
                                                    }}
                                                    className="myjobs-action-btn action-upload"
                                                    title="Bulk Upload Candidate Resumes"
                                                >
                                                    <UploadCloud size={15} />
                                                </button>

                                                {/* Edit Requisition */}
                                                <button
                                                    onClick={() => navigate(`/recruiter/post-job?edit=${job._id}`)}
                                                    className="myjobs-action-btn action-edit"
                                                    title="Edit Requisition Details"
                                                >
                                                    <Edit3 size={15} />
                                                </button>

                                                {/* Delete Requisition */}
                                                <button
                                                    onClick={() => handleDelete(job._id)}
                                                    className="myjobs-action-btn action-delete"
                                                    title="Delete Requisition"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Admin Moderation Feedback Notice (if rejected) */}
                                {job.status === 'rejected' && job.adminFeedback?.reason && (
                                    <div className="mx-3 -mt-2 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 shadow-2xs">
                                        <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-rose-800 font-bold text-xs uppercase tracking-wider mb-0.5">
                                                Admin Moderation Notice
                                            </p>
                                            <p className="text-rose-700 text-xs leading-relaxed">
                                                {job.adminFeedback.reason}
                                            </p>
                                            <div className="mt-2">
                                                <button
                                                    onClick={() => navigate(`/recruiter/post-job?edit=${job._id}`)}
                                                    className="text-xs font-bold text-rose-800 underline hover:text-rose-950 cursor-pointer"
                                                >
                                                    Edit requisition to address feedback →
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })
                ) : (
                    /* 6. Empty / No Results State */
                    <div className="myjobs-empty-state space-y-4">
                        <div className="myjobs-empty-icon">
                            <Briefcase size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                                ? 'No matching job campaigns found'
                                : 'No job campaigns published yet'}
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                                ? `No requisitions matched your current filters. Try changing or resetting your search parameters.`
                                : 'Create your first job requisition with automated AI resume parsing, proctored coding assessments, and video interviews.'}
                        </p>
                        
                        <div className="pt-2 flex items-center justify-center gap-3">
                            {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') ? (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setStatusFilter('all');
                                        setTypeFilter('all');
                                    }}
                                    className="rec-btn-secondary px-5 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            ) : (
                                <Link 
                                    to="/recruiter/post-job" 
                                    className="rec-btn-primary inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer"
                                >
                                    <Plus size={15} />
                                    <span>Post Your First Job</span>
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 7. Bulk Upload Modal Component */}
            <BulkUploadModal
                isOpen={uploadModalOpen}
                onClose={() => {
                    setUploadModalOpen(false);
                    setSelectedJobId(null);
                }}
                jobId={selectedJobId}
                onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['jobs', 'recruiter', userId] })}
            />
        </div>
    );
};

export default MyJobs;
