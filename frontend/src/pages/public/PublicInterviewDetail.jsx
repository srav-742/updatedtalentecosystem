import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    CheckCircle,
    Award,
    User,
    Mail,
    Briefcase,
    MessageSquare,
    Video,
    PlayCircle,
    Github,
    Linkedin,
    ShieldAlert,
    ShieldCheck,
    AlertTriangle,
    Clock,
    Home,
    AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';

const PublicInterviewDetail = () => {
    const { applicationId } = useParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPublicDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                // Call our unauthenticated public endpoint
                const res = await axios.get(`${API_URL}/interview/public/interview-details/${applicationId}`);
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch public interview details:", err);
                setError(err.response?.data?.message || 'Failed to load public interview details');
            } finally {
                setLoading(false);
            }
        };

        if (applicationId) {
            fetchPublicDetails();
        }
    }, [applicationId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fbf8f3] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-12 text-center max-w-md w-full border border-black/5 shadow-xl">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold text-gray-800">Loading Shared Interview</h3>
                    <p className="text-gray-500 mt-2">Retrieving candidate recording and assessment...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#fbf8f3] flex items-center justify-center p-4">
                <div className="bg-[#1a1d24] text-white border border-white/10 rounded-3xl p-12 text-center max-w-md w-full shadow-2xl">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Interview Link Expired or Invalid</h3>
                    <p className="text-gray-400 mb-8 leading-relaxed">{error || 'This shared interview detail is no longer accessible.'}</p>
                    <Link
                        to="/"
                        className="inline-flex w-full items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                    >
                        <Home size={16} />
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const { application, job, interview } = data;
    const formatMarks = (marks) => (typeof marks === 'number' ? marks.toFixed(1) : '0.0');
    const hasCompletedInterview = interview?.status === 'completed' && (interview?.questions?.length || 0) > 0;
    const interviewStatusLabel = interview?.status === 'in_progress'
        ? 'In Progress'
        : interview?.status === 'not_completed'
            ? 'Not Finalized'
            : 'Completed';

    return (
        <div className="min-h-screen bg-[#fbf8f3] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] border border-black/10 shadow-[0_24px_70px_rgba(15,23,42,0.06)] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 sm:p-10">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                        <div className="flex-1 w-full">
                            <div className="flex items-center gap-3 mb-4">
                                <Award className="w-8 h-8" />
                                <h2 className="text-3xl font-black tracking-tight">Shared AI Interview Details</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/10">
                                    <div className="text-3xl font-black text-white">{hasCompletedInterview ? `${interview.score}%` : interviewStatusLabel}</div>
                                    <div className="text-xs text-gray-300 font-bold uppercase tracking-widest mt-1">{hasCompletedInterview ? 'Overall Score' : 'Interview Status'}</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/10">
                                    <div className="text-3xl font-black text-white">{application.ownershipScore || 0}%</div>
                                    <div className="text-xs text-gray-300 font-bold uppercase tracking-widest mt-1">Ownership Score</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/10">
                                    <div className="text-3xl font-black text-white">{hasCompletedInterview ? `${formatMarks(interview.marks)}/10` : '--'}</div>
                                    <div className="text-xs text-gray-300 font-bold uppercase tracking-widest mt-1">Average Marks</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/10">
                                    <div className="text-3.5xl font-black text-white">{interview.totalQuestions}</div>
                                    <div className="text-xs text-gray-300 font-bold uppercase tracking-widest mt-1">Questions</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Candidate Info */}
                <div className="p-8 sm:p-10 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-purple-600" />
                        Candidate Information
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-3 rounded-xl shrink-0">
                                <User className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Name</div>
                                <div className="font-bold text-gray-800">{application.applicantName}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-3 rounded-xl shrink-0">
                                <Mail className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Email</div>
                                <div className="font-bold text-gray-800">{application.applicantEmail}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-3 rounded-xl shrink-0">
                                <Briefcase className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Job Applied</div>
                                <div className="font-bold text-gray-800">{job.title}</div>
                            </div>
                        </div>

                        {application.githubUrl && (
                            <div className="flex items-center gap-3">
                                <div className="bg-gray-100 p-3 rounded-xl shrink-0">
                                    <Github className="w-5 h-5 text-gray-700" />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">GitHub</div>
                                    <a href={application.githubUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-teal-600 hover:underline break-all">
                                        {application.githubUrl.split('/').pop()}
                                    </a>
                                </div>
                            </div>
                        )}
                        {application.linkedinUrl && (
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 p-3 rounded-xl shrink-0">
                                    <Linkedin className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">LinkedIn</div>
                                    <a href={application.linkedinUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 hover:underline break-all">
                                        {application.linkedinUrl.split('/').pop() || application.linkedinUrl.split('/').slice(-2, -1)[0]}
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Video Recording Section */}
                {(application.recordingPlaybackUrl || application.recordingUrl) && (
                    <div className="p-8 sm:p-10 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Video className="w-5 h-5 text-purple-600" />
                            Interview Recording
                        </h3>
                        <div className="bg-black rounded-3xl overflow-hidden shadow-xl border border-black/10">
                            <video
                                controls
                                className="w-full max-h-[500px]"
                                src={application.recordingPlaybackUrl || application.recordingUrl}
                            />
                        </div>
                        <div className="mt-4 flex items-center gap-3 text-sm text-gray-600">
                            <PlayCircle className="w-4 h-4 text-purple-600" />
                            <span className="font-medium">Click play to watch the candidate's interview recording</span>
                        </div>
                    </div>
                )}

                {/* Security & Proctoring Verdict (ReadOnly Summary) */}
                {interview?.proctoringReport && (
                    <div className="p-8 sm:p-10 border-b border-gray-200 bg-gray-50/20">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-purple-600" />
                            Security & Integrity Report
                        </h3>
                        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                    interview.proctoringReport.status === 'clean' || interview.proctoringReport.status === 'low_risk' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    interview.proctoringReport.status === 'suspicious' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                    'bg-red-50 text-red-600 border border-red-100'
                                }`}>
                                    {interview.proctoringReport.status === 'clean' && <ShieldCheck size={26} />}
                                    {interview.proctoringReport.status === 'low_risk' && <ShieldCheck size={26} />}
                                    {interview.proctoringReport.status === 'suspicious' && <AlertTriangle size={26} />}
                                    {interview.proctoringReport.status === 'critical' && <ShieldAlert size={26} />}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Integrity Verdict</p>
                                    <h4 className={`text-lg font-black mt-1 ${
                                        interview.proctoringReport.status === 'clean' || interview.proctoringReport.status === 'low_risk' ? 'text-emerald-600' :
                                        interview.proctoringReport.status === 'suspicious' ? 'text-amber-600' :
                                        'text-red-600'
                                    }`}>
                                        {interview.proctoringReport.verdict}
                                    </h4>
                                    <p className="text-xs text-gray-500 font-semibold leading-relaxed mt-2 max-w-xl">
                                        {interview.proctoringReport.summary}
                                    </p>
                                </div>
                            </div>
                            <div className={`flex flex-col items-center justify-center h-20 w-28 rounded-2xl border shrink-0 ${
                                interview.proctoringReport.status === 'clean' || interview.proctoringReport.status === 'low_risk' ? 'bg-emerald-50/25 border-emerald-100 text-emerald-800' :
                                interview.proctoringReport.status === 'suspicious' ? 'bg-amber-50/25 border-amber-100 text-amber-800' :
                                'bg-red-50/25 border-red-100 text-red-800'
                            }`}>
                                <span className="text-2xl font-black">{interview.proctoringReport.totalPenaltyRating}</span>
                                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 mt-1">Suspicion Penalty</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Questions & Answers */}
                <div className="p-8 sm:p-10">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                        Interview Transcript & Analysis
                    </h3>
                    <div className="space-y-6">
                        {!hasCompletedInterview && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left">
                                <div className="text-sm font-black uppercase tracking-widest text-amber-800">Interview Incomplete</div>
                                <p className="mt-2 text-sm text-amber-900 leading-relaxed">
                                    The candidate has started the interview session, but the answers are not finalized yet.
                                </p>
                            </div>
                        )}
                        {hasCompletedInterview && interview.questions.map((q, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="border-2 border-purple-200 bg-purple-50/30 rounded-3xl p-6 shadow-sm"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-purple-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
                                            {q.questionNumber}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                                Question {q.questionNumber}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-4 py-2 rounded-2xl bg-purple-500 text-white font-bold text-sm text-right leading-tight min-w-[100px] shadow-sm">
                                        <div>{formatMarks(q.marks)}/10</div>
                                        <div className="text-[9px] font-semibold text-purple-100">{q.score}%</div>
                                    </div>
                                </div>

                                {/* Question */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-4 h-4 text-purple-600" />
                                        <h4 className="font-bold text-gray-700 text-sm">Interviewer Question:</h4>
                                    </div>
                                    <div className="bg-white border-2 border-purple-100 rounded-2xl p-4">
                                        <p className="text-gray-800 font-medium leading-relaxed">{q.question}</p>
                                    </div>
                                </div>

                                {/* Answer */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4 text-indigo-600" />
                                        <h4 className="font-bold text-gray-700 text-sm">Candidate's Response:</h4>
                                    </div>
                                    <div className="bg-indigo-50/40 border-2 border-indigo-100 rounded-2xl p-4">
                                        <p className="text-gray-800 leading-relaxed">{q.answer}</p>
                                    </div>
                                </div>

                                {/* Feedback */}
                                {q.feedback && (
                                    <div className="mt-4 pt-4 border-t border-purple-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                                            <h4 className="font-bold text-gray-700 text-sm">Automated Evaluation:</h4>
                                        </div>
                                        <div className="bg-emerald-50/20 border-2 border-emerald-100 rounded-2xl p-4">
                                            <p className="text-gray-850 leading-relaxed">{q.feedback}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 sm:p-10 bg-gray-50 border-t border-gray-200 rounded-b-[2.5rem]">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <Award className="w-6 h-6 text-purple-600" />
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Aggregate Assessment Score</div>
                                <div className="text-2xl font-black text-purple-600">{hasCompletedInterview ? `${interview.score}%` : interviewStatusLabel}</div>
                            </div>
                        </div>
                        <div className="text-xs font-semibold text-gray-400">
                            Shared via hire1percent AI Recruiter Suite
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicInterviewDetail;
