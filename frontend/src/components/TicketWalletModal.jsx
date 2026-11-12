import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wallet, 
    Ticket, 
    X, 
    Plus, 
    Users, 
    CheckCircle2, 
    AlertCircle, 
    Briefcase, 
    ArrowUpRight, 
    Clock, 
    Sparkles, 
    ChevronDown, 
    Layers,
    ShieldCheck,
    RotateCcw
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../firebase';

export default function TicketWalletModal({ 
    isOpen, 
    onClose, 
    userId, 
    onOpenBuyTickets 
}) {
    const [walletData, setWalletData] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedJobFilter, setSelectedJobFilter] = useState('ALL');
    const [activeTab, setActiveTab] = useState('breakdown'); // 'breakdown' | 'history'

    const resolvedApiUrl = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        ? 'http://localhost:5000/api'
        : (API_URL || 'https://updatedtalentecosystem-kl0c.onrender.com/api');

    const fetchWallet = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [wRes, hRes] = await Promise.all([
                axios.get(`${resolvedApiUrl}/tickets/wallet/${userId}`),
                axios.get(`${resolvedApiUrl}/tickets/history/${userId}`).catch(() => ({ data: { history: [] } }))
            ]);

            if (wRes.data?.success) {
                setWalletData(wRes.data.wallet);
            }
            if (hRes.data?.success) {
                setTransactions(hRes.data.history || []);
            }
        } catch (err) {
            console.error('[TICKET-WALLET-MODAL] Error loading wallet:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && userId) {
            fetchWallet();
        }
    }, [isOpen, userId, resolvedApiUrl]);

    if (!isOpen) return null;

    const jobs = walletData?.jobs || [];
    const totalPurchased = walletData?.totalPurchased || 0;
    const totalConsumed = walletData?.totalConsumed || 0;
    const availableTickets = walletData?.availableTickets || 0;

    // Filtered Job Data
    const selectedJob = selectedJobFilter !== 'ALL' 
        ? jobs.find(j => String(j.jobId) === String(selectedJobFilter))
        : null;

    return (
        <div className="ticket-wallet-modal-overlay fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="ticket-wallet-modal-container relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6"
            >
                {/* 1. Header */}
                <div 
                    className="modal-header relative px-6 py-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between shrink-0"
                    style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
                            <Wallet size={20} style={{ color: '#60a5fa' }} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black tracking-tight" style={{ color: '#ffffff' }}>Interview Tickets Wallet</h2>
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-bold text-blue-300 uppercase">
                                    Live Balance
                                </span>
                            </div>
                            <p className="text-xs text-slate-300" style={{ color: '#94a3b8' }}>
                                1 Ticket = 1 Full Candidate Assessment & Proctored AI Interview
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchWallet}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                            title="Refresh Balance"
                        >
                            <RotateCcw size={17} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* 2. Combined Summary Card (Total Tickets Bought, Attended & Left) */}
                <div className="p-6 md:p-8 space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                        {/* Background decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">
                                    Overall Combined Summary
                                </span>
                                <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
                                    All Jobs Consolidated Pool
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    if (onOpenBuyTickets) onOpenBuyTickets(selectedJobFilter !== 'ALL' ? selectedJobFilter : null);
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-lg shadow-blue-500/30 cursor-pointer shrink-0"
                            >
                                <Plus size={14} />
                                <span>Buy More Tickets</span>
                            </button>
                        </div>

                        {/* 3 Core KPI Numbers */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Total Bought */}
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                                <div className="flex items-center justify-between text-slate-300 text-xs font-bold">
                                    <span>Total Tickets Bought</span>
                                    <Ticket size={16} className="text-blue-400" />
                                </div>
                                <div className="mt-2 text-3xl font-black text-white">
                                    {totalPurchased}
                                </div>
                                <div className="mt-1 text-[11px] text-blue-200/80 font-medium">
                                    Combined across all jobs
                                </div>
                            </div>

                            {/* Total Attended / Consumed */}
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                                <div className="flex items-center justify-between text-slate-300 text-xs font-bold">
                                    <span>Candidates Attended</span>
                                    <Users size={16} className="text-amber-400" />
                                </div>
                                <div className="mt-2 text-3xl font-black text-amber-300">
                                    {totalConsumed}
                                </div>
                                <div className="mt-1 text-[11px] text-amber-200/80 font-medium">
                                    Tickets used for assessments
                                </div>
                            </div>

                            {/* Total Remaining Balance */}
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                                <div className="flex items-center justify-between text-slate-300 text-xs font-bold">
                                    <span>Total Tickets Left</span>
                                    <Sparkles size={16} className="text-emerald-400" />
                                </div>
                                <div className="mt-2 text-3xl font-black text-emerald-400">
                                    {availableTickets}
                                </div>
                                <div className="mt-1 text-[11px] text-emerald-200/80 font-medium">
                                    Ready for incoming candidates
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center justify-between border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setActiveTab('breakdown')}
                                className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 cursor-pointer ${
                                    activeTab === 'breakdown'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Job Ticket Breakdown ({jobs.length} Jobs)
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 cursor-pointer ${
                                    activeTab === 'history'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Transaction History ({transactions.length})
                            </button>
                        </div>
                    </div>

                    {/* Tab 1: Job-Specific Breakdown View */}
                    {activeTab === 'breakdown' && (
                        <div className="space-y-5">
                            {/* Job Selection Dropdown */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                        <Briefcase size={15} className="text-blue-600" />
                                        <span>Select Job to Inspect Tickets:</span>
                                    </label>
                                    <span className="text-[11px] text-slate-500">
                                        Switch between jobs to see individual purchased, attended & left tickets
                                    </span>
                                </div>

                                <div className="relative">
                                    <select
                                        value={selectedJobFilter}
                                        onChange={(e) => setSelectedJobFilter(e.target.value)}
                                        className="w-full appearance-none px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs pr-10 cursor-pointer"
                                    >
                                        <option value="ALL">
                                            📊 All Jobs Combined Overview
                                        </option>
                                        {jobs.map((j, idx) => (
                                            <option key={j.jobId || idx} value={j.jobId}>
                                                Job {idx + 1}: {j.jobTitle || 'Untitled Role'} — ({j.availableTickets || 0} tickets left)
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>

                            {/* If a Specific Job is selected from the dropdown */}
                            {selectedJob && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 rounded-2xl border-2 border-blue-500/30 bg-blue-50/30 space-y-4"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                                                Selected Job Requisition
                                            </span>
                                            <h4 className="text-base font-black text-slate-900">
                                                {selectedJob.jobTitle}
                                            </h4>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (onOpenBuyTickets) onOpenBuyTickets(selectedJob.jobId);
                                            }}
                                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                                        >
                                            <Plus size={13} />
                                            <span>Buy Tickets for this Job</span>
                                        </button>
                                    </div>

                                    {/* Detailed 3-metrics row for this specific job */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                                            <div className="text-[11px] font-bold text-slate-500 uppercase">
                                                Tickets Bought for this Job
                                            </div>
                                            <div className="text-2xl font-black text-slate-900 mt-1">
                                                {selectedJob.totalPurchased || 0}
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                                            <div className="text-[11px] font-bold text-slate-500 uppercase">
                                                Candidates Attended
                                            </div>
                                            <div className="text-2xl font-black text-amber-600 mt-1">
                                                {selectedJob.totalConsumed || 0}
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                                            <div className="text-[11px] font-bold text-slate-500 uppercase">
                                                Tickets Left for this Job
                                            </div>
                                            <div className="text-2xl font-black text-emerald-600 mt-1">
                                                {selectedJob.availableTickets || 0}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Side-by-Side Jobs Table List */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    All Jobs Breakdown
                                </h4>

                                {jobs.length === 0 ? (
                                    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs">
                                        No active jobs posted yet. When you post a job, its interview tickets will appear here.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                                <tr>
                                                    <th className="px-4 py-3">Job Title</th>
                                                    <th className="px-4 py-3 text-center">Tickets Bought</th>
                                                    <th className="px-4 py-3 text-center">Candidates Attended</th>
                                                    <th className="px-4 py-3 text-center">Tickets Left</th>
                                                    <th className="px-4 py-3 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium">
                                                {jobs.map((job, idx) => (
                                                    <tr key={job.jobId || idx} className="hover:bg-slate-50/70 transition">
                                                        <td className="px-4 py-3 font-bold text-slate-900">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                                                                    #{idx + 1}
                                                                </span>
                                                                <span>{job.jobTitle || 'Untitled Role'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-slate-800">
                                                            {job.totalPurchased || 0}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-amber-600">
                                                            {job.totalConsumed || 0}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                                                (job.availableTickets || 0) > 0 
                                                                    ? 'bg-emerald-100 text-emerald-800' 
                                                                    : 'bg-rose-100 text-rose-800'
                                                            }`}>
                                                                {job.availableTickets || 0} Left
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                onClick={() => {
                                                                    if (onOpenBuyTickets) onOpenBuyTickets(job.jobId);
                                                                }}
                                                                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition cursor-pointer"
                                                            >
                                                                + Buy Tickets
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Transaction History */}
                    {activeTab === 'history' && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Ticket Ledger Audit History
                            </h4>

                            {transactions.length === 0 ? (
                                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs">
                                    No ticket transactions recorded yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white max-h-80 overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Type</th>
                                                <th className="px-4 py-3">Job / Role</th>
                                                <th className="px-4 py-3 text-center">Quantity</th>
                                                <th className="px-4 py-3">Notes</th>
                                                <th className="px-4 py-3 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {transactions.map((tx) => (
                                                <tr key={tx._id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                                                        {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-bold">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                                                            tx.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {tx.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 font-medium text-slate-800">
                                                        {tx.jobTitle || tx.jobId?.title || 'General Pool'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center font-black">
                                                        {tx.type === 'CREDIT' ? `+${tx.quantity}` : `-${tx.quantity}`}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-slate-500 text-[11px] truncate max-w-xs">
                                                        {tx.notes || '-'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-emerald-600 uppercase text-[11px]">
                                                        {tx.status}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

