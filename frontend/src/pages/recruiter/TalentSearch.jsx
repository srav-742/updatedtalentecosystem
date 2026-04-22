import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    Sparkles, 
    User, 
    Briefcase, 
    Code, 
    ExternalLink, 
    Github, 
    Linkedin,
    Loader2,
    ArrowRight,
    BrainCircuit,
    Zap
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';

const TalentSearch = () => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [analysis, setAnalysis] = useState(null);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/ai-search/candidates`, { query });
            setCandidates(res.data.candidates || []);
            setAnalysis(res.data.analysis);
        } catch (err) {
            console.error("AI Search Failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const suggestions = [
        "React developers with 3+ years experience",
        "Python backend experts in Fintech",
        "Fullstack engineers who know AWS",
        "Mobile developers with React Native skills"
    ];

    return (
        <div className="space-y-12 pb-20">
            {/* Hero Section */}
            <header className="text-center max-w-3xl mx-auto space-y-6 pt-10">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest"
                >
                    <Sparkles size={14} /> AI-Powered Discovery
                </motion.div>
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
                    Find Talent in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">Plain English</span>
                </h1>
                <p className="text-gray-500 font-medium text-lg italic">
                    Stop using complex filters. Just describe who you need, and our AI will find them.
                </p>
            </header>

            {/* Search Bar */}
            <div className="max-w-4xl mx-auto relative group">
                <form onSubmit={handleSearch} className="relative z-10">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="I need a React developer with Fintech experience..."
                        className="w-full bg-white/5 border-2 border-white/10 rounded-[2.5rem] px-10 py-8 text-xl text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700 font-medium shadow-2xl backdrop-blur-xl"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-4 top-4 bottom-4 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-500 text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-blue-500/20"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                        {loading ? 'Finding...' : 'Search'}
                    </button>
                </form>
                {/* Glow Effects */}
                <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full -z-10 group-focus-within:bg-blue-500/40 transition-all duration-500" />
            </div>

            {/* Suggestions */}
            {!candidates.length && !loading && (
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-wrap justify-center gap-3 font-medium">
                        {suggestions.map((s, idx) => (
                            <button
                                key={idx}
                                onClick={() => { setQuery(s); }}
                                className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-500 text-sm hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/5 transition-all"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Analysis Debug */}
            {analysis && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-4xl mx-auto p-6 rounded-[2rem] bg-blue-500/5 border border-blue-500/10"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <BrainCircuit size={14} className="text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">AI Interpretation</span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium italic">"{analysis.reasoning || 'Analyzing query parameters...'}"</p>
                </motion.div>
            )}

            {/* Results */}
            <div className="max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center py-20 space-y-4"
                        >
                            <BrainCircuit size={48} className="text-blue-400 animate-pulse" />
                            <p className="text-gray-500 font-black uppercase tracking-widest text-xs">AI is analyzing your requirements...</p>
                        </motion.div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                        >
                            {candidates.map((can, idx) => (
                                <motion.div
                                    key={can._id || idx}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="group relative bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:border-blue-500/30 transition-all hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden"
                                >
                                    {/* Candidate Card Content */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400">
                                            {can.profilePic ? (
                                                <img src={can.profilePic} alt="" className="w-full h-full object-cover rounded-2xl" />
                                            ) : (
                                                <User size={24} />
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {can.githubUrl && (
                                                <a href={can.githubUrl} className="p-2 rounded-xl bg-white/5 text-gray-500 hover:text-white transition-all"><Github size={16} /></a>
                                            )}
                                            {can.linkedinUrl && (
                                                <a href={can.linkedinUrl} className="p-2 rounded-xl bg-white/5 text-gray-500 hover:text-white transition-all"><Linkedin size={16} /></a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-6">
                                        <h3 className="text-xl font-black uppercase tracking-tight text-white group-hover:text-blue-400 transition-colors">{can.name}</h3>
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{can.designation || 'Tech Explorer'}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-8">
                                        {can.skills?.slice(0, 4).map(skill => (
                                            <span key={skill} className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>

                                    <p className="text-gray-400 text-sm italic line-clamp-3 mb-8 leading-relaxed">
                                        {can.bio || "Crafting professional brilliance with every line of code..."}
                                    </p>

                                    <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 group-hover:border-blue-600 transition-all flex items-center justify-center gap-2">
                                        View Full Profile <ArrowRight size={14} />
                                    </button>

                                    {/* Decorative Glow */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full group-hover:bg-blue-500/10 transition-all" />
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {!loading && candidates.length === 0 && query && (
                    <div className="text-center py-20 space-y-4">
                        <Zap size={32} className="text-gray-700 mx-auto" />
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No matching candidates found for this specific query.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TalentSearch;
