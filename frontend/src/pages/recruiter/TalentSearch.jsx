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
import GeneratedResumeModal from './GeneratedResumeModal';
import './recruiter-theme.css';

const TalentSearch = () => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [selectedResumeUserId, setSelectedResumeUserId] = useState(null);

    const handleSearch = async (e, customQuery) => {
        if (e) e.preventDefault();
        const searchQuery = customQuery !== undefined ? customQuery : query;
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/ai-search/candidates`, { query: searchQuery });
            setCandidates(res.data.candidates || []);
            setAnalysis(res.data.analysis);
        } catch (err) {
            console.error("AI Search Failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch(e);
        }
    };

    const suggestions = [
        "React developers with 3+ years experience",
        "Python backend experts in Fintech",
        "Fullstack engineers who know AWS",
        "Mobile developers with React Native skills"
    ];

    return (
        <div className="space-y-10 pb-20">
            {/* Hero Section */}
            <header className="rec-hero p-8 md:p-12 text-center max-w-4xl mx-auto space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>Semantic Talent Discovery</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    Find Top 1% Engineers in <span className="rec-text-gradient-blue">Plain English</span>
                </h1>
                <p className="text-sm md:text-base text-slate-600 font-normal max-w-2xl mx-auto leading-relaxed">
                    Skip tedious keyword matching. Describe your ideal hire, specific stack requirements, or domain expertise, and our AI pipeline will surface the best matches.
                </p>
            </header>

            {/* Search Bar Input */}
            <div className="max-w-4xl mx-auto relative">
                <form onSubmit={handleSearch} className="relative z-10">
                    <div className="relative rounded-[2rem] bg-white border border-slate-200/90 shadow-lg transition-all focus-within:border-indigo-500 focus-within:shadow-indigo-500/10 focus-within:shadow-xl">
                        <div className="absolute left-6 top-6 text-slate-400">
                            <BrainCircuit size={22} className="text-indigo-500" />
                        </div>
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe candidate requirements (e.g. Senior Golang engineer with microservices & Kubernetes in high-scale systems)..."
                            className="w-full bg-transparent pl-16 pr-44 py-5 text-base md:text-lg text-slate-900 focus:outline-none placeholder:text-slate-400 font-medium resize-none min-h-[90px] rounded-[2rem]"
                            rows={2}
                        />
                        <div className="absolute right-4 bottom-4">
                            <button
                                type="submit"
                                disabled={loading || !query.trim()}
                                className="rec-btn-primary px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                                <span>{loading ? 'Analyzing...' : 'Search Talent'}</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Prompt Suggestions */}
            {!candidates.length && !loading && (
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Try Instant Queries</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2.5">
                        {suggestions.map((s, idx) => (
                            <button
                                key={idx}
                                onClick={() => { 
                                    setQuery(s); 
                                    handleSearch(null, s);
                                }}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-200/80 text-slate-600 text-xs font-semibold hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all cursor-pointer shadow-xs"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Reasoning Callout */}
            {analysis && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3.5"
                >
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-0.5">AI Search Analysis</p>
                        <p className="text-xs text-slate-600 leading-relaxed italic">"{analysis.reasoning || 'Analyzing query parameters against verified talent profiles...'}"</p>
                    </div>
                </motion.div>
            )}

            {/* Results Area */}
            <div className="max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center py-20 space-y-4"
                        >
                            <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center animate-bounce shadow-sm">
                                <BrainCircuit size={32} />
                            </div>
                            <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">AI is scanning candidate repositories and profiles...</p>
                        </motion.div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {candidates.map((can, idx) => (
                                <motion.div
                                    key={can._id || idx}
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="rec-card rec-card-interactive p-7 flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Candidate Header & Links */}
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 overflow-hidden shrink-0 shadow-xs">
                                                {can.profilePic ? (
                                                    <img loading="lazy" src={can.profilePic} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={22} />
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {can.githubUrl && (
                                                    <a 
                                                        href={can.githubUrl} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center transition-colors"
                                                        title="GitHub Profile"
                                                    >
                                                        <Github size={15} />
                                                    </a>
                                                )}
                                                {can.linkedinUrl && (
                                                    <a 
                                                        href={can.linkedinUrl} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center transition-colors"
                                                        title="LinkedIn Profile"
                                                    >
                                                        <Linkedin size={15} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Name & Designation */}
                                        <div className="space-y-1 mb-4">
                                            <h3 className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                                                {can.name}
                                            </h3>
                                            <p className="text-xs font-semibold text-slate-500">
                                                { (typeof can.designation === 'string' && can.designation.trim()) ? can.designation : 'Software Engineer' }
                                            </p>
                                        </div>

                                        {/* Skills Tags */}
                                        <div className="flex flex-wrap gap-1.5 mb-5">
                                            {(() => {
                                                const matched = can.matchedSkills || [];
                                                const allSkills = can.skills || [];
                                                const ordered = [...matched, ...allSkills.filter(s => !matched.includes(s))];
                                                return ordered.slice(0, 4).map(skill => (
                                                    <span key={skill} className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold">
                                                        {skill}
                                                    </span>
                                                ));
                                            })()}
                                        </div>

                                        {/* Bio / Summary */}
                                        <p className="text-slate-600 text-xs leading-relaxed line-clamp-3 mb-6">
                                            {can.bio || "Proven track record delivering scalable software, collaborating across teams, and architecting robust applications."}
                                        </p>
                                    </div>

                                    {/* Action Button */}
                                    <button 
                                        onClick={() => {
                                            setSelectedResumeUserId(can.uid || can._id);
                                            setShowResumeModal(true);
                                        }}
                                        className="rec-btn-primary w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <span>View Verified Profile</span>
                                        <ArrowRight size={14} />
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {!loading && candidates.length === 0 && query && (
                    <div className="text-center py-16 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                            <Zap size={22} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">No matching candidates found</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">Try broadening your prompt keywords or removing specific constraint combinations.</p>
                    </div>
                )}
            </div>

            {/* Generated Resume Modal */}
            {showResumeModal && selectedResumeUserId && (
                <GeneratedResumeModal
                    userId={selectedResumeUserId}
                    onClose={() => {
                        setShowResumeModal(false);
                        setSelectedResumeUserId(null);
                    }}
                />
            )}
        </div>
    );
};

export default TalentSearch;
