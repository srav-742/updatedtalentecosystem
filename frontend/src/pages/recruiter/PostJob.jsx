import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FilePlus, MapPin, Briefcase, Zap, Plus, X, Loader2, CheckCircle2, Save } from 'lucide-react';
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

    const [jobData, setJobData] = useState({
        title: '',
        description: '',
        location: '',
        type: 'Full-time',
        skills: [],
        minExperience: 0,
        minPercentage: 85,
        assessment: {
            enabled: false,
            type: 'MCQ',
            totalQuestions: 10
        },
        mockInterview: {
            enabled: false
        }
    });

    const [currentSkill, setCurrentSkill] = useState('');

    useEffect(() => {
        if (editJobId) {
            const fetchJob = async () => {
                try {
                    const res = await axios.get(`${API_URL}/jobs/${editJobId}`);
                    if (res.data) setJobData(res.data);
                } catch (error) {
                    console.error('Error fetching job for edit:', error);
                }
            };
            fetchJob();
        }
    }, [editJobId]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSave = {
                ...jobData,
                recruiterId: user.uid || user._id || user.id,
                company: user.company?.name || ''
            };

            if (editJobId) {
                await axios.put(`${API_URL}/jobs/${editJobId}`, dataToSave);
            } else {
                await axios.post(`${API_URL}/jobs`, dataToSave);
            }

            setSuccess(true);
            setTimeout(() => navigate('/recruiter/my-jobs'), 2000);
        } catch (error) {
            console.error('Error saving job:', error);
            alert('Failed to save job. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6"
                >
                    <CheckCircle2 size={40} />
                </motion.div>
                <h1 className="text-3xl font-bold mb-2">Job Posted Successfully!</h1>
                <p className="text-gray-400">Redirecting to your job listings...</p>
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
                            <label className="block text-sm font-medium text-gray-500 mb-2">Job Description</label>
                            <textarea
                                name="description"
                                value={jobData.description}
                                onChange={handleChange}
                                rows="4"
                                placeholder="Describe the role, responsibilities, and requirements..."
                                required
                                className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all resize-none"
                            ></textarea>
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
                            <select
                                name="type"
                                value={jobData.type}
                                onChange={handleChange}
                                className="w-full px-5 py-3 rounded-2xl bg-[#11131a] border border-white/10 focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="Full-time">Full-time</option>
                                <option value="Internship">Internship</option>
                                <option value="Contract">Contract</option>
                                <option value="Part-time">Part-time</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* B. Skill Requirements */}
                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold border border-teal-500/20">
                            B
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
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Minimum Experience (Years)</label>
                            <input
                                type="number"
                                name="minExperience"
                                value={jobData.minExperience}
                                onChange={handleChange}
                                min="0"
                                className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-teal-500/50 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* C. Selection Logic */}
                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">
                            C
                        </div>
                        <h2 className="text-xl font-bold">Selection Logic</h2>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-500">Minimum Selection Percentage (Auto-shortlisting)</label>
                            <span className="text-emerald-400 font-bold text-lg">{jobData.minPercentage}%</span>
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
                        <p className="mt-4 text-xs text-gray-500 bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed">
                            Candidates with a **Final Score** greater than or equal to this percentage will be automatically **SHORTLISTED**.
                            Final Score is a combination of Resume matching, Assessments, and Interviews.
                        </p>
                    </div>
                </div>

                {/* D & E. Modular Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Assessment Settings */}
                    <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold border border-orange-500/20">
                                    D
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

                        <div className={`space-y-4 transition-all ${jobData.assessment.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none'}`}>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-widest">Assessment Type</label>
                                <select
                                    name="assessment.type"
                                    value={jobData.assessment.type}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-xl bg-[#11131a] border border-white/10 focus:border-orange-500/50 outline-none text-sm"
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
                                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500/50 outline-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Interview Settings */}
                    <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold border border-purple-500/20">
                                    E
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
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Enable our **AI Mock Interviewer** to conduct preliminary video/audio rounds with candidates who clear the assessment.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 rounded-3xl bg-gradient-to-r from-blue-600 to-teal-500 text-white text-xl font-bold shadow-2xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <FilePlus />}
                    {loading ? 'Posting Job...' : 'Post Job Now'}
                </button>
            </form>
        </div>
    );
};

export default PostJob;
