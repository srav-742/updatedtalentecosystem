import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Filter, MoreVertical, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const Applicants = () => {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [searchTerm, setSearchTerm] = useState('');
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const targetJobId = searchParams.get('jobId');

    // Menu State
    const [activeMenuId, setActiveMenuId] = useState(null);

    useEffect(() => {
        const fetchApplicants = async () => {
            setLoading(true);
            try {
                const userId = user.uid || user._id || user.id;
                const res = await axios.get(`http://127.0.0.1:5000/api/applications/recruiter/${userId}`);
                let mapped = res.data.map(app => ({
                    id: app._id,
                    jobId: app.jobId?._id,
                    name: app.applicantName || 'Anonymous',
                    email: app.applicantEmail || 'No Email',
                    job: app.jobId?.title || 'Unknown Job',
                    resumeScore: app.resumeMatchPercent,
                    assessmentScore: app.assessmentScore,
                    interviewScore: app.interviewScore,
                    finalScore: app.finalScore,
                    status: app.status,
                    resultsVisibleAt: app.resultsVisibleAt
                }));

                if (targetJobId) {
                    mapped = mapped.filter(app => app.jobId === targetJobId);
                }
                setApplicants(mapped);
            } catch (error) {
                console.error("Failed to fetch applicants:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchApplicants();
    }, [targetJobId]);

    // Handle Search Filter
    const filteredApplicants = applicants.filter(app => {
        const term = searchTerm.toLowerCase();
        return (
            app.name.toLowerCase().includes(term) ||
            app.job.toLowerCase().includes(term) ||
            app.email.toLowerCase().includes(term)
        );
    });

    // Handle Status Update
    const handleStatusUpdate = async (id, newStatus) => {
        try {
            setActiveMenuId(null);
            // Optimistic update
            setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));

            await axios.put(`http://127.0.0.1:5000/api/applications/${id}/status`, { status: newStatus });
        } catch (error) {
            console.error("Failed to update status:", error);
            // Revert on error (could fetch again, but alert for now)
            alert("Failed to update status. Please try again.");
        }
    };

    return (
        <div className="space-y-8 min-h-[80vh]" onClick={() => setActiveMenuId(null)}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Applicants</h1>
                    <p className="text-gray-400">Review and shortlist candidates based on skill match scores.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search applicants..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all w-64 text-sm font-medium"
                        />
                    </div>
                </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-xl overflow-hidden relative">
                <div className="overflow-x-auto min-h-[400px]">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <Users size={200} />
                    </div>
                    <table className="w-full text-left relative z-10">
                        <thead>
                            <tr className="border-b border-white/10 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                                <th className="pb-6 pt-0 pl-4 text-left">Candidate Info</th>
                                <th className="pb-6 pt-0 text-center">Resume Match %</th>
                                <th className="pb-6 pt-0 text-center">Assessment</th>
                                <th className="pb-6 pt-0 text-center">Interview</th>
                                <th className="pb-6 pt-0 text-center">Final Score</th>
                                <th className="pb-6 pt-0 text-center">Status</th>
                                <th className="pb-6 pt-0 text-right pr-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center text-gray-500 italic">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                                            Reading Applicant Ledger...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredApplicants.length > 0 ? (
                                filteredApplicants.map((app) => (
                                    <tr key={app.id} className="group transition-all hover:bg-white/[0.02]">
                                        <td className="py-6 pl-4">
                                            <div className="flex items-center gap-4">
                                                {app.profilePic ? (
                                                    <img
                                                        src={app.profilePic}
                                                        alt={app.name}
                                                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                                                        onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-teal-500/20 border border-white/10 flex items-center justify-center font-bold text-sm text-blue-400">
                                                        {app.name[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{app.name}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5 font-bold uppercase tracking-widest">{app.job}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 text-center">
                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-400 font-bold text-sm">
                                                {app.resumeScore}%
                                            </div>
                                        </td>
                                        <td className="py-6 text-center">
                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-400 font-bold text-sm">
                                                {app.assessmentScore || '-'}%
                                            </div>
                                        </td>
                                        <td className="py-6 text-center">
                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/5 border border-purple-500/10 text-purple-400 font-bold text-sm">
                                                {app.interviewScore || '-'}%
                                            </div>
                                        </td>
                                        <td className="py-6 text-center">
                                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-lg">
                                                {app.finalScore || '-'}
                                            </div>
                                        </td>
                                        <td className="py-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${app.status === 'SHORTLISTED'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : app.status === 'REJECTED'
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                }`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="py-6 text-right pr-4 relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === app.id ? null : app.id);
                                                }}
                                                className={`p-2 rounded-xl transition-all ${activeMenuId === app.id ? 'bg-white text-black' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {activeMenuId === app.id && (
                                                <div className="absolute right-0 mt-2 w-48 bg-[#1a1d24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                                                    <div className="py-1">
                                                        <button
                                                            onClick={() => handleStatusUpdate(app.id, 'SHORTLISTED')}
                                                            className="w-full text-left px-4 py-3 text-xs font-bold text-emerald-400 hover:bg-white/5 flex items-center gap-2"
                                                        >
                                                            <CheckCircle2 size={14} /> Mark Shortlisted
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(app.id, 'REJECTED')}
                                                            className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:bg-white/5 flex items-center gap-2"
                                                        >
                                                            <CheckCircle2 size={14} className="rotate-45" /> Mark Rejected
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(app.id, 'ELIGIBLE')}
                                                            className="w-full text-left px-4 py-3 text-xs font-bold text-gray-400 hover:bg-white/5 flex items-center gap-2 border-t border-white/5"
                                                        >
                                                            <Filter size={14} /> Reset Status
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <div className="flex flex-col items-center opacity-40">
                                            <Users size={48} className="mb-4" />
                                            <p className="text-xl font-bold uppercase tracking-widest">{searchTerm ? 'No matches found' : 'No Applicants Yet'}</p>
                                            <p className="text-xs mt-2 font-medium">{searchTerm ? 'Try adjusting your search criteria.' : 'Candidates will appear here once they apply to your jobs.'}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4 text-xs text-gray-500 italic">
                <CheckCircle2 size={16} className="text-emerald-500 flex-none" />
                <p>Status logic is automatically handled by the system based on matching score, but you can manually override decisions using the action menu.</p>
            </div>
        </div>
    );
};

export default Applicants;
