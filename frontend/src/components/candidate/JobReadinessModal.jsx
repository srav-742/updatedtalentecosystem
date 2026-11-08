import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    TrendingUp,
    CheckCircle2,
    ArrowRight,
    Sparkles,
    Target,
    Code2,
    FileText,
    Mic,
    Briefcase,
    ShieldCheck,
    AlertCircle,
    ChevronRight,
    Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const pillarIcons = {
    skills: Target,
    assessments: Code2,
    projects: Briefcase,
    resume: FileText,
    interview: Mic
};

const pillarLabels = {
    skills: 'Technical Skills',
    assessments: 'Coding & Assessments',
    projects: 'Production Projects',
    resume: 'Resume & Profile',
    interview: 'Interview Performance'
};

const JobReadinessModal = ({ isOpen, onClose, readinessData }) => {
    const navigate = useNavigate();

    if (!isOpen || !readinessData) return null;

    const {
        overallScore = 65,
        tier = 'Developing - Moderate Readiness',
        tierColor = 'indigo',
        tierDescription = '',
        percentile = 72,
        dimensions = {},
        improvementActions = []
    } = readinessData;

    const handleActionClick = (path) => {
        onClose();
        if (path) {
            navigate(path);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs"
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 16 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-3xl rounded-[2rem] border border-black/10 bg-white p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                    {/* Header with Close */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-white">
                                    <Sparkles size={11} className="text-amber-400" />
                                    <span>Career Intelligence</span>
                                </span>
                                <span className="text-xs text-slate-500 font-medium">Top {percentile}th Percentile</span>
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                                Job Readiness Score Diagnostic
                            </h2>
                            <p className="text-xs text-slate-500">
                                Comprehensive evaluation across skills, coding assessments, projects, resume parsing, and interview screening.
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Overall Score Banner */}
                    <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md">
                        <div className="space-y-2 max-w-md">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                <Award size={12} />
                                {tier}
                            </span>
                            <h3 className="text-xl font-bold tracking-tight">
                                Overall Readiness: {overallScore} / 100
                            </h3>
                            <p className="text-xs text-slate-300 leading-relaxed font-normal">
                                {tierDescription} Candidates with an 80+ score get <strong>2.4x more recruiter interview requests</strong>.
                            </p>
                        </div>

                        {/* Radial Gauge Representation */}
                        <div className="flex flex-col items-center justify-center shrink-0">
                            <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-white/20 bg-white/5 shadow-inner">
                                <div className="text-center">
                                    <span className="text-3xl font-black text-white">{overallScore}</span>
                                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Score</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5 Pillars Dimensional Breakdown Grid */}
                    <div className="mt-7 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                5-Pillar Score Breakdown
                            </h4>
                            <span className="text-[11px] text-slate-400 font-medium">Weighted Evaluation Matrix</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {Object.entries(dimensions).map(([key, dim]) => {
                                const IconComponent = pillarIcons[key] || Target;
                                const label = pillarLabels[key] || key;

                                return (
                                    <div
                                        key={key}
                                        className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                                                    <IconComponent size={15} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-900">{label}</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-900">
                                                {dim.score} <span className="text-slate-400 font-normal">/ {dim.max}</span>
                                            </span>
                                        </div>

                                        {/* Mini Progress Bar */}
                                        <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                                            <div
                                                style={{ width: `${Math.min(100, dim.percent || 0)}%` }}
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    dim.percent >= 80 ? 'bg-emerald-500' : dim.percent >= 60 ? 'bg-indigo-600' : 'bg-amber-500'
                                                }`}
                                            />
                                        </div>

                                        <p className="text-[11px] text-slate-500 font-medium">{dim.details}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Priority Improvement Actions */}
                    {improvementActions.length > 0 && (
                        <div className="mt-7 space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-indigo-600" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                    Priority Improvement Actions to Boost Score
                                </h4>
                            </div>

                            <div className="space-y-2.5">
                                {improvementActions.map((action) => (
                                    <div
                                        key={action.id}
                                        className="p-4 rounded-2xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50/40 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-indigo-200 transition-all"
                                    >
                                        <div className="space-y-1 max-w-lg">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-indigo-600 text-white">
                                                    {action.pointsBoost}
                                                </span>
                                                <h5 className="text-xs font-bold text-slate-900">{action.title}</h5>
                                            </div>
                                            <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                                                {action.desc}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => handleActionClick(action.actionPath)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-black transition-all active:scale-95 cursor-pointer shrink-0"
                                        >
                                            <span>{action.actionLabel}</span>
                                            <ArrowRight size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recruiter Visibility Footer Note */}
                    <div className="mt-7 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            <span>Calculated from live verified assessments & candidate portfolio data</span>
                        </span>
                        <button
                            onClick={onClose}
                            className="text-xs font-bold text-slate-700 hover:text-slate-900 underline cursor-pointer self-start sm:self-auto"
                        >
                            Close Diagnostic
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default JobReadinessModal;
