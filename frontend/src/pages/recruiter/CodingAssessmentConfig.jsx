import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Edit3, ChevronDown, Save, Loader2, CheckCircle2, ArrowLeft, Code2, Clock, Zap, AlertCircle, GripVertical, UploadCloud } from 'lucide-react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../../firebase';
import CodingQuestionBuilder from '../../components/recruiter/CodingQuestionBuilder';

const SUPPORTED_LANGUAGES = [
    'Java', 'Python', 'JavaScript', 'C++', 'C', 'Go', 'PHP', 'C#', 'Kotlin', 'Swift', 'SQL'
];

const CodingAssessmentConfig = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [jobTitle, setJobTitle] = useState('');

    // Coding Round State
    const [roundConfig, setRoundConfig] = useState({
        totalTime: 60,
        timerType: 'overall',
        languages: [],
        instructions: '',
        status: 'draft'
    });
    const [codingRoundId, setCodingRoundId] = useState(null);
    const [questions, setQuestions] = useState([]);

    // UI State
    const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);

    useEffect(() => {
        if (!user.uid && !user._id && !user.id) {
            navigate('/login');
        } else if (user.role !== 'recruiter' && user.role !== 'admin') {
            navigate('/seeker');
        }
    }, [user, navigate]);

    // Fetch existing data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch job title
                const jobRes = await axios.get(`${API_URL}/jobs/${jobId}`);
                if (jobRes.data) setJobTitle(jobRes.data.title || '');

                // Fetch existing coding round
                const roundRes = await axios.get(`${API_URL}/coding-assessments/round/${jobId}`);
                if (roundRes.data?.success && roundRes.data.codingRound) {
                    const round = roundRes.data.codingRound;
                    setCodingRoundId(round._id);
                    setRoundConfig({
                        totalTime: round.totalTime || 60,
                        timerType: round.timerType || 'overall',
                        languages: round.languages || [],
                        instructions: round.instructions || '',
                        status: round.status || 'draft'
                    });
                    setQuestions(round.questions || []);
                }
            } catch (error) {
                // 404 is expected if no coding round exists yet
                if (error.response?.status !== 404) {
                    console.error('Error fetching coding assessment data:', error);
                }
            } finally {
                setLoading(false);
            }
        };
        if (jobId) fetchData();
    }, [jobId]);

    // Save round configuration
    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            const res = await axios.post(`${API_URL}/coding-assessments/round`, {
                jobId,
                ...roundConfig
            });
            if (res.data?.success) {
                setCodingRoundId(res.data.codingRound._id);
                setQuestions(res.data.codingRound.questions || []);
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
            }
        } catch (error) {
            console.error('Error saving config:', error);
            alert(error.response?.data?.message || 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    // Publish / Unpublish
    const handlePublish = async () => {
        setSaving(true);
        try {
            const newStatus = roundConfig.status === 'published' ? 'draft' : 'published';
            const res = await axios.post(`${API_URL}/coding-assessments/round`, {
                jobId,
                ...roundConfig,
                status: newStatus
            });
            if (res.data?.success) {
                setRoundConfig(prev => ({ ...prev, status: newStatus }));
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
            }
        } catch (error) {
            console.error('Error publishing:', error);
            alert(error.response?.data?.message || 'Failed to update status');
        } finally {
            setSaving(false);
        }
    };

    // Language toggle
    const toggleLanguage = (lang) => {
        setRoundConfig(prev => ({
            ...prev,
            languages: prev.languages.includes(lang)
                ? prev.languages.filter(l => l !== lang)
                : [...prev.languages, lang]
        }));
    };

    // Bulk upload coding questions from JSON
    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!codingRoundId) {
            alert('Please save the round configuration first before uploading questions.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!Array.isArray(data)) {
                    alert('Invalid format: The file must contain a JSON array of questions.');
                    return;
                }

                const validQuestions = data.filter(q => q.title && q.description);
                if (validQuestions.length === 0) {
                    alert('Invalid format: No valid questions found (each must have a title and description).');
                    return;
                }

                setSaving(true);
                const promises = validQuestions.map(q => {
                    return axios.post(`${API_URL}/coding-assessments/questions`, {
                        codingRoundId,
                        title: q.title,
                        description: q.description,
                        inputFormat: q.inputFormat || '',
                        outputFormat: q.outputFormat || '',
                        constraints: q.constraints || '',
                        expectedApproach: q.expectedApproach || '',
                        examples: Array.isArray(q.examples) ? q.examples : [],
                        difficulty: q.difficulty || 'Medium',
                        marks: Number(q.marks) || 10,
                        allowedLanguages: Array.isArray(q.allowedLanguages) ? q.allowedLanguages : roundConfig.languages,
                        timer: Number(q.timer) || 0
                    });
                });

                const results = await Promise.all(promises);
                const newQuestions = results.map(res => res.data.question);
                setQuestions(prev => [...prev, ...newQuestions]);
                alert(`Successfully uploaded and configured ${newQuestions.length} questions!`);
            } catch (err) {
                console.error('Bulk upload failed:', err);
                alert('Error parsing or saving questions. Please make sure the JSON format is valid.');
            } finally {
                setSaving(false);
                e.target.value = ''; // Reset input element
            }
        };
        reader.readAsText(file);
    };

    // Delete question
    const handleDeleteQuestion = async (questionId) => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;
        try {
            await axios.delete(`${API_URL}/coding-assessments/questions/${questionId}`);
            setQuestions(prev => prev.filter(q => (q._id || q.id) !== questionId));
        } catch (error) {
            console.error('Error deleting question:', error);
            alert('Failed to delete question');
        }
    };

    // On question saved (from builder)
    const handleQuestionSaved = (question, isEdit) => {
        if (isEdit) {
            setQuestions(prev => prev.map(q => (q._id || q.id) === (question._id || question.id) ? question : q));
        } else {
            setQuestions(prev => [...prev, question]);
        }
        setShowQuestionBuilder(false);
        setEditingQuestion(null);
    };

    // Difficulty badge colors
    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Easy': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'Medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'Hard': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-400 bg-white/5 border-white/10';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-500" size={40} />
                    <p className="text-gray-400 text-sm font-medium">Loading coding assessment...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="mb-10">
                <button
                    onClick={() => navigate('/recruiter/my-jobs')}
                    className="flex items-center gap-2 text-gray-500 hover:text-white text-sm font-medium mb-6 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to Jobs
                </button>
                <div className="flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                            <Code2 className="text-blue-500" size={28} />
                            Coding Assessment
                        </h1>
                        <p className="text-gray-400">
                            Configure the coding round for <span className="text-white font-semibold">{jobTitle || 'this job'}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {roundConfig.status === 'published' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                <CheckCircle2 size={12} /> Published
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                                <Clock size={12} /> Draft
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Section A: Round Configuration */}
            <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl mb-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                        A
                    </div>
                    <h2 className="text-xl font-bold">Round Configuration</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Timer Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Timer Type</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setRoundConfig(prev => ({ ...prev, timerType: 'overall' }))}
                                className={`flex-1 px-4 py-3 rounded-2xl border text-sm font-bold transition-all ${
                                    roundConfig.timerType === 'overall'
                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                            >
                                <Clock size={16} className="inline mr-2" />
                                Overall Timer
                            </button>
                            <button
                                type="button"
                                onClick={() => setRoundConfig(prev => ({ ...prev, timerType: 'individual' }))}
                                className={`flex-1 px-4 py-3 rounded-2xl border text-sm font-bold transition-all ${
                                    roundConfig.timerType === 'individual'
                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                            >
                                <Zap size={16} className="inline mr-2" />
                                Per Question
                            </button>
                        </div>
                    </div>

                    {/* Total Time (only for overall timer) */}
                    {roundConfig.timerType === 'overall' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Total Time (minutes)</label>
                            <input
                                type="number"
                                min="5"
                                max="480"
                                value={roundConfig.totalTime}
                                onChange={(e) => setRoundConfig(prev => ({ ...prev, totalTime: Number(e.target.value) }))}
                                className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all"
                            />
                        </div>
                    )}

                    {/* Languages */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 mb-2">Supported Languages</label>
                        <div className="flex flex-wrap gap-2">
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => toggleLanguage(lang)}
                                    className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
                                        roundConfig.languages.includes(lang)
                                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                            : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
                                    }`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                        {roundConfig.languages.length === 0 && (
                            <p className="text-amber-400/70 text-xs mt-2 flex items-center gap-1">
                                <AlertCircle size={12} /> Select at least one language
                            </p>
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 mb-2">Instructions for Candidates</label>
                        <textarea
                            value={roundConfig.instructions}
                            onChange={(e) => setRoundConfig(prev => ({ ...prev, instructions: e.target.value }))}
                            rows="3"
                            placeholder="e.g. Write clean code with proper variable naming. No external libraries allowed."
                            className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all resize-none text-sm"
                        />
                    </div>
                </div>

                {/* Save Config Button */}
                <div className="flex items-center gap-4 mt-8">
                    <button
                        type="button"
                        onClick={handleSaveConfig}
                        disabled={saving || roundConfig.languages.length === 0}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {codingRoundId ? 'Update Configuration' : 'Save Configuration'}
                    </button>
                    {saved && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-emerald-400 text-sm font-bold flex items-center gap-1"
                        >
                            <CheckCircle2 size={16} /> Saved!
                        </motion.span>
                    )}
                </div>
            </div>

            {/* Section B: Questions */}
            <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl mb-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold border border-teal-500/20">
                            B
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Questions</h2>
                            <p className="text-gray-500 text-xs mt-0.5">{questions.length} question{questions.length !== 1 ? 's' : ''} added</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer text-sm shadow-lg">
                            <UploadCloud size={18} className="text-teal-400" />
                            <span>Bulk Upload JSON</span>
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleBulkUpload}
                                className="hidden"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                if (!codingRoundId) {
                                    alert('Please save the round configuration first');
                                    return;
                                }
                                setEditingQuestion(null);
                                setShowQuestionBuilder(true);
                            }}
                            className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-teal-500/20 cursor-pointer"
                        >
                            <Plus size={18} />
                            Add Question
                        </button>
                    </div>
                </div>

                {/* Questions List */}
                {questions.length === 0 ? (
                    <div className="p-16 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Code2 className="text-gray-600" size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-gray-300">No Questions Yet</h3>
                        <p className="text-gray-500 text-sm max-w-sm mx-auto">Add your first coding question to start building the assessment.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questions.map((q, idx) => (
                            <motion.div
                                key={q._id || q.id || idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/20 transition-all group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-gray-500 shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                <h4 className="text-base font-bold text-white truncate">{q.title}</h4>
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getDifficultyColor(q.difficulty)}`}>
                                                    {q.difficulty}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-xs line-clamp-2 mb-3">{q.description}</p>
                                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <Zap size={12} className="text-amber-500" /> {q.marks} marks
                                                </span>
                                                {roundConfig.timerType === 'individual' ? (
                                                    <span className="flex items-center gap-1.5 bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-lg border border-teal-500/20">
                                                        <Clock size={12} /> {q.timer || (q.difficulty === 'Easy' ? 15 : q.difficulty === 'Hard' ? 45 : 30)} min
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded-lg border border-white/5">
                                                        <Clock size={12} /> Round Timer ({roundConfig.totalTime} min)
                                                    </span>
                                                )}
                                                {q.allowedLanguages?.length > 0 && (
                                                    <span className="text-gray-600">
                                                        {q.allowedLanguages.join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                setEditingQuestion(q);
                                                setShowQuestionBuilder(true);
                                            }}
                                            className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-blue-500/10 transition-all"
                                            title="Edit question"
                                        >
                                            <Edit3 size={16} className="text-gray-400 hover:text-blue-400" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteQuestion(q._id || q.id)}
                                            className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-red-500/10 transition-all"
                                            title="Delete question"
                                        >
                                            <Trash2 size={16} className="text-gray-400 hover:text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Publish Bar */}
            {codingRoundId && questions.length > 0 && (
                <div className="p-6 rounded-[2.5rem] bg-gradient-to-r from-blue-500/5 to-teal-500/5 border border-white/10 flex items-center justify-between gap-6">
                    <div>
                        <h3 className="text-lg font-bold mb-1">Ready to Publish?</h3>
                        <p className="text-gray-500 text-sm">
                            {roundConfig.status === 'published'
                                ? 'This coding round is live and visible to candidates.'
                                : `${questions.length} question${questions.length !== 1 ? 's' : ''} configured. Publish to make it available.`
                            }
                        </p>
                    </div>
                    <button
                        onClick={handlePublish}
                        disabled={saving}
                        className={`px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl ${
                            roundConfig.status === 'published'
                                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                                : 'bg-white text-black hover:bg-gray-200 shadow-white/10'
                        }`}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : roundConfig.status === 'published' ? 'Unpublish' : 'Publish Round'}
                    </button>
                </div>
            )}

            {/* Question Builder Modal */}
            <AnimatePresence>
                {showQuestionBuilder && (
                    <CodingQuestionBuilder
                        codingRoundId={codingRoundId}
                        question={editingQuestion}
                        roundLanguages={roundConfig.languages}
                        timerType={roundConfig.timerType}
                        onSave={handleQuestionSaved}
                        onClose={() => {
                            setShowQuestionBuilder(false);
                            setEditingQuestion(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default CodingAssessmentConfig;
