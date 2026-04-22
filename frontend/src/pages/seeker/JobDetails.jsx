import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Building2,
    ChevronLeft,
    Clock3,
    FileUp,
    GraduationCap,
    MapPin,
    Sparkles,
    Wand2
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';

const JobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await axios.get(`${API_URL}/jobs`);
                const found = res.data.find((item) => item._id === id);
                setJob(found);
            } catch (error) {
                console.error('Failed to fetch job details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
    }, [id]);

    if (loading) {
        return (
            <div className="rounded-[2.5rem] border border-black/10 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-black/10 border-t-black" />
                <p className="mt-6 text-sm font-medium text-gray-500">Loading job details...</p>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="rounded-[2.5rem] border border-red-200 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <p className="text-lg font-medium text-red-600">Job not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#faf7f1]"
            >
                <ChevronLeft size={16} />
                Back to jobs
            </button>

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
    );
};

export default JobDetails;
