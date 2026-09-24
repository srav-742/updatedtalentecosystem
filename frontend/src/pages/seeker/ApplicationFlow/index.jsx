import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle, Video, ChevronRight, Brain, Code2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL, getAuthHeaders } from '../../../firebase';

// ─── Direct Component Imports ────────────────────────────────────────────────
// Statically imported so transitions between steps are instantaneous and never
// suffer from React Suspense chunk delays or blank-screen deadlocks.
import ResumeAnalyzer from './ResumeAnalyzer';
import SkillAssessment from './SkillAssessment';
import CodingAssessment from './CodingAssessment';
import AIInterview from './InterviewWrapper';
import CandidateDeck from './CandidateDeck';
import GlobalProctoringToasts from '../../../components/exam/GlobalProctoringToasts';

// ─── Step-Level Error Boundary ───────────────────────────────────────────────
// Catches any rendering or runtime errors within individual steps, displaying
// a friendly recovery card rather than crashing into a blank white screen.
class StepErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[StepErrorBoundary] Uncaught step error:', this.props.stepId, error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="mx-auto max-w-xl p-8 rounded-[2.5rem] border border-black/10 bg-white shadow-2xl text-center my-12">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Step Loading Notice</h3>
                    <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                        An error occurred while loading this stage ({this.props.stepId || 'assessment'}).
                    </p>
                    <div className="flex items-center justify-center flex-wrap gap-3">
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="px-6 py-3 rounded-2xl bg-teal-600 text-white hover:bg-teal-700 transition font-bold text-sm"
                        >
                            Retry Step
                        </button>
                        {this.props.onSkip && (
                            <button
                                onClick={this.props.onSkip}
                                className="px-6 py-3 rounded-2xl bg-black text-white hover:bg-gray-800 transition font-bold text-sm"
                            >
                                Continue Next
                            </button>
                        )}
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const ApplicationFlow = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const requestedStep = searchParams.get('step') || searchParams.get('retest');
    const [stepIndex, setStepIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState(null);
    const [user, setUser] = useState(null);

    // Shared State
    const [resumeData, setResumeData] = useState(null);
    const [assessmentScore, setAssessmentScore] = useState(null);
    const [codingScore, setCodingScore] = useState(null);
    const [interviewResult, setInterviewResult] = useState(null);
    const [securityNotice, setSecurityNotice] = useState(null);

    // Shared continuous recording state (between Skill Assessment and AI Interview)
    const [sharedStream, setSharedStream] = useState(null);
    const [sharedRecorder, setSharedRecorder] = useState(null);
    const [sharedSessionId, setSharedSessionId] = useState(null);
    const [sharedRecordingSessionId, setSharedRecordingSessionId] = useState(null);
    const [firstQuestionData, setFirstQuestionData] = useState(null);
    const sharedChunkIndexRef = useRef(0);
    const sharedChunkUploadsRef = useRef([]);

    // Stop streams on unmount
    useEffect(() => {
        return () => {
            if (sharedStream) {
                try {
                    sharedStream.getTracks().forEach((t) => t.stop());
                } catch (e) {}
            }
        };
    }, [sharedStream]);

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

                // Define enabled steps sequence: Resume -> Candidate Video Deck -> Skill Assessment -> Coding Assessment -> AI Interview
                const currentEnabledSteps = [
                    { id: 'resume', enabled: jobData?.resumeAnalysis?.enabled !== false },
                    { id: 'candidate-deck', enabled: !!jobData?.mockInterview?.enabled },
                    { id: 'assessment', enabled: !!jobData?.assessment?.enabled },
                    { id: 'coding', enabled: !!jobData?.codingAssessment?.enabled },
                    { id: 'interview', enabled: !!jobData?.mockInterview?.enabled },
                ].filter(s => s.enabled);

                const enabledIds = currentEnabledSteps.map(s => s.id);

                // Check for existing application to resume candidate state
                try {
                    const candidateUserId = storedUser.uid || storedUser._id || storedUser.id;
                    const appsRes = await axios.get(`${API_URL}/applications/candidate/${candidateUserId}`);
                    const existingApp = (Array.isArray(appsRes.data) ? appsRes.data : appsRes.data?.applications || []).find(app => {
                        const appJobId = app?.jobId?._id || app?.jobId;
                        return appJobId && String(appJobId) === String(jobId);
                    });

                    if (requestedStep && enabledIds.includes(requestedStep)) {
                        setStepIndex(enabledIds.indexOf(requestedStep));
                        if (existingApp) {
                            if (existingApp.resumeMatchPercent) setResumeData({ matchPercentage: existingApp.resumeMatchPercent });
                            if (existingApp.assessmentScore) setAssessmentScore(existingApp.assessmentScore);
                            if (existingApp.codingScore) setCodingScore(existingApp.codingScore);
                        }
                    } else if (existingApp) {
                        if (existingApp.resumeMatchPercent) setResumeData({ matchPercentage: existingApp.resumeMatchPercent });
                        if (existingApp.assessmentScore) setAssessmentScore(existingApp.assessmentScore);
                        if (existingApp.codingScore) setCodingScore(existingApp.codingScore);

                        // Determine the next pending step based on the sequence
                        const resumeDone = !enabledIds.includes('resume') || (existingApp.resumeMatchPercent !== null && existingApp.resumeMatchPercent !== undefined);
                        const interviewDone = !enabledIds.includes('interview') || (existingApp.interviewScore !== null && existingApp.interviewScore !== undefined);
                        const videoDone = !enabledIds.includes('candidate-deck') || !!existingApp.videoIntroUrl || interviewDone;
                        const assessmentDone = !enabledIds.includes('assessment') || (existingApp.assessmentScore !== null && existingApp.assessmentScore !== undefined);
                        const codingDone = !enabledIds.includes('coding') || (existingApp.codingScore !== null && existingApp.codingScore !== undefined);

                        let targetIndex = 0;
                        if (resumeDone && !videoDone && enabledIds.includes('candidate-deck')) {
                            targetIndex = enabledIds.indexOf('candidate-deck');
                        } else if (resumeDone && videoDone && !assessmentDone && enabledIds.includes('assessment')) {
                            targetIndex = enabledIds.indexOf('assessment');
                        } else if (resumeDone && videoDone && assessmentDone && !codingDone && enabledIds.includes('coding')) {
                            targetIndex = enabledIds.indexOf('coding');
                        } else if (resumeDone && videoDone && assessmentDone && codingDone && !interviewDone && enabledIds.includes('interview')) {
                            targetIndex = enabledIds.indexOf('interview');
                        } else if ((resumeDone && videoDone && assessmentDone && codingDone && interviewDone) || (interviewDone && resumeDone)) {
                            queryClient.invalidateQueries({ queryKey: ['applications'] });
                            navigate('/candidate/applications');
                            return;
                        }

                        if (targetIndex >= 0 && targetIndex < currentEnabledSteps.length) {
                            setStepIndex(targetIndex);
                        } else {
                            setStepIndex(0);
                        }
                    }
                } catch (e) {
                    // No existing application found or minor network notice - continue normally
                    if (requestedStep && enabledIds.includes(requestedStep)) {
                        setStepIndex(enabledIds.indexOf(requestedStep));
                    }
                }
            } catch (error) {
                console.error("Error fetching application workflow data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [jobId, navigate, requestedStep]);

    // Computed enabled steps with memoization
    const enabledSteps = useMemo(() => {
        if (!job) return [];
        return [
            { id: 'resume', label: 'Resume Analysis', icon: <FileText className="w-4 h-4" />, enabled: job?.resumeAnalysis?.enabled !== false },
            { id: 'candidate-deck', label: 'Candidate Deck', icon: <Video className="w-4 h-4" />, enabled: !!job?.mockInterview?.enabled },
            { id: 'assessment', label: 'Skill Assessment', icon: <Brain className="w-4 h-4" />, enabled: !!job?.assessment?.enabled },
            { id: 'coding', label: 'Coding Assessment', icon: <Code2 className="w-4 h-4" />, enabled: !!job?.codingAssessment?.enabled },
            { id: 'interview', label: 'AI Interview', icon: <CheckCircle className="w-4 h-4" />, enabled: !!job?.mockInterview?.enabled },
        ].filter(s => s.enabled);
    }, [job]);

    // Safe clamped index guaranteeing currentStep is never undefined when steps exist
    const safeStepIndex = Math.max(0, Math.min(stepIndex, Math.max(0, enabledSteps.length - 1)));
    const currentStep = enabledSteps[safeStepIndex];

    const handleNext = () => {
        setSecurityNotice(null);
        setStepIndex(prev => {
            if (prev < enabledSteps.length - 1) {
                return prev + 1;
            } else {
                queryClient.invalidateQueries({ queryKey: ['applications'] });
                navigate('/candidate/applications');
                return prev;
            }
        });
    };

    const handleBack = () => {
        setStepIndex(prev => Math.max(prev - 1, 0));
    };

    const handleSecurityResetToResume = async ({ stage, reason, violation }) => {
        // Clean up continuous recording if active
        if (sharedStream) {
            try {
                sharedStream.getTracks().forEach((t) => t.stop());
            } catch (e) {}
            setSharedStream(null);
        }
        setSharedRecorder(null);
        setSharedSessionId(null);
        setSharedRecordingSessionId(null);
        setFirstQuestionData(null);
        sharedChunkIndexRef.current = 0;
        sharedChunkUploadsRef.current = [];

        try {
            await axios.post(`${API_URL}/applications/proctoring-reset`, {
                jobId: job?._id || job?.id,
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
        setCodingScore(null);
        setInterviewResult(null);
        setSecurityNotice(
            'Security policy triggered. Restart from Resume Analysis to continue this application.'
        );

        const resumeStepIndex = enabledSteps.findIndex((step) => step.id === 'resume');
        setStepIndex(resumeStepIndex >= 0 ? resumeStepIndex : 0);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fbf8f3]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Loading application workflow...</p>
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fbf8f3]">
                <div className="text-center p-8 bg-white rounded-3xl border border-black/10 shadow-lg max-w-md">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Job Not Found</h2>
                    <p className="text-sm text-gray-500 mb-6">The requested position could not be loaded or is no longer active.</p>
                    <button onClick={() => navigate('/candidate/jobs')} className="px-6 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition">
                        Browse Other Jobs
                    </button>
                </div>
            </div>
        );
    }

    const renderCurrentStep = () => {
        if (!currentStep) {
            return (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border border-black/10 p-8 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No Steps Configured</h2>
                    <p className="text-sm text-gray-500 mb-6">There are no evaluation stages enabled for this job position.</p>
                    <button onClick={() => navigate('/candidate/jobs')} className="px-6 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition">
                        Back to Jobs
                    </button>
                </div>
            );
        }

        switch (currentStep.id) {
            case 'resume':
                return (
                    <ResumeAnalyzer
                        key="resume"
                        job={job}
                        user={user}
                        onComplete={(data) => {
                            setResumeData(data);
                            handleNext();
                        }}
                    />
                );

            case 'candidate-deck':
                return (
                    <CandidateDeck
                        key="candidate-deck"
                        job={job}
                        user={user}
                        onComplete={(url) => {
                            handleNext();
                        }}
                    />
                );

            case 'assessment':
                return (
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
                        sharedStream={sharedStream}
                        setSharedStream={setSharedStream}
                        sharedRecorder={sharedRecorder}
                        setSharedRecorder={setSharedRecorder}
                        sharedSessionId={sharedSessionId}
                        setSharedSessionId={setSharedSessionId}
                        sharedRecordingSessionId={sharedRecordingSessionId}
                        setSharedRecordingSessionId={setSharedRecordingSessionId}
                        firstQuestionData={firstQuestionData}
                        setFirstQuestionData={setFirstQuestionData}
                        sharedChunkIndexRef={sharedChunkIndexRef}
                        sharedChunkUploadsRef={sharedChunkUploadsRef}
                    />
                );

            case 'coding':
                return (
                    <CodingAssessment
                        key="coding"
                        job={job}
                        user={user}
                        onBack={handleBack}
                        onSecurityReset={handleSecurityResetToResume}
                        onComplete={(score) => {
                            setCodingScore(score);
                            handleNext();
                        }}
                        sharedStream={sharedStream}
                        setSharedStream={setSharedStream}
                        sharedRecorder={sharedRecorder}
                        setSharedRecorder={setSharedRecorder}
                        sharedSessionId={sharedSessionId}
                        setSharedSessionId={setSharedSessionId}
                        sharedRecordingSessionId={sharedRecordingSessionId}
                        setSharedRecordingSessionId={setSharedRecordingSessionId}
                        firstQuestionData={firstQuestionData}
                        setFirstQuestionData={setFirstQuestionData}
                        sharedChunkIndexRef={sharedChunkIndexRef}
                        sharedChunkUploadsRef={sharedChunkUploadsRef}
                    />
                );

            case 'interview':
                return (
                    <AIInterview
                        key="interview"
                        job={job}
                        user={user}
                        resumeData={resumeData}
                        assessmentScore={assessmentScore}
                        onSecurityReset={handleSecurityResetToResume}
                        onComplete={async (result) => {
                            setInterviewResult(result);
                            try {
                                const headers = await getAuthHeaders();
                                await axios.post(
                                    `${API_URL}/applications`,
                                    {
                                        jobId: job._id,
                                        userId: user.uid || user._id || user.id,
                                        interviewScore: result?.interviewScore ?? 0,
                                        status: 'APPLIED'
                                    },
                                    { headers }
                                );
                            } catch (e) {
                                console.error("Could not sync final application status:", e);
                            }
                            queryClient.invalidateQueries({ queryKey: ['applications'] });
                            navigate('/candidate/applications');
                        }}
                        sharedStream={sharedStream}
                        setSharedStream={setSharedStream}
                        sharedRecorder={sharedRecorder}
                        setSharedRecorder={setSharedRecorder}
                        sharedSessionId={sharedSessionId}
                        setSharedSessionId={setSharedSessionId}
                        sharedRecordingSessionId={sharedRecordingSessionId}
                        setSharedRecordingSessionId={setSharedRecordingSessionId}
                        firstQuestionData={firstQuestionData}
                        setFirstQuestionData={setFirstQuestionData}
                        sharedChunkIndexRef={sharedChunkIndexRef}
                        sharedChunkUploadsRef={sharedChunkUploadsRef}
                    />
                );

            default:
                return (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border border-black/10 p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Stage Not Recognized</h2>
                        <button onClick={handleNext} className="px-6 py-2.5 bg-black text-white text-sm font-bold rounded-xl">
                            Continue to Next Stage
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-[#fbf8f3] flex flex-col">
            <GlobalProctoringToasts />
            <div className="sticky top-0 z-40 border-b border-black/10 bg-[#fcfbf8]/95 backdrop-blur-md">
                <div className="mx-auto max-w-[1320px] px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">Candidate workflow</p>
                        <h1 className="mt-1 text-lg font-semibold tracking-tight text-gray-900">Application for {job?.title || 'Job Opening'}</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        {enabledSteps.map((step, index) => (
                            <React.Fragment key={step.id}>
                                {index > 0 && <ChevronRight size={14} className="text-gray-300 hidden sm:inline" />}
                                <div className="flex items-center gap-2">
                                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                                        safeStepIndex === index
                                            ? 'bg-black text-white shadow-md'
                                            : safeStepIndex > index
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        {safeStepIndex > index ? <CheckCircle className="w-3 h-3 text-emerald-700" /> : index + 1}
                                    </div>
                                    <span className={`text-xs font-semibold transition-all ${
                                        safeStepIndex === index
                                            ? 'text-gray-900'
                                            : 'text-gray-400'
                                    }`}>
                                        {step.label}
                                    </span>
                                </div>
                            </React.Fragment>
                        ))}
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
                    <motion.div
                        key={currentStep?.id || 'empty-stage'}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                    >
                        <StepErrorBoundary stepId={currentStep?.id} onSkip={handleNext}>
                            {renderCurrentStep()}
                        </StepErrorBoundary>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ApplicationFlow;
