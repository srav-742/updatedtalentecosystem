import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Briefcase, 
    MapPin, 
    Users, 
    Trash2, 
    Edit3, 
    ArrowUpRight, 
    Search, 
    Filter, 
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
    Check
} from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../../firebase';
import BulkUploadModal from '../../components/BulkUploadModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RecruiterJobCardSkeleton } from '../../components/Skeleton';
import './recruiter-theme.css';

const MyJobs = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedJobId, setCopiedJobId] = useState(null);
    const [activeShareJobId, setActiveShareJobId] = useState(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);
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

    // Fetch recruiter's jobs using React Query
    const { data: jobs = [], isLoading: loading } = useQuery({
        queryKey: ['jobs', 'recruiter', userId],
        queryFn: async () => {
            if (!userId) return [];
            const res = await axios.get(`${API_URL}/jobs/recruiter/${userId}`);
            return res.data;
        },
        enabled: !!userId
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
        if (!window.confirm('Are you sure you want to delete this job posting?')) return;
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
        const text = `Check out this job posting for ${job.title}: ${shareUrl}`;
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
        const text = `We are hiring for ${job.title}! Apply here:`;
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
    };

    const handleShareEmail = (job) => {
        const shareUrl = `${window.location.origin}/candidate/job/${job._id}`;
        const subject = `Job Opportunity: ${job.title}`;
        const body = `Hi,\n\nWe are looking for a ${job.title} in ${job.location}.\n\nView details and apply here:\n${shareUrl}\n\nBest regards,\n${user.name || 'Recruiter'}`;
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl, '_self');
    };

    const filteredJobs = jobs.filter(job =>
        (job.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.location || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (job) => {
        if (job.status === 'approved') {
            return (
                <span className="rec-badge-emerald inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 rec-pulse-dot" />
                    Live & Active
                </span>
            );
        }
        if (job.status === 'rejected') {
            return (
                <span className="rec-badge-rose inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                    <XCircle size={13} /> Rejected
                </span>
            );
        }
        // Default: pending_approval
        return (
            <span className="rec-badge-amber inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                <Clock size={13} /> Pending Review
            </span>
        );
    };

    if (loading) {
        return (
            <div className="space-y-8 pb-12">
                <header className="rec-hero p-8 md:p-9">
                    <h1 className="text-3xl font-extrabold text-slate-900">Job Campaigns</h1>
                    <p className="text-xs text-slate-500 mt-1">Loading your active requisition pool...</p>
                </header>
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
            {/* Executive Hero Banner */}
            <header className="rec-hero p-8 md:p-9">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="rec-badge-dark px-3 py-0.5 text-[10px] uppercase tracking-wider">
                                Requisition Management
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                                {jobs.length} Total Campaigns
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                            Active Job <span className="rec-text-gradient">Postings</span>
                        </h1>
                        <p className="text-xs md:text-sm text-slate-600 max-w-xl">
                            Track real-time applicant flow, configure proctored coding assessments, and distribute public application links.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {/* Search Input */}
                        <div className="relative min-w-[220px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text"
                                placeholder="Search by title, location..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="rec-input pl-9 pr-4 py-2.5 text-xs w-full"
                            />
                        </div>

                        <Link 
                            to="/recruiter/post-job" 
                            className="rec-btn-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                            <Plus size={15} />
                            <span>Create New Job</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Job Requisition Cards Grid */}
            <div className="grid grid-cols-1 gap-6">
                {filteredJobs.length > 0 ? filteredJobs.map((job) => (
                    <React.Fragment key={job._id}>
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rec-card p-7 md:p-8 relative transition-all ${
                                activeShareJobId === job._id ? 'z-40' : 'z-0'
                            }`}
                        >
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                                {/* Left: Job Details Block */}
                                <div className="flex items-start gap-5 flex-1">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0 mt-1 shadow-xs">
                                        <Briefcase size={24} className="text-slate-800" />
                                    </div>
                                    <div className="space-y-3 flex-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="text-xl font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                                                {job.title}
                                            </h3>
                                            {getStatusBadge(job)}
                                        </div>

                                        {/* Metadata Row */}
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <MapPin size={13} className="text-slate-400" />
                                                {job.location}
                                            </span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                                                {job.type}
                                            </span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={13} className="text-slate-400" />
                                                {job.experienceLevel || `${job.minExperience || 0} Yrs`} Experience
                                            </span>
                                        </div>

                                        {/* Education Criteria */}
                                        <div className="flex flex-wrap gap-2">
                                            {job.education && job.education.length > 0 ? (
                                                job.education.map((edu, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/70 rounded-lg text-[11px] font-semibold text-slate-600">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                        {edu.qualification} • {edu.specialization}
                                                    </span>
                                                ))
                                            ) : (
                                                (job.qualification || job.specialization) && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/70 rounded-lg text-[11px] font-semibold text-slate-600">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                        {job.qualification || 'Any'} • {job.specialization || 'Any'}
                                                    </span>
                                                )
                                            )}
                                        </div>

                                        {/* Assessment Criteria Pills */}
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            <span className="rec-badge-emerald px-2.5 py-0.5 text-[10px]">
                                                {job.minPercentage}% Resume Match
                                            </span>
                                            {job.assessment?.enabled && (
                                                <span className="rec-badge-amber px-2.5 py-0.5 text-[10px]">
                                                    {job.assessment.passingScore || 70}% MCQ Round
                                                </span>
                                            )}
                                            {job.codingAssessment?.enabled && (
                                                <span className="rec-badge-blue px-2.5 py-0.5 text-[10px]">
                                                    {job.codingAssessment.passingScore || 70}% Coding Challenge
                                                </span>
                                            )}
                                            {job.mockInterview?.enabled && (
                                                <span className="rec-badge-purple px-2.5 py-0.5 text-[10px]">
                                                    {job.mockInterview.passingScore || 70}% AI Interview
                                                </span>
                                            )}
                                        </div>

                                        {/* Skills Tags */}
                                        {job.skills && job.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {job.skills.map(skill => (
                                                    <span key={skill} className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 text-[11px] font-semibold text-slate-600">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Applicants Counter & Action Hub */}
                                <div className="flex flex-col lg:items-end justify-between gap-5 shrink-0 lg:min-w-[320px]">
                                    {/* Applicant Stats Badge */}
                                    <div className="flex items-center gap-4 py-2.5 px-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                                        <div className="lg:text-right">
                                            <div className="text-2xl font-black text-slate-900 leading-none">
                                                {job.applicantCount || 0}
                                            </div>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                                                Total Applicants
                                            </div>
                                        </div>
                                        {job.applicantCount > 0 && (
                                            <>
                                                <div className="w-px h-8 bg-slate-200 mx-1" />
                                                <div className="flex -space-x-1.5">
                                                    {[...Array(Math.min(job.applicantCount, 3))].map((_, i) => (
                                                        <div key={i} className="w-7 h-7 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-700">
                                                            {String.fromCharCode(65 + i)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Primary and Icon Actions */}
                                    <div className="flex items-center gap-2 w-full">
                                        <Link
                                            to={`/recruiter/applicants?jobId=${job._id}`}
                                            className="rec-btn-primary flex-1 py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-center"
                                        >
                                            View Applicants
                                        </Link>

                                        {/* Share Menu */}
                                        <div className="share-container relative">
                                            <button
                                                onClick={() => toggleShareMenu(job._id)}
                                                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                                                    activeShareJobId === job._id 
                                                        ? 'bg-slate-900 border-slate-900 text-white' 
                                                        : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-600'
                                                }`}
                                                title="Share job opening"
                                            >
                                                <Share2 size={16} className={activeShareJobId === job._id ? 'text-white' : 'text-slate-600'} />
                                            </button>

                                            <AnimatePresence>
                                                {activeShareJobId === job._id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                                        className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white border border-slate-200 p-2 shadow-xl z-50 flex flex-col gap-1"
                                                    >
                                                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                                            Share Application Link
                                                        </div>
                                                        
                                                        <button
                                                            onClick={() => handleCopyLink(job._id)}
                                                            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Copy size={14} className="text-slate-500" />
                                                                <span>Copy Link</span>
                                                            </div>
                                                            {copiedJobId === job._id && (
                                                                <span className="rec-badge-emerald px-1.5 py-0.5 text-[9px] uppercase">
                                                                    Copied!
                                                                </span>
                                                            )}
                                                        </button>

                                                        <button
                                                            onClick={() => handleShareWhatsApp(job)}
                                                            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
                                                        >
                                                            <svg className="w-3.5 h-3.5 text-emerald-600 fill-current" viewBox="0 0 24 24">
                                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.99C16.558 1.874 14.088.843 11.45.843 6.012.843 1.587 5.263 1.584 10.707c-.001 1.677.447 3.312 1.3 4.747l-.996 3.636 3.727-.977zM17.47 14.8c-.322-.16-.1.9-.3-.54-.16-.32-.64-.515-.96-.68-.32-.16-1.9-.8-3.08-1.87-.92-.82-1.5-1.747-1.72-2.12-.22-.38-.02-.58.17-.77.17-.17.38-.44.57-.66.19-.22.25-.38.38-.63.13-.25.06-.47-.03-.66-.09-.19-.8-1.92-1.1-2.64-.29-.71-.59-.61-.8-.61-.2-.01-.44-.01-.68-.01-.24 0-.64.09-.98.47-.34.37-1.3 1.27-1.3 3.1 0 1.83 1.33 3.6 1.51 3.85.19.25 2.62 4.003 6.35 5.61.89.38 1.58.61 2.12.78.89.28 1.7.24 2.34.14.71-.1 1.47-.61 1.68-1.2.21-.59.21-1.09.15-1.2-.06-.11-.22-.2-.54-.36z" />
                                                            </svg>
                                                            <span>WhatsApp</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleShareLinkedIn(job)}
                                                            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left cursor-pointer"
                                                        >
                                                            <Linkedin size={14} className="text-blue-600" />
                                                            <span>LinkedIn</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleShareTwitter(job)}
                                                            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors text-left cursor-pointer"
                                                        >
                                                            <Twitter size={14} className="text-sky-500" />
                                                            <span>Twitter / X</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleShareEmail(job)}
                                                            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
                                                        >
                                                            <Mail size={14} className="text-purple-600" />
                                                            <span>Email</span>
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Coding Assessment Configuration */}
                                        {job.codingAssessment?.enabled && (
                                            <button
                                                onClick={() => navigate(`/recruiter/custom-coding-assessment/${job._id}`)}
                                                className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:text-indigo-600 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                                                title="Configure Coding Round"
                                            >
                                                <Code2 size={16} />
                                            </button>
                                        )}

                                        {/* Bulk Upload Resumes */}
                                        <button
                                            onClick={() => {
                                                setSelectedJobId(job._id);
                                                setUploadModalOpen(true);
                                            }}
                                            className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                                            title="Bulk Upload Resumes"
                                        >
                                            <UploadCloud size={16} />
                                        </button>

                                        {/* Edit Job */}
                                        <button
                                            onClick={() => navigate(`/recruiter/post-job?edit=${job._id}`)}
                                            className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 hover:border-slate-400 hover:text-slate-900 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                                            title="Edit Requisition"
                                        >
                                            <Edit3 size={16} />
                                        </button>

                                        {/* Delete Job */}
                                        <button
                                            onClick={() => handleDelete(job._id)}
                                            className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 hover:border-rose-300 hover:text-rose-600 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                                            title="Delete Requisition"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Rejection Notice if rejected */}
                        {job.status === 'rejected' && job.adminFeedback?.reason && (
                            <div className="mx-4 -mt-2 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-rose-800 font-bold text-xs uppercase tracking-wider mb-0.5">Admin Moderation Feedback</p>
                                    <p className="text-rose-700 text-xs">{job.adminFeedback.reason}</p>
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                )) : (
                    <div className="rec-card p-16 text-center space-y-4">
                        <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                            <Briefcase size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {searchTerm ? 'No matching job campaigns' : 'No job campaigns published yet'}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                            {searchTerm 
                                ? `No campaigns matched "${searchTerm}". Try a different title or location keyword.`
                                : 'Create your first job listing with automated AI scoring and proctored coding assessments.'}
                        </p>
                        {searchTerm ? (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="rec-btn-secondary px-4 py-2 text-xs cursor-pointer"
                            >
                                Clear search
                            </button>
                        ) : (
                            <Link 
                                to="/recruiter/post-job" 
                                className="rec-btn-primary inline-flex px-6 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                                + Post Your First Job
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* Bulk Upload Modal */}
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
