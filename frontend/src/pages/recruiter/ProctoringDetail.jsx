import { useState, useEffect } from 'react';


import axios from 'axios';
import { API_URL, getAuthHeaders } from '../../firebase';

const ProctoringDetail = ({ applicationId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProctoringDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const headers = await getAuthHeaders();
                const res = await axios.get(`${API_URL}/interview-details/${applicationId}`, { headers });
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch proctoring details:", err);
                setError(err.response?.data?.message || 'Failed to load proctoring details');
            } finally {
                setLoading(false);
            }
        };

        if (applicationId) {
            fetchProctoringDetails();
        }
    }, [applicationId]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-12 text-center max-w-md w-full">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold text-gray-800">Loading Proctoring Details</h3>
                    <p className="text-gray-500 mt-2">Fetching proctoring logs...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#1a1d24] text-white border border-white/10 rounded-3xl p-12 text-center max-w-md w-full shadow-2xl">
                    <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Error Loading Report</h3>
                    <p className="text-gray-400 mb-6">{error || 'Proctoring data not found'}</p>
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

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto my-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-600 text-white p-8 rounded-t-3xl z-10 shadow-md">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <ShieldAlert className="w-8 h-8" />
                                <h2 className="text-3xl font-black">Proctoring Integrity Report</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/10">
                                    <div className="text-3xl font-black text-white">
                                        {interview?.proctoringReport?.verdict || 'Flagged'}
                                    </div>
                                    <div className="text-xs text-red-100 font-bold uppercase tracking-widest mt-1">Status Verdict</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/10">
                                    <div className="text-3xl font-black text-white">
                                        {interview?.proctoringReport?.totalPenaltyRating || application.proctoringScore || 0}
                                    </div>
                                    <div className="text-xs text-red-100 font-bold uppercase tracking-widest mt-1">Penalty Rating</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/10">
                                    <div className="text-3xl font-black text-white">
                                        {interview?.proctoringViolations?.length || application.proctoringFlags?.length || 0}
                                    </div>
                                    <div className="text-xs text-red-100 font-bold uppercase tracking-widest mt-1">Alerts Logged</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/10">
                                    <div className="text-sm font-black text-white">
                                        {interview?.completedAt ? new Date(interview.completedAt).toLocaleDateString() : new Date().toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-red-100 font-bold uppercase tracking-widest mt-1">Session Date</div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-white/15 hover:bg-white/25 rounded-full p-3 transition-colors shrink-0"
                        >
                            <X className="w-6 h-6 animate-pulse" />
                        </button>
                    </div>
                </div>

                {/* Candidate Info */}
                <div className="p-8 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-red-600" />
                        Candidate Information
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                <User className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Name</div>
                                <div className="font-bold text-gray-800">{application.applicantName}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                                <Mail className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Email</div>
                                <div className="font-bold text-gray-800">{application.applicantEmail}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-3 rounded-xl border border-gray-200/60">
                                <Briefcase className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Applied Job</div>
                                <div className="font-bold text-gray-800">{job.title}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Integrity & Proctoring details */}
                <div className="p-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-600" />
                        Integrity Violation Log Details
                    </h3>

                    {/* Verdict Card */}
                    {interview?.proctoringReport && (
                        <div className="mb-6 rounded-3xl border border-red-100 bg-red-50/20 p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                        interview.proctoringReport.status === 'clean' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                        interview.proctoringReport.status === 'low_risk' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                        interview.proctoringReport.status === 'suspicious' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                        'bg-red-50 text-red-600 border border-red-100'
                                    }`}>
                                        {interview.proctoringReport.status === 'clean' && <ShieldCheck size={28} />}
                                        {interview.proctoringReport.status === 'low_risk' && <ShieldCheck size={28} />}
                                        {interview.proctoringReport.status === 'suspicious' && <AlertTriangle size={28} />}
                                        {interview.proctoringReport.status === 'critical' && <ShieldAlert size={28} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Proctoring integrity summary verdict</p>
                                        <h4 className={`text-xl font-black mt-1 ${
                                            interview.proctoringReport.status === 'clean' ? 'text-emerald-600' :
                                            interview.proctoringReport.status === 'low_risk' ? 'text-blue-600' :
                                            interview.proctoringReport.status === 'suspicious' ? 'text-amber-600' :
                                            'text-red-600'
                                        }`}>
                                            {interview.proctoringReport.verdict}
                                        </h4>
                                        <p className="text-xs text-gray-600 font-semibold leading-relaxed mt-2 max-w-2xl">
                                            {interview.proctoringReport.summary}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {(!interview?.proctoringViolations || interview.proctoringViolations.length === 0) ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 flex items-center gap-3 text-emerald-800">
                            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                            <div>
                                <h4 className="font-bold text-sm">No Integrity Issues Detected</h4>
                                <p className="text-xs text-emerald-700/90 mt-0.5">No proctoring violations or tab-switching events were logged during the session.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                                            <th className="py-3 px-4">Event Violation Type</th>
                                            <th className="py-3 px-4">Details</th>
                                            <th className="py-3 px-4 text-center">Score Penalty</th>
                                            <th className="py-3 px-4 text-center">Severity</th>
                                            <th className="py-3 px-4 text-right">Time Detected</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-xs">
                                        {interview.proctoringViolations.map((v, i) => {
                                            let severityClass = "bg-gray-100 text-gray-700";
                                            if (v.severity === 'low') severityClass = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                                            else if (v.severity === 'medium') severityClass = "bg-amber-50 text-amber-700 border border-amber-100";
                                            else if (v.severity === 'high') severityClass = "bg-red-50 text-red-700 border border-red-100";
                                            else if (v.severity === 'critical') severityClass = "bg-red-600 text-white font-bold";

                                            const typeLabel = String(v.type).replace(/_/g, ' ');

                                            return (
                                                <tr key={i} className="hover:bg-gray-50/50">
                                                    <td className="py-3 px-4 font-bold text-gray-800 uppercase tracking-tight">
                                                        {typeLabel}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600 leading-normal">
                                                        {v.detail}
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-bold text-red-600 bg-red-50/10">
                                                        +{v.rating || 0}
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
            </motion.div>
        </div>
    );
};

export default ProctoringDetail;
