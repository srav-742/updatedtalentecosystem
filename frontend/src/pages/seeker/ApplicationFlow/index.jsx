import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle, Video, ChevronRight, Brain } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../../firebase';
import ResumeAnalyzer from './ResumeAnalyzer';
import SkillAssessment from './SkillAssessment';
import AIInterview from './AIInterview';

const ApplicationFlow = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [stepIndex, setStepIndex] = useState(0);
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

                const jobRes = await axios.get(`${API_URL}/jobs/${jobId}`);
                const jobData = jobRes.data;
                setJob(jobData);

                // Define enabled steps
                const enabledSteps = [
                    { id: 'resume', enabled: jobData.resumeAnalysis?.enabled !== false },
                    { id: 'assessment', enabled: jobData.assessment?.enabled },
                    { id: 'interview', enabled: jobData.mockInterview?.enabled },
                ].filter(s => s.enabled);

                // Check for existing application to resume state
                try {
                    const appsRes = await axios.get(`${API_URL}/applications/seeker/${storedUser.uid || storedUser._id || storedUser.id}`);
                    const existingApp = appsRes.data.find(app => (app.jobId._id || app.jobId) === jobId);

                    if (existingApp) {
                        const enabledIds = enabledSteps.map(s => s.id);
                        if (existingApp.resumeMatchPercent) setResumeData({ matchPercentage: existingApp.resumeMatchPercent });
                        if (existingApp.assessmentScore) setAssessmentScore(existingApp.assessmentScore);

                        // Determine the next pending step
                        const resumeDone = !enabledIds.includes('resume') || !!existingApp.resumeMatchPercent;
                        const assessmentDone = !enabledIds.includes('assessment') || !!existingApp.assessmentScore;
                        const interviewDone = !enabledIds.includes('interview') || !!existingApp.interviewScore;

                        let targetIndex = 0;
                        if (resumeDone && !assessmentDone && enabledIds.includes('assessment')) {
                            targetIndex = enabledIds.indexOf('assessment');
                        } else if (resumeDone && assessmentDone && !interviewDone && enabledIds.includes('interview')) {
                            targetIndex = enabledIds.indexOf('interview');
                        } else if (resumeDone && assessmentDone && interviewDone) {
                            navigate('/seeker/applications');
                        }
                        setStepIndex(targetIndex);
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

    const enabledSteps = [
        { id: 'resume', label: 'Resume Analysis', icon: <FileText className="w-4 h-4" />, enabled: job.resumeAnalysis?.enabled !== false },
        { id: 'assessment', label: 'Skill Assessment', icon: <Brain className="w-4 h-4" />, enabled: job.assessment?.enabled },
        { id: 'interview', label: 'AI Interview', icon: <Video className="w-4 h-4" />, enabled: job.mockInterview?.enabled },
    ].filter(s => s.enabled);

    const currentStep = enabledSteps[stepIndex];

    const handleNext = () => {
        if (stepIndex < enabledSteps.length - 1) {
            setStepIndex(stepIndex + 1);
        } else {
            navigate('/seeker/applications');
        }
    };

    const handleBack = () => {
        if (stepIndex > 0) {
            setStepIndex(stepIndex - 1);
        }
    };

    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            {/* Progress Header */}
            <div className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-xl font-bold text-white">Application for {job.title}</h1>
                        <span className="text-sm font-medium text-gray-400">Step {stepIndex + 1} of {enabledSteps.length}</span>
                    </div>

                    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="absolute left-0 top-0 h-full bg-blue-500"
                            initial={{ width: "0%" }}
                            animate={{ width: `${((stepIndex + 1) / enabledSteps.length) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>

                    <div className="flex justify-between mt-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        {enabledSteps.map((s, idx) => (
                            <div key={s.id} className={`flex items-center ${stepIndex >= idx ? 'text-blue-400' : ''}`}>
                                <div className={`p-1.5 rounded-lg mr-2 ${stepIndex >= idx ? 'bg-blue-500/20' : 'bg-white/5 text-gray-600'}`}>
                                    {s.icon}
                                </div>
                                <span className="hidden sm:inline">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 pb-24">
                <AnimatePresence mode="wait">
                    {currentStep?.id === 'resume' && (
                        <ResumeAnalyzer
                            key="resume"
                            job={job}
                            user={user}
                            onComplete={(data) => {
                                setResumeData(data);
                                handleNext();
                            }}
                        />
                    )}

                    {currentStep?.id === 'assessment' && (
                        <SkillAssessment
                            key="assessment"
                            job={job}
                            user={user}
                            resumeData={resumeData}
                            onBack={handleBack}
                            onComplete={(score) => {
                                setAssessmentScore(score);
                                handleNext();
                            }}
                        />
                    )}

                    {currentStep?.id === 'interview' && (
                        <AIInterview
                            key="interview"
                            job={job}
                            user={user}
                            resumeData={resumeData}
                            assessmentScore={assessmentScore}
                            onComplete={(result) => {
                                setInterviewResult(result);
                                navigate('/seeker/applications');
                            }}
                        />
                    )}

                    {!currentStep && (
                        <div className="text-center py-20">
                            <h2 className="text-2xl font-bold text-white mb-4">No steps enabled for this job</h2>
                            <button onClick={() => navigate('/seeker/jobs')} className="px-6 py-2 bg-blue-600 text-white rounded-xl">Back to Jobs</button>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ApplicationFlow;
