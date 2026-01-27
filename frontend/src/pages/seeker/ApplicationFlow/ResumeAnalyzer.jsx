import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, Loader, XCircle, ArrowLeft, ArrowRight, BookOpen, Clock } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ResumeAnalyzer = ({ job, user, onComplete }) => {
    const navigate = useNavigate();
    const [method, setMethod] = useState('upload'); // 'upload' or 'create'
    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setError(null);
    };

    const handleAnalyze = async () => {
        if (method === 'upload' && !file) {
            setError("Please select a file first.");
            return;
        }

        setAnalyzing(true);
        setError(null);

        try {
            let resumeText = "";

            if (method === 'upload') {
                const formData = new FormData();
                formData.append('resume', file);
                const extractRes = await axios.post(`${API_BASE_URL}/api/extract-pdf`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                resumeText = extractRes.data.text;
            } else {
                resumeText = "Manual resume text placeholder";
            }

            // ✅ Use /api/analyze-resume (AI-powered, not structured parse)
            const analysisRes = await axios.post(`${API_BASE_URL}/api/analyze-resume`, {
                resumeText,
                jobSkills: job.skills,
                jobExperience: job.experienceLevel,
                jobEducation: job.education,
                userId: user.uid || user._id || user.id
            });

            const { data } = analysisRes;

            // ✅ Validate required fields
            if (
                typeof data.matchPercentage !== 'number' ||
                typeof data.skillsScore !== 'number' ||
                typeof data.experienceScore !== 'number' ||
                typeof data.skillsFeedback !== 'string' ||
                typeof data.experienceFeedback !== 'string' ||
                typeof data.explanation !== 'string'
            ) {
                throw new Error("Invalid AI response format");
            }

            setAnalysisResult({
                text: resumeText,
                data
            });

        } catch (err) {
            console.error("Analysis Failed:", err);
            setError(
                err.response?.data?.message ||
                "Failed to analyze resume. Please try again."
            );
        } finally {
            setAnalyzing(false);
        }
    };

    // Logic to determine pass/fail based on recruiter limit
    const THRESHOLD = job.minPercentage || 60;

    if (analysisResult) {
        const { matchPercentage, skillsScore, experienceScore, explanation, skillsFeedback, experienceFeedback } = analysisResult.data;
        const isPassed = matchPercentage >= THRESHOLD;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
                {/* Header Section */}
                <div className={`p-8 text-center text-white ${isPassed ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-pink-600'}`}>
                    {isPassed ? (
                        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-white opacity-90" />
                    ) : (
                        <XCircle className="w-16 h-16 mx-auto mb-4 text-white opacity-90" />
                    )}

                    <h2 className="text-3xl font-bold mb-2">
                        {isPassed ? "You Are Qualified!" : "Not Shortlisted"}
                    </h2>
                    <p className="text-white/90 text-lg">
                        {isPassed
                            ? `Great! Your profile matches ${matchPercentage}% of the requirements.`
                            : `Your profile match of ${matchPercentage}% is below the required ${THRESHOLD}%.`}
                    </p>
                </div>

                {/* Detailed Breakdown */}
                <div className="p-8 space-y-8">

                    {/* Score Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                            <div className="flex items-center mb-2 text-indigo-600">
                                <BookOpen className="w-5 h-5 mr-2" />
                                <h3 className="font-bold">Skills Match (50%)</h3>
                            </div>
                            <div className="text-3xl font-black text-gray-800 mb-1">{skillsScore}%</div>
                            {skillsFeedback && (
                                <p className="text-sm text-gray-600 mt-1 italic">"{skillsFeedback}"</p>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                            <div className="flex items-center mb-2 text-purple-600">
                                <Clock className="w-5 h-5 mr-2" />
                                <h3 className="font-bold">Experience & Education (50%)</h3>
                            </div>
                            <div className="text-3xl font-black text-gray-800 mb-1">{experienceScore}%</div>
                            {experienceFeedback && (
                                <p className="text-sm text-gray-600 mt-1 italic">"{experienceFeedback}"</p>
                            )}
                        </div>
                    </div>

                    {/* AI Explanation */}
                    <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                        <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-widest mb-3">Recruiter AI Feedback</h3>
                        <p className="text-gray-700 leading-relaxed">
                            "{explanation}"
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row gap-4 pt-4">
                        {!isPassed && (
                            <button
                                onClick={() => navigate('/seeker/jobs')}
                                className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" /> Back to Jobs
                            </button>
                        )}

                        {isPassed && (
                            <>
                                <button
                                    onClick={() => navigate('/seeker/jobs')}
                                    className="px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center mr-4"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            await axios.post(`${API_BASE_URL}/api/applications`, {
                                                jobId: job._id,
                                                userId: user.uid || user._id,
                                                status: 'APPLIED',
                                                resumeMatchPercent: matchPercentage,
                                                applicantName: user.name,
                                                applicantEmail: user.email,
                                                applicantPic: user.profilePic || ""
                                            });
                                            onComplete({ matchPercentage, skillsScore, experienceScore, explanation });
                                        } catch (err) {
                                            console.error("Failed to apply:", err);
                                            setError("Network error. Could not save application.");
                                        }
                                    }}
                                    className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] transition-all flex items-center justify-center"
                                >
                                    Apply & Start Assessment <ArrowRight className="w-5 h-5 ml-2" />
                                </button>
                            </>
                        )}

                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        >
            <div className="p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Resume Check</h2>
                    <p className="text-gray-500">Let's see how well your profile matches the <strong>{job.title}</strong> role.</p>
                </div>

                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors bg-gray-50 group cursor-pointer relative">
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-4">
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">
                                {file ? file.name : "Click to upload your Resume"}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">PDF files only, max 5MB</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center text-sm">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {error}
                    </div>
                )}

                <div className="flex gap-4 mt-8">
                    <button
                        onClick={() => navigate('/seeker/jobs')}
                        className="px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing || !file}
                        className={`flex-1 py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all flex items-center justify-center
                ${analyzing || !file
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-indigo-500/25 hover:scale-[1.02]'}`}
                    >
                        {analyzing ? (
                            <>
                                <Loader className="w-5 h-5 mr-2 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            "Analyze & Continue"
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default ResumeAnalyzer;