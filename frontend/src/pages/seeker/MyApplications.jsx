import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, Building2, Search, ArrowUpRight } from 'lucide-react';
import axios from 'axios';

const MyApplications = () => {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApps = async () => {
            try {
                const userId = user.uid || user._id || user.id;
                const res = await axios.get(`http://127.0.0.1:5000/api/applications/seeker/${userId}`);
                setApplications(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (user.uid || user._id || user.id) fetchApps();
    }, [user.uid, user._id, user.id]);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'SHORTLISTED': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
            case 'REJECTED': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'ELIGIBLE': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    };

    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-4xl font-black mb-2 tracking-tight uppercase">Application <span className="text-teal-400">Ledger</span></h1>
                <p className="text-gray-500 font-medium">Track your recruitment history on the eco system.</p>
            </div>

            <div className="bg-white/[0.03] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="p-20 text-center text-teal-400 font-black uppercase tracking-widest italic animate-pulse">Syncing Applications...</div>
                ) : applications.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 text-gray-500 text-[10px] uppercase font-black tracking-[0.2em]">
                                    <th className="p-8 pl-10">Job Opportunity</th>
                                    <th className="p-8 text-center">Resume Match</th>
                                    <th className="p-8 text-center">Assessment</th>
                                    <th className="p-8 text-center">AI Interview</th>
                                    <th className="p-8 text-center">Final Score</th>
                                    <th className="p-8 text-right pr-10">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {applications.map((app) => (
                                    <tr key={app._id} className="group hover:bg-white/[0.01] transition-all">
                                        <td className="p-8 pl-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 transition-all">
                                                    <Building2 size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-white uppercase tracking-tight text-lg leading-none mb-1 group-hover:text-teal-400 transition-colors">{app.jobId?.title}</p>
                                                    <p className="text-xs text-gray-500 font-black uppercase tracking-widest">{app.jobId?.recruiterId?.company?.name || 'Top Company'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/5 border border-teal-500/10 text-teal-400 font-black text-lg">
                                                {app.resumeMatchPercent}%
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-blue-400 font-black text-lg">
                                                {app.resultsVisibleAt && new Date() < new Date(app.resultsVisibleAt) ? '--' : (app.assessmentScore || '--')}
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/5 border border-purple-500/10 text-purple-400 font-black text-lg">
                                                {app.resultsVisibleAt && new Date() < new Date(app.resultsVisibleAt) ? '--' : (app.interviewScore || '--')}
                                            </div>
                                        </td>
                                        <td className="p-8 text-center font-black text-xl text-white">
                                            {app.resultsVisibleAt && new Date() < new Date(app.resultsVisibleAt) ? '--' : (app.finalScore || '--')}
                                        </td>
                                        <td className="p-8 text-right pr-10">
                                            <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner ${getStatusStyle(app.status)}`}>
                                                {app.resultsVisibleAt && new Date() < new Date(app.resultsVisibleAt) ? 'AUDITING...' : app.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-32 text-center opacity-30 flex flex-col items-center">
                        <Clock size={64} className="mb-6" />
                        <h3 className="text-2xl font-black uppercase tracking-widest">No Applications Recorded</h3>
                        <p className="mt-2 font-medium">Start your journey by applying to available jobs.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyApplications;
