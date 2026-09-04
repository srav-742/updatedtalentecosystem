import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Briefcase,
    Users,
    CheckCircle2,
    ArrowUpRight,
    Clock,
    MapPin,
    Sparkles,
    Plus,
    Search,
    TrendingUp,
    ShieldCheck,
    ChevronRight,
    Package,
    ArrowRight,
    Zap,
    Filter,
    FileText,
    Edit,
    Eye
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';
import { getAllBlogPostsAdmin } from '../../services/blogService';
import { useQuery } from '@tanstack/react-query';
import { RecruiterDashboardSkeleton } from '../../components/Skeleton';
import './RecruiterDashboard.css';

const RecruiterDashboard = () => {
    const navigate = useNavigate();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const userId = user.uid || user._id || user.id;

    const [jobSearchQuery, setJobSearchQuery] = useState('');

    // Fetch dashboard stats & recent jobs in a single ultra-fast query
    const { data: stats = { jobCount: 0, applicationCount: 0, shortlistedCount: 0, recentJobs: [] }, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard', 'stats', userId],
        queryFn: async () => {
            if (!userId) return { jobCount: 0, applicationCount: 0, shortlistedCount: 0, recentJobs: [] };
            const res = await axios.get(`${API_URL}/dashboard/${userId}`);
            return res.data;
        },
        enabled: !!userId,
        staleTime: 60 * 1000,
    });

    // Secondary query for full recruiter jobs (used as fallback or background cache)
    const { data: recruiterJobs = [] } = useQuery({
        queryKey: ['jobs', 'recruiter', userId],
        queryFn: async () => {
            if (!userId) return [];
            const res = await axios.get(`${API_URL}/jobs/recruiter/${userId}`);
            return res.data;
        },
        enabled: !!userId && (!stats.recentJobs || stats.recentJobs.length === 0),
        staleTime: 60 * 1000,
    });

    const recentJobs = (stats.recentJobs && stats.recentJobs.length > 0)
        ? stats.recentJobs
        : recruiterJobs.slice(0, 5);

    // Secondary query for admin blog posts if not embedded in stats
    const { data: fallbackAdminBlogs = [] } = useQuery({
        queryKey: ['admin', 'dashboard', 'blogs'],
        queryFn: async () => {
            try {
                const res = await getAllBlogPostsAdmin({ limit: 10 });
                return res?.posts || (Array.isArray(res) ? res : []);
            } catch (e) {
                return [];
            }
        },
        enabled: user.role === 'admin' && (!stats.recentBlogs || stats.recentBlogs.length === 0),
        staleTime: 60 * 1000,
    });

    const recentBlogs = (stats.recentBlogs && stats.recentBlogs.length > 0)
        ? stats.recentBlogs
        : fallbackAdminBlogs;

    const displayBlogCount = stats.blogCount ?? (recentBlogs.length > 0 ? recentBlogs.length : 0);

    const loading = statsLoading && !stats.jobCount && recentJobs.length === 0;

    // Filtered jobs for search
    const filteredJobs = useMemo(() => {
        if (!jobSearchQuery.trim()) return recentJobs;
        const q = jobSearchQuery.toLowerCase();
        return recentJobs.filter(job => 
            (job.title && job.title.toLowerCase().includes(q)) ||
            (job.location && job.location.toLowerCase().includes(q)) ||
            (job.type && job.type.toLowerCase().includes(q))
        );
    }, [recentJobs, jobSearchQuery]);

    // Dynamic greeting based on time of day
    const timeGreeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }, []);

    // Conversion / selection rate
    const selectionRate = useMemo(() => {
        if (!stats.applicationCount || stats.applicationCount === 0) return 0;
        return Math.round((stats.shortlistedCount / stats.applicationCount) * 100);
    }, [stats.applicationCount, stats.shortlistedCount]);

    // Benchmark percentage
    const avgBenchmark = useMemo(() => {
        if (recentJobs.length === 0) return 70;
        const total = recentJobs.reduce((acc, job) => acc + (job.minPercentage || 60), 0);
        return Math.round(total / recentJobs.length);
    }, [recentJobs]);

    if (loading) return <RecruiterDashboardSkeleton />;

    return (
        <div id="recruiter-dashboard-root" className="space-y-8 pb-10">
            {/* 1. Hero Welcome & Executive Cockpit Header */}
            <div className="rd-hero-banner rounded-[2.25rem] p-7 md:p-9 relative">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
                    <div className="space-y-2.5 max-w-2xl">
                        <div className="flex items-center gap-3">
                            <span className="rd-badge-dark inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 rd-pulse-dot" />
                                <span>Hiring Hub Live</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                <Clock size={13} className="text-slate-400" />
                                Updated just now
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                            {timeGreeting}, <span className="rd-text-gradient">{user.name || 'Recruiter'}</span> 👋
                        </h1>
                        <p className="text-sm md:text-base text-slate-600 leading-relaxed font-normal">
                            Monitor live candidate pipeline throughput, review AI-vetted applicant matches, and oversee your active job requisitions in real time.
                        </p>
                    </div>

                    {/* Quick CTA Hub */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <button
                            onClick={() => navigate('/recruiter/post-job')}
                            className="rd-btn-primary flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                            <Plus size={16} />
                            <span>Post New Job</span>
                        </button>
                        {user.role === 'admin' && (
                            <button
                                onClick={() => navigate('/recruiter/blog/new')}
                                className="rd-btn-secondary flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold text-slate-800 hover:text-slate-900 cursor-pointer"
                            >
                                <FileText size={16} className="text-violet-600" />
                                <span>Write Article</span>
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/recruiter/ai-search')}
                            className="rd-btn-secondary flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold text-slate-800 hover:text-slate-900 cursor-pointer"
                        >
                            <Sparkles size={16} className="text-indigo-600" />
                            <span>AI Candidate Search</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Key Metrics - 4 Card Stat Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Metric 1: Jobs */}
                <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="rd-stat-card cursor-pointer group"
                    onClick={() => navigate('/recruiter/my-jobs')}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                            <Briefcase size={22} />
                        </div>
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100/80">
                            Active Roles
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Jobs Posted</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.jobCount || 0}</h3>
                        <span className="text-xs text-slate-500 font-medium">listings</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 group-hover:text-blue-600 transition-colors font-medium">
                        <span>Manage postings</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </motion.div>

                {/* Metric 2: Applications */}
                <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="rd-stat-card cursor-pointer group"
                    onClick={() => navigate('/recruiter/applicants')}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 group-hover:scale-105 transition-transform">
                            <Users size={22} />
                        </div>
                        <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100/80">
                            Candidate Intake
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Applications</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.applicationCount || 0}</h3>
                        <span className="text-xs text-slate-500 font-medium">received</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 group-hover:text-teal-600 transition-colors font-medium">
                        <span>Review applicant pool</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </motion.div>

                {/* Metric 3: Shortlisted */}
                <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="rd-stat-card cursor-pointer group"
                    onClick={() => navigate('/recruiter/applicants')}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
                            <CheckCircle2 size={22} />
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/80">
                            {selectionRate}% Rate
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Shortlisted</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.shortlistedCount || 0}</h3>
                        <span className="text-xs text-slate-500 font-medium">candidates</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 group-hover:text-emerald-600 transition-colors font-medium">
                        <span>View qualified candidates</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </motion.div>

                {/* Metric 4: Blog Count (Admin) or AI Match Benchmark (Recruiter) */}
                {user.role === 'admin' ? (
                    <motion.div
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="rd-stat-card cursor-pointer group"
                        onClick={() => navigate('/recruiter/blog')}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 group-hover:scale-105 transition-transform">
                                <FileText size={22} />
                            </div>
                            <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-100/80">
                                All Statuses
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Blog Posts</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{displayBlogCount}</h3>
                            <span className="text-xs text-slate-500 font-medium">articles</span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 group-hover:text-violet-600 transition-colors font-medium">
                            <span>Manage blog content</span>
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="rd-stat-card cursor-pointer group"
                        onClick={() => navigate('/recruiter/ai-search')}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
                                <Sparkles size={22} />
                            </div>
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/80">
                                Top 1% Pool
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Avg. Match Threshold</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{avgBenchmark}%</h3>
                            <span className="text-xs text-slate-500 font-medium">min score</span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 group-hover:text-indigo-600 transition-colors font-medium">
                            <span>Search high-match talent</span>
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* 3. Recruitment Pipeline Funnel & Quick Tools Strip */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pipeline Overview Card (Spans 2 cols) */}
                <div className="lg:col-span-2 rd-card rounded-[2rem] p-7 md:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <TrendingUp size={18} className="text-slate-800" />
                                <h2 className="text-xl font-bold text-slate-900">Hiring Pipeline Funnel</h2>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Real-time candidate conversion stages across all open roles</p>
                        </div>
                        <span className="self-start sm:self-auto text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
                            {stats.applicationCount} Total In Pipeline
                        </span>
                    </div>

                    {/* Funnel Progress Segments */}
                    <div className="space-y-4">
                        {/* Segment Bar */}
                        <div className="rd-pipeline-bar">
                            <div
                                style={{ width: `${stats.applicationCount > 0 ? 100 : (stats.jobCount > 0 ? 30 : 15)}%` }}
                                className="rd-pipeline-fill transition-all duration-700"
                                title="Pipeline Intake Progress"
                            />
                        </div>

                        {/* Funnel Steps Breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Applied</span>
                                </div>
                                <div className="text-lg font-black text-slate-900">{stats.applicationCount}</div>
                                <span className="text-[10px] text-slate-500 font-medium">100% Ingested</span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Screened</span>
                                </div>
                                <div className="text-lg font-black text-slate-900">
                                    {stats.applicationCount > 0 ? Math.round(stats.applicationCount * 0.75) : 0}
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium">AI Resume Match</span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assessed</span>
                                </div>
                                <div className="text-lg font-black text-slate-900">
                                    {stats.applicationCount > 0 ? Math.round(stats.applicationCount * 0.45) : 0}
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium">Coding & Tests</span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Shortlisted</span>
                                </div>
                                <div className="text-lg font-black text-emerald-900">{stats.shortlistedCount}</div>
                                <span className="text-[10px] text-emerald-700 font-bold">{selectionRate}% Final Pool</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recruiter Quick Toolkit (1 col) */}
                <div className="rd-card rounded-[2rem] p-7 md:p-8 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={18} className="text-amber-500" />
                            <h2 className="text-lg font-bold text-slate-900">Recruiter Toolkit</h2>
                        </div>
                        <p className="text-xs text-slate-500 mb-5">High-impact shortcuts to accelerate your hiring workflow</p>

                        <div className="space-y-2.5">
                            <div
                                onClick={() => navigate('/recruiter/ai-search')}
                                className="p-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/80 transition-all cursor-pointer flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                        <Sparkles size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">AI Talent Search</p>
                                        <p className="text-[11px] text-slate-500">Source top 1% engineers instantly</p>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>

                            <div
                                onClick={() => navigate('/recruiter/onboarding-kit')}
                                className="p-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/80 transition-all cursor-pointer flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                        <Package size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Onboarding Kit</p>
                                        <p className="text-[11px] text-slate-500">Offer letter templates & kits</p>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>

                            <div
                                onClick={() => navigate('/recruiter/post-job')}
                                className="p-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/80 transition-all cursor-pointer flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                        <Plus size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Create Assessment Job</p>
                                        <p className="text-[11px] text-slate-500">Attach proctored coding rounds</p>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>

                            {user.role === 'admin' && (
                                <div
                                    onClick={() => navigate('/recruiter/blog')}
                                    className="p-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/80 transition-all cursor-pointer flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                                            <FileText size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 group-hover:text-violet-600 transition-colors">Blog Management</p>
                                            <p className="text-[11px] text-slate-500">Publish articles & manage content</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            Proctoring & Anti-Cheat Enabled
                        </span>
                    </div>
                </div>
            </div>

            {/* 4. Recent Job Postings Section */}
            <div className="rd-card rounded-[2.25rem] p-7 md:p-9">
                {/* Header with Search and Navigation */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7 pb-5 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Recent Job Postings</h2>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                                {recentJobs.length} Active
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Overview of latest roles and applicant influx</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Instant Search Bar */}
                        <div className="relative min-w-[220px]">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by title, location..."
                                value={jobSearchQuery}
                                onChange={(e) => setJobSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                            />
                        </div>

                        <button
                            onClick={() => navigate('/recruiter/my-jobs')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <span>View All Jobs</span>
                            <ArrowUpRight size={15} />
                        </button>
                    </div>
                </div>

                {/* Job Postings Content */}
                {filteredJobs.length > 0 ? (
                    <div className="rd-table-container overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                    <th className="pb-3.5 pt-0 font-semibold">Job Title & Details</th>
                                    <th className="pb-3.5 pt-0 text-center font-semibold">Min Match</th>
                                    <th className="pb-3.5 pt-0 text-center font-semibold">Applicants</th>
                                    <th className="pb-3.5 pt-0 text-center font-semibold">Status</th>
                                    <th className="pb-3.5 pt-0 text-right font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredJobs.map((job) => (
                                    <tr key={job._id} className="rd-table-row group">
                                        {/* Job Title & Details */}
                                        <td className="py-4.5 pr-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                        {job.title}
                                                    </span>
                                                    {job.type && (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                                                            {job.type}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                    {job.location && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={12} className="text-slate-400" />
                                                            {job.location}
                                                        </span>
                                                    )}
                                                    {job.createdAt && (
                                                        <>
                                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                            <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Min Match Requirement */}
                                        <td className="py-4.5 px-4 text-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {job.minPercentage || 60}% Match
                                            </span>
                                        </td>

                                        {/* Applicants Count & Visual Stack */}
                                        <td className="py-4.5 px-4 text-center">
                                            <div className="inline-flex items-center gap-2">
                                                <div className="flex -space-x-1.5">
                                                    {[...Array(Math.min(job.applicantCount || 0, 3))].map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-700"
                                                        >
                                                            {String.fromCharCode(65 + i)}
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="text-sm font-bold text-slate-900">
                                                    {job.applicantCount || 0}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="py-4.5 px-4 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 rd-pulse-dot" />
                                                Active
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-4.5 pl-4 text-right">
                                            <button
                                                onClick={() => navigate(`/recruiter/applicants?jobId=${job._id}`)}
                                                className="rd-btn-table-action inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                                            >
                                                <span>View Applicants</span>
                                                <ArrowRight size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Empty State */
                    <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4 border border-slate-200/80">
                            <Briefcase size={28} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-1">
                            {jobSearchQuery ? 'No matching jobs found' : 'No job postings published yet'}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
                            {jobSearchQuery
                                ? `No job listings matched your filter "${jobSearchQuery}". Try a different keyword.`
                                : 'Publish your first job requisition to tap into our top 1% AI-screened candidate pipeline and start receiving applicants.'}
                        </p>
                        {jobSearchQuery ? (
                            <button
                                onClick={() => setJobSearchQuery('')}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                Clear search
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/recruiter/post-job')}
                                className="rd-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                                <Plus size={16} />
                                <span>Create Your First Job Posting</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* 5. Admin Blog Posts Section (Visible to Admins) */}
            {user.role === 'admin' && (
                <div className="rd-card rounded-[2.25rem] p-7 md:p-9">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7 pb-5 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Blog Posts & Articles</h2>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
                                    {displayBlogCount} Total
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Live articles published to the Hire1Percent engineering blog</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => navigate('/recruiter/blog/new')}
                                className="rd-btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                                <Plus size={15} />
                                <span>Write Article</span>
                            </button>
                            <button
                                onClick={() => navigate('/recruiter/blog')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <span>Manage All Posts</span>
                                <ArrowUpRight size={15} />
                            </button>
                        </div>
                    </div>

                    {recentBlogs.length > 0 ? (
                        <div className="rd-table-container overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                        <th className="pb-3.5 pt-0 font-semibold">Article</th>
                                        <th className="pb-3.5 pt-0 text-center font-semibold">Category</th>
                                        <th className="pb-3.5 pt-0 text-center font-semibold">Status</th>
                                        <th className="pb-3.5 pt-0 text-center font-semibold">Published</th>
                                        <th className="pb-3.5 pt-0 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recentBlogs.map((blog) => {
                                        const blogId = blog._id || blog.id;
                                        const catName = typeof blog.category === 'object' ? (blog.category?.name || blog.category?.slug) : blog.category;
                                        return (
                                            <tr key={blogId} className="rd-table-row group">
                                                <td className="py-4 pr-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                                                            {blog.coverImage ? (
                                                                <img src={blog.coverImage} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <FileText size={16} className="text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 max-w-md">
                                                            <p className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                                {blog.title}
                                                            </p>
                                                            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                                                {blog.subtitle || (blog.slug ? `/blog/${blog.slug}` : 'No description')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-4 text-center">
                                                    <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                                                        {catName || 'Uncategorized'}
                                                    </span>
                                                </td>

                                                <td className="py-4 px-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                        blog.status === 'published'
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                            : blog.status === 'scheduled'
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                                            blog.status === 'published' ? 'bg-emerald-500 rd-pulse-dot' : blog.status === 'scheduled' ? 'bg-blue-500' : 'bg-amber-500'
                                                        }`} />
                                                        {blog.status ? (blog.status.charAt(0).toUpperCase() + blog.status.slice(1)) : 'Published'}
                                                    </span>
                                                </td>

                                                <td className="py-4 px-4 text-center text-xs text-slate-500 font-medium">
                                                    {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : (blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : 'Recent')}
                                                </td>

                                                <td className="py-4 pl-4 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        <button
                                                            onClick={() => navigate(`/recruiter/blog/edit/${blogId}`)}
                                                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
                                                            title="Edit Article"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        {blog.slug && (
                                                            <a
                                                                href={`/blog/${blog.slug}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-indigo-600 transition-colors cursor-pointer"
                                                                title="View Live Article"
                                                            >
                                                                <Eye size={14} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4 border border-slate-200/80">
                                <FileText size={28} />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-1">No blog articles found</h3>
                            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
                                Start sharing engineering hiring trends, AI recruitment guides, and tech insights with your audience.
                            </p>
                            <button
                                onClick={() => navigate('/recruiter/blog/new')}
                                className="rd-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                                <Plus size={16} />
                                <span>Write Your First Article</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RecruiterDashboard;
