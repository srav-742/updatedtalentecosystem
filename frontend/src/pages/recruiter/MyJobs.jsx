import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, Users, Trash2, Edit3, ArrowUpRight, Search, Filter, Clock } from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../../firebase';

const MyJobs = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <motion.div
                        key={job._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 rounded-[3rem] bg-white/[0.02] border border-white/5 group hover:border-blue-500/30 transition-all shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                            <div className="flex items-start gap-6">
                                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-500/10 to-teal-500/10 flex items-center justify-center text-blue-400 border border-white/5 transition-transform group-hover:rotate-6">
                                    <Briefcase size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black mb-2 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{job.title}</h3>
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

                            <div className="flex flex-col items-end gap-4 min-w-[240px]">
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
        </div>
    );
};

export default MyJobs;
