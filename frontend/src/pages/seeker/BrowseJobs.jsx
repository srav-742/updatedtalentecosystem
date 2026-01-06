import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Briefcase, ChevronRight, Zap, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const BrowseJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await axios.get('http://127.0.0.1:5000/api/jobs');
                setJobs(res.data);
            } catch (error) {
                console.error("Failed to fetch jobs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    const filteredJobs = jobs.filter(job => {
        const titleMatch = job.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const companyName = job.company || job.recruiterId?.company?.name || '';
        const companyMatch = companyName.toLowerCase().includes(searchTerm.toLowerCase());
        return titleMatch || companyMatch;
    });

    return (
        <div className="space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black mb-2 tracking-tight uppercase">Discover <span className="text-teal-400">Roles</span></h1>
                    <p className="text-gray-500 font-medium">Explore premium crypto and web3 opportunities.</p>
                </div>

                <div className="relative group min-w-[320px]">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search by role or company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-teal-500/50 focus:bg-white/[0.08] transition-all font-medium text-sm"
                    />
                </div>
            </header>

            {loading ? (
                <div className="py-20 text-center animate-pulse flex flex-col items-center">
                    <Zap size={48} className="text-teal-500 mb-4 rotate-12" />
                    <p className="font-black uppercase tracking-widest text-teal-500 text-sm">Synchronizing Ledger...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredJobs.length > 0 ? filteredJobs.map((job, idx) => (
                        <motion.div
                            key={job._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ y: -5 }}
                            className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 group hover:bg-white/[0.05] hover:border-teal-500/30 transition-all flex flex-col shadow-xl"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                                    <Building2 size={24} />
                                </div>
                                <div className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest text-teal-400">
                                    {job.type}
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-2xl font-black mb-1 group-hover:text-teal-400 transition-colors uppercase tracking-tight">{job.title}</h3>
                                <p className="text-gray-400 font-bold text-sm mb-6 flex items-center gap-1.5 opacity-80">
                                    {job.recruiterId?.company?.name || 'Top Startup'} <span className="text-white/20">•</span> {job.location}
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="flex flex-wrap gap-2">
                                    {job.skills.slice(0, 3).map(skill => (
                                        <span key={skill} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            {skill}
                                        </span>
                                    ))}
                                    {job.skills.length > 3 && (
                                        <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                            +{job.skills.length - 3}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-0.5">Eligibility</p>
                                        <p className="text-teal-400 font-black text-sm">{job.minPercentage}% <span className="text-[10px] text-gray-500">Threshold</span></p>
                                    </div>
                                    <Link
                                        to={`/seeker/job/${job._id}`}
                                        className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center hover:bg-teal-400 hover:text-white transition-all transform active:scale-95 group-hover:rotate-45"
                                    >
                                        <ChevronRight size={24} strokeWidth={3} />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )) : (
                        <div className="col-span-full py-20 text-center opacity-40">
                            <p className="text-2xl font-black uppercase tracking-tighter">No jobs found matching your criteria</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BrowseJobs;
