import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, CheckCircle2, Clock3, FileText, Star, UserCircle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../firebase';

const StatCard = ({ label, value, icon: Icon, tone }) => (
    <div className="rounded-[1.9rem] border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
            <Icon size={22} />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{value}</p>
    </div>
);

const quickActions = [
    {
        title: 'Browse Jobs',
        description: 'Explore current roles and move directly into the candidate workflow.',
        path: '/seeker/jobs',
        icon: Briefcase
    },
    {
        title: 'My Applications',
        description: 'Track every submitted role from review to final decision.',
        path: '/seeker/applications',
        icon: FileText
    },
    {
        title: 'Profile Settings',
        description: 'Keep your public candidate profile and links ready for recruiters.',
        path: '/seeker/profile',
        icon: UserCircle
    }
];

const SeekerDashboard = () => {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [stats, setStats] = useState({
        applied: 0,
        eligible: 0,
        shortlisted: 0,
        availableJobs: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const userId = user.uid || user._id || user.id;
                const [appsRes, jobsRes] = await Promise.all([
                    axios.get(`${API_URL}/applications/seeker/${userId}`),
                    axios.get(`${API_URL}/jobs`)
                ]);
                const apps = appsRes.data;
                const jobs = jobsRes.data;

                setStats({
                    applied: apps.length,
                    eligible: apps.filter((item) => item.status === 'ELIGIBLE' || item.status === 'SHORTLISTED').length,
                    shortlisted: apps.filter((item) => item.status === 'SHORTLISTED').length,
                    availableJobs: jobs.length
                });
            } catch (error) {
                console.error('Failed to fetch seeker stats:', error);
            }
        };

        if (user.uid || user._id || user.id) {
            fetchStats();
        }
    }, [user.uid, user._id, user.id]);

    const headline = useMemo(() => {
        if (stats.shortlisted > 0) {
            return 'Your applications are gaining traction.';
        }

        if (stats.applied > 0) {
            return 'Your candidate pipeline is active.';
        }

        return 'Your next opportunity starts here.';
    }, [stats.applied, stats.shortlisted]);

    return (
        <div className="space-y-8">
            <header className="overflow-hidden rounded-[2.5rem] border border-black/10 bg-gradient-to-br from-white via-[#fcfaf6] to-[#f4efe6] px-8 py-9 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Candidate dashboard</p>
                        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900">
                            Welcome back, {user.name || 'Candidate'}
                        </h1>
                        <p className="mt-4 max-w-3xl text-base leading-8 text-gray-500">{headline}</p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                to="/seeker/jobs"
                                className="inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                            >
                                Browse roles
                                <ArrowRight size={18} />
                            </Link>
                            <Link
                                to="/seeker/applications"
                                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 px-6 py-4 text-sm font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
                            >
                                Track applications
                            </Link>
                        </div>
                    </div>

                <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
                                <Zap size={22} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Hiring momentum</p>
                                <p className="text-lg font-semibold text-gray-900">Candidate-ready experience</p>
                            </div>
                        </div>

                        <div className="mt-6 space-y-4">
                            {[
                                'Upload once and extract your resume details automatically.',
                                'Move through resume screening, assessment, and interview in one clean flow.',
                                'Track application progress from submission to final selection.'
                            ].map((item) => (
                                <div key={item} className="flex items-start gap-3">
                                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-black text-white">
                                        <CheckCircle2 size={14} />
                                    </div>
                                    <p className="text-sm leading-6 text-gray-600">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Applied Jobs" value={stats.applied} icon={Briefcase} tone="bg-[#eef4ff] text-blue-700" />
                <StatCard label="Eligible Roles" value={stats.eligible} icon={Star} tone="bg-[#eef9f0] text-emerald-700" />
                <StatCard label="Shortlisted" value={stats.shortlisted} icon={CheckCircle2} tone="bg-[#fff7e8] text-amber-700" />
                <StatCard label="Open Roles" value={stats.availableJobs} icon={Clock3} tone="bg-[#f4efe6] text-gray-700" />
            </div>

            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[2.25rem] border border-black/10 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Quick actions</p>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">Continue your candidate journey</h2>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {quickActions.map((item, index) => {
                            const Icon = item.icon;

                            return (
                                <motion.div
                                    key={item.title}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.08 }}
                                >
                                    <Link
                                        to={item.path}
                                        className="block rounded-[1.9rem] border border-black/10 bg-[#fcfaf6] p-6 transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gray-700 shadow-sm">
                                            <Icon size={22} />
                                        </div>
                                        <h3 className="mt-5 text-xl font-semibold tracking-tight text-gray-900">{item.title}</h3>
                                        <p className="mt-2 text-sm leading-7 text-gray-500">{item.description}</p>
                                        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                                            Open
                                            <ArrowRight size={16} />
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-[2.25rem] border border-black/10 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Next best step</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">Keep your profile and resume ready</h2>
                    <p className="mt-4 text-sm leading-7 text-gray-500">
                        The stronger your candidate profile is, the smoother your assessment and interview workflow becomes.
                    </p>

                    <div className="mt-8 space-y-4">
                        {[
                            'Upload a current resume before starting any application.',
                            'Review your skills and public professional links in profile settings.',
                            'Check application tracking after every completed round.'
                        ].map((item) => (
                            <div key={item} className="flex items-start gap-3 rounded-2xl border border-black/10 bg-[#fbf8f3] px-4 py-4">
                                <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-black text-white">
                                    <CheckCircle2 size={14} />
                                </div>
                                <p className="text-sm leading-6 text-gray-600">{item}</p>
                            </div>
                        ))}
                    </div>

                    <Link
                        to="/seeker/profile"
                        className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-black/10 px-6 py-4 text-sm font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
                    >
                        Update profile
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default SeekerDashboard;
