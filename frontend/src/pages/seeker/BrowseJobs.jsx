import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, ChevronRight, Clock3, Share2, Mail, Linkedin, Twitter, Copy, Bookmark, Sparkles, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../firebase';
import { JobCardSkeleton } from '../../components/Skeleton';
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

const getCompanyMeta = (job, index) => {
    const companyName = job.company || job.recruiterId?.company?.name || job.recruiter?.company?.name || 'hire1percent Partner';
    const logoUrl = job.companyLogo || job.recruiter?.profilePic || job.recruiterId?.profilePic;
    
    // Deterministic gradient selection
    const hash = companyName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradient = AVATAR_GRADIENTS[(hash + index) % AVATAR_GRADIENTS.length];
    
    // Extract initials (smart detection for hire1percent, multi-word, and camelCase)
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

const BrowseJobs = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeShareJobId, setActiveShareJobId] = useState(null);
    const [copiedJobId, setCopiedJobId] = useState(null);
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

    const userId = user.uid || user._id || user.id;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeShareJobId && !event.target.closest('.share-container')) {
                setActiveShareJobId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeShareJobId]);

    // Fetch jobs using React Query
    const { data: jobs = [], isLoading: jobsLoading } = useQuery({
        queryKey: ['jobs'],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/jobs`);
            return res.data;
        }
    });

    // Fetch seeker's applications using React Query
    const { data: userApplications = [], isLoading: appsLoading } = useQuery({
        queryKey: ['applications', userId],
        queryFn: async () => {
            if (!userId) return [];
            const res = await axios.get(`${API_URL}/applications/candidate/${userId}`);
            return res.data;
        },
        enabled: !!userId
    });

    const loading = jobsLoading || appsLoading;

    // Mutation for toggling save state
    const toggleSaveMutation = useMutation({
        mutationFn: async ({ jobId, existingApp }) => {
            if (existingApp) {
                if (existingApp.status === 'SAVED') {
                    await axios.delete(`${API_URL}/applications/${existingApp._id || existingApp.id}`);
                }
            } else {
                await axios.post(`${API_URL}/applications`, {
                    jobId,
                    userId,
                    status: 'SAVED'
                });
            }
        },
        onSuccess: (_, variables) => {
            queryClient.setQueryData(['applications', userId], (oldApps) => {
                if (!oldApps) return [];
                if (variables.existingApp && variables.existingApp.status === 'SAVED') {
                    return oldApps.filter(app => app._id !== variables.existingApp._id && app.id !== variables.existingApp.id);
                } else if (!variables.existingApp) {
                    return [...oldApps, { _id: Date.now().toString(), jobId: variables.jobId, userId, status: 'SAVED' }];
                }
                return oldApps;
            });
            queryClient.invalidateQueries({ queryKey: ['applications', userId] });
        }
    });

    const handleToggleSaveJob = async (e, jobId) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!userId) {
            alert("Please log in to save jobs.");
            return;
        }

        const savedApp = userApplications.find(app => (app.jobId?._id || app.jobId) === jobId && app.status === 'SAVED');
        toggleSaveMutation.mutate({ jobId, existingApp: savedApp });
    };

    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            const companyName = job.company || job.recruiterId?.company?.name || '';
            return (
                job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                companyName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
    }, [jobs, searchTerm]);

    const getShareUrl = (jobId) => `${window.location.origin}/candidate/job/${jobId}`;

    const handleCopyLink = async (e, jobId) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(getShareUrl(jobId));
            setCopiedJobId(jobId);
            setTimeout(() => setCopiedJobId(null), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    const handleShareWhatsApp = (e, job) => {
        e.preventDefault();
        e.stopPropagation();
        const text = `Check out this job opportunity: ${job.title} — ${getShareUrl(job._id)}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleShareLinkedIn = (e, job) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl(job._id))}`, '_blank');
    };

    const handleShareTwitter = (e, job) => {
        e.preventDefault();
        e.stopPropagation();
        const text = `Check out this job opportunity: ${job.title}`;
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(getShareUrl(job._id))}&text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleShareEmail = (e, job) => {
        e.preventDefault();
        e.stopPropagation();
        const subject = `Job Opportunity: ${job.title}`;
        const body = `Hi,\n\nCheck out this exciting job opportunity:\n\n${job.title}\nLocation: ${job.location || 'Remote'}\n\nView details and apply here:\n${getShareUrl(job._id)}\n\nBest regards`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
    };

    return (
        <div className="space-y-6">
            <header className="rounded-3xl border border-black/10 bg-white px-7 py-6 shadow-[0_16px_50px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Browse jobs</p>
                        </div>
                        <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">Discover roles built for your next move</h1>
                        <p className="mt-1 text-xs md:text-sm text-gray-500">
                            Explore active opportunities, compare minimum match requirements, and fast-track your applications.
                        </p>
                    </div>

                    <div className="relative min-w-full lg:min-w-[340px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                        <input
                            type="text"
                            placeholder="Search by role or company..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="w-full rounded-2xl border border-black/10 bg-[#faf7f1] py-3.5 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-black/30 focus:bg-white"
                        />
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <JobCardSkeleton key={i} />
                    ))}
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredJobs.length > 0 ? filteredJobs.map((job, index) => {
                        const { companyName, logoUrl, gradient, initials } = getCompanyMeta(job, index);
                        const savedApp = userApplications.find(a => (a.jobId?._id || a.jobId) === job._id && a.status === 'SAVED');
                        const isSaved = !!savedApp;

                        return (
                            <motion.article
                                key={job._id}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="group relative flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)]"
                            >
                                <div>
                                    {/* Card Header: Avatar, Company/Type & Action buttons */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Company Avatar / Logo */}
                                            <div className="relative shrink-0">
                                                {logoUrl ? (
                                                    <div className="h-11 w-11 overflow-hidden rounded-xl border border-black/10 bg-white shadow-xs">
                                                        <img src={logoUrl} alt={companyName} className="h-full w-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-xs font-bold text-sm tracking-wider`}>
                                                        {initials}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-medium text-gray-500" title={companyName}>
                                                    {companyName}
                                                </p>
                                                <span className="mt-0.5 inline-block rounded-md border border-black/5 bg-[#f8f4ed] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                                                    {job.type || 'Full-time'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action buttons (Bookmark & Share) */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={(e) => handleToggleSaveJob(e, job._id)}
                                                className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
                                                    isSaved 
                                                        ? 'bg-amber-500 border-amber-500 text-white' 
                                                        : 'border-black/10 bg-[#f8f4ed] text-gray-500 hover:bg-black hover:text-white'
                                                }`}
                                                title={isSaved ? "Unsave Job" : "Save Job"}
                                            >
                                                <Bookmark size={13} fill={isSaved ? "currentColor" : "none"} />
                                            </button>

                                            <div className="share-container relative">
                                                <button 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setActiveShareJobId(activeShareJobId === job._id ? null : job._id);
                                                    }}
                                                    className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
                                                        activeShareJobId === job._id 
                                                            ? 'bg-black text-white border-black' 
                                                            : 'border-black/10 bg-[#f8f4ed] text-gray-500 hover:bg-black hover:text-white'
                                                    }`}
                                                    title="Share Job"
                                                >
                                                    <Share2 size={13} />
                                                </button>

                                                <AnimatePresence>
                                                    {activeShareJobId === job._id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                            transition={{ duration: 0.15 }}
                                                            className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white border border-black/10 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)] z-50 flex flex-col gap-1"
                                                        >
                                                            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 border-b border-black/5 mb-1 text-left">
                                                                Share this job
                                                            </div>

                                                            <button
                                                                onClick={(e) => handleCopyLink(e, job._id)}
                                                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-[#fbf8f3] transition-all text-left relative"
                                                            >
                                                                <Copy size={14} className="text-gray-400" />
                                                                <span>Copy Link</span>
                                                                {copiedJobId === job._id && (
                                                                    <span className="absolute right-2 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-semibold">
                                                                        Copied!
                                                                    </span>
                                                                )}
                                                            </button>

                                                            <button
                                                                onClick={(e) => handleShareWhatsApp(e, job)}
                                                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-emerald-50 transition-all text-left"
                                                            >
                                                                <svg className="w-3.5 h-3.5 text-emerald-500 fill-current" viewBox="0 0 24 24">
                                                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.99C16.558 1.874 14.088.843 11.45.843 6.012.843 1.587 5.263 1.584 10.707c-.001 1.677.447 3.312 1.3 4.747l-.996 3.636 3.727-.977z" />
                                                                </svg>
                                                                <span>WhatsApp</span>
                                                            </button>

                                                            <button
                                                                onClick={(e) => handleShareEmail(e, job)}
                                                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-purple-50 transition-all text-left"
                                                            >
                                                                <Mail size={14} className="text-purple-500" />
                                                                <span>Email</span>
                                                            </button>

                                                            <button
                                                                onClick={(e) => handleShareLinkedIn(e, job)}
                                                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-blue-50 transition-all text-left"
                                                            >
                                                                <Linkedin size={14} className="text-blue-600" />
                                                                <span>LinkedIn</span>
                                                            </button>

                                                            <button
                                                                onClick={(e) => handleShareTwitter(e, job)}
                                                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-sky-50 transition-all text-left"
                                                            >
                                                                <Twitter size={14} className="text-sky-500" />
                                                                <span>Twitter / X</span>
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Job Title */}
                                    <div className="mt-3.5">
                                        <h2 className="text-base font-semibold tracking-tight text-gray-900 line-clamp-1 group-hover:text-black" title={job.title}>
                                            {job.title}
                                        </h2>
                                    </div>

                                    {/* Meta pills: Location & Experience */}
                                    <div className="mt-2.5 flex flex-wrap gap-2 text-xs text-gray-600">
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#faf7f1] px-2.5 py-1 border border-black/[0.04]">
                                            <MapPin size={12} className="text-gray-400" />
                                            {job.location || 'Remote'}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#faf7f1] px-2.5 py-1 border border-black/[0.04]">
                                            <Clock3 size={12} className="text-gray-400" />
                                            {job.experienceLevel || `${job.minExperience || 0}+ yrs`}
                                        </span>
                                    </div>

                                    {/* Skills (compact badges) */}
                                    {job.skills && job.skills.length > 0 && (
                                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                            {job.skills.slice(0, 3).map((skill) => (
                                                <span
                                                    key={skill}
                                                    className="rounded-md border border-black/10 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                            {job.skills.length > 3 && (
                                                <span className="text-[10px] font-medium text-gray-400">
                                                    +{job.skills.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Bottom section: Requirement bar & View role button */}
                                <div className="mt-4 pt-3 border-t border-black/5 space-y-3">
                                    <div className="flex items-center justify-between rounded-xl bg-[#faf7f1] px-3 py-1.5 border border-black/[0.04] text-xs">
                                        <span className="flex items-center gap-1.5 font-medium text-gray-500 text-[11px]">
                                            <Sparkles size={13} className="text-amber-500" />
                                            Min. Resume Match
                                        </span>
                                        <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded-md border border-black/5 shadow-xs text-[11px]">
                                            {job.minPercentage || 60}%
                                        </span>
                                    </div>

                                    <Link
                                        to={`/candidate/job/${job._id}`}
                                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800 active:scale-[0.99]"
                                    >
                                        <span>View Role</span>
                                        <ChevronRight size={14} />
                                    </Link>
                                </div>
                            </motion.article>
                        );
                    }) : (
                        <div className="col-span-full rounded-3xl border border-dashed border-black/10 bg-white px-8 py-16 text-center shadow-[0_16px_50px_rgba(15,23,42,0.04)]">
                            <Building2 className="mx-auto text-gray-300 mb-3" size={36} />
                            <p className="text-base font-semibold text-gray-900">No jobs found</p>
                            <p className="text-xs text-gray-500 mt-1">Try adjusting your search keywords</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BrowseJobs;
