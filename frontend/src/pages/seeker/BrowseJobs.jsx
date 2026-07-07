import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, BriefcaseBusiness, ChevronRight, Building2, Clock3, Share2, Mail, Linkedin, Twitter, Copy, Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../firebase';
import { JobCardSkeleton } from '../../components/Skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
            const res = await axios.get(`${API_URL}/applications/seeker/${userId}`);
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
        onSuccess: () => {
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

        const existingApp = userApplications.find(app => (app.jobId?._id || app.jobId) === jobId);
        toggleSaveMutation.mutate({ jobId, existingApp });
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

    const getShareUrl = (jobId) => `${window.location.origin}/seeker/job/${jobId}`;

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
        <div className="space-y-8">
            <header className="rounded-[2.25rem] border border-black/10 bg-white px-8 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Browse jobs</p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">Discover roles built for your next move</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-500">
                            Explore active roles, compare hiring requirements, and move directly into the resume analysis workflow.
                        </p>
                    </div>

                    <div className="relative min-w-full lg:min-w-[360px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by role or company"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="w-full rounded-2xl border border-black/10 bg-[#faf7f1] py-4 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-black/20"
                        />
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <JobCardSkeleton key={i} />
                    ))}
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredJobs.length > 0 ? filteredJobs.map((job, index) => (
                        <motion.article
                            key={job._id}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-[#f4efe6] text-gray-700">
                                    <Building2 size={24} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-full border border-black/10 bg-[#f8f4ed] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                                        {job.type}
                                    </span>

                                    {(() => {
                                        const app = userApplications.find(a => (a.jobId?._id || a.jobId) === job._id);
                                        const isSaved = app?.status === 'SAVED';
                                        const isApplied = app && app.status !== 'SAVED';

                                        if (isApplied) return null;

                                        return (
                                            <button
                                                onClick={(e) => handleToggleSaveJob(e, job._id)}
                                                className={`rounded-full border p-1.5 transition-colors ${
                                                    isSaved 
                                                        ? 'bg-amber-500 border-amber-500 text-white' 
                                                        : 'border-black/10 bg-[#f8f4ed] text-gray-500 hover:bg-black hover:text-white'
                                                }`}
                                                title={isSaved ? "Unsave Job" : "Save Job"}
                                            >
                                                <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
                                            </button>
                                        );
                                    })()}

                                    <div className="share-container relative">
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setActiveShareJobId(activeShareJobId === job._id ? null : job._id);
                                            }}
                                            className={`rounded-full border p-1.5 text-gray-500 transition-colors ${
                                                activeShareJobId === job._id 
                                                    ? 'bg-black text-white border-black' 
                                                    : 'border-black/10 bg-[#f8f4ed] hover:bg-black hover:text-white'
                                            }`}
                                            title="Share Job"
                                        >
                                            <Share2 size={14} />
                                        </button>

                                        <AnimatePresence>
                                            {activeShareJobId === job._id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-black/10 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.12)] z-50 flex flex-col gap-1"
                                                >
                                                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 border-b border-black/5 mb-1 text-left">
                                                        Share this job
                                                    </div>

                                                    <button
                                                        onClick={(e) => handleCopyLink(e, job._id)}
                                                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-[#fbf8f3] transition-all text-left relative"
                                                    >
                                                        <Copy size={16} className="text-gray-400" />
                                                        <span>Copy Link</span>
                                                        {copiedJobId === job._id && (
                                                            <span className="absolute right-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                                                                Copied!
                                                            </span>
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={(e) => handleShareWhatsApp(e, job)}
                                                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-emerald-50 transition-all text-left"
                                                    >
                                                        <svg className="w-4 h-4 text-emerald-500 fill-current" viewBox="0 0 24 24">
                                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.99C16.558 1.874 14.088.843 11.45.843 6.012.843 1.587 5.263 1.584 10.707c-.001 1.677.447 3.312 1.3 4.747l-.996 3.636 3.727-.977z" />
                                                        </svg>
                                                        <span>WhatsApp</span>
                                                    </button>

                                                    <button
                                                        onClick={(e) => handleShareEmail(e, job)}
                                                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-purple-50 transition-all text-left"
                                                    >
                                                        <Mail size={16} className="text-purple-500" />
                                                        <span>Email</span>
                                                    </button>

                                                    <button
                                                        onClick={(e) => handleShareLinkedIn(e, job)}
                                                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-blue-50 transition-all text-left"
                                                    >
                                                        <Linkedin size={16} className="text-blue-600" />
                                                        <span>LinkedIn</span>
                                                    </button>

                                                    <button
                                                        onClick={(e) => handleShareTwitter(e, job)}
                                                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-sky-50 transition-all text-left"
                                                    >
                                                        <Twitter size={16} className="text-sky-500" />
                                                        <span>Twitter / X</span>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{job.title}</h2>
                                <p className="mt-2 text-sm text-gray-500">
                                    {job.company || job.recruiterId?.company?.name || 'hire1percent Partner'}
                                </p>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-500">
                                <span className="inline-flex items-center gap-2 rounded-full bg-[#fbf8f3] px-3 py-2">
                                    <MapPin size={14} />
                                    {job.location || 'Remote'}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-[#fbf8f3] px-3 py-2">
                                    <Clock3 size={14} />
                                    {job.experienceLevel || `${job.minExperience || 0}+ years`}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-[#fbf8f3] px-3 py-2">
                                    <BriefcaseBusiness size={14} />
                                    {job.type}
                                </span>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-2">
                                {job.skills?.slice(0, 4).map((skill) => (
                                    <span
                                        key={skill}
                                        className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-gray-600"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>

                            <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-[#fbf8f3] p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Application requirement</p>
                                <p className="mt-2 text-sm leading-6 text-gray-600">
                                    A minimum resume match of <span className="font-semibold text-gray-900">{job.minPercentage || 60}%</span> is needed to move to the next stage.
                                </p>
                            </div>

                            <Link
                                to={`/seeker/job/${job._id}`}
                                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                            >
                                View role
                                <ChevronRight size={16} />
                            </Link>
                        </motion.article>
                    )) : (
                        <div className="col-span-full rounded-[2rem] border border-dashed border-black/10 bg-white px-8 py-20 text-center shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                            <p className="text-lg font-medium text-gray-600">No jobs found for your current search.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BrowseJobs;
