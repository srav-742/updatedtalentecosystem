import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Code, FileText, RefreshCw, ChevronDown, ChevronUp, Save, Edit3, Eye, Clock } from 'lucide-react';
import axios from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../../firebase';

const CustomCodingAssessmentConfig = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

    // Generation Parameters (from navigation state or input form)
    const [language, setLanguage] = useState(location.state?.language || 'Python');
    const [normalCount, setNormalCount] = useState(location.state?.normalCount || 1);
    const [moderateCount, setModerateCount] = useState(location.state?.moderateCount || 1);
    const [highCount, setHighCount] = useState(location.state?.highCount || 0);
    const [uploadedFile, setUploadedFile] = useState(location.state?.uploadedFile || null);
    const [jobTitle, setJobTitle] = useState(location.state?.jobTitle || '');
    const [jobDescription, setJobDescription] = useState(location.state?.jobDescription || '');

    // State Variables
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [questions, setQuestions] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [openIndex, setOpenIndex] = useState(0);
    const [saving, setSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [totalTime, setTotalTime] = useState(location.state?.totalTime || 60);
    const [timerType, setTimerType] = useState(location.state?.timerType || 'overall');

    // Form inputs if state is missing (fallback form)
    const [showConfigForm, setShowConfigForm] = useState(!location.state);

    useEffect(() => {
        if (!user.uid && !user._id && !user.id) {
            navigate('/login');
        } else if (user.role !== 'recruiter' && user.role !== 'admin') {
            navigate('/seeker');
        }
    }, [user, navigate]);

    // Auto-trigger generation if config is provided via redirect state
    useEffect(() => {
        if (location.state) {
            triggerAIQuestionGeneration();
        }
    }, []);

    const triggerAIQuestionGeneration = async () => {
        setLoading(true);
        setQuestions([]);
        setStatusText('Reading parameters...');
        
        try {
            const formData = new FormData();
            formData.append('language', language);
            formData.append('normalCount', normalCount);
            formData.append('moderateCount', moderateCount);
            formData.append('highCount', highCount);
            formData.append('jobTitle', jobTitle);
            formData.append('jobDescription', jobDescription);
            if (uploadedFile) {
                formData.append('file', uploadedFile);
                setStatusText('Extracting context from uploaded syllabus...');
            }

            // Artificial progress steps for visual wow factor
            setTimeout(() => setStatusText('Parsing requirements & mapping concepts...'), 1000);
            setTimeout(() => setStatusText('Sending specifications to Gemini AI model...'), 2000);
            setTimeout(() => setStatusText('Generating logical code templates & edge cases...'), 4500);

            const res = await axios.post(`${API_URL}/custom-coding-assessments/generate`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.success && Array.isArray(res.data.questions)) {
                const enriched = res.data.questions.map(q => {
                    let qTimer = 0;
                    if ((location.state?.timerType || timerType) === 'individual') {
                        const diff = (q.difficulty || '').toLowerCase();
                        if (diff === 'easy' || diff === 'normal') {
                            qTimer = location.state?.normalTime || 15;
                        } else if (diff === 'hard' || diff === 'high') {
                            qTimer = location.state?.highTime || 45;
                        } else {
                            qTimer = location.state?.moderateTime || 30; // moderate / medium
                        }
                    }
                    return { ...q, timer: qTimer };
                });
                setQuestions(enriched);
                setShowConfigForm(false);
            } else {
                alert('AI generation failed to produce valid questions.');
            }
        } catch (error) {
            console.error('Error generating questions:', error);
            alert(error.response?.data?.message || 'Failed to generate questions. Please configure manually or try again.');
            setShowConfigForm(true);
        } finally {
            setLoading(false);
        }
    };

    // Question manipulation handlers
    const handleFieldChange = (index, field, value) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const handleExampleChange = (qIndex, eIndex, field, value) => {
        const updated = [...questions];
        const examples = [...updated[qIndex].examples];
        examples[eIndex] = { ...examples[eIndex], [field]: value };
        updated[qIndex] = { ...updated[qIndex], examples };
        setQuestions(updated);
    };

    const addExample = (qIndex) => {
        const updated = [...questions];
        const examples = [...(updated[qIndex].examples || []), { input: '', output: '', explanation: '' }];
        updated[qIndex] = { ...updated[qIndex], examples };
        setQuestions(updated);
    };

    const removeExample = (qIndex, eIndex) => {
        const updated = [...questions];
        const examples = updated[qIndex].examples.filter((_, i) => i !== eIndex);
        updated[qIndex] = { ...updated[qIndex], examples };
        setQuestions(updated);
    };

    const handleDeleteQuestion = (index) => {
        if (window.confirm('Delete this question?')) {
            const filtered = questions.filter((_, i) => i !== index);
            setQuestions(filtered);
            if (openIndex === index) setOpenIndex(null);
        }
    };

    const handleAddManualQuestion = () => {
        let qTimer = 0;
        if (timerType === 'individual') {
            qTimer = location.state?.moderateTime || 30;
        }
        const newQ = {
            title: 'New Coding Challenge',
            description: 'Write problem statement here.',
            inputFormat: 'Describe standard input stream.',
            outputFormat: 'Describe standard output format.',
            constraints: 'e.g. Time complexity O(N), Space complexity O(1)',
            expectedApproach: 'General description of expectations.',
            difficulty: 'Medium',
            marks: 20,
            timer: qTimer,
            allowedLanguages: [language],
            examples: [{ input: 'Input 1', output: 'Output 1', explanation: 'Sample description' }]
        };
        setQuestions([...questions, newQ]);
        setOpenIndex(questions.length);
        setEditingIndex(questions.length);
    };

    const handleSaveAndPublish = async () => {
        setSaving(true);
        try {
            const res = await axios.post(`${API_URL}/custom-coding-assessments/save`, {
                jobId,
                questions,
                totalTime,
                timerType,
                languages: [language]
            });
            if (res.data?.success) {
                setSavedSuccess(true);
                setTimeout(() => {
                    navigate('/recruiter/my-jobs');
                }, 2000);
            }
        } catch (error) {
            console.error('Save coding assessment error:', error);
            alert(error.response?.data?.message || 'Failed to save coding assessment.');
        } finally {
            setSaving(false);
        }
    };

    const getDifficultyBadgeClass = (diff) => {
        switch (diff?.toLowerCase()) {
            case 'easy': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'hard': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-400 bg-white/5 border-white/10';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[65vh] text-center px-6">
                <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                        className="absolute inset-0 rounded-full border-4 border-t-teal-500 border-r-transparent border-b-transparent border-l-teal-500/20"
                    />
                    <Code className="text-teal-400 animate-pulse" size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Generating Coding Assessment</h2>
                <p className="text-teal-400 font-semibold text-sm animate-pulse max-w-sm">{statusText}</p>
            </div>
        );
    }

    if (savedSuccess) {
        return (
            <div className="flex flex-col items-center justify-center h-[65vh] text-center">
                <div className="w-20 h-20 bg-teal-500/10 text-teal-400 rounded-full border border-teal-500/20 flex items-center justify-center mb-6 shadow-2xl">
                    <CheckCircle2 size={36} />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">Coding Assessment Published!</h2>
                <p className="text-gray-400 max-w-sm">The logical coding questions have been saved to the database. Candidates can now begin taking the assessment.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={() => navigate('/recruiter/my-jobs')}
                    className="flex items-center gap-2 text-gray-500 hover:text-white text-sm font-semibold transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to Jobs
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowConfigForm(!showConfigForm)}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                    >
                        <RefreshCw size={12} />
                        {showConfigForm ? 'Hide Specifier' : 'Regenerate SPEC'}
                    </button>
                </div>
            </div>

            {/* Specifier Configuration form (displayed if state is empty or regenerated) */}
            <AnimatePresence>
                {showConfigForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8 p-6 rounded-3xl bg-[#0d1117] border border-white/10 shadow-xl overflow-hidden"
                    >
                        <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                            <Zap className="text-teal-400" size={16} /> Specify Generation Parameters
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Language</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full bg-[#161b22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none"
                                >
                                    {['Python', 'Java', 'JavaScript', 'C++', 'C', 'Go', 'SQL'].map(lang => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Normal</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={normalCount}
                                        onChange={(e) => setNormalCount(parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#161b22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none text-center"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Moderate</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={moderateCount}
                                        onChange={(e) => setModerateCount(parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#161b22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none text-center"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">High</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={highCount}
                                        onChange={(e) => setHighCount(parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#161b22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none text-center"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Job Context Details (Job Title / Topics)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Backend API coding challenges, Binary Tree traversals"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    className="w-full bg-[#161b22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={triggerAIQuestionGeneration}
                                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all cursor-pointer"
                            >
                                Generate AI Questions
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Questions list */}
            {questions.length > 0 ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Review AI Logical Challenges</h1>
                            <p className="text-xs text-gray-500">Edit constraints, titles, marks or description inline.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Timer Type Selector */}
                            <div className="flex bg-[#161b22] rounded-xl border border-white/5 p-1 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setTimerType('overall')}
                                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timerType === 'overall' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Overall Timer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTimerType('individual')}
                                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timerType === 'individual' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Per Question
                                </button>
                            </div>

                            {timerType === 'overall' && (
                                <div className="flex items-center gap-2 bg-[#161b22] px-3 py-1.5 rounded-xl border border-white/5 text-xs text-white">
                                    <span>Duration:</span>
                                    <input
                                        type="number"
                                        value={totalTime}
                                        onChange={(e) => setTotalTime(parseInt(e.target.value) || 60)}
                                        className="w-12 bg-transparent text-center text-teal-400 outline-none font-bold"
                                    />
                                    <span>min</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {questions.map((q, idx) => {
                            const isOpen = openIndex === idx;
                            const isEditing = editingIndex === idx;

                            return (
                                <motion.div
                                    key={idx}
                                    layout
                                    className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-lg"
                                >
                                    {/* Accordion header */}
                                    <div
                                        onClick={() => setOpenIndex(isOpen ? null : idx)}
                                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-400 font-bold text-xs flex items-center justify-center">
                                                {idx + 1}
                                            </span>
                                            <h3 className="font-bold text-white text-sm">{q.title || 'Untitled coding question'}</h3>
                                            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] uppercase font-bold tracking-widest ${getDifficultyBadgeClass(q.difficulty)}`}>
                                                {q.difficulty}
                                            </span>
                                            <span className="text-xs text-gray-500">({q.marks || 10} Marks)</span>
                                            {timerType === 'individual' && (
                                                <span className="text-xs text-gray-400 flex items-center gap-1.5 font-semibold">
                                                    <Clock size={12} className="text-teal-400" /> {q.timer || (q.difficulty === 'Easy' ? 15 : q.difficulty === 'Hard' ? 45 : 30)} min
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setEditingIndex(isEditing ? null : idx)}
                                                className={`p-2 rounded-lg transition-all ${isEditing ? 'bg-teal-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                                            >
                                                {isEditing ? <Eye size={14} /> : <Edit3 size={14} />}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(idx)}
                                                className="p-2 rounded-lg bg-white/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>

                                    {/* Accordion content */}
                                    {isOpen && (
                                        <div className="p-6 border-t border-white/5 bg-black/10 space-y-6">
                                            {isEditing ? (
                                                /* EDIT MODE */
                                                <div className="space-y-4 text-xs">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-gray-400 mb-1">Title</label>
                                                            <input
                                                                type="text"
                                                                value={q.title}
                                                                onChange={(e) => handleFieldChange(idx, 'title', e.target.value)}
                                                                className="w-full bg-[#161b22] border border-white/10 rounded-xl p-2.5 text-white"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-gray-400 mb-1">Difficulty</label>
                                                                <select
                                                                    value={q.difficulty}
                                                                    onChange={(e) => {
                                                                        const diff = e.target.value;
                                                                        let defaultTimer = q.timer;
                                                                        if (timerType === 'individual') {
                                                                            if (diff === 'Easy') defaultTimer = 15;
                                                                            else if (diff === 'Hard') defaultTimer = 45;
                                                                            else defaultTimer = 30; // Medium
                                                                        }
                                                                        handleFieldChange(idx, 'difficulty', diff);
                                                                        handleFieldChange(idx, 'timer', defaultTimer);
                                                                    }}
                                                                    className="w-full bg-[#161b22] border border-white/10 rounded-xl p-2.5 text-white"
                                                                >
                                                                    <option value="Easy">Easy</option>
                                                                    <option value="Medium">Medium</option>
                                                                    <option value="Hard">Hard</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-gray-400 mb-1">Marks</label>
                                                                <input
                                                                    type="number"
                                                                    value={q.marks}
                                                                    onChange={(e) => handleFieldChange(idx, 'marks', parseInt(e.target.value) || 10)}
                                                                    className="w-full bg-[#161b22] border border-white/10 rounded-xl p-2.5 text-white"
                                                                />
                                                            </div>
                                                            {timerType === 'individual' && (
                                                                <div>
                                                                    <label className="block text-gray-400 mb-1">Time (min)</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={q.timer || (q.difficulty === 'Easy' ? 15 : q.difficulty === 'Hard' ? 45 : 30)}
                                                                        onChange={(e) => handleFieldChange(idx, 'timer', parseInt(e.target.value) || 0)}
                                                                        className="w-full bg-[#161b22] border border-white/10 rounded-xl p-2.5 text-white"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-gray-400 mb-1">Description (Markdown Supported)</label>
                                                        <textarea
                                                            rows="4"
                                                            value={q.description}
                                                            onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                                                            className="w-full bg-[#161b22] border border-white/10 rounded-xl p-2.5 text-white resize-none"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-gray-400 mb-1">Input Format</label>
                                                            <input
                                                                type="text"
                                                                value={q.inputFormat}
                                                                onChange={(e) => handleFieldChange(idx, 'inputFormat', e.target.value)}
                                                                className="w-full bg-[#161b22] border border-white/10 rounded-xl p-2.5 text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-gray-400 mb-1">Output Format</label>
                                                            <input
                                                                type="text"
                                                                value={q.outputFormat}
                                                                onChange={(e) => handleFieldChange(idx, 'outputFormat', e.target.value)}
                                                                className="w-full bg-[#161b22] border border-white/10 rounded-xl p-2.5 text-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-gray-400 mb-1">Constraints</label>
                                                            <input
                                                                type="text"
                                                                value={q.constraints}
                                                                onChange={(e) => handleFieldChange(idx, 'constraints', e.target.value)}
                                                                className="w-full bg-[#161b22] border border-white/10 rounded-xl p-2.5 text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-gray-400 mb-1">Expected Approach / Solution Theory</label>
                                                            <input
                                                                type="text"
                                                                value={q.expectedApproach}
                                                                onChange={(e) => handleFieldChange(idx, 'expectedApproach', e.target.value)}
                                                                className="w-full bg-[#161b22] border border-white/10 rounded-xl p-2.5 text-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Examples Editor */}
                                                    <div className="space-y-3 pt-3 border-t border-white/5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-white">Examples (Test Cases)</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => addExample(idx)}
                                                                className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1"
                                                            >
                                                                <Plus size={12} /> Add Case
                                                            </button>
                                                        </div>
                                                        {(q.examples || []).map((ex, exIdx) => (
                                                            <div key={exIdx} className="bg-black/35 p-3 rounded-xl border border-white/5 space-y-2 relative group/item">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeExample(idx, exIdx)}
                                                                    className="absolute top-2 right-2 text-red-400 opacity-0 group-hover/item:opacity-100 hover:text-red-300"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <span className="block text-[10px] text-gray-500 uppercase">Input</span>
                                                                        <input
                                                                            type="text"
                                                                            value={ex.input}
                                                                            onChange={(e) => handleExampleChange(idx, exIdx, 'input', e.target.value)}
                                                                            className="w-full bg-[#161b22] border border-white/10 rounded-lg p-1.5 text-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <span className="block text-[10px] text-gray-500 uppercase">Output</span>
                                                                        <input
                                                                            type="text"
                                                                            value={ex.output}
                                                                            onChange={(e) => handleExampleChange(idx, exIdx, 'output', e.target.value)}
                                                                            className="w-full bg-[#161b22] border border-white/10 rounded-lg p-1.5 text-white"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <span className="block text-[10px] text-gray-500 uppercase">Explanation</span>
                                                                    <input
                                                                        type="text"
                                                                        value={ex.explanation}
                                                                        onChange={(e) => handleExampleChange(idx, exIdx, 'explanation', e.target.value)}
                                                                        className="w-full bg-[#161b22] border border-white/10 rounded-lg p-1.5 text-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                /* READ PREVIEW MODE */
                                                <div className="space-y-4 text-xs leading-relaxed text-gray-300">
                                                    <div>
                                                        <h4 className="font-semibold text-white uppercase text-[10px] tracking-wider mb-1">Problem Description</h4>
                                                        <p className="whitespace-pre-line bg-black/20 p-4 rounded-xl border border-white/5">{q.description}</p>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <h4 className="font-semibold text-white uppercase text-[10px] tracking-wider mb-1">Input Format</h4>
                                                            <p className="bg-black/20 p-2.5 rounded-lg border border-white/5 text-gray-400">{q.inputFormat || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-white uppercase text-[10px] tracking-wider mb-1">Output Format</h4>
                                                            <p className="bg-black/20 p-2.5 rounded-lg border border-white/5 text-gray-400">{q.outputFormat || 'N/A'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <h4 className="font-semibold text-white uppercase text-[10px] tracking-wider mb-1">Constraints</h4>
                                                            <p className="bg-black/20 p-2.5 rounded-lg border border-white/5 text-gray-400">{q.constraints || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-white uppercase text-[10px] tracking-wider mb-1">Boilerplate / Optimal Approach</h4>
                                                            <p className="bg-black/20 p-2.5 rounded-lg border border-white/5 text-gray-400">{q.expectedApproach || 'N/A'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2.5">
                                                        <h4 className="font-semibold text-white uppercase text-[10px] tracking-wider">Examples</h4>
                                                        {(q.examples || []).map((ex, exIdx) => (
                                                            <div key={exIdx} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-1">
                                                                <div><strong className="text-teal-400 font-bold">Input:</strong> <code className="bg-white/5 px-1.5 py-0.5 rounded text-white">{ex.input}</code></div>
                                                                <div><strong className="text-teal-400 font-bold">Output:</strong> <code className="bg-white/5 px-1.5 py-0.5 rounded text-white">{ex.output}</code></div>
                                                                {ex.explanation && <div><strong className="text-gray-400 font-medium">Explanation:</strong> <span className="text-gray-400">{ex.explanation}</span></div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={handleAddManualQuestion}
                            className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                            <Plus size={16} /> Add Custom Question
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAndPublish}
                            disabled={saving}
                            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-blue-500 hover:from-teal-500 hover:to-blue-400 text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-teal-500/10 disabled:opacity-75"
                        >
                            {saving ? <Loader2 className="animate-spin" /> : <Save size={16} />}
                            {saving ? 'Publishing rounds...' : 'Save & Publish Rounds'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-3xl text-center">
                    <AlertCircle className="text-amber-400 mb-4" size={40} />
                    <h3 className="text-lg font-bold mb-2">No logical questions loaded</h3>
                    <p className="text-xs text-gray-500 max-w-sm mb-6">Specify the coding round criteria and trigger the AI generation.</p>
                    <button
                        onClick={() => setShowConfigForm(true)}
                        className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                        Configure Specifier
                    </button>
                </div>
            )}
        </div>
    );
};

export default CustomCodingAssessmentConfig;
