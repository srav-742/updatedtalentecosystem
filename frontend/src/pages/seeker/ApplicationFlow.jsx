import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FileUp, Sparkles, CheckCircle2, XCircle, Wand2, Loader2, BrainCircuit, FileText, Upload, Plus, Trash2, GraduationCap, Briefcase, Code, BookOpen, Users, Mic, Video, Volume2 } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://127.0.0.1:5000";

const ApplicationFlow = () => {
    const { jobId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);

    // params
    const method = searchParams.get('method') || 'upload'; // 'upload' or 'create'

    const [step, setStep] = useState(1);
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState({
        matchPercentage: 0,
        matchedSkills: [],
        missingSkills: [],
        explanation: '',
        assessmentScore: 0,
        interviewScore: 0
    });

    // Interview State
    const [interviewQuestions, setInterviewQuestions] = useState([]);
    const [interviewAnswers, setInterviewAnswers] = useState({});
    const [interviewActive, setInterviewActive] = useState(false);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [currentAssessmentIdx, setCurrentAssessmentIdx] = useState(0);
    const [qAnalysis, setQAnalysis] = useState(null); // { isMatch, feedback, score }
    const [analyzingAnswer, setAnalyzingAnswer] = useState(false);

    // Upload state
    const [selectedFile, setSelectedFile] = useState(null);

    // Create state
    const [createData, setCreateData] = useState({
        skills: '',
        education: '',
        experience: '',
        projects: ''
    });

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(s);
            if (videoRef.current) {
                videoRef.current.srcObject = s;
            }
        } catch (err) {
            console.error("Camera access error:", err);
            alert("Camera and Microphone access is required for the AI Interview to function correctly.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const speakQuestion = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
            utterance.volume = 1;
            window.speechSynthesis.speak(utterance);
        }
    };

    useEffect(() => {
        if (interviewActive && interviewQuestions.length > 0) {
            speakQuestion(interviewQuestions[currentQuestionIdx]);
        }
    }, [currentQuestionIdx, interviewActive, interviewQuestions]);

    useEffect(() => {
        return () => stopCamera();
    }, []);

    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript;
                setInterviewAnswers(prev => ({
                    ...prev,
                    [currentQuestionIdx]: (prev[currentQuestionIdx] || '') + ' ' + transcript
                }));
            };

            recognitionRef.current.onend = () => setIsListening(false);
        }
    }, [currentQuestionIdx]);

    const toggleListening = () => {
        if (!recognitionRef.current) return alert("Speech recognition not supported in this browser.");
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/jobs`);
                const found = res.data.find(j => j._id === jobId);
                setJob(found);
            } catch (error) { console.error(error); }
        };
        fetchJob();
    }, [jobId]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
        } else {
            alert("Please upload a valid PDF file.");
        }
    };

    const handleAnalyze = async () => {
        setStep(2);
        try {
            let resumeText = '';

            if (method === 'upload') {
                if (!selectedFile) {
                    alert("Please select a file first.");
                    setStep(1);
                    return;
                }
                // Extract text from PDF
                const formData = new FormData();
                formData.append('resume', selectedFile);
                const extractRes = await axios.post(`${API_BASE_URL}/api/extract-pdf`, formData);
                resumeText = extractRes.data.text;
            } else {
                // Combine create data
                resumeText = `
                    Skills: ${createData.skills}
                    Education: ${createData.education}
                    Experience: ${createData.experience}
                    Projects: ${createData.projects}
                `;
            }

            // Analyze with Gemini
            const res = await axios.post(`${API_BASE_URL}/api/analyze-resume`, {
                resumeText,
                jobSkills: job.skills,
                userId: user.uid || user._id || user.id
            });
            setAnalysis(res.data);

            // Immediate Popup for Missing Skills
            if (res.data.missingSkills && res.data.missingSkills.length > 0) {
                let msg = `Analysis Complete: ${res.data.matchPercentage}% Match.\n\nMissing Skills Detected:`;
                if (res.data.missingSkillsDetails && res.data.missingSkillsDetails.length > 0) {
                    msg += '\n' + res.data.missingSkillsDetails.map(d => `- ${d.skill}: ${d.message}`).join('\n');
                } else {
                    msg += '\n- ' + res.data.missingSkills.join('\n- ');
                }
                alert(msg);
            } else {
                alert(`Analysis Complete: ${res.data.matchPercentage}% Match.\n\nGreat job! Your profile matches all key requirements.`);
            }

            // Save application
            await axios.post(`${API_BASE_URL}/api/applications`, {
                jobId,
                userId: user._id || user.id,
                resumeMatchPercent: res.data.matchPercentage,
                matchedSkills: res.data.matchedSkills,
                missingSkills: res.data.missingSkills,
                status: 'APPLIED'
            });

            setStep(3);
        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.message || error.response?.data?.details || "Analysis failed. Please try again.";
            alert(`Error: ${errorMsg}`);
            setStep(1);
        }
    };

    const renderResumeStep = () => {
        if (method === 'upload') {
            return (
                <div className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Upload Resume</h2>
                        <p className="text-gray-500 font-medium">Select your professional PDF file for AI auditing.</p>
                    </div>

                    <div
                        onClick={() => fileInputRef.current.click()}
                        className={`p-16 rounded-[3rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-6 group
                            ${selectedFile ? 'bg-teal-500/5 border-teal-500/50' : 'bg-white/[0.02] border-white/10 hover:border-teal-500/30 hover:bg-white/[0.04]'}
                        `}
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${selectedFile ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'bg-white/5 text-gray-500 group-hover:text-teal-400'}`}>
                            {selectedFile ? <CheckCircle2 size={40} /> : <Upload size={40} />}
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-black uppercase tracking-tight">
                                {selectedFile ? selectedFile.name : 'Click to Browse Files'}
                            </p>
                            <p className="text-xs text-gray-500 mt-2 font-black uppercase tracking-widest">
                                {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Limit 5MB • PDF Only'}
                            </p>
                        </div>
                    </div>

                    <button
                        disabled={!selectedFile}
                        onClick={handleAnalyze}
                        className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-xl
                            ${selectedFile ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-teal-500/20' : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'}
                        `}
                    >
                        <BrainCircuit size={18} /> Analyze Selected Resume
                    </button>

                    <div className="text-center">
                        <button
                            onClick={() => navigate(`/seeker/apply/${jobId}?method=create`)}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-teal-400 transition-colors"
                        >
                            Don't have a resume? Create one instead
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Create Digital Resume</h2>
                    <p className="text-gray-500 font-medium">Build your profile ledger to match with {job?.title}.</p>
                </div>

                <div className="p-8 rounded-[3rem] bg-white/[0.03] border border-white/5 shadow-2xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-400 ml-2">
                                <Code size={14} /> Technical Skills
                            </label>
                            <textarea
                                value={createData.skills}
                                onChange={(e) => setCreateData({ ...createData, skills: e.target.value })}
                                placeholder="e.g. React, Node.js, Solidity, AWS..."
                                className="w-full h-32 p-5 bg-[#0a0c12] border border-white/5 rounded-2xl text-xs leading-relaxed text-gray-300 outline-none focus:border-teal-500/30 transition-all resize-none font-medium"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-400 ml-2">
                                <GraduationCap size={14} /> Education History
                            </label>
                            <textarea
                                value={createData.education}
                                onChange={(e) => setCreateData({ ...createData, education: e.target.value })}
                                placeholder="Degree, University, Graduation Year..."
                                className="w-full h-32 p-5 bg-[#0a0c12] border border-white/5 rounded-2xl text-xs leading-relaxed text-gray-300 outline-none focus:border-teal-500/30 transition-all resize-none font-medium"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-400 ml-2">
                                <Briefcase size={14} /> Work Experience
                            </label>
                            <textarea
                                value={createData.experience}
                                onChange={(e) => setCreateData({ ...createData, experience: e.target.value })}
                                placeholder="Role, Company, Years, Achievements..."
                                className="w-full h-32 p-5 bg-[#0a0c12] border border-white/5 rounded-2xl text-xs leading-relaxed text-gray-300 outline-none focus:border-teal-500/30 transition-all resize-none font-medium"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-400 ml-2">
                                <BookOpen size={14} /> Projects & Labs
                            </label>
                            <textarea
                                value={createData.projects}
                                onChange={(e) => setCreateData({ ...createData, projects: e.target.value })}
                                placeholder="Hackathons, Side Projects, Web3 Contributions..."
                                className="w-full h-32 p-5 bg-[#0a0c12] border border-white/5 rounded-2xl text-xs leading-relaxed text-gray-300 outline-none focus:border-teal-500/30 transition-all resize-none font-medium"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleAnalyze}
                        className="w-full mt-4 py-5 rounded-[2rem] bg-teal-500 text-white font-black uppercase tracking-widest text-xs hover:bg-teal-600 transition-all shadow-xl shadow-teal-500/20 flex items-center justify-center gap-3"
                    >
                        <Wand2 size={18} /> Generate & Analyze Profile
                    </button>
                </div>

                <div className="text-center">
                    <button
                        onClick={() => navigate(`/seeker/apply/${jobId}?method=upload`)}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-teal-400 transition-colors"
                    >
                        Already have a PDF? Upload instead
                    </button>
                </div>
            </div>
        );
    };

    // Assessment State
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({}); // { questionIndex: optionIndex }
    const [assessmentStarted, setAssessmentStarted] = useState(false);

    const startAssessment = async () => {
        setLoading(true);
        try {
            console.log("[FLOW] Initiating expert unified assessment generation...");
            const res = await axios.post(`${API_BASE_URL}/api/generate-full-assessment`, {
                jobTitle: job.title,
                jobSkills: job.skills,
                candidateSkills: analysis.matchedSkills,
                experienceLevel: (job.minExperience > 5) ? 'Senior' : (job.minExperience > 2 ? 'Mid-Level' : 'Junior'),
                assessmentType: job.assessment?.type || 'MCQ',
                totalQuestions: job.assessment?.totalQuestions || 10,
                userId: user.uid || user._id || user.id
            });

            if (res.data) {
                // Combine MCQs and Coding into the main questions array for Page 4
                const allAssessmentQs = [
                    ...(res.data.mcq || []),
                    ...(res.data.coding || [])
                ];

                setQuestions(allAssessmentQs);

                // Store interview questions for Page 5
                const formattedInterview = (res.data.interview || []).map(q =>
                    typeof q === 'string' ? q : `${q.question} (Follow-up: ${q.followUp})`
                );
                setInterviewQuestions(formattedInterview);

                setAssessmentStarted(true);
                setCurrentAssessmentIdx(0);
                setAnswers({});
            } else {
                throw new Error("Invalid assessment structure received");
            }
        } catch (error) {
            console.error("Expert Assessment Failure:", error);

            // Professional Multi-Question Fallback
            const fallbackSkills = job.skills.length > 0 ? job.skills : ['Technical Strategy'];
            const templates = [
                (s) => `In a production ${s} environment, which protocol ensures maximum reliability and scalability?`,
                (s) => `What is the most critical security risk to consider when deploying a ${s} application?`,
                (s) => `Which of these is considered a best practice for ${s} code maintainability?`,
                (s) => `How should large-scale data migrations be handled in a ${s}-heavy architecture?`,
                (s) => `Identify the optimal design pattern for high-concurrency modules using ${s}.`
            ];

            const fallbackQs = Array.from({ length: job.assessment?.totalQuestions || 5 }, (_, i) => {
                const skill = fallbackSkills[i % fallbackSkills.length];
                const template = templates[i % templates.length];
                return {
                    title: `${skill} Advanced Assessment`,
                    question: template(skill),
                    options: ["Modular Encapsulation", "State Hydration", "Distributed Load Balancing", "System Default Optimization"],
                    correctAnswer: 2,
                    explanation: "Following distributed standards ensures high availability."
                };
            });

            setQuestions(fallbackQs);
            setInterviewQuestions([
                `Describe your approach to building highly scalable systems using ${fallbackSkills[0]}.`,
                "How do you prioritize security in your development lifecycle?"
            ]);
            setAssessmentStarted(true);
        } finally { setLoading(false); }
    };

    const handleAnswerSelect = (qIdx, oIdx) => {
        setAnswers({ ...answers, [qIdx]: oIdx });
    };

    const startInterview = async () => {
        // Ensure we have a robust set of questions (at least 4)
        if (interviewQuestions.length >= 4) {
            setStep(5);
            return;
        }

        console.log("[FLOW] Insufficient cached questions. Fetching fresh interview set...");

        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/generate-interview-questions`, {
                skills: analysis?.matchedSkills || job.skills,
                jobTitle: job.title,
                userId: user.uid || user._id || user.id // For seeding
            });
            setInterviewQuestions(res.data);
            setStep(5);
        } catch (error) {
            console.error("Interview Resume Fallback Error:", error);
            setStep(6);
        } finally { setLoading(false); }
    };

    const submitAssessment = async () => {
        setLoading(true);
        console.log("Submitting assessment. Context:", { jobId, userId: user?._id || user?.id, analysis, answers });
        try {
            const userId = user.uid || user._id || user.id;
            if (!jobId || !userId) {
                console.error("Missing context:", { jobId, userId, user });
                throw new Error("Missing Application Context (Job or User ID). Please ensure you are logged in.");
            }

            let correctCount = 0;
            const qs = questions.length > 0 ? questions : [];

            qs.forEach((q, i) => {
                const userAnswer = answers[i];
                if (q.options) {
                    // MCQ Scoring
                    if (userAnswer === q.correctAnswer) correctCount++;
                } else {
                    // Coding Scoring (Checking for presence of meaningful code)
                    if (typeof userAnswer === 'string' && userAnswer.trim().length > 20) {
                        correctCount++;
                    }
                }
            });

            const score = Math.round((correctCount / (qs.length || 1)) * 100);
            console.log("Calculated Combined Score:", score);

            // Sync analysis state and proceed
            const updatedAnalysis = { ...analysis, assessmentScore: score };
            setAnalysis(updatedAnalysis);

            if (job?.mockInterview?.enabled) {
                console.log("Flow: Redirecting to Interview Step...");
                await startInterview();
            } else {
                console.log("Flow: Finalizing directly...");
                const matchPct = updatedAnalysis.matchPercentage || 0;
                const final = Math.round((matchPct + score) / 2);

                const applicationData = {
                    jobId,
                    userId: user.uid || user._id || user.id,
                    applicantName: user.name,
                    applicantEmail: user.email,
                    applicantPic: user.profilePic,
                    resumeMatchPercent: matchPct,
                    assessmentScore: score,
                    status: final >= (job.minPercentage || 50) ? 'SHORTLISTED' : 'ELIGIBLE',
                    finalScore: final
                };

                await axios.post(`${API_BASE_URL}/api/applications`, applicationData);
                setStep(6);
            }
        } catch (error) {
            console.error('Submission Error Details:', error);
            alert('CRITICAL: Assessment submission failed. ' + (error.response?.data?.message || error.message));
        } finally { setLoading(false); }
    };

    const handleInterviewSubmit = async () => {
        setLoading(true);
        try {
            stopCamera();
            const res = await axios.post(`${API_BASE_URL}/api/analyze-interview`, {
                answers: interviewAnswers,
                skills: job.skills,
                userId: user.uid || user._id || user.id
            });

            setAnalysis(prev => ({ ...prev, interviewScore: res.data.interviewScore }));

            const final = Math.round((analysis.matchPercentage + (analysis.assessmentScore || 0) + res.data.interviewScore) / 3);

            await axios.post(`${API_BASE_URL}/api/applications`, {
                jobId,
                userId: user.uid || user._id || user.id,
                applicantName: user.name,
                applicantEmail: user.email,
                applicantPic: user.profilePic,
                resumeMatchPercent: analysis.matchPercentage,
                assessmentScore: analysis.assessmentScore,
                interviewScore: res.data.interviewScore,
                status: final >= (job.minPercentage || 50) ? 'SHORTLISTED' : 'ELIGIBLE',
                finalScore: final
            });
            setStep(6);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    return (
        <div className="max-w-5xl mx-auto py-10 px-4">
            {/* Progress Bar */}
            <div className="flex items-center justify-between mb-16 px-4">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                    <div key={s} className={`flex flex-col items-center relative flex-1 ${(!job?.mockInterview?.enabled && s === 5) ? 'hidden' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500 z-10 ${step >= s ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'bg-white/5 text-gray-600 border border-white/5'}`}>
                            {step > s ? <CheckCircle2 size={16} /> : s}
                        </div>
                        {s < 6 && (
                            <div className="absolute top-4 left-1/2 w-full h-[2px] bg-white/5 -z-0">
                                <div className={`h-full bg-teal-500 transition-all duration-500 ${step > s ? 'w-full' : 'w-0'}`} />
                            </div>
                        )}
                        <span className={`text-[8px] uppercase font-black tracking-widest mt-3 transition-colors ${step >= s ? 'text-teal-400' : 'text-gray-600'}`}>
                            {s === 1 ? 'Resume' : s === 2 ? 'Analysis' : s === 3 ? 'Eligible' : s === 4 ? 'Assessment' : s === 5 ? 'Interview' : 'Final'}
                        </span>
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div key="1" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                        {renderResumeStep()}
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div key="2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center space-y-8">
                        <div className="relative w-32 h-32 mx-auto">
                            <div className="absolute inset-0 border-4 border-teal-500/20 rounded-full" />
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="absolute inset-0 border-4 border-transparent border-t-teal-500 rounded-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles size={40} className="text-teal-400" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Analyzing Your Ledger...</h2>
                            <p className="text-gray-500 font-medium">Running AI match against {job?.skills.length} target skills.</p>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div key="3" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                        <div className={`relative p-12 rounded-[4rem] border transition-all duration-700 overflow-hidden ${analysis?.matchPercentage >= (job?.minPercentage || 50) ? 'bg-teal-500/5 border-teal-500/20 shadow-2xl shadow-teal-500/10' : 'bg-red-500/5 border-red-500/20 shadow-2xl shadow-red-500/10'}`}>
                            {/* Decorative background glow */}
                            <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-20 ${analysis?.matchPercentage >= (job?.minPercentage || 50) ? 'bg-teal-500' : 'bg-red-500'}`} />

                            <div className="relative z-10 text-center space-y-10">
                                {analysis?.matchPercentage >= (job?.minPercentage || 50) ? (
                                    <>
                                        <div className="space-y-8">
                                            <div className="flex flex-col items-center justify-center relative">
                                                {/* Circular Progress */}
                                                <div className="relative w-48 h-48 mb-6">
                                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                                                        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="15" fill="transparent" className="text-teal-900/20" />
                                                        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="15" fill="transparent"
                                                            strokeDasharray={2 * Math.PI * 80}
                                                            strokeDashoffset={2 * Math.PI * 80 - (analysis.matchPercentage / 100) * 2 * Math.PI * 80}
                                                            className="text-teal-500 transition-all duration-1000 ease-out"
                                                            strokeLinecap="round"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <CheckCircle2 size={32} className="text-teal-400 mb-2" />
                                                        <span className="text-5xl font-black text-white tracking-tighter">{analysis.matchPercentage}%</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-teal-500/80 mt-1">Match Success</span>
                                                    </div>
                                                </div>
                                                <h2 className="text-4xl font-black tracking-tight uppercase mb-4 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent italic">Protocol: ELIGIBLE</h2>
                                            </div>
                                            <p className="text-gray-400 font-medium max-w-xl mx-auto leading-relaxed text-lg italic">"{analysis.explanation}"</p>
                                        </div>

                                        {/* Missing Skills Warning Block */}
                                        {analysis.missingSkills && analysis.missingSkills.length > 0 && (
                                            <div className="max-w-lg mx-auto p-6 rounded-3xl bg-yellow-500/5 border border-yellow-500/10 text-left space-y-3">
                                                <div className="flex items-center gap-3 text-yellow-500">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest">Skill Gap Detected</h3>
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                                    The following required nodes were not explicitly found in your ledger:
                                                </p>
                                                {analysis.missingSkillsDetails && analysis.missingSkillsDetails.length > 0 ? (
                                                    <div className="space-y-2 w-full mt-2">
                                                        {analysis.missingSkillsDetails.map((item, i) => (
                                                            <div key={i} className="flex gap-3 items-start bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/10 text-left">
                                                                <div className="min-w-[4px] h-[4px] mt-1.5 rounded-full bg-yellow-500" />
                                                                <div className="flex-1">
                                                                    <div className="text-[10px] font-bold uppercase tracking-wide text-yellow-400 mb-0.5">{item.skill}</div>
                                                                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{item.message}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {analysis.missingSkills.map((skill, i) => (
                                                            <span key={i} className="px-3 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 text-[10px] font-bold uppercase tracking-wide">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setStep(4)}
                                            className="w-full mt-10 py-7 rounded-[2.5rem] bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black uppercase tracking-[0.3em] text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-3xl shadow-teal-500/20 border border-white/10"
                                        >
                                            Initiate Phase 02: Skill Verification
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-10 py-10">
                                        <div className="flex flex-col items-center justify-center relative">
                                            {/* Circular Progress */}
                                            <div className="relative w-48 h-48 mb-6">
                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                                                    <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="15" fill="transparent" className="text-red-900/20" />
                                                    <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="15" fill="transparent"
                                                        strokeDasharray={2 * Math.PI * 80}
                                                        strokeDashoffset={2 * Math.PI * 80 - (analysis.matchPercentage / 100) * 2 * Math.PI * 80}
                                                        className="text-red-500 transition-all duration-1000 ease-out"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <XCircle size={32} className="text-red-400 mb-2" />
                                                    <span className="text-5xl font-black text-white tracking-tighter">{analysis.matchPercentage}%</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/80 mt-1">Match Failed</span>
                                                </div>
                                            </div>
                                            <h2 className="text-4xl font-black tracking-tight uppercase mb-4 text-white">Entry Denied</h2>
                                        </div>
                                        <p className="text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">System requires a minimum of {job?.minPercentage || 50}% compatibility. Current profile ledger lacks critical skill nodes required for this position.</p>

                                        {/* Missing Skills Warning for Rejected State */}
                                        {analysis.missingSkills && analysis.missingSkills.length > 0 && (
                                            <div className="max-w-lg mx-auto p-6 rounded-3xl bg-red-500/5 border border-red-500/10 text-left space-y-3">
                                                <div className="flex items-center gap-3 text-red-500">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest">Critical Skill Gaps</h3>
                                                </div>
                                                {analysis.missingSkillsDetails && analysis.missingSkillsDetails.length > 0 ? (
                                                    <div className="space-y-2 w-full mt-2">
                                                        {analysis.missingSkillsDetails.map((item, i) => (
                                                            <div key={i} className="flex gap-3 items-start bg-red-500/10 p-3 rounded-xl border border-red-500/10 text-left">
                                                                <div className="min-w-[4px] h-[4px] mt-1.5 rounded-full bg-red-500" />
                                                                <div className="flex-1">
                                                                    <div className="text-[10px] font-bold uppercase tracking-wide text-red-400 mb-0.5">{item.skill}</div>
                                                                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{item.message}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {analysis.missingSkills.map((skill, i) => (
                                                            <span key={i} className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wide">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => navigate('/seeker/jobs')}
                                            className="px-12 py-5 rounded-[2rem] bg-white/5 border border-white/5 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 hover:text-white transition-all"
                                        >
                                            Return to Headquarters
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 4 && (
                    <motion.div key="4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                        {/* Header / Progress */}
                        <div className="flex items-center justify-between mb-8 px-4">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Technical Assessment</h2>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Job Core Verification</p>
                            </div>
                            <div className="flex items-center gap-3 overflow-x-auto max-w-md no-scrollbar py-2">
                                {questions.map((_, i) => (
                                    <div key={i} className={`h-1.5 min-w-[32px] rounded-full transition-all flex-shrink-0 ${i === currentAssessmentIdx ? 'bg-teal-500' : i < currentAssessmentIdx ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
                                ))}
                            </div>
                        </div>

                        {!assessmentStarted ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="max-w-md w-full p-10 rounded-[3rem] bg-white/[0.03] border border-white/5 text-center space-y-6">
                                    <div className="py-20 border-2 border-dashed border-white/10 rounded-[2rem] bg-black/20">
                                        <BrainCircuit size={48} className="text-teal-500 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold uppercase mb-2">Module Initialized</h3>
                                        <p className="text-gray-500 text-sm italic">5 Dynamic Challenges Prepared</p>
                                    </div>
                                    <button onClick={startAssessment} className="w-full py-5 rounded-[2rem] bg-teal-500 text-white font-black uppercase tracking-widest text-xs hover:bg-teal-600 transition-all shadow-xl shadow-teal-500/20">
                                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "Start Assessment"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden min-h-0">
                                {/* Left Side: Statement */}
                                <div className="lg:w-1/2 flex flex-col bg-[#0a0c12] border border-white/5 rounded-[2.5rem] overflow-hidden">
                                    <div className="flex border-b border-white/5 bg-white/[0.02]">
                                        <div className="px-8 py-4 border-b-2 border-teal-500 text-teal-500 text-[10px] font-black uppercase tracking-widest bg-teal-500/5">Statement</div>
                                        <div className="px-8 py-4 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:text-gray-300 cursor-not-allowed">AI Help</div>
                                    </div>
                                    <div className="flex-1 p-10 overflow-y-auto space-y-8 custom-scrollbar">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white mb-2">{questions[currentAssessmentIdx]?.title || questions[currentAssessmentIdx]?.question || "Technical Challenge"}</h3>
                                            <p className="text-gray-400 leading-relaxed font-medium">{questions[currentAssessmentIdx]?.problem || (questions[currentAssessmentIdx]?.title ? questions[currentAssessmentIdx]?.question : "") || "Select the most appropriate answer for this scenario:"}</p>
                                        </div>

                                        {(questions[currentAssessmentIdx]?.codeSnippet || questions[currentAssessmentIdx]?.starterCode) ? (
                                            <div className="relative group">
                                                <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/20 to-blue-500/20 rounded-3xl blur opacity-25" />
                                                <pre className="relative p-8 bg-black rounded-3xl border border-white/10 font-mono text-sm text-emerald-400 overflow-x-auto">
                                                    <code>{questions[currentAssessmentIdx].codeSnippet || questions[currentAssessmentIdx].starterCode}</code>
                                                </pre>
                                            </div>
                                        ) : !questions[currentAssessmentIdx]?.options && (
                                            <div className="p-10 border border-dashed border-white/10 rounded-3xl bg-white/5 flex flex-col items-center justify-center text-center">
                                                <Code className="text-gray-600 mb-2" size={32} />
                                                <p className="text-xs text-gray-500 uppercase tracking-widest font-black">No snippet available for this task</p>
                                            </div>
                                        )}

                                        {/* Optional Video-like hint area */}
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400"><Sparkles size={18} /></div>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Analyze the code structure carefully before selecting.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Interaction */}
                                <div className="lg:w-1/2 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
                                    <div className="p-10 bg-[#0a0c12] border border-white/5 rounded-[2.5rem] space-y-8">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                            {questions[currentAssessmentIdx]?.options ? "Pick the correct option:" : "Enter your solution code:"}
                                        </h4>
                                        <div className="space-y-4">
                                            {questions[currentAssessmentIdx]?.options ? (
                                                questions[currentAssessmentIdx].options.map((opt, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleAnswerSelect(currentAssessmentIdx, i)}
                                                        className={`w-full p-6 rounded-2xl text-left transition-all border flex items-center gap-6 group ${answers[currentAssessmentIdx] === i ? 'bg-teal-500 border-teal-400 shadow-lg shadow-teal-500/20' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black transition-all ${answers[currentAssessmentIdx] === i ? 'bg-white text-teal-600 border-white' : 'bg-white/5 border-white/10 text-gray-500 group-hover:text-white'}`}>{String.fromCharCode(65 + i)}</div>
                                                        <span className={`font-bold transition-colors ${answers[currentAssessmentIdx] === i ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                                            {typeof opt === 'object' ? (opt.text || opt.a || JSON.stringify(opt)) : opt}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <textarea
                                                    value={answers[currentAssessmentIdx] || ''}
                                                    onChange={(e) => handleAnswerSelect(currentAssessmentIdx, e.target.value)}
                                                    placeholder="// Type your code solution here..."
                                                    className="w-full h-64 p-6 bg-black/50 border border-white/10 rounded-2xl outline-none focus:border-teal-500/50 transition-all font-mono text-xs text-teal-400 resize-none"
                                                />
                                            )}
                                        </div>

                                        <div className="pt-6 border-t border-white/5">
                                            <details className="group cursor-pointer">
                                                <summary className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-open:rotate-180 transition-transform"><Plus size={14} /></div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">See Hint / Logic</span>
                                                </summary>
                                                <div className="mt-6 p-6 rounded-2xl bg-teal-500/5 border border-teal-500/10 text-xs text-teal-400/80 leading-relaxed italic">
                                                    Think about how variables are stored in memory and how operations are executed in a sequential thread.
                                                </div>
                                            </details>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Footer */}
                                <div className="flex items-center gap-4 mt-auto">
                                    <button
                                        onClick={() => {
                                            if (currentAssessmentIdx > 0) setCurrentAssessmentIdx(prev => prev - 1);
                                        }}
                                        disabled={currentAssessmentIdx === 0}
                                        className="px-10 py-5 rounded-[2rem] bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        Previous
                                    </button>

                                    {currentAssessmentIdx < questions.length - 1 ? (
                                        <button
                                            onClick={() => {
                                                if (!answers[currentAssessmentIdx] && answers[currentAssessmentIdx] !== 0) {
                                                    alert("Please provide an answer to continue.");
                                                    return;
                                                }
                                                setCurrentAssessmentIdx(prev => prev + 1);
                                            }}
                                            className="flex-1 py-5 rounded-[2rem] bg-teal-500 text-white font-black uppercase tracking-widest text-xs hover:bg-teal-600 transition-all shadow-xl shadow-teal-500/20"
                                        >
                                            Submit & Next
                                        </button>
                                    ) : (
                                        <button
                                            onClick={submitAssessment}
                                            className="flex-1 py-5 rounded-[2rem] bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black uppercase tracking-widest text-xs hover:shadow-emerald-500/30 transition-all shadow-xl shadow-emerald-500/10"
                                        >
                                            Finalize Result
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {step === 5 && (
                    <motion.div key="5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="text-center">
                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 text-purple-400">AI Video Interview</h2>
                            <p className="text-gray-500 font-medium">One-on-one professional verification with our AI Core.</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="aspect-video rounded-[3rem] bg-[#050505] border-4 border-white/5 relative overflow-hidden shadow-2xl">
                                    {/* Video Stream Element */}
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${interviewActive ? 'opacity-50' : 'opacity-0'}`}
                                    />

                                    {!interviewActive ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-500/5 backdrop-blur-sm">
                                            <div className="w-20 h-20 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 animate-pulse">
                                                <Users size={32} />
                                            </div>
                                            <p className="mt-4 font-black uppercase tracking-[0.3em] text-[10px] text-purple-400/80">Camera Initializing...</p>
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col justify-end">
                                            <div className="absolute top-6 left-6 flex items-center gap-3 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-md">
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Rec-Neural Link</span>
                                            </div>

                                            <div className="p-10 bg-gradient-to-t from-black via-black/80 to-transparent">
                                                <div className="space-y-4 max-w-2xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="px-3 py-1 rounded-lg bg-purple-500 text-[8px] font-black uppercase tracking-[0.2em] text-white">AI Core</div>
                                                        <div className="h-[1px] flex-1 bg-white/10" />
                                                    </div>
                                                    <p className="text-2xl font-black text-white leading-tight tracking-tight">
                                                        "{interviewQuestions[currentQuestionIdx]}"
                                                    </p>
                                                    <div className="flex items-center gap-4 text-purple-400">
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3, 4].map(i => <div key={i} className="w-1 h-3 bg-current rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />)}
                                                        </div>
                                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-50 text-white">Audio Synthesis Active</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {!interviewActive ? (
                                    <button
                                        onClick={() => {
                                            setInterviewActive(true);
                                            startCamera();
                                        }}
                                        className="w-full py-6 rounded-[3rem] bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black uppercase tracking-[0.2em] text-xs hover:shadow-purple-500/40 transition-all shadow-2xl active:scale-95 group"
                                    >
                                        <span className="group-hover:tracking-[0.3em] transition-all">Establish Neural Link</span>
                                    </button>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <textarea
                                                placeholder="Speak your answer or type it here..."
                                                value={interviewAnswers[currentQuestionIdx] || ''}
                                                onChange={(e) => setInterviewAnswers({ ...interviewAnswers, [currentQuestionIdx]: e.target.value })}
                                                disabled={!!qAnalysis}
                                                className={`w-full h-40 p-10 bg-[#050505] border rounded-[3rem] outline-none transition-all text-sm font-medium text-purple-100 shadow-2xl resize-none leading-relaxed ${qAnalysis ? (qAnalysis.isMatch ? 'border-teal-500/50 bg-teal-500/5' : 'border-red-500/50 bg-red-500/5') : 'border-white/5 focus:border-purple-500/30'}`}
                                            />
                                            {!qAnalysis && (
                                                <button
                                                    onClick={toggleListening}
                                                    className={`absolute right-6 bottom-6 w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20'}`}
                                                >
                                                    <Mic size={20} className={isListening ? 'scale-110' : ''} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Analysis Feedback Area */}
                                        {analyzingAnswer && (
                                            <div className="flex items-center gap-3 justify-center py-4 text-purple-400 animate-pulse">
                                                <BrainCircuit size={18} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">AI Analyzing Response...</span>
                                            </div>
                                        )}

                                        {qAnalysis && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-3xl border ${qAnalysis.isMatch ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                                <div className="flex items-start gap-3">
                                                    {qAnalysis.isMatch ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">{qAnalysis.isMatch ? 'Valid Response' : 'Needs Improvement'}</h4>
                                                        <p className="text-xs font-medium opacity-80 leading-relaxed">"{qAnalysis.feedback}"</p>
                                                    </div>
                                                    <div className="ml-auto text-xl font-black opacity-50">{qAnalysis.score}</div>
                                                </div>
                                            </motion.div>
                                        )}

                                        <div className="flex gap-4">
                                            {/* Submit Answer Button (Before Analysis) */}
                                            {!qAnalysis ? (
                                                <button
                                                    onClick={async () => {
                                                        const ans = interviewAnswers[currentQuestionIdx];
                                                        if (!ans || ans.trim().length < 2) return alert('Please provide an answer.');

                                                        setAnalyzingAnswer(true);
                                                        try {
                                                            const res = await axios.post('http://127.0.0.1:5000/api/validate-answer', {
                                                                question: interviewQuestions[currentQuestionIdx],
                                                                answer: ans,
                                                                jobTitle: job.title
                                                            });
                                                            setQAnalysis(res.data);
                                                        } catch (e) {
                                                            console.error(e);
                                                            alert("Analysis failed, assume validity.");
                                                            setQAnalysis({ isMatch: true, feedback: "Service check skipped.", score: 80 });
                                                        } finally {
                                                            setAnalyzingAnswer(false);
                                                        }
                                                    }}
                                                    disabled={analyzingAnswer}
                                                    className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-black uppercase tracking-widest text-[10px] border border-white/5 hover:bg-white/20 disabled:opacity-50"
                                                >
                                                    {analyzingAnswer ? 'Analyzing...' : 'Identify & Analyze'}
                                                </button>
                                            ) : (
                                                // Navigation Buttons (After Analysis)
                                                <>
                                                    {currentQuestionIdx < interviewQuestions.length - 1 ? (
                                                        <button onClick={() => {
                                                            setCurrentQuestionIdx(v => v + 1);
                                                            setQAnalysis(null);
                                                        }} className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-purple-500/20 hover:scale-[1.02] transition-all">
                                                            Next Challenge
                                                        </button>
                                                    ) : (
                                                        <button onClick={handleInterviewSubmit} className="flex-1 py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20">
                                                            Note Final Score
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 space-y-6 h-fit backdrop-blur-xl">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-white/10 pb-4">Audit Specs</h3>
                                <ul className="space-y-4">
                                    {['Sentimental Analysis', 'Skill Cross-Audit', 'Syntactic Evaluation', 'Latency Check'].map(p => (
                                        <li key={p} className="flex items-center gap-3 text-[10px] font-bold text-gray-500"><div className="w-1.5 h-1.5 rounded-full bg-purple-500/50 shadow-sm" /> {p}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 6 && (
                    <motion.div key="6" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 text-center">
                        <div className="p-16 rounded-[4rem] bg-gradient-to-br from-teal-500 to-emerald-600 text-white relative overflow-hidden shadow-3xl">
                            <div className="relative z-10 space-y-8">
                                <div className="w-24 h-24 rounded-full bg-white/20 mx-auto flex items-center justify-center border border-white/30 backdrop-blur-xl"><CheckCircle2 size={48} /></div>
                                <div><h2 className="text-6xl font-black uppercase tracking-tighter leading-none mb-4 tracking-tighter">Verified!</h2><p className="text-white/80 font-black uppercase tracking-widest text-lg">Application Protocol Success</p></div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                    {[
                                        { l: 'Match', v: `${analysis.matchPercentage}% ` },
                                        { l: 'Skill test', v: `${analysis.assessmentScore}% ` },
                                        { l: 'AI Interview', v: `${analysis.interviewScore || 'N/A'}% ` },
                                        { l: 'Final Score', v: `${analysis.finalScore || analysis.matchPercentage}% ` }
                                    ].map(stat => (
                                        <div key={stat.l} className="p-4 rounded-3xl bg-black/10 border border-white/10 backdrop-blur-sm"><p className="text-[8px] uppercase font-black text-white/50 mb-1">{stat.l}</p><p className="text-xl font-black">{stat.v}</p></div>
                                    ))}
                                </div>
                                <button onClick={() => navigate('/seeker/applications')} className="w-full py-6 rounded-[2rem] bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-gray-100 transition-all shadow-2xl active:scale-95">View Application Records</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ApplicationFlow;
