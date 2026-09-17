import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FilePlus, MapPin, Briefcase, Zap, Plus, X, Loader2, CheckCircle2, Save, ChevronDown, Clock, Code2, UploadCloud, FileText, Sparkles, AlertCircle, ArrowUp, ArrowDown, Trash2, Edit3, Shuffle, ListOrdered, ClipboardList } from 'lucide-react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL, getAuthHeaders } from '../../firebase';
import './recruiter-theme.css';

const PostJob = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const editJobId = searchParams.get('edit');
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

    useEffect(() => {
        if (!user.uid && !user._id && !user.id) {
            navigate('/login');
        } else if (user.role !== 'recruiter' && user.role !== 'admin') {
            navigate('/seeker');
        }
    }, [user, navigate]);

    const [jobData, setJobData] = useState({
        title: '',
        description: '',
        location: '',
        type: '',
        skills: [],
        experienceLevel: 'Fresher',
        education: [{ qualification: '', specialization: '' }],
        minPercentage: 60,
        resumeAnalysis: {
            enabled: true
        },
        assessment: {
            enabled: false,
            type: 'MCQ',
            totalQuestions: 10
        },
        codingAssessment: {
            enabled: false,
            passingScore: 70
        },
        mockInterview: {
            enabled: false,
            passingScore: 70
        },
        questionSource: 'AI_GENERATED',
        questionCount: 5,
        selectionMode: 'ORDERED',
        recruiterQuestions: [],
        specialInstructions: ''
    });

    const [codingLanguages, setCodingLanguages] = useState(['Python', 'Java', 'C++', 'C', 'JavaScript']);
    const [selectedLanguage, setSelectedLanguage] = useState('Python');
    const [normalCount, setNormalCount] = useState(1);
    const [moderateCount, setModerateCount] = useState(1);
    const [highCount, setHighCount] = useState(0);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    
    // Timer states for Coding Rounds
    const [timerType, setTimerType] = useState('overall');
    const [totalTime, setTotalTime] = useState(60);
    const [normalTime, setNormalTime] = useState(15);
    const [moderateTime, setModerateTime] = useState(30);
    const [highTime, setHighTime] = useState(45);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setUploadedFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0]);
        }
    };

    const [currentSkill, setCurrentSkill] = useState('');

    // Recruiter-Provided AI Interview Question Bank states
    const [questionUploadLoading, setQuestionUploadLoading] = useState(false);
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [showImportPreviewModal, setShowImportPreviewModal] = useState(false);
    const [parsedQuestionsPreview, setParsedQuestionsPreview] = useState([]);
    const [previewStats, setPreviewStats] = useState(null);
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionCategory, setNewQuestionCategory] = useState('General');
    const [newQuestionDifficulty, setNewQuestionDifficulty] = useState('Medium');
    const [newQuestionTimeLimit, setNewQuestionTimeLimit] = useState(120);
    const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);
    const [editingQuestionIdx, setEditingQuestionIdx] = useState(null);

    useEffect(() => {
        if (editJobId) {
            const fetchJob = async () => {
                try {
                    const res = await axios.get(`${API_URL}/jobs/${editJobId}`);
                    if (res.data) {
                        const job = res.data;
                        const mock = job.mockInterview || {};
                        const qSource = job.questionSource || mock.questionSource || 'AI_GENERATED';
                        const qCount = Number(job.questionCount || mock.questionCount) || 5;
                        const sMode = job.selectionMode || mock.selectionMode || 'ORDERED';
                        const rQuestions = (Array.isArray(job.recruiterQuestions) && job.recruiterQuestions.length > 0)
                            ? job.recruiterQuestions
                            : (Array.isArray(mock.recruiterQuestions) ? mock.recruiterQuestions : []);

                        setJobData(prev => ({
                            ...prev,
                            ...job,
                            questionSource: qSource,
                            questionCount: qCount,
                            selectionMode: sMode,
                            recruiterQuestions: rQuestions.map((q, idx) => ({
                                ...q,
                                questionId: q.questionId || `q_${Date.now()}_${idx + 1}`,
                                text: q.text || q.question || '',
                                question: q.question || q.text || '',
                                order: Number(q.order) || (idx + 1)
                            }))
                        }));
                    }

                    // Fetch existing coding round config
                    const headers = await getAuthHeaders();
                    const roundRes = await axios.get(`${API_URL}/coding-assessments/round/${editJobId}`, { headers });
                    if (roundRes.data?.success && roundRes.data.codingRound) {
                        const round = roundRes.data.codingRound;
                        if (round.languages && round.languages.length > 0) {
                            setCodingLanguages(round.languages);
                        }
                        if (round.timerType) setTimerType(round.timerType);
                        if (round.totalTime) setTotalTime(round.totalTime);
                    }
                } catch (error) {
                    console.error('Error fetching job for edit:', error);
                }
            };
            fetchJob();
        }
    }, [editJobId]);

    // Recruiter Question Bank Handlers
    const handleQuestionFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setQuestionUploadLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const headers = await getAuthHeaders();
            // Delete Content-Type so browser/Axios automatically sets multipart/form-data with boundary
            delete headers['Content-Type'];
            const res = await axios.post(`${API_URL}/jobs/parse-questions`, formData, {
                headers
            });
            if (res.data?.success && Array.isArray(res.data.questions)) {
                setParsedQuestionsPreview(res.data.questions);
                setPreviewStats({
                    total: res.data.count,
                    warnings: res.data.warnings || [],
                    stats: res.data.stats || {}
                });
                setShowImportPreviewModal(true);
            } else {
                alert(res.data?.message || 'Could not parse questions from file.');
            }
        } catch (err) {
            console.error('Question parse error:', err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to parse questions file.';
            alert(errorMsg);
        } finally {
            setQuestionUploadLoading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handlePasteParse = async () => {
        if (!pasteText.trim()) {
            alert('Please paste some questions first.');
            return;
        }
        setQuestionUploadLoading(true);
        try {
            const headers = await getAuthHeaders();
            const res = await axios.post(`${API_URL}/jobs/parse-questions`, { rawText: pasteText }, { headers });
            if (res.data?.success && Array.isArray(res.data.questions)) {
                setParsedQuestionsPreview(res.data.questions);
                setPreviewStats({
                    total: res.data.count,
                    warnings: res.data.warnings || [],
                    stats: res.data.stats || {}
                });
                setShowPasteModal(false);
                setShowImportPreviewModal(true);
            } else {
                alert(res.data?.message || 'Could not parse questions from pasted text.');
            }
        } catch (err) {
            console.error('Question parse error:', err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to parse pasted questions.';
            alert(errorMsg);
        } finally {
            setQuestionUploadLoading(false);
        }
    };

    const confirmImport = (mode = 'replace') => {
        const newQuestions = parsedQuestionsPreview.map((q, idx) => ({
            questionId: q.questionId || `q_${Date.now()}_${idx}`,
            text: q.text,
            question: q.question || q.text,
            category: q.category || 'General',
            difficulty: q.difficulty || 'Medium',
            timeLimit: Number(q.timeLimit) || 120,
            order: idx + 1
        }));

        let combined = [];
        if (mode === 'append') {
            combined = [...(jobData.recruiterQuestions || []), ...newQuestions];
        } else {
            combined = newQuestions;
        }

        combined = combined.map((q, idx) => ({ ...q, order: idx + 1 }));
        const newCount = Math.min(Math.max(1, jobData.questionCount || 5), combined.length);

        setJobData(prev => ({
            ...prev,
            questionSource: 'RECRUITER_PROVIDED',
            recruiterQuestions: combined,
            questionCount: newCount,
            mockInterview: {
                ...(prev.mockInterview || {}),
                enabled: true,
                questionSource: 'RECRUITER_PROVIDED',
                questionCount: newCount,
                recruiterQuestions: combined
            }
        }));

        setShowImportPreviewModal(false);
        setParsedQuestionsPreview([]);
        setPreviewStats(null);
        setPasteText('');
    };

    const handleAddManualQuestion = () => {
        if (!newQuestionText.trim()) {
            alert('Please enter question text.');
            return;
        }
        const currentBank = jobData.recruiterQuestions || [];
        const newQ = {
            questionId: `q_${Date.now()}`,
            text: newQuestionText.trim(),
            question: newQuestionText.trim(),
            category: newQuestionCategory || 'General',
            difficulty: newQuestionDifficulty || 'Medium',
            timeLimit: Number(newQuestionTimeLimit) || 120,
            order: currentBank.length + 1
        };
        const updated = [...currentBank, newQ];
        const newCount = Math.min(Math.max(1, jobData.questionCount || 1), updated.length);
        setJobData(prev => ({
            ...prev,
            questionSource: 'RECRUITER_PROVIDED',
            recruiterQuestions: updated,
            questionCount: newCount,
            mockInterview: {
                ...(prev.mockInterview || {}),
                enabled: true,
                questionSource: 'RECRUITER_PROVIDED',
                questionCount: newCount,
                recruiterQuestions: updated
            }
        }));
        setNewQuestionText('');
        setShowAddQuestionForm(false);
    };

    const handleDeleteQuestion = (idx) => {
        const currentBank = jobData.recruiterQuestions || [];
        const updated = currentBank
            .filter((_, i) => i !== idx)
            .map((q, i) => ({ ...q, order: i + 1 }));
        const newCount = Math.max(1, Math.min(jobData.questionCount || 1, updated.length || 1));
        setJobData(prev => ({
            ...prev,
            recruiterQuestions: updated,
            questionCount: newCount,
            mockInterview: {
                ...(prev.mockInterview || {}),
                questionCount: newCount,
                recruiterQuestions: updated
            }
        }));
    };

    const handleMoveQuestion = (idx, direction) => {
        const currentBank = jobData.recruiterQuestions || [];
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= currentBank.length) return;
        const list = [...currentBank];
        const temp = list[idx];
        list[idx] = list[targetIdx];
        list[targetIdx] = temp;
        const updated = list.map((q, i) => ({ ...q, order: i + 1 }));
        setJobData(prev => ({ ...prev, recruiterQuestions: updated }));
    };

    const handleUpdateQuestion = (idx, field, value) => {
        const currentBank = jobData.recruiterQuestions || [];
        const list = [...currentBank];
        list[idx] = { ...list[idx], [field]: value };
        setJobData(prev => ({ ...prev, recruiterQuestions: list }));
    };

    const handleAddEducation = () => {
        setJobData({
            ...jobData,
            education: [...jobData.education, { qualification: '', specialization: '' }]
        });
    };

    const handleRemoveEducation = (index) => {
        const newEducation = jobData.education.filter((_, i) => i !== index);
        setJobData({ ...jobData, education: newEducation });
    };

    const handleEducationChange = (index, field, value) => {
        const newEducation = [...jobData.education];
        newEducation[index][field] = value;
        setJobData({ ...jobData, education: newEducation });
    };

    const handleAddSkill = () => {
        if (currentSkill && !jobData.skills.includes(currentSkill)) {
            setJobData({ ...jobData, skills: [...jobData.skills, currentSkill] });
            setCurrentSkill('');
        }
    };

    const removeSkill = (skillToRemove) => {
        setJobData({ ...jobData, skills: jobData.skills.filter(s => s !== skillToRemove) });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setJobData({
                ...jobData,
                [parent]: { ...jobData[parent], [child]: value }
            });
        } else {
            setJobData({ ...jobData, [name]: value });
        }
    };

    const handleToggle = (name) => {
        const [parent, child] = name.split('.');
        setJobData({
            ...jobData,
            [parent]: { ...jobData[parent], [child]: !jobData[parent][child] }
        });
    };

    const toggleCodingLanguage = (lang) => {
        setCodingLanguages(prev =>
            prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
        );
    };

    const generateAIDescription = async () => {
        if (!jobData.title) {
            alert("Please enter a Job Title first to generate a description.");
            return;
        }

        try {
            setIsGeneratingDesc(true);
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/jobs/generate-description`, {
                title: jobData.title,
                skills: jobData.skills,
                experienceLevel: jobData.experienceLevel,
                type: jobData.type,
                location: jobData.location,
                specialInstructions: jobData.specialInstructions
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (res.data && res.data.description) {
                setJobData(prev => ({ ...prev, description: res.data.description }));
            }
        } catch (error) {
            console.error('Error generating description:', error);
            alert('Failed to generate description. Please try again.');
        } finally {
            setIsGeneratingDesc(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const recruiterId = user.uid || user._id || user.id;
            
            if (!recruiterId) {
                alert("You must be logged in to post a job.");
                navigate('/login');
                return;
            }

            const formattedQuestions = (jobData.recruiterQuestions || []).map((q, idx) => ({
                questionId: q.questionId || `q_${Date.now()}_${idx + 1}`,
                text: String(q.text || q.question || '').trim(),
                question: String(q.text || q.question || '').trim(),
                category: q.category || 'General',
                difficulty: q.difficulty || 'Medium',
                timeLimit: Number(q.timeLimit) || 120,
                order: idx + 1
            })).filter(q => q.text.length > 0);

            const qCount = Number(jobData.questionCount || 5);
            const qSource = jobData.questionSource || 'AI_GENERATED';
            const sMode = jobData.selectionMode || 'ORDERED';

            const dataToSave = {
                ...jobData,
                recruiterId: recruiterId,
                company: jobData.company || user.company?.name || user.company || 'hire1percent Partner',
                minPercentage: Number(jobData.minPercentage),
                questionSource: qSource,
                questionCount: qCount,
                selectionMode: sMode,
                recruiterQuestions: formattedQuestions
            };

            // Ensure nested values are also cast if they exist
            if (dataToSave.assessment) {
                dataToSave.assessment.totalQuestions = Number(dataToSave.assessment.totalQuestions);
            }
            if (dataToSave.codingAssessment) {
                dataToSave.codingAssessment.passingScore = Number(dataToSave.codingAssessment.passingScore);
            }
            if (dataToSave.mockInterview) {
                dataToSave.mockInterview.passingScore = Number(dataToSave.mockInterview.passingScore);
                dataToSave.mockInterview.questionSource = qSource;
                dataToSave.mockInterview.questionCount = qCount;
                dataToSave.mockInterview.selectionMode = sMode;
                dataToSave.mockInterview.recruiterQuestions = formattedQuestions;
            }

            // Validation for RECRUITER_PROVIDED questions
            if (dataToSave.mockInterview?.enabled && dataToSave.questionSource === 'RECRUITER_PROVIDED') {
                if (!dataToSave.recruiterQuestions || dataToSave.recruiterQuestions.length === 0) {
                    alert("Please add at least one question to the recruiter question bank, or switch to AI-Generated mode.");
                    setLoading(false);
                    return;
                }
                if (dataToSave.questionCount < 1 || dataToSave.questionCount > dataToSave.recruiterQuestions.length) {
                    alert(`Question Count must be between 1 and ${dataToSave.recruiterQuestions.length} (the total bank size).`);
                    setLoading(false);
                    return;
                }
            }
            let targetJobId = editJobId;
            const headers = await getAuthHeaders();
            if (editJobId) {
                await axios.put(`${API_URL}/jobs/${editJobId}`, dataToSave, { headers });
            } else {
                const res = await axios.post(`${API_URL}/jobs`, dataToSave, { headers });
                targetJobId = res.data?._id || res.data?.job?._id;
            }

            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            setSuccess(true);
            if (dataToSave.codingAssessment?.enabled && targetJobId) {
                setTimeout(() => {
                    navigate(`/recruiter/custom-coding-assessment/${targetJobId}`, {
                        state: {
                            language: selectedLanguage,
                            normalCount,
                            moderateCount,
                            highCount,
                            uploadedFile,
                            jobTitle: jobData.title,
                            jobDescription: jobData.description,
                            timerType,
                            totalTime,
                            normalTime,
                            moderateTime,
                            highTime
                        }
                    });
                }, 1500);
            } else {
                setTimeout(() => navigate('/recruiter/my-jobs'), 3000);
            }
        } catch (error) {
            console.error('Error saving job:', error);
            const data = error.response?.data;
            const errorMessage = data?.message || 'Failed to save job. Please try again.';
            const detailedError = data?.error;
            const validationErrors = data?.errors;
            
            let fullMessage = errorMessage;
            if (detailedError) fullMessage += `\nError: ${detailedError}`;
            if (validationErrors) fullMessage += `\n\nDetails:\n${validationErrors.join('\n')}`;
            
            alert(fullMessage);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mb-6 border-2 border-amber-500/30"
                >
                    <Clock size={44} />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h1 className="text-3xl font-bold mb-3">Job Submitted for Review</h1>
                    <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
                        Your job posting is now <span className="text-amber-400 font-bold">pending admin approval</span>. You'll be able to see the status in your job listings. Once approved, it will be visible to candidates.
                    </p>
                    <p className="text-gray-600 text-sm mt-4">Redirecting to your job listings...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="mb-10">
                <h1 className="text-3xl font-bold mb-2">Post a New Job</h1>
                <p className="text-gray-400">Define your requirements and find the best talent.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* A. Job Information */}
                <div className="rec-card p-7 md:p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                            A
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Job Information</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Job Title</label>
                            <input
                                type="text"
                                name="title"
                                value={jobData.title}
                                onChange={handleChange}
                                placeholder="e.g. Senior Web3 Developer"
                                required
                                className="rec-input w-full px-4 py-2.5 text-xs font-medium"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Job Description</label>
                                <button
                                    type="button"
                                    onClick={generateAIDescription}
                                    disabled={isGeneratingDesc || !jobData.title}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100/70 transition-colors text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isGeneratingDesc ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                    Generate with AI
                                </button>
                            </div>
                            <textarea
                                name="description"
                                value={jobData.description}
                                onChange={handleChange}
                                rows="6"
                                placeholder="Describe the role, responsibilities, and requirements..."
                                required
                                className="rec-input w-full px-4 py-2.5 text-xs font-medium resize-none"
                            ></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                                <Zap size={16} /> Special Instructions for AI Agent
                            </label>
                            <textarea
                                name="specialInstructions"
                                value={jobData.specialInstructions}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Example:
• Prefer candidates with startup experience
• Avoid candidates who frequently change jobs
• Prioritize candidates with system design knowledge"
                                className="rec-input w-full px-4 py-2.5 text-xs font-medium resize-none text-sm"
                            ></textarea>
                            <p className="mt-2 text-[10px] text-gray-500 italic">
                                This information will only be used by our AI to better filter candidates. It will NOT appear in the public job description.
                            </p>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    name="location"
                                    value={jobData.location}
                                    onChange={handleChange}
                                    placeholder="e.g. New York or Remote"
                                    required
                                    className="rec-input w-full pl-10 pr-4 py-2.5 text-xs font-medium"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Job Type</label>
                            <div className="relative">
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                                <select
                                    name="type"
                                    value={jobData.type}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-5 py-3 rounded-2xl bg-[#11131a] border border-white/10 focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer ${!jobData.type ? 'text-gray-500' : 'text-white'}`}
                                >
                                    <option value="" disabled>Select Job Type</option>
                                    <option value="Full-time">Full-time</option>
                                    <option value="Internship">Internship</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Part-time">Part-time</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* B. Education Details */}
                <div className="rec-card p-7 md:p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold border border-purple-500/20 shadow-lg shadow-purple-500/10">
                                    B
                                </div>
                                <h2 className="text-lg font-bold text-slate-900">Education Details</h2>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddEducation}
                                className="w-10 h-10 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                                title="Add Another Education"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {jobData.education.map((edu, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 relative group/item hover:border-indigo-200 transition-all"
                                >
                                    {index > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveEducation(index)}
                                            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shadow-lg hover:bg-red-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Qualification</label>
                                            <div className="relative">
                                                <select
                                                    value={edu.qualification}
                                                    onChange={(e) => handleEducationChange(index, 'qualification', e.target.value)}
                                                    className="rec-select w-full px-4 py-2.5 text-xs font-medium cursor-pointer"
                                                >
                                                    <option value="">Select Qualification</option>
                                                    <option value="B.Tech">B.Tech</option>
                                                    <option value="M.Tech">M.Tech</option>
                                                    <option value="BCA">BCA</option>
                                                    <option value="MCA">MCA</option>
                                                    <option value="Degree">Degree</option>
                                                    <option value="Diploma">Diploma</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Specialization</label>
                                            <div className="relative">
                                                <select
                                                    value={edu.specialization}
                                                    onChange={(e) => handleEducationChange(index, 'specialization', e.target.value)}
                                                    className="rec-select w-full px-4 py-2.5 text-xs font-medium cursor-pointer"
                                                >
                                                    <option value="">Select Specialization</option>
                                                    <option value="CSE">CSE</option>
                                                    <option value="ECE">ECE</option>
                                                    <option value="EEE">EEE</option>
                                                    <option value="IT">IT</option>
                                                    <option value="Mechanical">Mechanical</option>
                                                    <option value="Civil">Civil</option>
                                                    <option value="All Branches">All Branches Eligible</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* C. Experience Requirements */}
                <div className="rec-card p-7 md:p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold border border-pink-500/20 shadow-lg shadow-pink-500/10">
                                C
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">Work Experience</h2>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Required Experience Level</label>
                            <div className="relative group/select">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500/50 group-focus-within/select:text-pink-500 transition-colors" size={20} />
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                                <select
                                    name="experienceLevel"
                                    value={jobData.experienceLevel}
                                    onChange={handleChange}
                                    className="rec-select w-full pl-10 pr-4 py-2.5 text-xs font-medium cursor-pointer"
                                >
                                    <option value="Fresher">Fresher (0 Years)</option>
                                    <option value="0-1 Years">0-1 Years</option>
                                    <option value="1-2 Years">1-2 Years</option>
                                    <option value="3+ Years">3+ Years</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* C. Skill Requirements */}
                <div className="rec-card p-7 md:p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold border border-teal-500/20">
                            D
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Skill Requirements</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Required Skills</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={currentSkill}
                                    onChange={(e) => setCurrentSkill(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                                    placeholder="Add skill (e.g. Solidity)"
                                    className="flex-1 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-teal-500/50 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSkill}
                                    className="px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white transition-all font-bold"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                                {jobData.skills.length > 0 ? jobData.skills.map(skill => (
                                    <span key={skill} className="px-4 py-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 text-sm flex items-center gap-2">
                                        {skill}
                                        <button type="button" onClick={() => removeSkill(skill)}><X size={14} /></button>
                                    </span>
                                )) : <p className="text-xs text-gray-600 italic">No skills added yet.</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* D. Resume Selection Logic */}
                <div className="rec-card p-7 md:p-8 space-y-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">
                                E
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">Resume Selection Logic</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggle('resumeAnalysis.enabled')}
                            className={`w-12 h-6 rounded-full transition-all relative ${jobData.resumeAnalysis?.enabled !== false ? 'bg-emerald-500' : 'bg-gray-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${jobData.resumeAnalysis?.enabled !== false ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className={`transition-all ${jobData.resumeAnalysis?.enabled !== false ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-500">Resume Match Threshold</label>
                            <span className="text-emerald-400 font-bold text-lg">{jobData.minPercentage}/100</span>
                        </div>
                        <input
                            type="range"
                            name="minPercentage"
                            min="0"
                            max="100"
                            step="5"
                            value={jobData.minPercentage}
                            onChange={handleChange}
                            className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <p className="mt-4 text-xs text-emerald-400 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 leading-relaxed font-medium">
                            Message: All the applicants whose resume matches with the {jobData.minPercentage}% will be eligible.
                        </p>
                    </div>
                </div>

                {/* E & F. Modular Settings */}
                <div className="flex flex-col gap-8">
                    {/* Assessment Settings */}
                    <div className={`rec-card p-7 md:p-8 space-y-6 flex flex-col justify-between ${
                        jobData.assessment.enabled ? 'border-orange-500/35 bg-orange-500/[0.02] shadow-orange-500/5' : 'border-white/10'
                    }`}>
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold border border-orange-500/20">
                                        F
                                    </div>
                                    <h2 className="text-base font-bold text-slate-900">Assessments</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleToggle('assessment.enabled')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${jobData.assessment.enabled ? 'bg-orange-500' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${jobData.assessment.enabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
    
                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all ${jobData.assessment.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none'}`}>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assessment Type</label>
                                    <select
                                        name="assessment.type"
                                        value={jobData.assessment.type}
                                        onChange={handleChange}
                                        className="rec-select w-full px-4 py-2 text-xs font-medium cursor-pointer"
                                    >
                                        <option value="MCQ">MCQ Questions</option>
                                        <option value="Coding">Coding Challenges</option>
                                        <option value="Hybrid">Hybrid Test</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Questions</label>
                                    <input
                                        type="number"
                                        name="assessment.totalQuestions"
                                        value={jobData.assessment.totalQuestions}
                                        onChange={handleChange}
                                        className="rec-input w-full px-4 py-2 text-xs font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Coding Assessment Settings */}
                    <div className={`rec-card p-7 md:p-8 space-y-6 flex flex-col justify-between ${
                        jobData.codingAssessment?.enabled ? 'border-teal-500/35 bg-teal-500/[0.02] shadow-teal-500/5' : 'border-white/10'
                    }`}>
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold border border-teal-500/20">
                                        <Code2 size={16} />
                                    </div>
                                    <h2 className="text-base font-bold text-slate-900">Coding Rounds</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleToggle('codingAssessment.enabled')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${jobData.codingAssessment?.enabled ? 'bg-teal-500' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${jobData.codingAssessment?.enabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
 
                            {jobData.codingAssessment?.enabled ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs mt-6 pt-6 border-t border-white/5">
                                    {/* Col 1: Basics */}
                                    <div className="space-y-5">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="block font-semibold text-gray-500 uppercase tracking-wider">Score Threshold</label>
                                                <span className="text-teal-400 font-bold text-xs">{jobData.codingAssessment.passingScore || 70}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                name="codingAssessment.passingScore"
                                                min="30"
                                                max="100"
                                                step="5"
                                                value={jobData.codingAssessment.passingScore || 70}
                                                onChange={handleChange}
                                                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                            />
                                        </div>
 
                                        <div>
                                            <label className="block font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Select Primary Language</label>
                                            <div className="relative">
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                                                <select
                                                    value={selectedLanguage}
                                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                                    className="rec-select w-full px-3 py-2 text-xs font-medium cursor-pointer"
                                                >
                                                    {['Python', 'Java', 'JavaScript', 'C++', 'C', 'Go', 'SQL', 'Kotlin', 'C#'].map(lang => (
                                                        <option key={lang} value={lang}>{lang}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
 
                                    {/* Col 2: Timer Config */}
                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <label className="block font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Timer Type</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setTimerType('overall')}
                                                    className={`flex-1 py-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                                                        timerType === 'overall'
                                                            ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                                                            : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                                                    }`}
                                                >
                                                    Overall Round
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTimerType('individual')}
                                                    className={`flex-1 py-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                                                        timerType === 'individual'
                                                            ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                                                            : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                                                    }`}
                                                >
                                                    Per Question
                                                </button>
                                            </div>
 
                                            {timerType === 'overall' ? (
                                                <div>
                                                    <label className="block font-semibold text-gray-500 mb-1.5 uppercase tracking-wider text-[10px]">Total Time (min)</label>
                                                    <input
                                                        type="number"
                                                        min="5"
                                                        max="480"
                                                        value={totalTime}
                                                        onChange={(e) => setTotalTime(Number(e.target.value) || 60)}
                                                        className="rec-input w-full px-3 py-2 text-xs font-medium"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="block font-semibold text-gray-400 mb-1 text-[9px] uppercase">Normal</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={normalTime}
                                                            onChange={(e) => setNormalTime(Number(e.target.value) || 15)}
                                                            className="rec-input w-full px-2 py-2 text-xs font-medium text-center"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block font-semibold text-gray-400 mb-1 text-[9px] uppercase">Moderate</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={moderateTime}
                                                            onChange={(e) => setModerateTime(Number(e.target.value) || 30)}
                                                            className="rec-input w-full px-2 py-2 text-xs font-medium text-center"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block font-semibold text-gray-400 mb-1 text-[9px] uppercase">High</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={highTime}
                                                            onChange={(e) => setHighTime(Number(e.target.value) || 45)}
                                                            className="rec-input w-full px-2 py-2 text-xs font-medium text-center"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
 
                                    {/* Col 3: Counts & Upload */}
                                    <div className="space-y-4">
                                        <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 space-y-2.5">
                                            <span className="block font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Questions Counts</span>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="flex flex-col items-center p-1.5 bg-black/20 rounded-lg border border-white/5">
                                                    <span className="text-[9px] text-gray-400 mb-0.5">Normal</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setNormalCount(prev => Math.max(0, prev - 1))}
                                                            className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-xs font-bold text-emerald-400">{normalCount}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setNormalCount(prev => prev + 1)}
                                                            className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
 
                                                <div className="flex flex-col items-center p-1.5 bg-black/20 rounded-lg border border-white/5">
                                                    <span className="text-[9px] text-gray-400 mb-0.5">Moderate</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setModerateCount(prev => Math.max(0, prev - 1))}
                                                            className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-xs font-bold text-amber-400">{moderateCount}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setModerateCount(prev => prev + 1)}
                                                            className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
 
                                                <div className="flex flex-col items-center p-1.5 bg-black/20 rounded-lg border border-white/5">
                                                    <span className="text-[9px] text-gray-400 mb-0.5">High</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setHighCount(prev => Math.max(0, prev - 1))}
                                                            className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-xs font-bold text-red-400">{highCount}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setHighCount(prev => prev + 1)}
                                                            className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
 
                                        <div>
                                            <label className="block font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Upload Reference / Syllabus</label>
                                            <div
                                                onDragEnter={handleDrag}
                                                onDragOver={handleDrag}
                                                onDragLeave={handleDrag}
                                                onDrop={handleDrop}
                                                className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                                                    dragActive ? 'border-teal-500 bg-teal-500/10' : 'border-white/10 hover:border-teal-500/30'
                                                }`}
                                            >
                                                <input
                                                    type="file"
                                                    id="file-upload"
                                                    accept=".txt,.pdf"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-1">
                                                    <UploadCloud className="text-teal-400 animate-pulse" size={24} />
                                                    <p className="text-[10px] font-bold text-white">Drag file here, or <span className="text-teal-400">browse</span></p>
                                                    <p className="text-[8px] text-gray-500">TXT, PDF (max 10MB)</p>
                                                </label>
                                            </div>
 
                                            {uploadedFile && (
                                                <div className="mt-2 flex items-center justify-between p-2 bg-black/40 rounded-lg border border-white/5">
                                                    <div className="flex items-center gap-1.5 text-[10px] truncate max-w-[80%]">
                                                        <FileText className="text-teal-400 shrink-0" size={12} />
                                                        <span className="text-white truncate">{uploadedFile.name}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setUploadedFile(null)}
                                                        className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 leading-relaxed mt-4">
                                    Enable coding rounds with specific challenges, language options, and timers.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Interview Settings */}
                    <div className={`rec-card p-7 md:p-8 space-y-6 flex flex-col justify-between ${
                        jobData.mockInterview.enabled ? 'border-purple-500/35 bg-purple-500/[0.02] shadow-purple-500/5' : 'border-white/10'
                    }`}>
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold border border-purple-500/20">
                                        G
                                    </div>
                                    <h2 className="text-base font-bold text-slate-900">AI Interview</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleToggle('mockInterview.enabled')}
                                    className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${jobData.mockInterview.enabled ? 'bg-purple-500' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${jobData.mockInterview.enabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className={`transition-all ${jobData.mockInterview.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 pt-6 border-t border-slate-200">
                                    <div>
                                        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                                            Enable our **AI Mock Interviewer** to conduct preliminary video/audio rounds. Candidates will be interviewed by our AI and automatically scored and evaluated.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-widest">Interview Score Threshold</label>
                                            <span className="text-purple-600 font-bold text-xs">{jobData.mockInterview.passingScore}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            name="mockInterview.passingScore"
                                            min="10"
                                            max="100"
                                            step="5"
                                            value={jobData.mockInterview.passingScore || 70}
                                            onChange={handleChange}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                        />
                                        <p className="mt-2 text-[10px] text-purple-600 font-medium">
                                            Job seeker should score {jobData.mockInterview.passingScore}% and above to pass.
                                        </p>
                                    </div>
                                </div>

                                {/* QUESTION SOURCE SELECTION */}
                                <div className="mt-8 pt-6 border-t border-slate-200 space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                                            Interview Question Source
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* AI_GENERATED Option */}
                                            <div
                                                onClick={() => setJobData(prev => ({ ...prev, questionSource: 'AI_GENERATED', mockInterview: { ...(prev.mockInterview || {}), questionSource: 'AI_GENERATED' } }))}
                                                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                                    jobData.questionSource === 'AI_GENERATED'
                                                        ? 'border-purple-600 bg-purple-50/50 shadow-sm ring-2 ring-purple-600/10'
                                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                            jobData.questionSource === 'AI_GENERATED'
                                                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                                                : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            <Sparkles size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-900">AI-Generated Questions</h4>
                                                            <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">Default & Adaptive</span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="radio"
                                                        name="questionSource"
                                                        checked={jobData.questionSource === 'AI_GENERATED'}
                                                        onChange={() => setJobData(prev => ({ ...prev, questionSource: 'AI_GENERATED', mockInterview: { ...(prev.mockInterview || {}), questionSource: 'AI_GENERATED' } }))}
                                                        className="w-4 h-4 text-purple-600 accent-purple-600 cursor-pointer mt-1"
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed">
                                                    AI generates dynamic questions tailored to the Job Description and candidate resume, with real-time adaptive follow-ups based on candidate responses.
                                                </p>
                                            </div>

                                            {/* RECRUITER_PROVIDED Option */}
                                            <div
                                                onClick={() => setJobData(prev => ({ ...prev, questionSource: 'RECRUITER_PROVIDED', mockInterview: { ...(prev.mockInterview || {}), questionSource: 'RECRUITER_PROVIDED' } }))}
                                                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                                    jobData.questionSource === 'RECRUITER_PROVIDED'
                                                        ? 'border-purple-600 bg-purple-50/50 shadow-sm ring-2 ring-purple-600/10'
                                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                            jobData.questionSource === 'RECRUITER_PROVIDED'
                                                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                                                : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            <ClipboardList size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-900">Recruiter Question Bank</h4>
                                                            <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">Standardized & Verbatim</span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="radio"
                                                        name="questionSource"
                                                        checked={jobData.questionSource === 'RECRUITER_PROVIDED'}
                                                        onChange={() => setJobData(prev => ({ ...prev, questionSource: 'RECRUITER_PROVIDED', mockInterview: { ...(prev.mockInterview || {}), questionSource: 'RECRUITER_PROVIDED' } }))}
                                                        className="w-4 h-4 text-purple-600 accent-purple-600 cursor-pointer mt-1"
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed">
                                                    Supply your own curated question bank. The AI interviewer asks your exact canonical questions without rewording or adding unapproved follow-ups.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RECRUITER QUESTION BANK CONFIG & LIST */}
                                    {jobData.questionSource === 'RECRUITER_PROVIDED' && (
                                        <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-6">
                                            {/* Config Bar */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                                                        Questions Asked per Candidate
                                                    </label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={Math.max(1, jobData.recruiterQuestions.length || 50)}
                                                            value={jobData.questionCount || 1}
                                                            onChange={(e) => {
                                                                const maxAllowed = Math.max(1, jobData.recruiterQuestions.length || 1);
                                                                const val = Math.max(1, Math.min(Number(e.target.value) || 1, maxAllowed));
                                                                setJobData(prev => ({ ...prev, questionCount: val, mockInterview: { ...(prev.mockInterview || {}), questionCount: val } }));
                                                            }}
                                                            className="rec-input w-28 px-4 py-2.5 text-sm font-bold text-slate-900"
                                                        />
                                                        <span className="text-xs text-slate-500">
                                                            of {jobData.recruiterQuestions.length} in bank
                                                            {jobData.recruiterQuestions.length === 0 && ' (Add questions to bank below)'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-1.5">
                                                        Each candidate will be asked exactly this many questions before completion.
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                                                        Question Selection Mode
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setJobData(prev => ({ ...prev, selectionMode: 'ORDERED' }))}
                                                            className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                                jobData.selectionMode === 'ORDERED'
                                                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            <ListOrdered size={14} />
                                                            <span>Sequential Order</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setJobData(prev => ({ ...prev, selectionMode: 'RANDOM' }))}
                                                            className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                                jobData.selectionMode === 'RANDOM'
                                                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            <Shuffle size={14} />
                                                            <span>Random Selection</span>
                                                        </button>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-1.5">
                                                        {jobData.selectionMode === 'ORDERED'
                                                            ? 'Every candidate receives the first N questions in your configured order.'
                                                            : 'Questions are randomly sampled from your bank per candidate session (deterministic once started).'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    {/* File Upload */}
                                                    <label className={`rec-btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                                                        questionUploadLoading ? 'opacity-70 pointer-events-none' : ''
                                                    }`}>
                                                        {questionUploadLoading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                                                        <span>Upload File (.txt, .csv, .xlsx, .docx, .doc, .pdf)</span>
                                                        <input
                                                            type="file"
                                                            accept=".txt,.csv,.xlsx,.xls,.docx,.doc,.pdf"
                                                            onChange={handleQuestionFileUpload}
                                                            className="hidden"
                                                            disabled={questionUploadLoading}
                                                        />
                                                    </label>

                                                    {/* Paste Questions */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasteModal(true)}
                                                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-2 cursor-pointer"
                                                    >
                                                        <FileText size={14} />
                                                        <span>Paste Text</span>
                                                    </button>

                                                    {/* Add Manually */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAddQuestionForm(prev => !prev)}
                                                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-all flex items-center gap-2 cursor-pointer"
                                                    >
                                                        <Plus size={14} />
                                                        <span>+ Add Manually</span>
                                                    </button>
                                                </div>

                                                {jobData.recruiterQuestions.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (window.confirm('Are you sure you want to clear all questions in the bank?')) {
                                                                setJobData(prev => ({ ...prev, recruiterQuestions: [], questionCount: 1 }));
                                                            }
                                                        }}
                                                        className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Trash2 size={13} />
                                                        <span>Clear Bank</span>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Add Manually Form */}
                                            {showAddQuestionForm && (
                                                <div className="p-4 rounded-xl bg-white border border-purple-200 shadow-sm space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Add Single Question</h5>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAddQuestionForm(false)}
                                                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        rows={2}
                                                        placeholder="Enter question text (e.g. Explain how goroutines are scheduled in Go...)"
                                                        value={newQuestionText}
                                                        onChange={(e) => setNewQuestionText(e.target.value)}
                                                        className="rec-input w-full px-3 py-2 text-xs font-medium resize-none"
                                                    />
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Technical, Go, System Design"
                                                                value={newQuestionCategory}
                                                                onChange={(e) => setNewQuestionCategory(e.target.value)}
                                                                className="rec-input w-full px-3 py-1.5 text-xs"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Difficulty</label>
                                                            <select
                                                                value={newQuestionDifficulty}
                                                                onChange={(e) => setNewQuestionDifficulty(e.target.value)}
                                                                className="rec-select w-full px-3 py-1.5 text-xs"
                                                            >
                                                                <option value="Easy">Easy</option>
                                                                <option value="Medium">Medium</option>
                                                                <option value="Hard">Hard</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Time Limit (sec)</label>
                                                            <input
                                                                type="number"
                                                                min="30"
                                                                max="600"
                                                                value={newQuestionTimeLimit}
                                                                onChange={(e) => setNewQuestionTimeLimit(Number(e.target.value) || 120)}
                                                                className="rec-input w-full px-3 py-1.5 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAddQuestionForm(false)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleAddManualQuestion}
                                                            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-sm cursor-pointer"
                                                        >
                                                            Add to Bank
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Questions Bank List */}
                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                                                    <span>Bank Questions ({jobData.recruiterQuestions.length})</span>
                                                    <span>Asking {Math.min(jobData.questionCount || 0, jobData.recruiterQuestions.length)}</span>
                                                </div>

                                                {jobData.recruiterQuestions.length === 0 ? (
                                                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-white">
                                                        <ClipboardList size={36} className="mx-auto text-slate-300 mb-2" />
                                                        <p className="text-xs font-bold text-slate-700">No questions in bank yet</p>
                                                        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                                                            Upload a file (.txt, .csv, .xlsx, .docx, .pdf), paste text, or add questions manually.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                                                        {jobData.recruiterQuestions.map((q, idx) => (
                                                            <div
                                                                key={q.questionId || idx}
                                                                className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition-all flex items-start gap-3"
                                                            >
                                                                <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                                                    {idx + 1}
                                                                </span>

                                                                <div className="flex-1 min-w-0">
                                                                    {editingQuestionIdx === idx ? (
                                                                        <div className="space-y-2">
                                                                            <textarea
                                                                                rows={2}
                                                                                value={q.text}
                                                                                onChange={(e) => handleUpdateQuestion(idx, 'text', e.target.value)}
                                                                                className="rec-input w-full px-2.5 py-1.5 text-xs font-medium"
                                                                            />
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Category"
                                                                                    value={q.category || ''}
                                                                                    onChange={(e) => handleUpdateQuestion(idx, 'category', e.target.value)}
                                                                                    className="rec-input px-2 py-1 text-xs w-32"
                                                                                />
                                                                                <select
                                                                                    value={q.difficulty || 'Medium'}
                                                                                    onChange={(e) => handleUpdateQuestion(idx, 'difficulty', e.target.value)}
                                                                                    className="rec-select px-2 py-1 text-xs w-28"
                                                                                >
                                                                                    <option value="Easy">Easy</option>
                                                                                    <option value="Medium">Medium</option>
                                                                                    <option value="Hard">Hard</option>
                                                                                </select>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setEditingQuestionIdx(null)}
                                                                                    className="px-2.5 py-1 rounded text-xs font-bold bg-purple-600 text-white cursor-pointer"
                                                                                >
                                                                                    Done
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div>
                                                                            <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                                                                                {q.text}
                                                                            </p>
                                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                                                                                    {q.category || 'General'}
                                                                                </span>
                                                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                                                                    q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600' :
                                                                                    q.difficulty === 'Hard' ? 'bg-red-50 text-red-600' :
                                                                                    'bg-amber-50 text-amber-600'
                                                                                }`}>
                                                                                    {q.difficulty || 'Medium'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Controls */}
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        disabled={idx === 0}
                                                                        onClick={() => handleMoveQuestion(idx, 'up')}
                                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                                                        title="Move Up"
                                                                    >
                                                                        <ArrowUp size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={idx === jobData.recruiterQuestions.length - 1}
                                                                        onClick={() => handleMoveQuestion(idx, 'down')}
                                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                                                        title="Move Down"
                                                                    >
                                                                        <ArrowDown size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEditingQuestionIdx(editingQuestionIdx === idx ? null : idx)}
                                                                        className="p-1 text-slate-400 hover:text-purple-600 cursor-pointer"
                                                                        title="Edit"
                                                                    >
                                                                        <Edit3 size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteQuestion(idx)}
                                                                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium flex items-start gap-3">
                    <Clock size={18} className="shrink-0 mt-0.5" />
                    <span>After posting, your job will go through a brief admin review before being visible to candidates. You'll see the approval status in your job listings.</span>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="rec-btn-primary w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2.5 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <FilePlus />}
                    {loading ? 'Submitting for Review...' : 'Submit for Admin Review'}
                </button>
            </form >

            {/* Paste Modal */}
            {showPasteModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <FileText className="text-purple-600" size={20} />
                                <h3 className="text-base font-bold text-slate-900">Paste Questions</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPasteModal(false)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Paste questions below (one per line, or numbered like "1. What is..."). Our parser will automatically clean prefixes, detect categories and difficulties, and remove duplicates.
                        </p>
                        <textarea
                            rows={10}
                            placeholder="1. What is the difference between concurrency and parallelism in Go?&#10;2. Explain how goroutines are scheduled by the Go runtime.&#10;3. How do channels work under the hood and when can deadlocks occur?"
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            className="rec-input w-full p-3 text-xs font-mono resize-none"
                        />
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowPasteModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={questionUploadLoading || !pasteText.trim()}
                                onClick={handlePasteParse}
                                className="rec-btn-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {questionUploadLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                <span>Parse Questions</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Preview Modal */}
            {showImportPreviewModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="text-emerald-600" size={20} />
                                <h3 className="text-base font-bold text-slate-900">
                                    Parsed {parsedQuestionsPreview.length} Questions
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowImportPreviewModal(false)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {previewStats?.warnings && previewStats.warnings.length > 0 && (
                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs space-y-1">
                                <div className="font-bold flex items-center gap-1.5">
                                    <AlertCircle size={14} />
                                    <span>Parser Notices:</span>
                                </div>
                                {previewStats.warnings.map((w, i) => (
                                    <p key={i} className="text-[11px] pl-5">• {w}</p>
                                ))}
                            </div>
                        )}

                        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                            {parsedQuestionsPreview.map((q, idx) => (
                                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-800">{q.text}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-slate-500 font-medium">{q.category}</span>
                                            <span className="text-[10px] text-purple-600 font-bold">• {q.difficulty}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setShowImportPreviewModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <div className="flex items-center gap-2">
                                {jobData.recruiterQuestions.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => confirmImport('append')}
                                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 cursor-pointer"
                                    >
                                        Append to Bank ({jobData.recruiterQuestions.length + parsedQuestionsPreview.length})
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => confirmImport('replace')}
                                    className="rec-btn-primary px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    {jobData.recruiterQuestions.length > 0 ? 'Replace Existing Bank' : 'Import to Bank'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default PostJob;
