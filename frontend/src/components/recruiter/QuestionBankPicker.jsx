import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    X,
    Check,
    CheckSquare,
    Square,
    Code2,
    Database,
    Sparkles,
    ChevronDown,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Layers,
    Tag,
    Clock,
    FileCode2,
    Eye,
    Plus,
    Loader2
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';

const DIFFICULTY_COLORS = {
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    HIGH: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
};

const TOPICS_LIST = [
    'All Topics',
    'Arrays',
    'Strings',
    'Math',
    'Searching',
    'Sorting',
    'Two Pointers',
    'Stacks',
    'Queues',
    'Hashing',
    'Recursion',
    'Dynamic Programming',
    'Greedy',
    'Graphs',
    'Trees',
    'Intervals',
    'Bit Manipulation'
];

const ensureArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val.split(/[,\s]+/).filter(Boolean);
    return [];
};

export default function QuestionBankPicker({ isOpen, onClose, jobId, onQuestionsImported, onSelectQuestions, initialSelectedIds }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [difficulty, setDifficulty] = useState('ALL');
    const [selectedTopic, setSelectedTopic] = useState('All Topics');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [previewQuestion, setPreviewQuestion] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importSuccess, setImportSuccess] = useState(null);
    const [error, setError] = useState(null);

    const ADMIN_EMAILS = ['sravyaadmin@gmail.com', 'sravyadhadi@gmail.com', 'admin@hire1percent.com', 'hemangi@web3today.io'];
    const storedUser = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    }, []);
    const isAdminUser = storedUser.role === 'admin' || (storedUser.email && ADMIN_EMAILS.includes(storedUser.email.toLowerCase().trim()));

    // Fetch questions when modal opens
    useEffect(() => {
        if (!isOpen) {
            setSelectedIds(new Set());
            setPreviewQuestion(null);
            setImportSuccess(null);
            setError(null);
            return;
        }

        if (initialSelectedIds && (initialSelectedIds.size > 0 || initialSelectedIds.length > 0)) {
            setSelectedIds(new Set(Array.from(initialSelectedIds).map(String)));
        } else {
            setSelectedIds(new Set());
        }

        const fetchQuestions = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = { limit: 100 };
                if (difficulty !== 'ALL') params.difficulty = difficulty;
                if (selectedTopic !== 'All Topics') params.topic = selectedTopic;
                if (search.trim()) params.search = search.trim();

                const res = await axios.get(`${API_URL}/question-bank`, { params });
                if (res.data?.success) {
                    setQuestions(res.data.questions || []);
                }
            } catch (err) {
                console.error('Error fetching question bank:', err);
                setError(err.response?.data?.message || 'Failed to load question bank.');
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchQuestions, 200);
        return () => clearTimeout(timer);
    }, [isOpen, difficulty, selectedTopic, search]);

    // Toggle single selection
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Toggle select all visible
    const toggleSelectAll = () => {
        if (selectedIds.size === questions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(questions.map(q => q._id)));
        }
    };

    // Import selected questions into the job assessment
    const handleImport = async () => {
        if (selectedIds.size === 0) return;
        const selectedList = questions.filter(q => selectedIds.has(q._id));

        // If onSelectQuestions callback is provided (e.g., PostJob.jsx), pass the questions directly
        if (onSelectQuestions) {
            onSelectQuestions(selectedList);
            setImportSuccess({ message: `${selectedList.length} question(s) selected!` });
            setTimeout(() => {
                onClose();
            }, 600);
            return;
        }

        if (!jobId) {
            setError('Please specify a Job ID or pass onSelectQuestions callback.');
            return;
        }

        setImporting(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/question-bank/import-to-job`, {
                jobId,
                questionIds: Array.from(selectedIds)
            });

            if (res.data?.success) {
                setImportSuccess(res.data);
                if (onQuestionsImported) {
                    onQuestionsImported(res.data);
                }
                setTimeout(() => {
                    onClose();
                }, 1500);
            }
        } catch (err) {
            console.error('Error importing questions:', err);
            setError(err.response?.data?.message || 'Failed to import questions to assessment.');
        } finally {
            setImporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-slate-100"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                <Database size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-extrabold text-white">Central Coding Question Bank</h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        Hire1Percent Verified
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Select pre-tested questions with verified test cases to attach directly to this job assessment
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isAdminUser && (
                                <button
                                    type="button"
                                    onClick={() => window.open('/admin/question-bank', '_blank')}
                                    className="px-3 py-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    title="Open Admin Question Bank in a new tab"
                                >
                                    <Database size={13} />
                                    <span>Manage in Admin ↗</span>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="p-6 border-b border-white/10 bg-slate-900/60 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by title, topic, or keyword..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 focus:border-indigo-500 text-sm outline-none transition-colors text-white placeholder-slate-500"
                                />
                            </div>

                            {/* Difficulty Filter Tabs */}
                            <div className="flex items-center rounded-2xl bg-white/5 border border-white/10 p-1">
                                {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map(diff => (
                                    <button
                                        key={diff}
                                        type="button"
                                        onClick={() => setDifficulty(diff)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            difficulty === diff
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {diff}
                                    </button>
                                ))}
                            </div>

                            {/* Topic Dropdown */}
                            <select
                                value={selectedTopic}
                                onChange={(e) => setSelectedTopic(e.target.value)}
                                className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                {TOPICS_LIST.map(topic => (
                                    <option key={topic} value={topic} className="bg-slate-900 text-white">
                                        {topic}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Selection status sub-bar */}
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleSelectAll}
                                    className="flex items-center gap-1.5 font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    {selectedIds.size === questions.length && questions.length > 0 ? (
                                        <CheckSquare size={16} />
                                    ) : (
                                        <Square size={16} />
                                    )}
                                    {selectedIds.size === questions.length && questions.length > 0 ? 'Deselect All' : 'Select All Visible'}
                                </button>
                                <span>•</span>
                                <span>Showing {questions.length} question{questions.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="font-bold text-white">
                                <span className="text-indigo-400">{selectedIds.size}</span> question{selectedIds.size !== 1 ? 's' : ''} selected
                            </div>
                        </div>
                    </div>

                    {/* Content: List + Detail Preview Split */}
                    <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
                        {/* Questions List (Left / Main) */}
                        <div className={`overflow-y-auto p-6 space-y-3 ${previewQuestion ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
                            {loading ? (
                                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                                    <Loader2 className="animate-spin text-indigo-400" size={36} />
                                    <p className="text-sm">Loading verified questions from bank...</p>
                                </div>
                            ) : error ? (
                                <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
                                    <AlertCircle size={20} />
                                    <span>{error}</span>
                                </div>
                            ) : questions.length === 0 ? (
                                <div className="py-16 text-center text-slate-400 space-y-2">
                                    <Layers size={36} className="mx-auto text-slate-600 mb-2" />
                                    <p className="text-base font-bold text-white">No questions match your criteria</p>
                                    <p className="text-xs text-slate-500">Try adjusting your filters or search terms.</p>
                                </div>
                            ) : (
                                questions.map((q) => {
                                    const isSelected = selectedIds.has(String(q._id)) || (q.title && selectedIds.has(q.title.trim().toLowerCase()));
                                    const isPreviewed = previewQuestion?._id === q._id;

                                    return (
                                        <div
                                            key={q._id}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-900/20'
                                                    : isPreviewed
                                                    ? 'bg-white/10 border-white/20'
                                                    : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                                            }`}
                                            onClick={() => toggleSelect(q._id)}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Checkbox */}
                                                <div className="mt-1 text-indigo-400 flex-shrink-0">
                                                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-500" />}
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <h4 className="font-bold text-white text-sm truncate">{q.title}</h4>
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${DIFFICULTY_COLORS[q.difficulty] || ''}`}>
                                                            {q.difficulty}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300 border border-white/5">
                                                            {q.executionMode || 'STDIN'}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">{q.description}</p>

                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {ensureArray(q.topics).slice(0, 3).map(t => (
                                                                <span key={t} className="px-2 py-0.5 rounded bg-white/5 text-slate-300 text-[10px] border border-white/5">
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                                                                <CheckCircle2 size={12} />
                                                                {q.testCaseSummary?.total || (q.testCases || []).length} Test Cases
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPreviewQuestion(isPreviewed ? null : q);
                                                                }}
                                                                className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors"
                                                            >
                                                                <Eye size={12} />
                                                                {isPreviewed ? 'Close Preview' : 'Preview'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Preview Pane (Right side when a question is clicked) */}
                        {previewQuestion && (
                            <div className="lg:col-span-5 p-6 border-l border-white/10 bg-slate-900/90 overflow-y-auto space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${DIFFICULTY_COLORS[previewQuestion.difficulty]}`}>
                                            {previewQuestion.difficulty}
                                        </span>
                                        <h3 className="text-lg font-bold text-white mt-2">{previewQuestion.title}</h3>
                                        <p className="text-xs text-indigo-400 font-mono mt-0.5">slug: {previewQuestion.slug}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewQuestion(null)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-white"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Problem Description */}
                                <div className="space-y-1.5">
                                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Problem Statement</h5>
                                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                                        {previewQuestion.description}
                                    </div>
                                </div>

                                {/* Input / Output Format */}
                                {(previewQuestion.inputFormat || previewQuestion.outputFormat) && (
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {previewQuestion.inputFormat && (
                                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Input Format</span>
                                                <p className="text-slate-300 font-mono text-[11px] whitespace-pre-line">{previewQuestion.inputFormat}</p>
                                            </div>
                                        )}
                                        {previewQuestion.outputFormat && (
                                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Output Format</span>
                                                <p className="text-slate-300 font-mono text-[11px] whitespace-pre-line">{previewQuestion.outputFormat}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Constraints */}
                                {previewQuestion.constraints && (
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Constraints</span>
                                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] font-mono text-amber-300/80 whitespace-pre-line">
                                            {previewQuestion.constraints}
                                        </div>
                                    </div>
                                )}

                                {/* Public Examples */}
                                {(previewQuestion.examples || []).length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Public Examples</span>
                                        {previewQuestion.examples.map((ex, i) => (
                                            <div key={i} className="p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] space-y-1">
                                                <div className="text-slate-400">Input: <span className="text-white">{ex.input}</span></div>
                                                <div className="text-slate-400">Output: <span className="text-emerald-400">{ex.output}</span></div>
                                                {ex.explanation && (
                                                    <div className="text-slate-500 text-[10px] font-sans pt-1 border-t border-white/5">{ex.explanation}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Test Case Security Notice */}
                                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2">
                                    <CheckCircle2 size={16} className="mt-0.5 text-indigo-400 flex-shrink-0" />
                                    <span>
                                        This question contains verified test cases (public and private). Hidden test cases will evaluate candidate submissions in the sandbox without being exposed in the UI.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 border-t border-white/10 bg-slate-900/80 flex items-center justify-between">
                        {importSuccess ? (
                            <div className="text-emerald-400 text-sm font-bold flex items-center gap-2">
                                <CheckCircle2 size={18} />
                                {importSuccess.message}
                            </div>
                        ) : error ? (
                            <div className="text-rose-400 text-xs font-semibold flex items-center gap-1.5">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400">
                                {selectedIds.size === 0
                                    ? 'Select questions to import into the job assessment'
                                    : `Ready to attach ${selectedIds.size} question${selectedIds.size !== 1 ? 's' : ''} to this job`}
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={importing}
                                className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleImport}
                                disabled={selectedIds.size === 0 || importing}
                                className={`px-6 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg ${
                                    selectedIds.size > 0 && !importing
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer active:scale-95'
                                        : 'bg-white/10 text-slate-500 cursor-not-allowed'
                                }`}
                            >
                                {importing ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={16} />
                                        Import Selected ({selectedIds.size})
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
