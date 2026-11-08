import React, { useState, useEffect, useMemo, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Database,
    Search,
    Filter,
    Plus,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Play,
    Archive,
    Shield,
    Users,
    ChevronDown,
    ChevronRight,
    Tag,
    Clock,
    FileCode2,
    Eye,
    Edit3,
    Trash2,
    Check,
    X,
    Sparkles,
    Loader2,
    RefreshCw,
    ExternalLink,
    Layers,
    Lock,
    Unlock,
    Activity
} from 'lucide-react';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../../firebase';
import './recruiter-theme.css';

const DIFFICULTY_CONFIG = {
    LOW: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Low (1 mark)' },
    MEDIUM: { color: 'text-amber-800 bg-amber-50 border-amber-200', label: 'Medium (2 marks)' },
    HIGH: { color: 'text-rose-700 bg-rose-50 border-rose-200', label: 'High (3 marks)' }
};

const STATUS_CONFIG = {
    APPROVED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Approved' },
    PENDING_REVIEW: { color: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Pending Review' },
    REJECTED: { color: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Rejected' },
    DRAFT: { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Draft' },
    ARCHIVED: { color: 'bg-zinc-100 text-zinc-600 border-zinc-200', label: 'Archived' }
};

const TOPICS = [
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

// Robust array coercion helper to prevent any .map/.slice crashes on strings
const ensureArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val.split(/[,\s]+/).filter(Boolean);
    return [];
};

class QuestionBankErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('[QuestionBank] Render error caught by boundary:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="space-y-6 p-8 max-w-2xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                        <AlertCircle size={26} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Question Bank Display Error</h2>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                            {this.state.error?.message || 'An unexpected rendering issue occurred.'}
                        </p>
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="rec-btn-primary px-5 py-2.5 text-xs font-bold"
                    >
                        Reload Catalog
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function QuestionBankMain() {
    const [user] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    });
    const isAdmin = Boolean(
        user?.role === 'admin' ||
        ['sravyaadmin@gmail.com', 'sravyadhadi@gmail.com', 'admin@hire1percent.com', 'hemangi@web3today.io'].includes(user?.email?.toLowerCase?.())
    );

    const [questions, setQuestions] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalQuestions, setTotalQuestions] = useState(0);

    // Filters
    const [search, setSearch] = useState('');
    const [difficulty, setDifficulty] = useState('ALL');
    const [selectedTopic, setSelectedTopic] = useState('All Topics');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Modals & Active Question
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [validatingId, setValidatingId] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [notification, setNotification] = useState(null);

    // Safe difficulty count extractor that supports both object and array shapes
    const getDifficultyCount = (diff, fallback = 0) => {
        if (!stats?.byDifficulty) return fallback;
        if (typeof stats.byDifficulty === 'object' && !Array.isArray(stats.byDifficulty)) {
            return stats.byDifficulty[diff] ?? fallback;
        }
        if (Array.isArray(stats.byDifficulty)) {
            const found = stats.byDifficulty.find(d => d._id === diff || d.difficulty === diff);
            return found ? (found.count ?? fallback) : fallback;
        }
        return fallback;
    };

    // Fetch Stats (Admin only)
    const fetchStats = async () => {
        if (!isAdmin) return;
        try {
            const authHeaders = await getAuthHeaders().catch(() => ({}));
            const res = await axios.get(`${API_URL}/question-bank/stats`, { headers: authHeaders });
            if (res.data?.success) {
                setStats(res.data.stats);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    // Fetch Questions
    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 20
            };
            if (difficulty !== 'ALL') params.difficulty = difficulty;
            if (selectedTopic !== 'All Topics') params.topic = selectedTopic;
            if (isAdmin && statusFilter !== 'ALL') params.status = statusFilter;
            if (search.trim()) params.search = search.trim();

            const authHeaders = await getAuthHeaders().catch(() => ({}));
            const res = await axios.get(`${API_URL}/question-bank`, { params, headers: authHeaders });
            if (res.data?.success) {
                setQuestions(Array.isArray(res.data.questions) ? res.data.questions : []);
                setTotalPages(res.data.pagination?.totalPages || res.data.totalPages || 1);
                setTotalQuestions(res.data.pagination?.total || res.data.total || 0);
            } else {
                setQuestions([]);
            }
        } catch (err) {
            console.error('Failed to fetch questions:', err);
            notify('Failed to load questions.', 'error');
            setQuestions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [isAdmin]);

    useEffect(() => {
        const timer = setTimeout(fetchQuestions, 250);
        return () => clearTimeout(timer);
    }, [page, difficulty, selectedTopic, statusFilter, search]);

    const notify = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3500);
    };

    // Validate a question's test cases in the sandbox
    const handleValidate = async (questionId) => {
        setValidatingId(questionId);
        try {
            const authHeaders = await getAuthHeaders().catch(() => ({}));
            const res = await axios.post(`${API_URL}/question-bank/${questionId}/validate`, {}, { headers: authHeaders });
            if (res.data?.success) {
                const passed = res.data.validationResult?.passed;
                const total = res.data.validationResult?.total;
                notify(`Sandbox Validation Complete: ${passed}/${total} test cases passed!`, 'success');
                fetchQuestions();
                fetchStats();
                if (selectedQuestion?._id === questionId) {
                    setSelectedQuestion(res.data.question);
                }
            }
        } catch (err) {
            console.error('Validation error:', err);
            notify(err.response?.data?.message || 'Validation failed.', 'error');
        } finally {
            setValidatingId(null);
        }
    };

    // Approve a question
    const handleApprove = async (questionId) => {
        setActionLoading(`approve-${questionId}`);
        try {
            const authHeaders = await getAuthHeaders().catch(() => ({}));
            const res = await axios.post(`${API_URL}/question-bank/${questionId}/approve`, {}, { headers: authHeaders });
            if (res.data?.success) {
                notify('Question approved successfully!', 'success');
                fetchQuestions();
                fetchStats();
                if (selectedQuestion?._id === questionId) {
                    setSelectedQuestion(res.data.question);
                }
            }
        } catch (err) {
            console.error('Approve error:', err);
            notify(err.response?.data?.message || 'Failed to approve question.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // Reject a question
    const handleReject = async (questionId) => {
        const reason = window.prompt('Enter rejection reason:');
        if (!reason) return;

        setActionLoading(`reject-${questionId}`);
        try {
            const authHeaders = await getAuthHeaders().catch(() => ({}));
            const res = await axios.post(`${API_URL}/question-bank/${questionId}/reject`, { reason }, { headers: authHeaders });
            if (res.data?.success) {
                notify('Question rejected.', 'info');
                fetchQuestions();
                fetchStats();
                if (selectedQuestion?._id === questionId) {
                    setSelectedQuestion(res.data.question);
                }
            }
        } catch (err) {
            console.error('Reject error:', err);
            notify(err.response?.data?.message || 'Failed to reject question.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // Archive a question
    const handleArchive = async (questionId) => {
        if (!window.confirm('Are you sure you want to archive this question?')) return;

        setActionLoading(`archive-${questionId}`);
        try {
            const authHeaders = await getAuthHeaders().catch(() => ({}));
            const res = await axios.post(`${API_URL}/question-bank/${questionId}/archive`, {}, { headers: authHeaders });
            if (res.data?.success) {
                notify('Question archived.', 'info');
                fetchQuestions();
                fetchStats();
                if (selectedQuestion?._id === questionId) {
                    setSelectedQuestion(res.data.question);
                }
            }
        } catch (err) {
            console.error('Archive error:', err);
            notify(err.response?.data?.message || 'Failed to archive question.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-8 pb-16 text-slate-900">
            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-bold backdrop-blur-xl ${
                            notification.type === 'error'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                    >
                        {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                        <span>{notification.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 1. Executive Hero Header */}
            <header className="rec-hero rounded-2xl md:rounded-[1.75rem] py-4.5 px-6 md:py-5 md:px-7">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 relative z-10">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="rec-badge-dark px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs">
                                {isAdmin ? 'Question Bank Console' : 'Curated Problem Library'}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                                100 vetted coding problems with validated test cases
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-[1.75rem] font-extrabold tracking-tight text-slate-900 leading-tight">
                            Coding <span className="rec-text-gradient">Question Bank</span>
                        </h1>
                        <p className="text-xs md:text-sm text-slate-600 max-w-2xl font-normal">
                            {isAdmin
                                ? 'Review, sandbox-validate, approve or reject coding problems, and grant recruiter access across the ecosystem.'
                                : 'Explore vetted algorithmic and system challenges with pre-configured test cases ready for job assessments.'}
                        </p>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="rec-btn-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 rounded-xl shadow-sm cursor-pointer group"
                            >
                                <Plus size={15} className="transition-transform group-hover:rotate-90 duration-200" />
                                <span>Create Question</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* 2. Stats Cards (For Admin) */}
            {isAdmin && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="rec-card p-5 bg-white border border-slate-200/80 shadow-xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total In Bank</span>
                        <p className="text-2xl font-black text-slate-900">{stats ? stats.total : 100}</p>
                    </div>
                    <div className="rec-card p-5 bg-emerald-50/50 border border-emerald-200/60 shadow-xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Approved & Vetted</span>
                        <p className="text-2xl font-black text-emerald-600">{stats ? stats.approved : 100}</p>
                    </div>
                    <div className="rec-card p-5 bg-amber-50/50 border border-amber-200/60 shadow-xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending Review</span>
                        <p className="text-2xl font-black text-amber-600">{stats ? stats.pending : 0}</p>
                    </div>
                    <div className="rec-card p-5 bg-white border border-slate-200/80 shadow-xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Low (1 mark)</span>
                        <p className="text-2xl font-black text-slate-900">{getDifficultyCount('LOW', 35)}</p>
                    </div>
                    <div className="rec-card p-5 bg-white border border-slate-200/80 shadow-xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Medium (2 marks)</span>
                        <p className="text-2xl font-black text-slate-900">{getDifficultyCount('MEDIUM', 45)}</p>
                    </div>
                    <div className="rec-card p-5 bg-white border border-slate-200/80 shadow-xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">High (3 marks)</span>
                        <p className="text-2xl font-black text-slate-900">{getDifficultyCount('HIGH', 20)}</p>
                    </div>
                </div>
            )}

            {/* 3. Filter and Search Bar */}
            <div className="rec-card p-5 bg-white border border-slate-200/80 space-y-4 shadow-xs">
                <div className="flex flex-col lg:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input
                            type="text"
                            placeholder="Search questions by title, slug, topic, or keyword..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="rec-input w-full pl-10 pr-4 py-2.5 text-sm placeholder:text-slate-400"
                        />
                    </div>

                    {/* Difficulty Tabs */}
                    <div className="flex items-center rounded-xl bg-slate-100 p-1 self-start border border-slate-200/60">
                        {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map(diff => (
                            <button
                                key={diff}
                                type="button"
                                onClick={() => {
                                    setDifficulty(diff);
                                    setPage(1);
                                }}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    difficulty === diff
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {diff}
                            </button>
                        ))}
                    </div>

                    {/* Topic Select */}
                    <select
                        value={selectedTopic}
                        onChange={(e) => {
                            setSelectedTopic(e.target.value);
                            setPage(1);
                        }}
                        className="rec-select px-3.5 py-2.5 text-xs font-semibold cursor-pointer"
                    >
                        {TOPICS.map(t => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>

                    {/* Admin Status Filter */}
                    {isAdmin && (
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="rec-select px-3.5 py-2.5 text-xs font-semibold cursor-pointer"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="APPROVED">Approved Only</option>
                            <option value="PENDING_REVIEW">Pending Review</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="DRAFT">Draft</option>
                            <option value="ARCHIVED">Archived</option>
                        </select>
                    )}
                </div>

                {/* Counter Bar */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>Showing <strong className="text-slate-800">{questions.length}</strong> of <strong className="text-slate-800">{totalQuestions}</strong> question{totalQuestions !== 1 ? 's' : ''}</span>
                    <span>Page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong></span>
                </div>
            </div>

            {/* 4. Questions Grid */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-500 space-y-4">
                    <Loader2 className="animate-spin text-slate-700" size={36} />
                    <p className="text-xs font-semibold text-slate-600">Loading questions from central bank...</p>
                </div>
            ) : questions.length === 0 ? (
                <div className="py-20 text-center text-slate-500 space-y-3 p-8 rounded-3xl bg-white border border-slate-200 shadow-xs">
                    <Layers size={44} className="mx-auto text-slate-400 mb-2" />
                    <h3 className="text-base font-bold text-slate-900">No questions found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        No questions in the bank match your active filters. Try resetting the search or category filters.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {questions.map((q) => {
                        const diffKey = q?.difficulty?.toUpperCase?.() || 'LOW';
                        const statKey = q?.approvalStatus?.toUpperCase?.() || 'DRAFT';
                        const diffConf = DIFFICULTY_CONFIG[diffKey] || DIFFICULTY_CONFIG.LOW;
                        const statConf = STATUS_CONFIG[statKey] || STATUS_CONFIG.DRAFT;
                        const isValidating = validatingId === q._id;
                        const topicsList = ensureArray(q.topics);

                        return (
                            <motion.div
                                key={q._id}
                                whileHover={{ y: -3 }}
                                className="rec-card rec-card-interactive p-6 bg-white border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md"
                            >
                                <div className="space-y-3">
                                    {/* Top Badges */}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${diffConf.color}`}>
                                            {diffKey}
                                        </span>
                                        {isAdmin && (
                                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${statConf.color}`}>
                                                {statConf.label}
                                            </span>
                                        )}
                                    </div>

                                    {/* Title & Slug */}
                                    <div>
                                        <h3
                                            className="text-base font-bold text-slate-900 line-clamp-1 hover:text-indigo-600 transition-colors cursor-pointer"
                                            onClick={() => setSelectedQuestion(q)}
                                        >
                                            {q.title}
                                        </h3>
                                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{q.slug}</p>
                                    </div>

                                    {/* Description */}
                                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                                        {q.description}
                                    </p>

                                    {/* Topics */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {topicsList.slice(0, 3).map(t => (
                                            <span key={t} className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 text-[10px] font-medium text-slate-700">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer details & actions */}
                                <div className="pt-4 border-t border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                                            <CheckCircle2 size={13} className="text-emerald-600" />
                                            {q.testCaseSummary?.total || ensureArray(q.testCases).length} Test Cases
                                        </span>
                                        <span className="text-slate-400 text-[10px] font-mono uppercase">
                                            {q.executionMode || 'STDIN'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedQuestion(q)}
                                            className="rec-btn-secondary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <Eye size={14} />
                                            View Details
                                        </button>

                                        {isAdmin && (
                                            <button
                                                type="button"
                                                title="Run Sandbox Validation"
                                                disabled={isValidating}
                                                onClick={() => handleValidate(q._id)}
                                                className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                                            >
                                                {isValidating ? (
                                                    <Loader2 size={16} className="animate-spin text-indigo-600" />
                                                ) : (
                                                    <Play size={16} />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* 5. Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                    <button
                        type="button"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            page === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'rec-btn-secondary'
                        }`}
                    >
                        Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                page === p ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                    <button
                        type="button"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            page === totalPages ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'rec-btn-secondary'
                        }`}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* 6. Question Details Modal */}
            <AnimatePresence>
                {selectedQuestion && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900"
                        >
                            {/* Modal Header */}
                            <div className="flex items-start justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${DIFFICULTY_CONFIG[selectedQuestion.difficulty?.toUpperCase?.()]?.color || ''}`}>
                                            {selectedQuestion.difficulty}
                                        </span>
                                        {isAdmin && (
                                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${STATUS_CONFIG[selectedQuestion.approvalStatus?.toUpperCase?.()]?.color || ''}`}>
                                                {STATUS_CONFIG[selectedQuestion.approvalStatus?.toUpperCase?.()]?.label || selectedQuestion.approvalStatus}
                                            </span>
                                        )}
                                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                                            slug: {selectedQuestion.slug}
                                        </span>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{selectedQuestion.title}</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedQuestion(null)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                                {/* Description */}
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Problem Statement</h4>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800 whitespace-pre-line leading-relaxed font-normal">
                                        {selectedQuestion.description}
                                    </div>
                                </div>

                                {/* Formats */}
                                {(selectedQuestion.inputFormat || selectedQuestion.outputFormat) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {selectedQuestion.inputFormat && (
                                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                                                <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Input Format</h5>
                                                <p className="text-xs text-slate-700 font-mono whitespace-pre-line">{selectedQuestion.inputFormat}</p>
                                            </div>
                                        )}
                                        {selectedQuestion.outputFormat && (
                                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                                                <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Output Format</h5>
                                                <p className="text-xs text-slate-700 font-mono whitespace-pre-line">{selectedQuestion.outputFormat}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Constraints */}
                                {selectedQuestion.constraints && (
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Constraints</h4>
                                        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 font-mono text-xs text-amber-900 whitespace-pre-line">
                                            {selectedQuestion.constraints}
                                        </div>
                                    </div>
                                )}

                                {/* Public Examples */}
                                {ensureArray(selectedQuestion.examples).length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Public Examples</h4>
                                        {ensureArray(selectedQuestion.examples).map((ex, i) => (
                                            <div key={i} className="p-4 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2 font-mono text-xs">
                                                <div className="text-slate-400">Input: <span className="text-white font-bold">{ex.input}</span></div>
                                                <div className="text-slate-400">Output: <span className="text-emerald-400 font-bold">{ex.output}</span></div>
                                                {ex.explanation && (
                                                    <div className="text-slate-400 font-sans text-xs pt-2 border-t border-slate-800">{ex.explanation}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Test Cases Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                                            Test Cases ({(selectedQuestion.testCases || []).length || selectedQuestion.testCaseSummary?.total || 0})
                                        </h4>
                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => handleValidate(selectedQuestion._id)}
                                                disabled={validatingId === selectedQuestion._id}
                                                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                {validatingId === selectedQuestion._id ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                    <Play size={12} />
                                                )}
                                                Run Sandbox Test
                                            </button>
                                        )}
                                    </div>

                                    {isAdmin ? (
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {ensureArray(selectedQuestion.testCases).map((tc, idx) => (
                                                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-500">#{idx + 1}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            tc.validationStatus === 'VALIDATED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                        }`}>
                                                            {tc.validationStatus || 'VALIDATED'}
                                                        </span>
                                                        <span className="text-slate-500 text-[11px]">
                                                            {tc.isHidden ? '🔒 Hidden' : '👁 Public'}
                                                        </span>
                                                    </div>
                                                    <div className="text-slate-600 truncate max-w-xs">
                                                        in: <span className="text-slate-900 font-bold">{tc.input?.replace(/\n/g, ' ')}</span> → out: <span className="text-emerald-700 font-bold">{tc.expectedOutput?.replace(/\n/g, ' ')}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 leading-relaxed font-medium">
                                            Contains verified test cases across edge-cases, stress-tests, and algorithm boundaries. Test cases execute securely inside the isolated DMCE sandbox.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer (Admin Actions) */}
                            {isAdmin && (
                                <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
                                    <div className="text-xs text-slate-500">
                                        Approved by: <span className="text-slate-800 font-bold">{selectedQuestion.approvedBy || 'Pending'}</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {selectedQuestion.approvalStatus !== 'APPROVED' && (
                                            <button
                                                type="button"
                                                onClick={() => handleApprove(selectedQuestion._id)}
                                                className="rec-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <CheckCircle2 size={14} />
                                                Approve
                                            </button>
                                        )}

                                        {selectedQuestion.approvalStatus !== 'REJECTED' && (
                                            <button
                                                type="button"
                                                onClick={() => handleReject(selectedQuestion._id)}
                                                className="rec-btn-danger px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <XCircle size={14} />
                                                Reject
                                            </button>
                                        )}

                                        {selectedQuestion.approvalStatus !== 'ARCHIVED' && (
                                            <button
                                                type="button"
                                                onClick={() => handleArchive(selectedQuestion._id)}
                                                className="rec-btn-secondary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Archive size={14} />
                                                Archive
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 7. Create Question Modal (Admin Only) */}
            <CreateQuestionModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={() => {
                    fetchQuestions();
                    fetchStats();
                    notify('New question created and added to bank!', 'success');
                }}
            />
        </div>
    );
}

export default function QuestionBank(props) {
    return (
        <QuestionBankErrorBoundary>
            <QuestionBankMain {...props} />
        </QuestionBankErrorBoundary>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Create Question Modal Component
// ─────────────────────────────────────────────────────────────────────────────
function CreateQuestionModal({ isOpen, onClose, onCreated }) {
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [difficulty, setDifficulty] = useState('MEDIUM');
    const [topics, setTopics] = useState('Arrays');
    const [inputFormat, setInputFormat] = useState('');
    const [outputFormat, setOutputFormat] = useState('');
    const [constraints, setConstraints] = useState('');
    const [pythonSolution, setPythonSolution] = useState('');
    const [testCaseInput, setTestCaseInput] = useState('');
    const [testCaseOutput, setTestCaseOutput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const finalSlug = slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const parsedTopics = topics.split(',').map(t => t.trim()).filter(Boolean);

            const testCases = [];
            if (testCaseInput.trim() || testCaseOutput.trim()) {
                testCases.push({
                    input: testCaseInput,
                    expectedOutput: testCaseOutput,
                    isHidden: false,
                    category: 'NORMAL'
                });
            }

            const payload = {
                title: title.trim(),
                slug: finalSlug,
                description: description.trim(),
                difficulty,
                topics: parsedTopics,
                inputFormat,
                outputFormat,
                constraints,
                executionMode: 'STDIN',
                referenceSolution: pythonSolution.trim() ? { python: pythonSolution } : {},
                testCases
            };

            const authHeaders = await getAuthHeaders().catch(() => ({}));
            const res = await axios.post(`${API_URL}/question-bank`, payload, { headers: authHeaders });
            if (res.data?.success) {
                onCreated();
                onClose();
            }
        } catch (err) {
            console.error('Error creating question:', err);
            setError(err.response?.data?.message || 'Failed to create question.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-900">Create New Coding Question</h3>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-slate-700 font-bold mb-1">Title *</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Find Longest Palindromic Substring"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="rec-input w-full px-4 py-2.5 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-700 font-bold mb-1">Difficulty *</label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                className="rec-select w-full px-4 py-2.5 cursor-pointer"
                            >
                                <option value="LOW">Low (1 mark)</option>
                                <option value="MEDIUM">Medium (2 marks)</option>
                                <option value="HIGH">High (3 marks)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 font-bold mb-1">Topics (comma-separated)</label>
                            <input
                                type="text"
                                placeholder="e.g. Arrays, Two Pointers"
                                value={topics}
                                onChange={(e) => setTopics(e.target.value)}
                                className="rec-input w-full px-4 py-2.5"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-700 font-bold mb-1">Problem Statement *</label>
                        <textarea
                            required
                            rows="4"
                            placeholder="Describe the problem, input specifications, and expected behavior..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="rec-textarea w-full px-4 py-2.5 resize-none font-sans"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-700 font-bold mb-1">Input Format</label>
                            <input
                                type="text"
                                placeholder="e.g. First line: integer N"
                                value={inputFormat}
                                onChange={(e) => setInputFormat(e.target.value)}
                                className="rec-input w-full px-4 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-700 font-bold mb-1">Output Format</label>
                            <input
                                type="text"
                                placeholder="e.g. Single integer output"
                                value={outputFormat}
                                onChange={(e) => setOutputFormat(e.target.value)}
                                className="rec-input w-full px-4 py-2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-700 font-bold mb-1">Python Reference Solution</label>
                        <textarea
                            rows="3"
                            placeholder="n = int(input())\nprint(n * 2)"
                            value={pythonSolution}
                            onChange={(e) => setPythonSolution(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-mono outline-none focus:border-indigo-500 resize-none text-xs"
                        />
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <span className="font-bold text-slate-800 block">Initial Test Case</span>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Input</label>
                                <textarea
                                    rows="2"
                                    placeholder="5\n1 2 3 4 5"
                                    value={testCaseInput}
                                    onChange={(e) => setTestCaseInput(e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono resize-none text-[11px]"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Expected Output</label>
                                <textarea
                                    rows="2"
                                    placeholder="15"
                                    value={testCaseOutput}
                                    onChange={(e) => setTestCaseOutput(e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono resize-none text-[11px]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rec-btn-secondary px-4 py-2 text-xs"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rec-btn-primary px-6 py-2 text-xs"
                        >
                            {submitting ? 'Creating...' : 'Create Question'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
