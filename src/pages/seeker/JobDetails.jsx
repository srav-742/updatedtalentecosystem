import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Briefcase, ChevronLeft, Building2, Star, CheckCircle, FileUp, Sparkles, Wand2 } from 'lucide-react';
import axios from 'axios';

const JobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                // In a real app we'd have a specific endpoint, for now we filter all jobs
                const res = await axios.get('http://127.0.0.1:5000/api/jobs');
                const found = res.data.find(j => j._id === id);
                setJob(found);
            } catch (error) {
                console.error("Failed to fetch job details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [id]);

    if (loading) return <div className="py-20 text-center text-teal-400 font-black uppercase tracking-widest">Accessing Job Node...</div>;
    if (!job) return <div className="text-center py-20 text-red-400">Job not found.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-black uppercase tracking-widest text-xs group"
            >
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to jobs
            </button>

            <header className="flex flex-col md:flex-row md:items-start justify-between gap-8 p-10 rounded-[3rem] bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/10 shadow-2xl">
                <div className="flex items-start gap-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-teal-400">
                        <Building2 size={40} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black mb-1 uppercase tracking-tighter">{job.title}</h1>
                        <p className="text-teal-400 font-black flex items-center gap-2 text-lg uppercase">
                            {job.recruiterId?.company?.name || 'Venture Startup'}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-black uppercase tracking-widest text-gray-400">
                            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-teal-500/50" /> {job.location}</span>
                            <span className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                            <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-teal-500/50" /> {job.type}</span>
                            <span className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                            <span className="flex items-center gap-1.5 text-teal-400"><CheckCircle size={14} /> {job.minPercentage}% match req.</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-2 space-y-10">
                    <section className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5">
                        <h3 className="text-sm font-black uppercase tracking-widest text-teal-400 mb-6 flex items-center gap-2">
                            <Star size={16} /> Job Description
                        </h3>
                        <p className="text-gray-400 leading-relaxed font-medium whitespace-pre-line">
                            {job.description}
                        </p>
                    </section>

                    <section className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5">
                        <h3 className="text-sm font-black uppercase tracking-widest text-teal-400 mb-6 flex items-center gap-2">
                            <Sparkles size={16} /> Required Skill Ledger
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {job.skills.map(skill => (
                                <span key={skill} className="px-5 py-3 rounded-2xl bg-teal-500/5 border border-teal-500/10 text-sm font-black uppercase tracking-tight text-white/90">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <div className="p-8 rounded-[2.5rem] bg-white text-black shadow-2xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <FileUp size={80} />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 leading-none">Ready to Apply?</h3>
                        <p className="text-xs font-bold text-gray-500 mb-8 uppercase tracking-widest">Our AI will match your resume against the job ledger instantly.</p>

                        <Link
                            to={`/seeker/apply/${job._id}`}
                            className="flex items-center justify-center gap-2 w-full py-5 rounded-2xl bg-black text-white font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-all active:scale-95"
                        >
                            <FileUp size={18} /> Upload & Analyze
                        </Link>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/10"></div></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-gray-400 px-4 bg-white">OR</div>
                        </div>

                        <Link
                            to={`/seeker/apply/${job._id}?method=create`}
                            className="flex items-center justify-center gap-2 w-full py-5 rounded-2xl bg-teal-500 text-white font-black uppercase tracking-widest text-xs hover:bg-teal-600 transition-all active:scale-95 shadow-lg shadow-teal-500/20"
                        >
                            <Wand2 size={18} /> Create Resume
                        </Link>
                    </div>

                    <div className="p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] text-xs text-gray-500 space-y-4 font-medium italic">
                        <div className="flex gap-3">
                            <CheckCircle size={14} className="text-teal-500 flex-none" />
                            <p>Once you apply, our AI (Gemini) evaluates your skills for an eligibility score.</p>
                        </div>
                        <div className="flex gap-3">
                            <CheckCircle size={14} className="text-teal-500 flex-none" />
                            <p>Eligible candidates proceed to a quick assessment and AI-powered interview.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetails;
