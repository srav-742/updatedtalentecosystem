import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BookOpenCheck,
    Brain,
    CheckCircle2,
    Clock3,
    Code2,
    FileLock2,
    ListChecks,
    Loader2,
    Play
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../../firebase';
import SecureExamWrapper from '../../../components/exam/SecureExamWrapper';

const SkillAssessment = ({ job, user, onComplete, onBack, onSecurityReset }) => {
    const [started, setStarted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [error, setError] = useState(null);
    const [securityResetting, setSecurityResetting] = useState(false);

    const assessmentType = (job.assessment?.type || 'mcq').toUpperCase();
    const totalQuestions = questions.length || job.assessment?.totalQuestions || 5;
    const estimatedMinutes = Math.max(totalQuestions * 8, 20);

    const progress = useMemo(() => {
        if (!questions.length) return 0;
        return ((currentQIndex + 1) / questions.length) * 100;
    }, [currentQIndex, questions.length]);

    const startAssessment = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await axios.post(`${API_URL}/generate-full-assessment`, {
                jobId: job._id,
                userId: user.uid
            });

            if (!Array.isArray(res.data?.questions) || res.data.questions.length === 0) {
                throw new Error('No questions in response');
            }

            setQuestions(res.data.questions);
            setSessionId(res.data.sessionId);
            setStarted(true);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Failed to generate assessment. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (value) => {
        setAnswers((prev) => ({ ...prev, [currentQIndex]: value }));
    };

    const nextQuestion = () => {
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex((value) => value + 1);
            return;
        }

        finishAssessment();
    };

    const finishAssessment = async () => {
        let correct = 0;
        const formattedAnswers = [];

        questions.forEach((question, index) => {
            const userAnswer = answers[index];
            let isCorrect = false;

            if (question.type === 'mcq') {
                if (question.options[question.correctAnswer] === userAnswer) {
                    correct += 1;
                    isCorrect = true;
                }
            } else if (question.type === 'coding') {
                if (userAnswer && userAnswer.trim().length > 20) {
                    correct += 1;
                    isCorrect = true;
                }
            }

            formattedAnswers.push({
                userAnswer,
                isCorrect
            });
        });

        const finalScore = Math.round((correct / questions.length) * 100);

        try {
            const submitRes = await axios.post(`${API_URL}/submit-assessment`, {
                jobId: job._id,
                userId: user.uid,
                sessionId,
                questions,
                answers: formattedAnswers
            });

            await axios.post(`${API_URL}/applications`, {
                jobId: job._id,
                userId: user.uid,
                assessmentScore: finalScore,
                assessmentSubmissionId: submitRes.data.submissionId
            });
        } catch (submitError) {
            console.warn('Assessment score save failed:', submitError);
        }

        setScore(finalScore);
    };

    const handleAssessmentSecurityReset = async (violation) => {
        setSecurityResetting(true);

        try {
            if (sessionId && questions.length > 0) {
                await axios.post(`${API_URL}/submit-assessment`, {
                    jobId: job._id,
                    userId: user.uid,
                    sessionId,
                    questions,
                    answers: [],
                    terminated: true,
                    terminationReason: violation?.detail || 'Assessment security limit exceeded'
                });
            }
        } catch (saveError) {
            console.warn('Failed to save terminated assessment attempt:', saveError);
        }

        await onSecurityReset?.({
            stage: 'assessment',
            reason: violation?.detail || 'Assessment security limit exceeded',
            violation
        });
    };

    if (loading) {
        return (
            <div className="rounded-[2.5rem] border border-black/10 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f3efe6] text-gray-700">
                    <Loader2 size={34} className="animate-spin" />
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">Preparing your assessment</h2>
                <p className="mt-3 text-sm leading-7 text-gray-500">
                    We are generating role-specific questions based on the recruiter requirements for {job.title}.
                </p>
            </div>
        );
    }

    if (!started && score === null) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                <header className="rounded-[2.25rem] border border-black/10 bg-white px-8 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Skill assessment</p>
                    <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Assessment Center</h1>
                            <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-500">
                                Complete the next stage of your application through a secure, proctored challenge tailored to the job requirements.
                            </p>
                        </div>
                        <div className="rounded-full border border-black/10 bg-[#f8f4ed] px-4 py-2 text-sm font-medium text-gray-700">
                            Stage 2 of 4
                        </div>
                    </div>
                </header>

                <div className="rounded-[2.5rem] border border-black/10 bg-white p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <div className="rounded-[2rem] border border-black/10 bg-[#fbf8f3] p-8">
                            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-black text-white">
                                <Brain size={28} />
                            </div>
                            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900">Ready for the assessment?</h2>
                            <p className="mt-4 text-sm leading-7 text-gray-600">
                                This round checks how well your skills align with the role, then unlocks the next application stage.
                            </p>

                            <div className="mt-8 grid gap-4 md:grid-cols-3">
                                <div className="rounded-[1.5rem] border border-black/10 bg-white p-5">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                                        <ListChecks size={20} />
                                    </div>
                                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Format</p>
                                    <p className="mt-2 text-lg font-semibold text-gray-900">{assessmentType}</p>
                                </div>
                                <div className="rounded-[1.5rem] border border-black/10 bg-white p-5">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                                        <BookOpenCheck size={20} />
                                    </div>
                                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Questions</p>
                                    <p className="mt-2 text-lg font-semibold text-gray-900">{totalQuestions}</p>
                                </div>
                                <div className="rounded-[1.5rem] border border-black/10 bg-white p-5">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                                        <Clock3 size={20} />
                                    </div>
                                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Estimated time</p>
                                    <p className="mt-2 text-lg font-semibold text-gray-900">{estimatedMinutes} min</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
                                <div className="flex items-center gap-3 text-amber-800">
                                    <AlertCircle size={20} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Before you start</h3>
                                </div>
                                <ul className="mt-4 space-y-3 text-xs leading-5 text-amber-700/80">
                                    <li className="flex gap-2"><span>â€¢</span> Do not switch tabs or minimize the window.</li>
                                    <li className="flex gap-2"><span>â€¢</span> Ensure you are in a quiet place with stable internet.</li>
                                    <li className="flex gap-2"><span>â€¢</span> Screen sharing and camera must remain active.</li>
                                    <li className="flex gap-2"><span>â€¢</span> Any attempt to copy-paste or search will be logged.</li>
                                </ul>
                            </div>

                            {[
                                {
                                    icon: FileLock2,
                                    title: 'Secure environment',
                                    description: 'Proctoring features remain active throughout the session.'
                                },
                                {
                                    icon: Code2,
                                    title: 'Dynamic Questions',
                                    description: 'AI-generated challenges based on real-world scenarios.'
                                }
                            ].map((item) => {
                                const Icon = item.icon;

                                return (
                                    <div key={item.title} className="rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-sm">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                                            <Icon size={20} />
                                        </div>
                                        <h3 className="mt-5 text-xl font-semibold tracking-tight text-gray-900">{item.title}</h3>
                                        <p className="mt-2 text-sm leading-7 text-gray-500">{item.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {error ? (
                        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    ) : null}

                    <div className="mt-8 flex flex-col justify-between gap-4 border-t border-black/10 pt-6 md:flex-row md:items-center">
                        <button
                            onClick={onBack}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 px-6 py-4 text-sm font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
                        >
                            <ArrowLeft size={18} />
                            Back
                        </button>

                        <button
                            onClick={startAssessment}
                            className="inline-flex items-center justify-center gap-3 rounded-[2rem] bg-black px-10 py-5 text-sm font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-gray-800 shadow-2xl active:scale-95"
                        >
                            Start Challenge
                            <Play size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (score !== null) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[2.5rem] border border-black/10 bg-white p-10 shadow-[0_30px_90px_rgba(15,23,42,0.08)]"
            >
                <div className="mx-auto max-w-3xl text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#eff9ef] text-emerald-600">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900">Assessment completed</h2>
                    <p className="mt-4 text-sm leading-7 text-gray-500">
                        Your responses have been recorded successfully. Continue to the interview stage to complete your application.
                    </p>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 text-left">
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Score</p>
                            <p className="mt-3 text-4xl font-semibold tracking-tight text-gray-900">{score}%</p>
                        </div>
                        <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 text-left">
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Questions completed</p>
                            <p className="mt-3 text-4xl font-semibold tracking-tight text-gray-900">{questions.length}</p>
                        </div>
                        <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 text-left">
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Next stage</p>
                            <p className="mt-3 text-lg font-semibold text-gray-900">AI interview</p>
                        </div>
                    </div>

                    <button
                        onClick={() => onComplete(score)}
                        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-black px-7 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                        Continue to Interview
                        <ArrowRight size={18} />
                    </button>
                </div>
            </motion.div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="rounded-[2.5rem] border border-red-200 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                    <AlertCircle size={28} />
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">No questions loaded</h2>
                <p className="mt-3 text-sm leading-7 text-gray-500">Please go back and restart the assessment.</p>
                <button
                    onClick={onBack}
                    className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                    <ArrowLeft size={18} />
                    Go back
                </button>
            </div>
        );
    }

    const question = questions[currentQIndex];

    if (!question || typeof question.question !== 'string') {
        return (
            <div className="rounded-[2.5rem] border border-amber-200 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                    <AlertCircle size={28} />
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">Question data unavailable</h2>
                <p className="mt-3 text-sm leading-7 text-gray-500">Use the button below to move to the next question.</p>
                <button
                    onClick={() => setCurrentQIndex((value) => Math.min(value + 1, questions.length - 1))}
                    className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                    Skip to next
                    <ArrowRight size={18} />
                </button>
            </div>
        );
    }

    return (
        <SecureExamWrapper
            examId={`assessment:${job._id}:${sessionId || 'pending'}`}
            userId={user.uid}
            isActive={started && !securityResetting}
            requireScreenShare={true}
            warningLimit={3}
            resetLimit={4}
            onSecurityReset={handleAssessmentSecurityReset}
        >
            <motion.div
                key={currentQIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                <div className="rounded-[2.25rem] border border-black/10 bg-white px-8 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Assessment in progress</p>
                            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">{job.title}</h1>
                        </div>
                        <div className="rounded-full border border-black/10 bg-[#f8f4ed] px-4 py-2 text-sm font-medium text-gray-700">
                            Question {currentQIndex + 1} of {questions.length}
                        </div>
                    </div>

                    <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/10">
                        <motion.div
                            className="h-full rounded-full bg-black"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="rounded-[2.5rem] border border-black/10 bg-white p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f8f4ed] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
                                {question.type === 'mcq' ? <ListChecks size={14} /> : <Code2 size={14} />}
                                {question.type === 'mcq' ? 'Multiple choice' : 'Coding response'}
                            </div>
                            <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-gray-900">
                                {question.question}
                            </h2>
                        </div>
                    </div>

                    {question.type === 'mcq' ? (
                        <div className="mt-8 space-y-4">
                            {question.options.map((option, index) => {
                                const isSelected = answers[currentQIndex] === option;

                                return (
                                    <button
                                        key={`${option}-${index}`}
                                        onClick={() => handleAnswer(option)}
                                        className={`w-full rounded-[1.5rem] border px-5 py-5 text-left transition ${isSelected ? 'border-black bg-black text-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]' : 'border-black/10 bg-[#fbf8f3] text-gray-700 hover:border-black/20 hover:bg-[#faf7f1]'}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${isSelected ? 'bg-white text-black' : 'bg-white text-gray-500 border border-black/10'}`}>
                                                {String.fromCharCode(65 + index)}
                                            </div>
                                            <p className="text-base leading-7">{option}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="mt-8 space-y-4">
                            <div className="rounded-[1.75rem] border border-black/10 bg-[#111827] p-5 text-sm text-gray-200">
                                <pre className="overflow-x-auto whitespace-pre-wrap font-mono leading-7">
                                    {question.starterCode || '// Write your solution here'}
                                </pre>
                            </div>
                            <textarea
                                className="h-72 w-full rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 font-mono text-sm leading-7 text-gray-800 outline-none transition focus:border-black/20"
                                value={answers[currentQIndex] || ''}
                                onChange={(event) => handleAnswer(event.target.value)}
                                placeholder="Write your response here..."
                            />
                        </div>
                    )}

                    <div className="mt-8 flex flex-col justify-between gap-4 border-t border-black/10 pt-6 md:flex-row md:items-center">
                        <div className="text-sm text-gray-500">
                            {question.type === 'mcq'
                                ? 'Select the strongest answer before moving forward.'
                                : 'Provide a complete response before continuing.'}
                        </div>

                        <button
                            onClick={nextQuestion}
                            disabled={!answers[currentQIndex]}
                            className={`inline-flex items-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold transition ${answers[currentQIndex] ? 'bg-black text-white hover:bg-gray-800' : 'cursor-not-allowed border border-black/10 bg-gray-100 text-gray-400'}`}
                        >
                            {currentQIndex === questions.length - 1 ? 'Finish assessment' : 'Next question'}
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </SecureExamWrapper>
    );
};

export default SkillAssessment;
