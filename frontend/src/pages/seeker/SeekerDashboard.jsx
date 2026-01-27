import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, FileText, UserCircle, ArrowRight, Zap, Star, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../firebase';

const SeekerDashboard = () => {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [stats, setStats] = useState({ applied: 0, eligible: 0, shortlisted: 0, availableJobs: 0 });

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
                    eligible: apps.filter(a => a.status === 'ELIGIBLE' || a.status === 'SHORTLISTED').length,
                    shortlisted: apps.filter(a => a.status === 'SHORTLISTED').length,
                    availableJobs: jobs.length,
                    pendingAssessments: apps.filter(a => a.status === 'APPLIED' && !a.assessmentScore && !a.interviewScore)
                });
            } catch (error) {
                console.error("Failed to fetch seeker stats:", error);
            }
        };
        if (user.uid || user._id || user.id) fetchStats();
    }, [user.uid, user._id, user.id]);

    const cards = [
        { title: "Browse Jobs", icon: <Briefcase size={24} />, path: "/seeker/jobs", color: "from-blue-500/20 to-blue-600/20", border: "border-blue-500/20", text: "blue" },
        { title: "My Applications", icon: <FileText size={24} />, path: "/seeker/applications", color: "from-teal-500/20 to-teal-600/20", border: "border-teal-500/20", text: "teal" },
        { title: "Profile Settings", icon: <UserCircle size={24} />, path: "/seeker/profile", color: "from-purple-500/20 to-purple-600/20", border: "border-purple-500/20", text: "purple" },
    ];

    return (
        <div className="space-y-12">
            <header className="relative py-12 px-10 rounded-[3rem] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-5">
                    <Zap size={200} className="text-teal-400" />
                </div>
                <div className="relative z-10">
                    <h2 className="text-teal-400 font-black uppercase tracking-widest text-xs mb-4">Web3 Talent Eco System</h2>
                    <h1 className="text-5xl font-black tracking-tight mb-2">Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">{user.name}</span></h1>
                    <p className="text-gray-500 text-lg max-w-xl font-medium">Your journey to a decentralized career starts here. Explore AI-vetted opportunities specifically matched to your unique skills.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
                    <StatCard label="Applied Jobs" value={stats.applied} icon={<Briefcase size={20} />} color="blue" />
                    <StatCard label="Eligible Roles" value={stats.eligible} icon={<Star size={20} />} color="teal" />
                    <StatCard label="Shortlisted" value={stats.shortlisted} icon={<CheckCircle size={20} />} color="emerald" />
                    <StatCard label="Available Jobs" value={stats.availableJobs} icon={<Zap size={20} />} color="orange" />
                </div>
            </header>

            {/* Pending Assessments Alert */}


            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {cards.map((card, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -10 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Link to={card.path} className={`block p-8 rounded-[2.5rem] bg-gradient-to-br ${card.color} border ${card.border} group transition-all hover:shadow-2xl hover:shadow-${card.text}-500/10`}>
                            <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-${card.text}-400 mb-6 group-hover:scale-110 transition-transform`}>
                                {card.icon}
                            </div>
                            <h3 className="text-2xl font-black mb-2 tracking-tight">{card.title}</h3>
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest group-hover:gap-4 transition-all">
                                Explore Now <ArrowRight size={14} className="text-teal-400" />
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            <section className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5">
                <h3 className="text-xl font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                    <Star className="text-teal-400" size={20} /> Recommendations for you
                </h3>
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                    <Briefcase size={48} className="mb-4" />
                    <p className="font-bold text-gray-400 uppercase tracking-widest text-sm">Complete your profile to see AI suggestions</p>
                    <Link to="/seeker/jobs" className="mt-4 px-6 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-xs font-black uppercase tracking-widest">Browse all jobs</Link>
                </div>
            </section>
        </div>
    );
};

const StatCard = ({ label, value, icon, color }) => (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 flex items-center justify-center text-${color}-400`}>
            {icon}
        </div>
        <div>
            <div className="text-2xl font-black tracking-tight">{value}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</div>
        </div>
    </div>
);

export default SeekerDashboard;
