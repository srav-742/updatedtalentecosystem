import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Building2,
    ChevronLeft,
    Clock3,
    FileUp,
    GraduationCap,
    MapPin,
    Sparkles,
    Share2,
    Mail,
    Linkedin,
    Twitter,
    Copy
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';
import Navbar from '../../components/Navbar';

const PublicJobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await axios.get(`${API_URL}/jobs/${id}`);
                setJob(res.data);
            } catch (error) {
                console.error('Failed to fetch job details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
    }, [id]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showShareMenu && !event.target.closest('.share-container')) {
                setShowShareMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showShareMenu]);

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

    const handleResumeAnalysis = () => {
        // Check if user is already logged in as a seeker
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser && parsedUser.uid && (parsedUser.role === 'seeker' || parsedUser.role === 'candidate')) {
                    // Navigate directly to the application flow without prompt
                    navigate(`/candidate/apply/${job._id}`);
                    return;
                }
            } catch (e) {
                console.error('Failed to parse user session:', e);
            }
        }

        // Navigate to login page with candidate role pre-selected and return URL to the application flow
        navigate('/login?role=candidate', {
            state: { from: { pathname: `/candidate/apply/${job._id}` } }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f7f4ee]">
                <Navbar theme="light" />
                <main className="mx-auto max-w-6xl px-6 pb-16 pt-28">
                    <div className="rounded-[2.5rem] border border-black/10 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-black/10 border-t-black" />
                        <p className="mt-6 text-sm font-medium text-gray-500">Loading job details...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-[#f7f4ee]">
                <Navbar theme="light" />
                <main className="mx-auto max-w-6xl px-6 pb-16 pt-28">
                    <div className="rounded-[2.5rem] border border-red-200 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                        <p className="text-lg font-medium text-red-600">Job not found.</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f4ee]">
            <Navbar theme="light" />
            <main className="mx-auto max-w-6xl px-6 pb-16 pt-28">
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate('/')}
                            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#faf7f1]"
                        >
                            <ChevronLeft size={16} />
                            Back to Home
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

                            <div className="w-full xl:max-w-md rounded-[2rem] border border-black/10 bg-[#fbf8f3] p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Start application</p>
                                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">Ready to apply?</h2>
                                <p className="mt-3 text-sm leading-7 text-gray-600">
                                    Upload your resume to begin the AI-led application process and unlock the assessment and interview stages.
                                </p>

                                <div className="mt-6 space-y-3">
                                    <button
                                        onClick={handleResumeAnalysis}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                                    >
                                        <Sparkles size={18} />
                                        Apply
                                    </button>
                                    {!localStorage.getItem('user') && (
                                        <p className="text-xs text-center text-gray-400">
                                            You'll be asked to sign in before proceeding
                                        </p>
                                    )}
                                </div>
                            </div>
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
            </main>
        </div>
    );
};

export default PublicJobDetails;
