import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Building2,
    ChevronLeft,
    Clock3,
    FileUp,
    GraduationCap,
    MapPin,
    Sparkles,
    Wand2,
    Share2,
    Mail,
    Linkedin,
    Twitter,
    Copy
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';
import { JobDetailSkeleton } from '../../components/Skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const JobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [showApplyOptions, setShowApplyOptions] = useState(false);
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const userId = user.uid || user._id || user.id;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showShareMenu && !event.target.closest('.share-container')) {
                setShowShareMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showShareMenu]);

    // Fetch individual job details
    const { data: job = null, isLoading: jobLoading } = useQuery({
        queryKey: ['job', id],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/jobs/${id}`);
            return res.data;
        },
        enabled: !!id
    });

    // Fetch seeker's applications to determine save/application status
    const { data: userApplications = [], isLoading: appsLoading } = useQuery({
        queryKey: ['applications', userId],
        queryFn: async () => {
            if (!userId) return [];
            const res = await axios.get(`${API_URL}/applications/seeker/${userId}`);
            return res.data;
        },
        enabled: !!userId
    });

    const loading = jobLoading || appsLoading;
    const application = userApplications.find((app) => (app.jobId?._id || app.jobId) === id);

    // Mutation for toggling save state
    const toggleSaveMutation = useMutation({
        mutationFn: async () => {
            if (application) {
                if (application.status === 'SAVED') {
                    await axios.delete(`${API_URL}/applications/${application._id || application.id}`);
                }
            } else {
                await axios.post(`${API_URL}/applications`, {
                    jobId: id,
                    userId,
                    status: 'SAVED'
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications', userId] });
        }
    });

    const isSaving = toggleSaveMutation.isPending;

    const handleToggleSaveJob = async () => {
        if (!userId) {
            alert("Please log in to save jobs.");
            return;
        }
        toggleSaveMutation.mutate();
    };

    if (loading) {
        return <JobDetailSkeleton />;
    }

    if (!job) {
        return (
            <div className="rounded-[2.5rem] border border-red-200 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <p className="text-lg font-medium text-red-600">Job not found.</p>
            </div>
        );
    }

    const getShareUrl = () => `${window.location.origin}/seeker/job/${job._id}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(getShareUrl());
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    const handleShareWhatsApp = () => {
        const text = `Check out this job opportunity: ${job.title} — ${getShareUrl()}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleShareLinkedIn = () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`, '_blank');
    };

    const handleShareTwitter = () => {
        const text = `Check out this job opportunity: ${job.title}`;
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleShareEmail = () => {
        const subject = `Job Opportunity: ${job.title}`;
        const body = `Hi,\n\nCheck out this exciting job opportunity:\n\n${job.title}\nLocation: ${job.location || 'Remote'}\n\nView details and apply here:\n${getShareUrl()}\n\nBest regards`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#faf7f1]"
                >
                    <ChevronLeft size={16} />
                    Back to jobs
                </button>
                <div className="share-container relative">
                    <button
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#faf7f1]"
                    >
                        <Share2 size={16} />
                        Share Job
                    </button>

                    <AnimatePresence>
                        {showShareMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-black/10 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.12)] z-50 flex flex-col gap-1"
                            >
                                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 border-b border-black/5 mb-1">
                                    Share this job
                                </div>

                                <button
                                    onClick={handleCopyLink}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-[#fbf8f3] transition-all text-left relative"
                                >
                                    <Copy size={16} className="text-gray-400" />
                                    <span>Copy Link</span>
                                    {copiedLink && (
                                        <span className="absolute right-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                                            Copied!
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={handleShareWhatsApp}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-emerald-50 transition-all text-left"
                                >
                                    <svg className="w-4 h-4 text-emerald-500 fill-current" viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.99C16.558 1.874 14.088.843 11.45.843 6.012.843 1.587 5.263 1.584 10.707c-.001 1.677.447 3.312 1.3 4.747l-.996 3.636 3.727-.977z" />
                                    </svg>
                                    <span>WhatsApp</span>
                                </button>

                                <button
                                    onClick={handleShareEmail}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-purple-50 transition-all text-left"
                                >
                                    <Mail size={16} className="text-purple-500" />
                                    <span>Email</span>
                                </button>

                                <button
                                    onClick={handleShareLinkedIn}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-blue-50 transition-all text-left"
                                >
                                    <Linkedin size={16} className="text-blue-600" />
                                    <span>LinkedIn</span>
                                </button>

                                <button
                                    onClick={handleShareTwitter}
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

            <header className="rounded-[2.5rem] border border-black/10 bg-white px-8 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-5">
                        <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#f4efe6] text-gray-700">
                            <Building2 size={36} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Job overview</p>
                            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-gray-900">{job.title}</h1>
                            <p className="mt-2 text-base text-gray-500">
                                {job.company || job.recruiterId?.company?.name || 'hire1percent Partner'}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-500">
                                <span className="inline-flex items-center gap-2 rounded-full bg-[#fbf8f3] px-4 py-2">
                                    <MapPin size={14} />
                                    {job.location || 'Remote'}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-[#fbf8f3] px-4 py-2">
                                    <Clock3 size={14} />
                                    {job.experienceLevel || `${job.minExperience || 0}+ years`}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-[#fbf8f3] px-4 py-2">
                                    <GraduationCap size={14} />
                                    {job.qualification || 'Any qualification'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {application && application.status !== 'SAVED' ? (
                        <div className="w-full xl:max-w-md rounded-[2rem] border border-black/10 bg-[#fbf8f3] p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Application status</p>
                            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">Already Applied</h2>
                            <p className="mt-3 text-sm leading-7 text-gray-600">
                                You have an active application for this role. Current status: <span className="font-bold text-gray-900 uppercase">{application.status}</span>.
                            </p>
                            <div className="mt-6">
                                <Link
                                    to="/seeker/applications"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                                >
                                    Track your application
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full xl:max-w-md rounded-[2rem] border border-black/10 bg-[#fbf8f3] p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Start application</p>
                            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">Ready to apply?</h2>
                            <p className="mt-3 text-sm leading-7 text-gray-600">
                                Upload your resume to begin the AI-led application process and unlock the assessment and interview stages.
                            </p>

                            <div className="mt-6 space-y-3">
                                {!showApplyOptions ? (
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => setShowApplyOptions(true)}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 text-sm font-semibold text-white transition hover:bg-gray-800 shadow-sm"
                                        >
                                            <Sparkles size={18} />
                                            Apply
                                        </button>
                                        <button
                                            onClick={handleToggleSaveJob}
                                            disabled={isSaving}
                                            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-sm font-semibold transition shadow-sm ${
                                                application?.status === 'SAVED'
                                                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100/75'
                                                    : 'border-black/10 bg-white text-gray-700 hover:bg-[#faf7f1]'
                                            }`}
                                        >
                                            {application?.status === 'SAVED' ? 'Saved' : 'Save for Later'}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Link
                                            to={`/seeker/apply/${job._id}`}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                                        >
                                            <FileUp size={18} />
                                            Upload and analyze resume
                                        </Link>
                                        <Link
                                            to={`/seeker/apply/${job._id}?method=create`}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-5 py-4 text-sm font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
                                        >
                                            <Wand2 size={18} />
                                            Create resume
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-[2rem] border border-black/10 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Role description</p>
                    <p className="mt-5 whitespace-pre-line text-sm leading-8 text-gray-600">
                        {job.description}
                    </p>
                </section>

                <div className="space-y-6">
                    <section className="rounded-[2rem] border border-black/10 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Required skills</p>
                                <h3 className="text-xl font-semibold tracking-tight text-gray-900">What the recruiter is looking for</h3>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2">
                            {job.skills?.map((skill) => (
                                <span
                                    key={skill}
                                    className="rounded-full border border-black/10 bg-[#fbf8f3] px-3 py-1.5 text-xs font-medium text-gray-600"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-[2rem] border border-black/10 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Application flow</p>
                        <div className="mt-5 space-y-4">
                            {[
                                'Resume is analyzed against the recruiter requirements.',
                                `Minimum match score to continue: ${job.minPercentage || 60}%.`,
                                'Qualified candidates move to the secure assessment stage.',
                                'After assessment, the candidate proceeds to the interview round.'
                            ].map((item) => (
                                <div key={item} className="flex items-start gap-3">
                                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-black" />
                                    <p className="text-sm leading-7 text-gray-600">{item}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default JobDetails;
