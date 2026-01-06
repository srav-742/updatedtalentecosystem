import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { motion } from 'framer-motion';
import { Briefcase, Users, CheckCircle, ArrowUpRight, Clock, MapPin } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';

const StatCard = ({ title, value, icon, color }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="p-6 rounded-[2rem] bg-white/5 border border-white/10 relative overflow-hidden group shadow-xl"
    >
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            {icon}
        </div>
        <div className="relative z-10">
            <div className={`w-12 h-12 rounded-2xl ${color.replace('text-', 'bg-').replace('400', '500/20')} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                <div className={color}>{React.cloneElement(icon, { size: 24 })}</div>
            </div>
            <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
            <h3 className="text-3xl font-bold">{value}</h3>
        </div>
    </motion.div>
);

const RecruiterDashboard = () => {
    const [stats, setStats] = useState({ jobCount: 0, applicationCount: 0, shortlistedCount: 0 });
    const [recentJobs, setRecentJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    console.log("[Dashboard] Current user ID:", user._id || user.id);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const userId = user.uid || user._id || user.id;
                const [statsRes, jobsRes] = await Promise.all([
                    axios.get(`${API_URL}/dashboard/${userId}`),
                    axios.get(`${API_URL}/jobs/recruiter/${userId}`)
                ]);
                setStats(statsRes.data);
                setRecentJobs(jobsRes.data.slice(0, 5));
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user.uid || user._id || user.id) fetchDashboardData();
    }, [user.uid, user._id, user.id]);

    if (loading) return <div className="flex items-center justify-center h-[60vh] text-blue-400">Loading Dashboard...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Welcome Back, {user.name}</h1>
                    <p className="text-gray-400">Here's an overview of your recruitment activity.</p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                    <Clock size={16} />
                    <span>Last updated: Just now</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Jobs Posted"
                    value={stats.jobCount}
                    icon={<Briefcase />}
                    color="text-blue-400"
                />
                <StatCard
                    title="Total Applications"
                    value={stats.applicationCount}
                    icon={<Users />}
                    color="text-teal-400"
                />
                <StatCard
                    title="Shortlisted"
                    value={stats.shortlistedCount}
                    icon={<CheckCircle />}
                    color="text-emerald-400"
                />
            </div>

            {/* Recent Jobs Table */}
            <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold">Recent Job Postings</h2>
                    <button className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                        View All <ArrowUpRight size={16} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10 text-gray-400 text-sm font-medium">
                                <th className="pb-4 pt-0">Job Title</th>
                                <th className="pb-4 pt-0 text-center">Min Match</th>
                                <th className="pb-4 pt-0 text-center">Applicants</th>
                                <th className="pb-4 pt-0 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentJobs.length > 0 ? recentJobs.map((job) => (
                                <tr key={job._id} className="group transition-colors hover:bg-white/[0.02]">
                                    <td className="py-5">
                                        <div>
                                            <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{job.title}</p>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                                                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                                                <span>{job.type}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 text-center">
                                        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                                            {job.minPercentage}%
                                        </span>
                                    </td>
                                    <td className="py-5 text-center font-bold text-white">{job.applicantCount || 0}</td>
                                    <td className="py-5 text-right">
                                        <button
                                            onClick={() => navigate(`/recruiter/applicants?jobId=${job._id}`)}
                                            className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all active:scale-95"
                                        >
                                            View Applicants
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="py-10 text-center text-gray-500 italic">No jobs posted yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RecruiterDashboard;
