import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle, Video, ChevronRight, Brain } from 'lucide-react';
import axios from 'axios';
import ResumeAnalyzer from './ResumeAnalyzer';
import SkillAssessment from './SkillAssessment';
import AIInterview from './AIInterview';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ApplicationFlow = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState(null);
    const [user, setUser] = useState(null);

    // Shared State
    const [resumeData, setResumeData] = useState(null);
    const [assessmentScore, setAssessmentScore] = useState(null);
    const [interviewResult, setInterviewResult] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const storedUser = JSON.parse(localStorage.getItem('user'));
                if (!storedUser) {
                    navigate('/login');
                    return;
                }
                setUser(storedUser);

                const jobRes = await axios.get(`${API_BASE_URL}/api/jobs/${jobId}`);
                setJob(jobRes.data);

                // Check for existing application to resume state
                try {
                    const appsRes = await axios.get(`${API_BASE_URL}/api/applications/seeker/${storedUser.uid || storedUser._id || storedUser.id}`);
                    const existingApp = appsRes.data.find(app => app.jobId._id === jobId || app.jobId === jobId);

                    if (existingApp) {
                        if (existingApp.resumeMatchPercent && !existingApp.assessmentScore) {
                            // Resume passed, Assessment Pending
                            setResumeData({ data: { matchPercentage: existingApp.resumeMatchPercent } }); // Hydrate minimal data
                            setStep(2);
                        } else if (existingApp.assessmentScore && !existingApp.interviewScore) {
                            // Assessment passed, Interview Pending
                            setResumeData({ data: { matchPercentage: existingApp.resumeMatchPercent } });
                            setAssessmentScore(existingApp.assessmentScore);
                            setStep(3);
                        }
                    }
                } catch (e) {
                    console.log("No existing application found or error checking:", e);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [jobId, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!job) return <div>Job not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Progress Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-xl font-bold text-gray-800">Application for {job.title}</h1>
                        <span className="text-sm font-medium text-gray-500">Step {step} of 3</span>
                    </div>

                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            className="absolute left-0 top-0 h-full bg-indigo-600"
                            initial={{ width: "0%" }}
                            animate={{ width: `${(step / 3) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>

                    <div className="flex justify-between mt-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className={`flex items-center ${step >= 1 ? 'text-indigo-600' : ''}`}>
                            <div className={`p-1.5 rounded-full mr-2 ${step >= 1 ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                                <FileText className="w-4 h-4" />
                            </div>
                            Resume Analysis
                        </div>
                        <div className={`flex items-center ${step >= 2 ? 'text-indigo-600' : ''}`}>
                            <div className={`p-1.5 rounded-full mr-2 ${step >= 2 ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                                <Brain className="w-4 h-4" />
                            </div>
                            Skill Assessment
                        </div>
                        <div className={`flex items-center ${step >= 3 ? 'text-indigo-600' : ''}`}>
                            <div className={`p-1.5 rounded-full mr-2 ${step >= 3 ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                                <Video className="w-4 h-4" />
                            </div>
                            AI Interview
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 pb-24">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <ResumeAnalyzer
                            key="resume"
                            job={job}
                            user={user}
                            onComplete={(data) => {
                                setResumeData(data);
                                setStep(2);
                            }}
                        />
                    )}

                    {step === 2 && (
                        <SkillAssessment
                            key="assessment"
                            job={job}
                            user={user}
                            resumeData={resumeData}
                            onBack={() => setStep(1)}
                            onComplete={(score) => {
                                setAssessmentScore(score);
                                setStep(3);
                            }}
                        />
                    )}

                    {step === 3 && (
                        <AIInterview
                            key="interview"
                            job={job}
                            user={user}
                            resumeData={resumeData}
                            assessmentScore={assessmentScore}
                            onComplete={(result) => {
                                setInterviewResult(result);
                                navigate('/seeker/applications'); // Or success page
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ApplicationFlow;
