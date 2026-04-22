import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle, Video, ChevronRight, Brain } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../../firebase';
import ResumeAnalyzer from './ResumeAnalyzer';
import SkillAssessment from './SkillAssessment';
import AIInterview from './AIInterview';
import CandidateDeck from './CandidateDeck';


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
    const [securityNotice, setSecurityNotice] = useState(null);

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
                    { id: 'candidate-deck', enabled: jobData.mockInterview?.enabled }, // Required if interview is enabled
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
                        const videoDone = !enabledIds.includes('candidate-deck') || !!existingApp.videoIntroUrl;
                        const interviewDone = !enabledIds.includes('interview') || !!existingApp.interviewScore;

                        let targetIndex = 0;
                        if (resumeDone && !assessmentDone && enabledIds.includes('assessment')) {
                            targetIndex = enabledIds.indexOf('assessment');
                        } else if (resumeDone && assessmentDone && !videoDone && enabledIds.includes('candidate-deck')) {
                            targetIndex = enabledIds.indexOf('candidate-deck');
                        } else if (resumeDone && assessmentDone && videoDone && !interviewDone && enabledIds.includes('interview')) {
                            targetIndex = enabledIds.indexOf('interview');
                        } else if (resumeDone && assessmentDone && videoDone && interviewDone) {
                            navigate('/seeker/applications');
                        }

                        setStepIndex(targetIndex);
                    }
                } catch (e) {
                    // No existing application found or minor error - continue normally
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
        { id: 'candidate-deck', label: 'Candidate Deck', icon: <Video className="w-4 h-4" />, enabled: job.mockInterview?.enabled },
        { id: 'interview', label: 'AI Interview', icon: <CheckCircle className="w-4 h-4" />, enabled: job.mockInterview?.enabled },
    ].filter(s => s.enabled);


    const currentStep = enabledSteps[stepIndex];

    const handleNext = () => {
        setSecurityNotice(null);
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

    const handleSecurityResetToResume = async ({ stage, reason, violation }) => {
        try {
            await axios.post(`${API_URL}/applications/proctoring-reset`, {
                jobId: job._id,
                userId: user?.uid || user?._id || user?.id,
                stage,
                reason,
                violation
            });
        } catch (error) {
            console.error('Failed to reset application after security violation:', error);
        }

        setResumeData(null);
        setAssessmentScore(null);
        setInterviewResult(null);
        setSecurityNotice(
            'Security policy triggered. Restart from Resume Analysis to continue this application.'
        );

        const resumeStepIndex = enabledSteps.findIndex((step) => step.id === 'resume');
        setStepIndex(resumeStepIndex >= 0 ? resumeStepIndex : 0);
    };

    return (
        <div className="min-h-screen bg-[#fbf8f3] flex flex-col">
            <div className="sticky top-0 z-40 border-b border-black/10 bg-[#fbf8f3]/90 backdrop-blur">
                <div className="mx-auto max-w-[1320px] px-4 py-5 md:px-6">
                    <div className="rounded-[2rem] border border-black/10 bg-white px-6 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Candidate workflow</p>
                                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">Application for {job.title}</h1>
                                <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-500">
                                    Move from resume analysis to assessment and interview without losing your current progress.
                                </p>
                            </div>

                            <div className="rounded-full border border-black/10 bg-[#f8f4ed] px-4 py-2 text-sm font-medium text-gray-700">
                                Step {stepIndex + 1} of {enabledSteps.length}
                            </div>
                        </div>

                        <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/10">
                            <motion.div
                                className="h-full rounded-full bg-black"
                                initial={{ width: '0%' }}
                                animate={{ width: `${((stepIndex + 1) / enabledSteps.length) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-4">
                            {enabledSteps.map((step, index) => (
                                <div
                                    key={step.id}
                                    className={`rounded-[1.5rem] border px-4 py-4 transition ${stepIndex === index
                                        ? 'border-black bg-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]'
                                        : stepIndex > index
                                            ? 'border-black/10 bg-[#f8f4ed] text-gray-800'
                                            : 'border-black/10 bg-[#fbf8f3] text-gray-500'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${stepIndex === index ? 'bg-white text-black' : 'bg-white text-gray-600'}`}>
                                            {step.icon}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-60">Stage {index + 1}</p>
                                            <p className="mt-1 text-sm font-semibold">{step.label}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 mx-auto max-w-[1320px] w-full p-4 md:p-6 pb-24">
                {securityNotice && (
                    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-900">
                        {securityNotice}
                    </div>
                )}

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
                            onSecurityReset={handleSecurityResetToResume}
                            onComplete={(score) => {
                                setAssessmentScore(score);
                                handleNext();
                            }}
                        />
                    )}

                    {currentStep?.id === 'candidate-deck' && (
                        <CandidateDeck
                            key="candidate-deck"
                            job={job}
                            user={user}
                            onComplete={(url) => {
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
                            onSecurityReset={handleSecurityResetToResume}
                            onComplete={(result) => {
                                setInterviewResult(result);
                                navigate('/seeker/applications');
                            }}
                        />
                    )}

                    {!currentStep && (
                        <div className="text-center py-20">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">No steps enabled for this job</h2>
                            <button onClick={() => navigate('/seeker/jobs')} className="px-6 py-2 bg-blue-600 text-white rounded-xl">Back to Jobs</button>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ApplicationFlow;
