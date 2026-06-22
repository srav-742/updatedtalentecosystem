import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, MapPin, Users, Trash2, Edit3, ArrowUpRight, Search, Filter, Clock, CheckCircle2, XCircle, AlertCircle, Share2, Mail, Linkedin, Twitter, Copy, UploadCloud } from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../../firebase';
import BulkUploadModal from '../../components/BulkUploadModal';

const MyJobs = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedJobId, setCopiedJobId] = useState(null);
    const [activeShareJobId, setActiveShareJobId] = useState(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeShareJobId && !event.target.closest('.share-container')) {
                setActiveShareJobId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeShareJobId]);

    const fetchJobs = async () => {
        try {
            const userId = user.uid || user._id || user.id;
            const res = await axios.get(`${API_URL}/jobs/recruiter/${userId}`);
            setJobs(res.data);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user.uid || user._id || user.id) fetchJobs();
    }, [user.uid, user._id, user.id]);

    const handleDelete = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this job posting?')) return;
        try {
            await axios.delete(`${API_URL}/jobs/${jobId}`);
            setJobs(jobs.filter(j => j._id !== jobId));
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job.');
        }
    };

    const toggleShareMenu = (jobId) => {
        setActiveShareJobId(activeShareJobId === jobId ? null : jobId);
    };

    const handleCopyLink = async (jobId) => {
        const shareUrl = `${window.location.origin}/seeker/job/${jobId}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedJobId(jobId);
            setTimeout(() => setCopiedJobId(null), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    const handleShareWhatsApp = (job) => {
        const shareUrl = `${window.location.origin}/seeker/job/${job._id}`;
        const text = `Check out this job posting for ${job.title}: ${shareUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleShareLinkedIn = (job) => {
        const shareUrl = `${window.location.origin}/seeker/job/${job._id}`;
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        window.open(linkedinUrl, '_blank');
    };

    const handleShareTwitter = (job) => {
        const shareUrl = `${window.location.origin}/seeker/job/${job._id}`;
        const text = `We are hiring for ${job.title}! Apply here:`;
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
    };

    const handleShareEmail = (job) => {
        const shareUrl = `${window.location.origin}/seeker/job/${job._id}`;
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle2 size={12} /> Live
                </span>
            );
        }
        if (job.status === 'rejected') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest">
                    <XCircle size={12} /> Rejected
                </span>
            );
        }
        // Default: pending_approval
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                <Clock size={12} /> Pending Approval
            </span>
        );
    };

    if (loading) return <div className="flex items-center justify-center h-[60vh] text-blue-400">Loading Job Postings...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2 uppercase tracking-tight">Active Campaigns</h1>
                    <p className="text-gray-400 font-medium">Manage your {jobs.length} active job postings and track applicant status.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search campaigns..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all w-64 text-sm font-medium"
                        />
                    </div>
                    <Link to="/recruiter/post-job" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                        Create New
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredJobs.length > 0 ? filteredJobs.map((job) => (
                    <React.Fragment key={job._id}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 rounded-[3rem] bg-white/[0.02] border border-white/5 group hover:border-blue-500/30 transition-all shadow-2xl relative"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 relative z-10">
                            <div className="flex items-start gap-6">
                                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-500/10 to-teal-500/10 flex items-center justify-center text-blue-400 border border-white/5 transition-transform group-hover:rotate-6">
                                    <Briefcase size={32} />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <h3 className="text-2xl font-black group-hover:text-blue-400 transition-colors uppercase tracking-tight">{job.title}</h3>
                                        {getStatusBadge(job)}
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-loose">
                                            <span className="flex items-center gap-2 pr-4 border-r border-white/10"><MapPin size={14} className="text-blue-500" /> {job.location}</span>
                                            <span className="flex items-center gap-2 pr-4 border-r border-white/10"><Briefcase size={14} className="text-teal-500" /> {job.type}</span>
                                            <span className="flex items-center gap-2 pr-4 border-r border-white/10"><Clock size={14} className="text-amber-500" /> {job.experienceLevel || `${job.minExperience || 0} Years`} Exp</span>
                                        </div>

                                        {/* Education Section */}
                                        <div className="flex flex-wrap gap-3">
                                            {job.education && job.education.length > 0 ? (
                                                job.education.map((edu, idx) => (
                                                    <span key={idx} className="flex items-center gap-2 px-3 py-1 bg-purple-500/5 border border-purple-500/10 rounded-lg text-[10px] font-bold uppercase text-purple-400 tracking-wider">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                        {edu.qualification} <span className="text-purple-500/50">|</span> {edu.specialization}
                                                    </span>
                                                ))
                                            ) : (
                                                (job.qualification || job.specialization) && (
                                                    <span className="flex items-center gap-2 px-3 py-1 bg-purple-500/5 border border-purple-500/10 rounded-lg text-[10px] font-bold uppercase text-purple-400 tracking-wider">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                        {job.qualification || 'Any'} <span className="text-purple-500/50">|</span> {job.specialization || 'Any'}
                                                    </span>
                                                )
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20 text-[10px] font-bold uppercase">{job.minPercentage}% Resume</span>
                                            {job.assessment?.enabled && (
                                                <span className="text-orange-400 bg-orange-400/10 px-2 py-1 rounded-md border border-orange-400/20 text-[10px] font-bold uppercase">
                                                    {job.assessment.passingScore || 70}% Assessment
                                                </span>
                                            )}
                                            {job.mockInterview?.enabled && (
                                                <span className="text-purple-400 bg-purple-400/10 px-2 py-1 rounded-md border border-purple-400/20 text-[10px] font-bold uppercase">
                                                    {job.mockInterview.passingScore || 70}% Interview
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {job.skills.map(skill => (
                                                <span key={skill} className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] uppercase font-black tracking-widest text-gray-400 group-hover:border-blue-500/20 transition-all">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-4 w-full md:w-auto md:min-w-[360px]">
                                <div className="flex items-center gap-3 py-2 px-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="text-right">
                                        <div className="text-xl font-black text-blue-400 leading-none">{job.applicantCount || 0}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Applicants</div>
                                    </div>
                                    {job.applicantCount > 0 && (
                                        <>
                                            <div className="w-px h-8 bg-white/10 mx-2" />
                                            <div className="flex -space-x-3">
                                                {[...Array(Math.min(job.applicantCount, 3))].map((_, i) => (
                                                    <div key={i} className="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-[#0a0c10] flex items-center justify-center text-[10px] font-black uppercase">
                                                        <Users size={14} />
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 w-full">
                                    <Link
                                        to={`/recruiter/applicants?jobId=${job._id}`}
                                        className="flex-1 px-6 py-3.5 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest transition-all text-center hover:bg-gray-200 active:scale-95 shadow-xl shadow-white/5"
                                    >
                                        Manage Applicants
                                    </Link>
                                    <div className="flex gap-2">
                                        <div className="share-container relative">
                                            <button
                                                onClick={() => toggleShareMenu(job._id)}
                                                className={`p-3.5 rounded-2xl border transition-all group/btn relative ${
                                                    activeShareJobId === job._id 
                                                        ? 'bg-teal-500/10 border-teal-500/30' 
                                                        : 'bg-white/5 border-white/5 hover:bg-teal-500/10'
                                                }`}
                                                title="Share job link"
                                            >
                                                <Share2 size={20} className={activeShareJobId === job._id ? 'text-teal-400' : 'text-gray-400 group-hover/btn:text-teal-400'} />
                                            </button>

                                            <AnimatePresence>
                                                {activeShareJobId === job._id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        className="absolute right-0 top-full mt-3 w-56 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/10 p-2 shadow-2xl z-50 flex flex-col gap-1"
                                                    >
                                                        <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5 mb-1">
                                                            Share Campaign
                                                        </div>
                                                        
                                                        <button
                                                            onClick={() => handleCopyLink(job._id)}
                                                            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-all text-left relative"
                                                        >
                                                            <Copy size={16} className="text-blue-400" />
                                                            <span>Copy Link</span>
                                                            {copiedJobId === job._id && (
                                                                <span className="absolute right-2 px-1.5 py-0.5 rounded bg-teal-500 text-white text-[9px] font-bold uppercase tracking-wider">
                                                                    Copied!
                                                                </span>
                                                            )}
                                                        </button>

                                                        <button
                                                            onClick={() => handleShareWhatsApp(job)}
                                                            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-zinc-100 hover:bg-emerald-500/10 transition-all text-left"
                                                        >
                                                            <svg className="w-4 h-4 text-emerald-400 fill-current" viewBox="0 0 24 24">
                                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.99C16.558 1.874 14.088.843 11.45.843 6.012.843 1.587 5.263 1.584 10.707c-.001 1.677.447 3.312 1.3 4.747l-.996 3.636 3.727-.977zM17.47 14.8c-.322-.16-.1.9-.3-.54-.16-.32-.64-.515-.96-.68-.32-.16-1.9-.8-3.08-1.87-.92-.82-1.5-1.747-1.72-2.12-.22-.38-.02-.58.17-.77.17-.17.38-.44.57-.66.19-.22.25-.38.38-.63.13-.25.06-.47-.03-.66-.09-.19-.8-1.92-1.1-2.64-.29-.71-.59-.61-.8-.61-.2-.01-.44-.01-.68-.01-.24 0-.64.09-.98.47-.34.37-1.3 1.27-1.3 3.1 0 1.83 1.33 3.6 1.51 3.85.19.25 2.62 4.003 6.35 5.61.89.38 1.58.61 2.12.78.89.28 1.7.24 2.34.14.71-.1 1.47-.61 1.68-1.2.21-.59.21-1.09.15-1.2-.06-.11-.22-.2-.54-.36z" />
                                                            </svg>
                                                            <span>WhatsApp</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleShareLinkedIn(job)}
                                                            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-zinc-100 hover:bg-blue-500/10 transition-all text-left"
                                                        >
                                                            <Linkedin size={16} className="text-blue-400" />
                                                            <span>LinkedIn</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleShareTwitter(job)}
                                                            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-zinc-100 hover:bg-sky-500/10 transition-all text-left"
                                                        >
                                                            <Twitter size={16} className="text-sky-400" />
                                                            <span>Twitter / X</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleShareEmail(job)}
                                                            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-zinc-100 hover:bg-purple-500/10 transition-all text-left"
                                                        >
                                                            <Mail size={16} className="text-purple-400" />
                                                            <span>Email</span>
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        {job.status === 'approved' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedJobId(job._id);
                                                    setUploadModalOpen(true);
                                                }}
                                                className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-blue-500/10 transition-all group/btn"
                                                title="Bulk upload candidate resumes"
                                            >
                                                <UploadCloud size={20} className="text-gray-400 group-hover/btn:text-blue-400" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => navigate(`/recruiter/post-job?edit=${job._id}`)}
                                            className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group/btn"
                                        >
                                            <Edit3 size={20} className="text-gray-400 group-hover/btn:text-blue-400" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(job._id)}
                                            className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-red-500/10 transition-all group/btn"
                                        >
                                            <Trash2 size={20} className="text-gray-400 group-hover/btn:text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    {/* Rejection reason notice */}
                    {job.status === 'rejected' && job.adminFeedback?.reason && (
                        <div className="mx-6 mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-400 font-black text-xs uppercase tracking-widest mb-1">Rejected by Admin</p>
                                <p className="text-red-300/80 text-sm font-medium">{job.adminFeedback.reason}</p>
                            </div>
                        </div>
                    )}
                    </React.Fragment>
                )) : (
                    <div className="p-24 text-center border-2 border-dashed border-white/5 rounded-[4rem] bg-white/[0.01]">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
                            <Briefcase className="text-gray-600" size={40} />
                        </div>
                        <h2 className="text-3xl font-black mb-3 uppercase tracking-tighter">No Campaigns Found</h2>
                        <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium">Elevate your hiring process by posting your first job requirement into the ecosystem.</p>
                        <Link to="/recruiter/post-job" className="px-10 py-5 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-500 transition-all shadow-2xl shadow-blue-500/30 active:scale-95">
                            Launch First Posting
                        </Link>
                    </div>
                )}
            </div>

            <BulkUploadModal
                isOpen={uploadModalOpen}
                onClose={() => {
                    setUploadModalOpen(false);
                    setSelectedJobId(null);
                }}
                jobId={selectedJobId}
                onUploadComplete={fetchJobs}
            />
        </div>
    );
};

export default MyJobs;
