import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../firebase";
import { ShieldAlert, AlertTriangle, ShieldCheck, Eye, Search, Filter, RefreshCw, ChevronRight } from "lucide-react";
import ProctoringDetail from "./ProctoringDetail";

export default function ProctoringReports() {
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Modal state for detailed timeline
    const [selectedApplicationId, setSelectedApplicationId] = useState(null);
    const [showProctoringDetail, setShowProctoringDetail] = useState(false);

    const fetchReports = async () => {
        setLoading(true);
        setError(null);
        try {
            const userStr = localStorage.getItem("user");
            const user = JSON.parse(userStr || "{}");
            const headers = {
                "Content-Type": "application/json",
                "x-user-id": user.uid || user._id || user.id || "",
            };

            const res = await axios.get(`${API_URL}/proctoring-enhanced/reports`, { headers });
            setReports(res.data || []);
            setFilteredReports(res.data || []);
        } catch (err) {
            console.error("Failed to fetch proctoring reports:", err);
            setError(err.response?.data?.message || "Failed to load proctoring reports");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    // Helper to get normalized risk level and integrity score
    const getReportRiskLevel = (report) => {
        if (report.riskLevel) return report.riskLevel;
        if (report.status === 'critical') return 'HIGH RISK';
        if (report.status === 'suspicious') return 'REVIEW REQUIRED';
        return 'LOW RISK';
    };

    const getReportIntegrityScore = (report) => {
        if (typeof report.integrityScore === 'number') return report.integrityScore;
        if (typeof report.proctoringScore === 'number') return report.proctoringScore;
        if (report.totalPenaltyRating > 0) return Math.max(0, 100 - Math.round(report.totalPenaltyRating * 2.5));
        return 100;
    };

    // Filter and search logic
    useEffect(() => {
        let result = reports;

        if (statusFilter !== "all") {
            result = result.filter(r => {
                const rLevel = getReportRiskLevel(r);
                if (statusFilter === 'HIGH RISK' || statusFilter === 'critical') {
                    return rLevel === 'HIGH RISK';
                }
                if (statusFilter === 'REVIEW REQUIRED' || statusFilter === 'suspicious') {
                    return rLevel === 'REVIEW REQUIRED';
                }
                if (statusFilter === 'LOW RISK' || statusFilter === 'low_risk' || statusFilter === 'clean') {
                    return rLevel === 'LOW RISK';
                }
                return true;
            });
        }

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(r => {
                const app = r.applicationId || r.resolvedApplication;
                const name = app?.applicantName || "";
                const email = app?.applicantEmail || "";
                const jobTitle = app?.jobId?.title || "";
                const userId = r.userId || "";
                return (
                    name.toLowerCase().includes(query) ||
                    email.toLowerCase().includes(query) ||
                    jobTitle.toLowerCase().includes(query) ||
                    userId.toLowerCase().includes(query)
                );
            });
        }

        setFilteredReports(result);
    }, [searchQuery, statusFilter, reports]);

    // Aggregate statistics
    const totalReports = reports.length;
    const highRiskCount = reports.filter(r => getReportRiskLevel(r) === 'HIGH RISK').length;
    const reviewRequiredCount = reports.filter(r => getReportRiskLevel(r) === 'REVIEW REQUIRED').length;
    const lowRiskCount = reports.filter(r => getReportRiskLevel(r) === 'LOW RISK').length;

    const handleViewDetail = (applicationId) => {
        if (!applicationId) {
            alert("No application reference found for this report. The report might have been logged during a legacy assessment session.");
            return;
        }
        setSelectedApplicationId(applicationId);
        setShowProctoringDetail(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">Proctoring Integrity Hub</h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                        Monitor live assessment integrity, risk classifications, and evidence audit trails across candidate sessions.
                    </p>
                </div>
                <button
                    id="btn-refresh-reports"
                    onClick={fetchReports}
                    className="inline-flex items-center gap-2 self-start rounded-2xl border border-black/10 bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95 cursor-pointer"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    Sync Reports
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-6 md:grid-cols-4">
                <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Tracked</span>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tight text-gray-900">{totalReports}</span>
                        <span className="text-xs font-semibold text-gray-400">Sessions</span>
                    </div>
                </div>

                <div className="rounded-[2rem] border border-red-100 bg-red-50/30 p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">HIGH RISK</span>
                        <ShieldAlert size={18} className="text-red-500" />
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tight text-red-600">{highRiskCount}</span>
                        <span className="text-xs font-semibold text-red-400">Urgent Review</span>
                    </div>
                </div>

                <div className="rounded-[2rem] border border-amber-100 bg-amber-50/30 p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">REVIEW REQUIRED</span>
                        <AlertTriangle size={18} className="text-amber-500" />
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tight text-amber-600">{reviewRequiredCount}</span>
                        <span className="text-xs font-semibold text-gray-400">Attention Needed</span>
                    </div>
                </div>

                <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/30 p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">LOW RISK</span>
                        <ShieldCheck size={18} className="text-emerald-500" />
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tight text-emerald-600">{lowRiskCount}</span>
                        <span className="text-xs font-semibold text-gray-400">Verified Safe</span>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-[2rem] border border-black/5 bg-white p-5 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        id="search-candidates"
                        type="text"
                        placeholder="Search by candidate name, email, job title or user ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-2xl border-none bg-gray-50 py-3.5 pl-12 pr-4 text-sm font-semibold placeholder-gray-400 outline-none ring-1 ring-black/5 focus:bg-white focus:ring-black/20 transition-all"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Filter className="text-gray-400 hidden md:block" size={16} />
                    <select
                        id="filter-status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-2xl border-none bg-gray-50 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-gray-700 outline-none ring-1 ring-black/5 focus:bg-white focus:ring-black/20 transition-all cursor-pointer"
                    >
                        <option value="all">All Risk Levels</option>
                        <option value="HIGH RISK">High Risk</option>
                        <option value="REVIEW REQUIRED">Review Required</option>
                        <option value="LOW RISK">Low Risk</option>
                    </select>
                </div>
            </div>

            {/* Reports Table */}
            <div className="overflow-hidden rounded-[2.5rem] border border-black/5 bg-white shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <RefreshCw size={36} className="animate-spin text-gray-300 mb-4" />
                        <p className="text-sm font-semibold tracking-wide uppercase text-gray-400">Loading candidate proctoring data...</p>
                    </div>
                ) : error ? (
                    <div className="py-20 text-center text-red-500">
                        <AlertTriangle size={36} className="mx-auto mb-4" />
                        <p className="font-bold text-lg">{error}</p>
                        <button
                            id="btn-retry-reports"
                            onClick={fetchReports}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
                        >
                            Retry Loading
                        </button>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="py-20 text-center text-gray-500">
                        <ShieldCheck size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-bold text-lg text-gray-800">No Proctoring Reports Found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black/5 bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <th className="py-5 pl-8">Candidate Info</th>
                                    <th className="py-5">Target Assessment / Job</th>
                                    <th className="py-5 text-center">Risk Classification</th>
                                    <th className="py-5 text-center">Incidents</th>
                                    <th className="py-5 text-center">Evidence</th>
                                    <th className="py-5 text-center">Integrity Score</th>
                                    <th className="py-5 text-right pr-8">Timeline Report</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/[0.03]">
                                {filteredReports.map((report) => {
                                    const app = report.applicationId || report.resolvedApplication;
                                    const name = app?.applicantName || "Anonymous Candidate";
                                    const email = app?.applicantEmail || "N/A";
                                    const jobTitle = app?.jobId?.title || "Assessment Session";
                                    const integrityScore = getReportIntegrityScore(report);
                                    const riskLevel = getReportRiskLevel(report);

                                    // Risk Classification Badge Styling
                                    let riskBadgeClass = "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
                                    if (riskLevel === "HIGH RISK") riskBadgeClass = "bg-red-500/10 text-red-600 border-red-500/20";
                                    else if (riskLevel === "REVIEW REQUIRED") riskBadgeClass = "bg-amber-500/10 text-amber-700 border-amber-500/20";

                                    const criticalIncidents = report.criticalIncidents || 0;
                                    const standardIncidents = report.standardIncidents || (report.totalViolations || 0);

                                    // Check evidence availability
                                    const hasEvidence = report.timeline?.some(t => t.evidenceFrames?.length > 0) || (report.evidenceFramesCount > 0);

                                    return (
                                        <tr key={report._id} className="group hover:bg-black/[0.01] transition-all">
                                            {/* Candidate Info */}
                                            <td className="py-5 pl-8">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 group-hover:text-black transition-colors">{name}</span>
                                                    <span className="text-xs text-gray-400 font-medium mt-0.5">{email}</span>
                                                    <span className="text-[9px] font-mono text-gray-400 mt-1">ID: {report.userId}</span>
                                                </div>
                                            </td>

                                            {/* Target Job */}
                                            <td className="py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800">{jobTitle}</span>
                                                    <span className="text-[10px] font-mono text-gray-400 mt-1 truncate max-w-xs" title={report.examId}>Exam: {report.examId}</span>
                                                </div>
                                            </td>

                                            {/* Risk Level Badge */}
                                            <td className="py-5 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider ${riskBadgeClass}`}>
                                                    {riskLevel === "HIGH RISK" && <ShieldAlert size={12} className="text-red-600" />}
                                                    {riskLevel === "REVIEW REQUIRED" && <AlertTriangle size={12} className="text-amber-600" />}
                                                    {riskLevel === "LOW RISK" && <ShieldCheck size={12} className="text-emerald-600" />}
                                                    {riskLevel}
                                                </span>
                                            </td>

                                            {/* Incidents Count */}
                                            <td className="py-5 text-center text-xs">
                                                <div className="inline-flex flex-col items-center">
                                                    {criticalIncidents > 0 ? (
                                                        <span className="font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 text-[10px]">
                                                            {criticalIncidents} Critical
                                                        </span>
                                                    ) : null}
                                                    <span className="text-gray-500 font-medium text-[11px] mt-0.5">
                                                        {standardIncidents} Standard
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Evidence Available */}
                                            <td className="py-5 text-center">
                                                {hasEvidence ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold">
                                                        Frames Available
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px] font-medium">—</span>
                                                )}
                                            </td>

                                            {/* Proctoring Integrity Score */}
                                            <td className="py-5 text-center">
                                                <span className={`inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl border font-black text-sm shadow-sm ${
                                                    integrityScore >= 80 
                                                        ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-600" 
                                                        : integrityScore >= 60 
                                                            ? "bg-amber-500/5 border-amber-500/15 text-amber-600" 
                                                            : "bg-red-500/5 border-red-500/15 text-red-600"
                                                }`}>
                                                    {integrityScore} / 100
                                                </span>
                                            </td>

                                            {/* Action View Detail */}
                                            <td className="py-5 text-right pr-8">
                                                <button
                                                    id={`btn-view-timeline-${report._id}`}
                                                    onClick={() => handleViewDetail(app?._id || app?.id)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-gray-800 active:scale-95 shadow-md shadow-black/10 cursor-pointer"
                                                >
                                                    <Eye size={12} />
                                                    Audit Trail
                                                    <ChevronRight size={10} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Timline Detail Overlay Modal */}
            {showProctoringDetail && (
                <ProctoringDetail
                    applicationId={selectedApplicationId}
                    onClose={() => {
                        setShowProctoringDetail(false);
                        setSelectedApplicationId(null);
                    }}
                />
            )}
        </div>
    );
}
