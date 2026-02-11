import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Code2, Briefcase, GraduationCap, Loader2, Search } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../firebase';

const mockProfiles = [
    {
        name: "Arjun Mehta",
        role: "Senior AI Engineer",
        background: "IIT Delhi • Ex-Google",
        location: "Bengaluru, India",
        match: "98%",
        technicalScore: "94/100",
        skills: ["PyTorch", "LLMs", "RAG", "CUDA"],
        experience: "5+ Years in Generative AI",
        bio: "Specializes in scaling LLM architectures and optimizing inference latency for production environments."
    },
    {
        name: "Sanya Iyer",
        role: "MLOps Specialist",
        background: "IIT Bombay • Ex-Zomato",
        location: "Mumbai, India",
        match: "95%",
        technicalScore: "91/100",
        skills: ["Kubernetes", "MLflow", "Terraform", "Python"],
        experience: "4 Years in AI Infrastructure",
        bio: "Expert in building robust CI/CD pipelines for machine learning models and managing GPU clusters."
    },
    {
        name: "Vikram Singh",
        role: "Fullstack AI Developer",
        background: "IIT Madras • Ex-Microsoft",
        location: "Hyderabad, India",
        match: "92%",
        technicalScore: "88/100",
        skills: ["React", "Node.js", "Python", "OpenAI API"],
        experience: "3+ Years Fullstack AI",
        bio: "Bridging the gap between complex AI models and intuitive user interfaces with high-performance web apps."
    }
];

const SampleProfilesModal = ({ isOpen, onClose }) => {
    const [realSeekers, setRealSeekers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchSampleSeekers = async () => {
                setLoading(true);
                try {
                    const res = await axios.get(`${API_URL}/sample-seekers`);
                    // Filter out seekers with no data or private names if necessary
                    const validSeekers = res.data.filter(s => s.name && s.skills?.length > 0);
                    setRealSeekers(validSeekers);
                } catch (error) {
                    console.error("Error fetching sample seekers:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchSampleSeekers();
        }
    }, [isOpen]);

    const displayProfiles = realSeekers.length > 0 ? realSeekers : mockProfiles;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/90 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 40 }}
                        className="relative w-full max-w-6xl bg-[#0c0f16] border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(37,99,235,0.15)] my-auto max-h-[90vh] flex flex-col"
                    >
                        <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar">
                            <button
                                onClick={onClose}
                                className="absolute top-8 right-8 z-10 p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-full"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="mb-10">
                                <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px] mb-2 block">Live Talent Pool</span>
                                <h3 className="text-3xl font-bold text-white mb-2">Verified AI Specialists</h3>
                                <p className="text-gray-400">Hand-picked engineers from the top 1% of the Indian engineering ecosystem.</p>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="animate-spin text-blue-500" size={40} />
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">Accessing Talent Ledger...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {displayProfiles.map((profile, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/10 flex flex-col h-full hover:border-blue-500/40 transition-all group backdrop-blur-sm"
                                        >
                                            <div className="flex items-start justify-between mb-8">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 p-0.5 relative group-hover:scale-110 transition-transform">
                                                    <div className="w-full h-full rounded-[0.9rem] bg-[#0c0f16] flex items-center justify-center overflow-hidden">
                                                        {profile.profilePic ? (
                                                            <img src={profile.profilePic} alt={profile.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-xl font-black text-white">{profile.name[0]}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-[9px] font-black text-green-400 uppercase tracking-widest">
                                                        {profile.match || '90%+ Match'}
                                                    </div>
                                                    <div className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-widest">
                                                        Score: {profile.technicalScore || 'A+'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h4 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors uppercase tracking-tight italic">
                                                    {profile.name}
                                                </h4>
                                                <p className="text-blue-400/80 text-[10px] font-black uppercase tracking-[0.2em]">
                                                    {profile.role || profile.designation || 'Specialist AI Engineer'}
                                                </p>
                                            </div>

                                            <div className="space-y-4 flex-1">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                                        <GraduationCap className="w-3.5 h-3.5 text-blue-500/50" />
                                                        {typeof profile.education === 'string' ? profile.education : (profile.education?.[0]?.institution || 'Elite Technical Background')}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                                        <Briefcase className="w-3.5 h-3.5 text-blue-500/50" />
                                                        {typeof profile.experience === 'string' ? profile.experience : (profile.experience?.[0]?.company ? `${profile.experience[0].role} @ ${profile.experience[0].company}` : 'Proven Industry Expertise')}
                                                    </div>
                                                </div>

                                                <p className="text-gray-500 text-[11px] leading-relaxed italic line-clamp-3 group-hover:line-clamp-none transition-all">
                                                    "{profile.bio || `Exceptional AI talent specializing in ${profile.skills?.slice(0, 3).join(', ') || 'advanced machine learning'}. Highly recommended for scale-up environments.`}"
                                                </p>

                                                <div className="flex flex-wrap gap-1.5 pt-2">
                                                    {(profile.skills || []).slice(0, 5).map((skill, sIdx) => (
                                                        <span key={sIdx} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-gray-400 hover:bg-white/10 transition-colors">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                    {profile.skills?.length > 5 && (
                                                        <span className="text-[9px] text-gray-600 font-bold self-center">+{profile.skills.length - 5} More</span>
                                                    )}
                                                </div>
                                            </div>

                                            <button className="w-full mt-8 py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-black/20 group-hover:scale-[1.02] active:scale-95">
                                                Request Full Dossier
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-12 p-8 rounded-[2rem] bg-gradient-to-r from-blue-600/10 to-teal-500/10 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="text-center md:text-left">
                                    <h5 className="text-white font-bold mb-1">Need a custom candidate pool?</h5>
                                    <p className="text-xs text-gray-500">We can filter our database of 5,000+ IIT-trained engineers for your specific needs.</p>
                                </div>
                                <button className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                    Contact Sales
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SampleProfilesModal;
