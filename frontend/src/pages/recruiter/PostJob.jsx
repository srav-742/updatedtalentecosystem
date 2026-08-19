import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FilePlus, MapPin, Briefcase, Zap, Plus, X, Loader2, CheckCircle2, Save, ChevronDown, Clock, Code2, UploadCloud, FileText, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../../firebase';

const PostJob = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editJobId = searchParams.get('edit');
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

    useEffect(() => {
        if (!user.uid && !user._id && !user.id) {
            navigate('/login');
        } else if (user.role !== 'recruiter') {
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

    useEffect(() => {
        if (editJobId) {
            const fetchJob = async () => {
                try {
                    const res = await axios.get(`${API_URL}/jobs/${editJobId}`);
                    if (res.data) setJobData(res.data);

                    // Fetch existing coding round config
                    const roundRes = await axios.get(`${API_URL}/coding-assessments/round/${editJobId}`);
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

            const dataToSave = {
                ...jobData,
                recruiterId: recruiterId,
                company: jobData.company || user.company?.name || user.company || 'hire1percent Partner',
                minPercentage: Number(jobData.minPercentage)
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
            }

            let targetJobId = editJobId;
            if (editJobId) {
                await axios.put(`${API_URL}/jobs/${editJobId}`, dataToSave);
            } else {
                const res = await axios.post(`${API_URL}/jobs`, dataToSave);
                targetJobId = res.data?._id || res.data?.job?._id;
            }

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
                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                            A
                        </div>
                        <h2 className="text-xl font-bold">Job Information</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-500 mb-2">Job Title</label>
                            <input
                                type="text"
                                name="title"
                                value={jobData.title}
                                onChange={handleChange}
                                placeholder="e.g. Senior Web3 Developer"
                                required
                                className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-500">Job Description</label>
                                <button
                                    type="button"
                                    onClick={generateAIDescription}
                                    disabled={isGeneratingDesc || !jobData.title}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                                className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all resize-none"
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
                                className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all resize-none text-sm"
                            ></textarea>
                            <p className="mt-2 text-[10px] text-gray-500 italic">
                                This information will only be used by our AI to better filter candidates. It will NOT appear in the public job description.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    name="location"
                                    value={jobData.location}
                                    onChange={handleChange}
                                    placeholder="e.g. New York or Remote"
                                    required
                                    className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Job Type</label>
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
                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold border border-purple-500/20 shadow-lg shadow-purple-500/10">
                                    B
                                </div>
                                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Education Details</h2>
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
                                    className="p-6 rounded-2xl bg-black/20 border border-white/5 relative group/item hover:border-purple-500/30 transition-all"
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
                                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Qualification</label>
                                            <div className="relative">
                                                <select
                                                    value={edu.qualification}
                                                    onChange={(e) => handleEducationChange(index, 'qualification', e.target.value)}
                                                    className="w-full px-5 py-3 rounded-xl bg-[#1a1d24] border border-white/10 focus:border-purple-500/50 outline-none transition-all appearance-none cursor-pointer text-sm text-white"
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
                                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Specialization</label>
                                            <div className="relative">
                                                <select
                                                    value={edu.specialization}
                                                    onChange={(e) => handleEducationChange(index, 'specialization', e.target.value)}
                                                    className="w-full px-5 py-3 rounded-xl bg-[#1a1d24] border border-white/10 focus:border-purple-500/50 outline-none transition-all appearance-none cursor-pointer text-sm text-white"
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
                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold border border-pink-500/20 shadow-lg shadow-pink-500/10">
                                C
                            </div>
                            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Work Experience</h2>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-3 ml-1">Required Experience Level</label>
                            <div className="relative group/select">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500/50 group-focus-within/select:text-pink-500 transition-colors" size={20} />
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                                <select
                                    name="experienceLevel"
                                    value={jobData.experienceLevel}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-5 py-4 rounded-2xl bg-[#11131a] border border-white/10 focus:border-pink-500/50 outline-none transition-all appearance-none cursor-pointer text-white font-medium"
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
                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold border border-teal-500/20">
                            D
                        </div>
                        <h2 className="text-xl font-bold">Skill Requirements</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Required Skills</label>
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
                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">
                                E
                            </div>
                            <h2 className="text-xl font-bold">Resume Selection Logic</h2>
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
                    <div className={`p-8 rounded-[2.5rem] bg-white/5 border transition-all duration-300 shadow-xl flex flex-col justify-between ${
                        jobData.assessment.enabled ? 'border-orange-500/35 bg-orange-500/[0.02] shadow-orange-500/5' : 'border-white/10'
                    }`}>
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold border border-orange-500/20">
                                        F
                                    </div>
                                    <h2 className="text-lg font-bold">Assessments</h2>
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
                                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-widest">Assessment Type</label>
                                    <select
                                        name="assessment.type"
                                        value={jobData.assessment.type}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl bg-[#11131a] border border-white/10 focus:border-orange-500/50 outline-none text-sm"
                                    >
                                        <option value="MCQ">MCQ Questions</option>
                                        <option value="Coding">Coding Challenges</option>
                                        <option value="Hybrid">Hybrid Test</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-widest">Total Questions</label>
                                    <input
                                        type="number"
                                        name="assessment.totalQuestions"
                                        value={jobData.assessment.totalQuestions}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500/50 outline-none text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Coding Assessment Settings */}
                    <div className={`p-8 rounded-[2.5rem] bg-white/5 border transition-all duration-300 shadow-xl flex flex-col justify-between ${
                        jobData.codingAssessment?.enabled ? 'border-teal-500/35 bg-teal-500/[0.02] shadow-teal-500/5' : 'border-white/10'
                    }`}>
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold border border-teal-500/20">
                                        <Code2 size={16} />
                                    </div>
                                    <h2 className="text-lg font-bold">Coding Rounds</h2>
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
                                                    className="w-full bg-[#11131a] border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none cursor-pointer hover:border-teal-500/50 transition-all appearance-none text-xs"
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
                                                        className="w-full bg-[#11131a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-teal-500/50"
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
                                                            className="w-full bg-[#11131a] border border-white/10 rounded-xl px-2 py-2 text-white text-xs text-center outline-none focus:border-teal-500/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block font-semibold text-gray-400 mb-1 text-[9px] uppercase">Moderate</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={moderateTime}
                                                            onChange={(e) => setModerateTime(Number(e.target.value) || 30)}
                                                            className="w-full bg-[#11131a] border border-white/10 rounded-xl px-2 py-2 text-white text-xs text-center outline-none focus:border-teal-500/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block font-semibold text-gray-400 mb-1 text-[9px] uppercase">High</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={highTime}
                                                            onChange={(e) => setHighTime(Number(e.target.value) || 45)}
                                                            className="w-full bg-[#11131a] border border-white/10 rounded-xl px-2 py-2 text-white text-xs text-center outline-none focus:border-teal-500/50"
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
                    <div className={`p-8 rounded-[2.5rem] bg-white/5 border transition-all duration-300 shadow-xl flex flex-col justify-between ${
                        jobData.mockInterview.enabled ? 'border-purple-500/35 bg-purple-500/[0.02] shadow-purple-500/5' : 'border-white/10'
                    }`}>
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold border border-purple-500/20">
                                        G
                                    </div>
                                    <h2 className="text-lg font-bold">AI Interview</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleToggle('mockInterview.enabled')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${jobData.mockInterview.enabled ? 'bg-purple-500' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${jobData.mockInterview.enabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className={`transition-all ${jobData.mockInterview.enabled ? 'opacity-100' : 'opacity-30'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 pt-6 border-t border-white/5">
                                    <div>
                                        <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                                            Enable our **AI Mock Interviewer** to conduct preliminary video/audio rounds. Candidates will be interviewed by our AI and automatically scored and evaluated.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest">Interview Score Threshold</label>
                                            <span className="text-purple-400 font-bold text-xs">{jobData.mockInterview.passingScore}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            name="mockInterview.passingScore"
                                            min="10"
                                            max="100"
                                            step="5"
                                            value={jobData.mockInterview.passingScore || 70}
                                            onChange={handleChange}
                                            className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                        <p className="mt-2 text-[10px] text-purple-400/80 font-medium">
                                            Job seeker should be {jobData.mockInterview.passingScore}% and above perfectly.
                                        </p>
                                    </div>
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
                    className="w-full py-5 rounded-3xl bg-gradient-to-r from-blue-600 to-teal-500 text-white text-xl font-bold shadow-2xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <FilePlus />}
                    {loading ? 'Submitting for Review...' : 'Submit for Admin Review'}
                </button>
            </form >
        </div >
    );
};

export default PostJob;
