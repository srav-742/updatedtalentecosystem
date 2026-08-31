import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, CheckCircle2, Clock3, FileText, Star, UserCircle, Zap, Sparkles, ChevronRight, Building2, MapPin, Target, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../firebase';
import { useQuery } from '@tanstack/react-query';
import { SeekerDashboardSkeleton } from '../../components/Skeleton';

// Avatar gradient palettes for company badges
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

const getCompanyMeta = (job, index) => {
    const companyName = job.company || job.recruiterId?.company?.name || job.recruiter?.company?.name || 'hire1percent Partner';
    const logoUrl = job.companyLogo || job.recruiter?.profilePic || job.recruiterId?.profilePic;
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

const StatCard = ({ label, value, icon: Icon, tone, sublabel, index = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group relative flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
    >
        <div className="flex items-center justify-between">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone} shadow-xs`}>
                <Icon size={20} />
            </div>
            <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                <TrendingUp size={12} className="text-emerald-500" />
                Live
            </span>
        </div>
        <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{sublabel}</p>
        </div>
    </motion.div>
);

const quickActions = [
    {
        title: 'Browse Jobs',
        description: 'Explore active roles with instant resume matching.',
        path: '/candidate/jobs',
        icon: Briefcase,
        badge: 'Recommended',
        tone: 'bg-blue-50 text-blue-700 border-blue-100'
    },
    {
        title: 'My Applications',
        description: 'Track application stages and assessment feedback.',
        path: '/candidate/applications',
        icon: FileText,
        badge: 'Pipeline',
        tone: 'bg-emerald-50 text-emerald-700 border-emerald-100'
    },
    {
        title: 'AI Mock Interview',
        description: 'Practice real-time technical & behavioural interviews.',
        path: '/candidate/mock-interview',
        icon: Zap,
        badge: 'AI Powered',
        tone: 'bg-purple-50 text-purple-700 border-purple-100'
    },
    {
        title: 'Profile & Resume',
        description: 'Keep your ATS profile and credentials recruiter-ready.',
        path: '/candidate/profile',
        icon: UserCircle,
        badge: 'Settings',
        tone: 'bg-amber-50 text-amber-700 border-amber-100'
    }
];

const SeekerDashboard = () => {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const userId = user.uid || user._id || user.id;

    // Fetch lightweight candidate stats instantly (<5ms)
    const { data: serverStats, isLoading: statsLoading } = useQuery({
        queryKey: ['applications', 'stats', userId],
        queryFn: async () => {
            if (!userId) return { applied: 0, eligible: 0, shortlisted: 0, availableJobs: 0 };
            const res = await axios.get(`${API_URL}/applications/candidate/${userId}/stats`);
            return res.data;
        },
        enabled: !!userId,
        staleTime: 60 * 1000,
    });

    // Secondary query for seeker's applications in background (caches for MyApplications tab)
    const { data: userApplications = [] } = useQuery({
        queryKey: ['applications', userId],
        queryFn: async () => {
            if (!userId) return [];
            const res = await axios.get(`${API_URL}/applications/candidate/${userId}`);
            return res.data;
        },
        enabled: !!userId && !serverStats,
        staleTime: 60 * 1000,
    });

    // Secondary query for jobs (caches for BrowseJobs tab)
    const { data: jobs = [] } = useQuery({
        queryKey: ['jobs'],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/jobs`);
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const stats = useMemo(() => {
        if (serverStats) {
            return {
                applied: serverStats.applied || 0,
                eligible: serverStats.eligible || 0,
                shortlisted: serverStats.shortlisted || 0,
                availableJobs: serverStats.availableJobs || jobs.length || 0
            };
        }
        return {
            applied: userApplications.length,
            eligible: userApplications.filter((item) => item.status === 'ELIGIBLE' || item.status === 'SHORTLISTED').length,
            shortlisted: userApplications.filter((item) => item.status === 'SHORTLISTED').length,
            availableJobs: jobs.length
        };
    }, [serverStats, userApplications, jobs]);

    const loading = statsLoading && !serverStats && userApplications.length === 0;

    const headline = useMemo(() => {
        if (stats.shortlisted > 0) {
            return 'Your applications are gaining strong recruiter traction.';
        }
        if (stats.applied > 0) {
            return 'Your candidate pipeline is actively being reviewed.';
        }
        return 'Discover curated roles, test your skills, and fast-track your hiring.';
    }, [stats.applied, stats.shortlisted]);

    // Recommended top 3 open jobs preview
    const recommendedJobs = useMemo(() => {
        return jobs.slice(0, 3);
    }, [jobs]);

    if (loading) return <SeekerDashboardSkeleton />;

    return (
        <div className="space-y-6">
            {/* Header Hero Banner */}
            <header className="overflow-hidden rounded-3xl border border-black/10 bg-gradient-to-br from-white via-[#fcfaf6] to-[#f4eee4] px-7 py-7 shadow-[0_16px_50px_rgba(15,23,42,0.04)]">
                <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-[#f4efe6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-gray-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Candidate Dashboard
                        </div>
                        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                            Welcome back, {user.name || 'Candidate'}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">{headline}</p>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <Link
                                to="/candidate/jobs"
                                className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.99]"
                            >
                                <span>Browse Roles</span>
                                <ArrowRight size={15} />
                            </Link>
                            <Link
                                to="/candidate/applications"
                                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/80 px-5 py-3 text-xs font-semibold text-gray-700 transition hover:bg-white active:scale-[0.99]"
                            >
                                <span>Track Applications</span>
                            </Link>
                            <Link
                                to="/candidate/mock-interview"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200/80 bg-purple-50/70 px-4 py-3 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
                            >
                                <Zap size={14} className="text-purple-600" />
                                <span>Practice AI Interview</span>
                            </Link>
                        </div>
                    </div>

                    {/* AI Copilot Status Card */}
                    <div className="rounded-2xl border border-black/10 bg-white/85 p-5 backdrop-blur-sm shadow-xs">
                        <div className="flex items-center justify-between border-b border-black/5 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white shadow-xs">
                                    <Zap size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-900">Hiring Momentum</p>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400">AI Screening Pipeline</p>
                                </div>
                            </div>
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                                Active
                            </span>
                        </div>

                        <div className="mt-3.5 space-y-2.5">
                            {[
                                { title: 'Resume Parsing', desc: 'Auto-extract skills & experience' },
                                { title: 'Skill Match & Assessment', desc: 'Instant qualification benchmark' },
                                { title: 'AI Mock Interview', desc: 'Live practice with instant feedback' }
                            ].map((step, idx) => (
                                <div key={step.title} className="flex items-start gap-2.5">
                                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-black text-white text-[9px] font-bold">
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-900 leading-tight">{step.title}</p>
                                        <p className="text-[11px] text-gray-500 leading-tight">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* Metrics 4-Stat Grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard 
                    label="Applied Jobs" 
                    value={stats.applied} 
                    icon={Briefcase} 
                    tone="bg-blue-50 text-blue-700 border border-blue-100" 
                    sublabel="Active in your pipeline"
                    index={0}
                />
                <StatCard 
                    label="Eligible Roles" 
                    value={stats.eligible} 
                    icon={Star} 
                    tone="bg-emerald-50 text-emerald-700 border border-emerald-100" 
                    sublabel="Qualified match >= 60%"
                    index={1}
                />
                <StatCard 
                    label="Shortlisted" 
                    value={stats.shortlisted} 
                    icon={CheckCircle2} 
                    tone="bg-amber-50 text-amber-700 border border-amber-100" 
                    sublabel="Ready for interview round"
                    index={2}
                />
                <StatCard 
                    label="Open Roles" 
                    value={stats.availableJobs} 
                    icon={Clock3} 
                    tone="bg-purple-50 text-purple-700 border border-purple-100" 
                    sublabel="Active hiring postings"
                    index={3}
                />
            </div>

            {/* Featured Recommended Jobs Preview */}
            {recommendedJobs.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Featured Roles</p>
                            <h2 className="text-xl font-bold tracking-tight text-gray-900">Recommended for your profile</h2>
                        </div>
                        <Link 
                            to="/candidate/jobs" 
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-black transition"
                        >
                            <span>View all roles ({stats.availableJobs})</span>
                            <ChevronRight size={14} />
                        </Link>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {recommendedJobs.map((job, idx) => {
                            const { companyName, logoUrl, gradient, initials } = getCompanyMeta(job, idx);

                            return (
                                <motion.div
                                    key={job._id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="group flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {logoUrl ? (
                                                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-white">
                                                        <img src={logoUrl} alt={companyName} className="h-full w-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} font-bold text-xs`}>
                                                        {initials}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-medium text-gray-500" title={companyName}>
                                                        {companyName}
                                                    </p>
                                                    <span className="inline-block rounded-md border border-black/5 bg-[#f8f4ed] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gray-600">
                                                        {job.type || 'Full-time'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="mt-3 text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-black" title={job.title}>
                                            {job.title}
                                        </h3>

                                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-[#faf7f1] px-2 py-0.5 border border-black/[0.04] text-[11px]">
                                                <MapPin size={11} className="text-gray-400" />
                                                {job.location || 'Remote'}
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-md bg-[#faf7f1] px-2 py-0.5 border border-black/[0.04] text-[11px]">
                                                <Clock3 size={11} className="text-gray-400" />
                                                {job.experienceLevel || `${job.minExperience || 0}+ yrs`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-3.5 pt-3 border-t border-black/5 flex items-center justify-between gap-2">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                                            <Sparkles size={12} className="text-amber-500" />
                                            Match: {job.minPercentage || 60}%
                                        </span>

                                        <Link
                                            to={`/candidate/job/${job._id}`}
                                            className="inline-flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800"
                                        >
                                            <span>Apply</span>
                                            <ChevronRight size={13} />
                                        </Link>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Quick Action Grid & Profile Readiness Split Section */}
            <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                {/* Quick Actions 2x2 Grid */}
                <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.04)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Action Center</p>
                                <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900">Career Tools & Navigation</h2>
                            </div>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f4efe6] text-gray-600">
                                <Target size={15} />
                            </span>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {quickActions.map((item, index) => {
                                const Icon = item.icon;

                                return (
                                    <motion.div
                                        key={item.title}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.04 }}
                                    >
                                        <Link
                                            to={item.path}
                                            className="group flex flex-col justify-between rounded-2xl border border-black/10 bg-[#fdfbf7] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-black/20 hover:bg-white hover:shadow-[0_12px_30px_rgba(15,23,42,0.05)] h-full"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone} border`}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                        {item.badge}
                                                    </span>
                                                </div>
                                                <h3 className="mt-3 text-sm font-bold text-gray-900 group-hover:text-black">{item.title}</h3>
                                                <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.description}</p>
                                            </div>
                                            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-gray-900 group-hover:underline">
                                                <span>Open</span>
                                                <ArrowRight size={13} />
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Profile Readiness & Checklist */}
                <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.04)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Candidate Checklist</p>
                                <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900">Profile Readiness</h2>
                            </div>
                            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5">
                                High Priority
                            </span>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                            Complete these key steps to maximize your automated resume score and recruiter shortlisting.
                        </p>

                        <div className="mt-4 space-y-2.5">
                            {[
                                { text: 'Upload latest resume for instant AI parsing', done: true },
                                { text: 'Complete technical skills & experience details', done: true },
                                { text: 'Practice AI mock interview to test readiness', done: false },
                                { text: 'Review application status updates regularly', done: true }
                            ].map((item) => (
                                <div key={item.text} className="flex items-center gap-2.5 rounded-xl border border-black/[0.04] bg-[#faf7f1] p-3">
                                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${item.done ? 'bg-emerald-600 text-white' : 'border border-gray-300 bg-white text-transparent'}`}>
                                        <CheckCircle2 size={13} className={item.done ? 'text-white' : 'text-gray-300'} />
                                    </div>
                                    <p className="text-xs font-medium text-gray-700 leading-tight">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Link
                        to="/candidate/profile"
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-[#faf7f1] py-2.5 text-xs font-semibold text-gray-800 transition hover:bg-black hover:text-white"
                    >
                        <span>Update Profile Settings</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default SeekerDashboard;
