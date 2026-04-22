import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, BriefcaseBusiness, ChevronRight, Building2, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../firebase';

const BrowseJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await axios.get(`${API_URL}/jobs`);
                setJobs(res.data);
            } catch (error) {
                console.error('Failed to fetch jobs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            const companyName = job.company || job.recruiterId?.company?.name || '';
            return (
                job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                companyName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
    }, [jobs, searchTerm]);

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
                <div className="rounded-[2.5rem] border border-black/10 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-black/10 border-t-black" />
                    <p className="mt-6 text-sm font-medium text-gray-500">Loading available roles...</p>
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
                                <span className="rounded-full border border-black/10 bg-[#f8f4ed] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                                    {job.type}
                                </span>
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
