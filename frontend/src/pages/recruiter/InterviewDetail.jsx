import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X,
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
    Clock
} from 'lucide-react';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../../firebase'

const InterviewDetail = ({ applicationId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchInterviewDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const headers = await getAuthHeaders();
                const res = await axios.get(`${API_URL}/interview-details/${applicationId}`, { headers });
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch interview details:", err);
                setError(err.response?.data?.message || 'Failed to load interview details');
            } finally {
                setLoading(false);
            }
        };

        if (applicationId) {
            fetchInterviewDetails();
        }
    }, [applicationId]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-12 text-center max-w-md w-full">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold text-gray-800">Loading Interview Details</h3>
                    <p className="text-gray-500 mt-2">Fetching candidate's responses...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        const isUpgradeError = error?.includes('Pro Recruiter') || error?.includes('Forbidden') || error?.includes('Unauthorized');
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#1a1d24] text-white border border-white/10 rounded-3xl p-12 text-center max-w-md w-full shadow-2xl">
                    {isUpgradeError ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
                                <Award className="w-8 h-8 text-black" />
                            </div>
                            <h3 className="text-2xl font-black mb-3 text-white">Pro Access Required</h3>
                            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                                Detailed candidate AI interview transcripts are exclusive to premium recruiters. Upgrade your plan to view full candidate answers.
                            </p>
                            <button
                                onClick={() => {
                                    onClose();
                                    window.location.href = '/recruiter/upgrade';
                                }}
                                className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold px-6 py-3.5 rounded-xl transition-transform hover:scale-102 hover:shadow-lg shadow-amber-500/20 mb-3"
                            >
                                Upgrade to Pro
                            </button>
                        </>
                    ) : (
                        <>
                            <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Error Loading Interview</h3>
                            <p className="text-gray-400 mb-6">{error || 'Interview data not found'}</p>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-bold px-6 py-3 rounded-xl border border-white/10 transition-colors"
                    >
                        Close
                    </button>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto my-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-t-3xl">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <Award className="w-8 h-8" />
                                <h2 className="text-3xl font-black">Interview Details</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                                    <div className="text-3xl font-black text-white">{hasCompletedInterview ? `${interview.score}%` : interviewStatusLabel}</div>
                                    <div className="text-xs text-gray-300 font-bold uppercase tracking-widest">{hasCompletedInterview ? 'Overall Score' : 'Interview Status'}</div>
                                </div>
                                {/* ─── OWNERSHIP V VETTING SCORE ─── */}
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/20">
                                    <div className="text-3xl font-black text-white">{application.ownershipScore || 0}%</div>
                                    <div className="text-xs text-gray-300 font-bold uppercase tracking-widest italic">Ownership %</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                                    <div className="text-3xl font-black text-white">{hasCompletedInterview ? `${formatMarks(interview.marks)}/10` : '--'}</div>
                                    <div className="text-xs text-gray-300 font-bold uppercase tracking-widest">Average Marks</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                                    <div className="text-3xl font-black text-white">{interview.totalQuestions}</div>
                                    <div className="text-xs text-gray-300 font-bold uppercase tracking-widest">Questions</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                                    <div className="text-sm font-black text-white">
                                        {new Date(interview.completedAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-300 font-bold uppercase tracking-widest">{hasCompletedInterview ? 'Completed' : 'Last Update'}</div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-white/15 hover:bg-white/25 rounded-full p-3 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Candidate Info */}
                <div className="p-8 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-purple-600" />
                        Candidate Information
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-3 rounded-xl">
                                <User className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Name</div>
                                <div className="font-bold text-gray-800">{application.applicantName}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-3 rounded-xl">
                                <Mail className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Email</div>
                                <div className="font-bold text-gray-800">{application.applicantEmail}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-3 rounded-xl">
                                <Briefcase className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Job</div>
                                <div className="font-bold text-gray-800">{job.title}</div>
                            </div>
                        </div>

                        {/* ─── SOCIAL INTEGRATIONS ─── */}
                        {application.githubUrl && (
                            <div className="flex items-center gap-3">
                                <div className="bg-gray-100 p-3 rounded-xl">
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
                                <div className="bg-blue-50 p-3 rounded-xl">
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
                    <div className="p-8 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Video className="w-5 h-5 text-purple-600" />
                            Interview Recording
                        </h3>
                        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
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
                        {application.recordingSessionId && (
                            <div className="mt-3 text-xs font-mono text-gray-500 break-all">
                                Recording ID: {application.recordingSessionId}
                            </div>
                        )}
                    </div>
                )}

                {/* Security & Proctoring Audit Log */}
                <div className="p-8 border-b border-gray-200 bg-gray-50/30">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-purple-600" />
                        Security & Proctoring Audit
                    </h3>

                    {(!interview?.proctoringViolations || interview.proctoringViolations.length === 0) ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 flex items-center gap-3 text-emerald-800">
                            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                            <div>
                                <h4 className="font-bold text-sm">Clean Session</h4>
                                <p className="text-xs text-emerald-700/90 mt-0.5">No proctoring violations or tab-switching events were detected during this interview session.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 flex items-center gap-3 text-amber-800">
                                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-sm">Integrity Alerts Logged ({interview.proctoringViolations.length})</h4>
                                    <p className="text-xs text-amber-700/90 mt-0.5">
                                        The system detected activities that triggered proctoring alerts. Please review the details below.
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                                            <th className="py-3 px-4">Event Type</th>
                                            <th className="py-3 px-4">Details</th>
                                            <th className="py-3 px-4 text-center">Severity</th>
                                            <th className="py-3 px-4 text-right">Time Detected</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-xs">
                                        {interview.proctoringViolations.map((v) => {
                                            let severityClass = "bg-gray-100 text-gray-700";
                                            if (v.severity === 'low') severityClass = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                                            else if (v.severity === 'medium') severityClass = "bg-amber-50 text-amber-700 border border-amber-100";
                                            else if (v.severity === 'high') severityClass = "bg-red-50 text-red-700 border border-red-100";
                                            else if (v.severity === 'critical') severityClass = "bg-red-600 text-white font-bold";

                                            const typeLabel = String(v.type).replace(/_/g, ' ');

                                            return (
                                                <tr key={v.id || v.timestamp} className="hover:bg-gray-50/50">
                                                    <td className="py-3 px-4 font-bold text-gray-800 uppercase tracking-tight">
                                                        {typeLabel}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600 leading-normal">
                                                        {v.detail}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${severityClass}`}>
                                                            {v.severity || 'medium'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-gray-400 font-medium whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Clock size={12} />
                                                            {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Questions & Answers */}
                <div className="p-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                        Interview Questions & Responses
                    </h3>
                    <div className="space-y-6">
                        {!hasCompletedInterview && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left">
                                <div className="text-sm font-black uppercase tracking-widest text-amber-800">Interview Not Finalized</div>
                                <p className="mt-2 text-sm text-amber-900">
                                    This candidate started the interview flow, but the final interview answers were not saved yet. If a recording is available above, you can still review that session evidence here.
                                </p>
                                {application.recordingSessionId && (
                                    <div className="mt-3 text-xs font-mono text-amber-900/80 break-all">
                                        Session ID: {application.recordingSessionId}
                                    </div>
                                )}
                            </div>
                        )}
                        {hasCompletedInterview && interview.questions.map((q, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="border-2 border-purple-200 bg-purple-50 rounded-2xl p-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-black text-lg">
                                            {q.questionNumber}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                                Question {q.questionNumber}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="px-4 py-2 rounded-2xl bg-purple-500 text-white font-bold text-sm text-right leading-tight min-w-[110px]">
                                            <div>{formatMarks(q.marks)}/10</div>
                                            <div className="text-[10px] font-semibold text-purple-100">{q.score}%</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Question */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-4 h-4 text-purple-600" />
                                        <h4 className="font-bold text-gray-800">Interviewer Question:</h4>
                                    </div>
                                    <div className="bg-white border-2 border-purple-200 rounded-xl p-4">
                                        <p className="text-gray-800 font-medium">{q.question}</p>
                                    </div>
                                </div>

                                {/* Answer */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4 text-indigo-600" />
                                        <h4 className="font-bold text-gray-800">Candidate's Answer:</h4>
                                    </div>
                                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
                                        <p className="text-gray-800">{q.answer}</p>
                                    </div>
                                </div>

                                {/* Feedback */}
                                {q.feedback && (
                                    <div className="mt-4 pt-4 border-t border-purple-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            <h4 className="font-bold text-gray-800">Automated Assessment:</h4>
                                        </div>
                                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                                            <p className="text-gray-800">{q.feedback}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-gray-50 border-t border-gray-200 rounded-b-3xl">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Award className="w-6 h-6 text-purple-600" />
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">{hasCompletedInterview ? 'Final Score' : 'Interview Status'}</div>
                                <div className="text-2xl font-black text-purple-600">{hasCompletedInterview ? `${interview.score}%` : interviewStatusLabel}</div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors"
                        >
                            Close Interview
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default InterviewDetail;
