import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    Ticket, 
    X, 
    Check, 
    Sparkles, 
    ShieldCheck, 
    Loader2, 
    Crown, 
    Zap, 
    Building2,
    Users,
    AlertCircle,
    Briefcase,
    ChevronDown
} from 'lucide-react';
import { loadRazorpayScript } from '../../utils/loadRazorpayScript';
import { API_URL } from '../../config';

const FALLBACK_PACKAGES = [
    {
        packageId: 'starter',
        name: 'Starter Package',
        ticketCount: 5,
        price: 999,
        badge: 'Starter',
        features: [
            '5 Candidate AI Evaluations',
            'Full Profiles & Resumes',
            '4-Layer AI Proctoring',
            'Transcripts & Audio Playback'
        ],
        popular: false,
        icon: Zap,
        accentColor: '#2563eb',
        badgeBg: '#eff6ff',
        badgeText: '#1d4ed8'
    },
    {
        packageId: 'growth',
        name: 'Growth Package',
        ticketCount: 25,
        price: 3999,
        badge: '★ Best Value',
        features: [
            '25 Candidate AI Evaluations',
            'Live Code Defense & Playback',
            'Real-Time Proctoring Audit',
            'Priority Recruiter Support'
        ],
        popular: true,
        icon: Crown,
        accentColor: '#d97706',
        badgeBg: '#fef3c7',
        badgeText: '#b45309'
    },
    {
        packageId: 'business',
        name: 'Business Package',
        ticketCount: 50,
        price: 6999,
        badge: 'High Volume',
        features: [
            '50 Candidate AI Evaluations',
            'Custom Coding Challenges',
            'Deep Semantic Talent Search',
            'CSV & JSON Pipeline Export'
        ],
        popular: false,
        icon: Users,
        accentColor: '#0d9488',
        badgeBg: '#f0fdfa',
        badgeText: '#0f766e'
    },
    {
        packageId: 'enterprise',
        name: 'Enterprise Package',
        ticketCount: 100,
        price: 11999,
        badge: 'Enterprise',
        features: [
            '100+ Candidate AI Evaluations',
            'Multi-Stage Technical Rounds',
            'Custom Question Bank Sync',
            '99.9% Uptime & Dedicated SLA'
        ],
        popular: false,
        icon: Building2,
        accentColor: '#7c3aed',
        badgeBg: '#f5f3ff',
        badgeText: '#6d28d9'
    }
];

export default function BuyTicketsModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    user, 
    currentTickets = 0,
    targetJobId = null,
    initialJobId = null
}) {
    const navigate = useNavigate();
    const [packages, setPackages] = useState(FALLBACK_PACKAGES);
    const [selectedPackageId, setSelectedPackageId] = useState('growth');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Jobs state
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [jobsLoading, setJobsLoading] = useState(false);

    const resolvedApiUrl = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        ? 'http://localhost:5000/api'
        : (API_URL || 'https://updatedtalentecosystem-kl0c.onrender.com/api');

    const userId = user?.uid || user?._id || user?.id;

    useEffect(() => {
        const preferred = targetJobId || initialJobId;
        setSelectedJobId(preferred ? String(preferred) : '');
    }, [targetJobId, initialJobId, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setErrorMsg('');
            setSuccessMsg('');
            return;
        }

        // Fetch dynamic packages from backend
        axios.get(`${resolvedApiUrl}/tickets/packages`)
            .then(res => {
                if (res.data?.success && Array.isArray(res.data.packages) && res.data.packages.length > 0) {
                    const mapped = res.data.packages.map((pkg, idx) => ({
                        ...pkg,
                        icon: idx === 1 ? Crown : idx === 2 ? Users : idx === 3 ? Building2 : Zap,
                        badge: idx === 1 ? '★ Best Value' : (pkg.badge || 'Package'),
                        features: (pkg.features || []).slice(0, 4).map(f => {
                            if (f.includes('Assessments & Interviews')) return f.replace('Assessments & Interviews', 'AI Evaluations');
                            if (f.includes('Skill Assessments')) return f.replace('Skill Assessments & Interviews', 'AI Evaluations');
                            return f;
                        }),
                        accentColor: idx === 1 ? '#d97706' : idx === 2 ? '#0d9488' : idx === 3 ? '#7c3aed' : '#2563eb',
                        badgeBg: idx === 1 ? '#fef3c7' : idx === 2 ? '#f0fdfa' : idx === 3 ? '#f5f3ff' : '#eff6ff',
                        badgeText: idx === 1 ? '#b45309' : idx === 2 ? '#0f766e' : idx === 3 ? '#6d28d9' : '#1d4ed8'
                    }));
                    setPackages(mapped);
                }
            })
            .catch(err => {
                console.warn('[BUY-TICKETS-MODAL] Fallback to default packages:', err.message);
            });

        // Fetch recruiter jobs to allow job-specific ticket purchase
        if (userId) {
            setJobsLoading(true);
            axios.get(`${resolvedApiUrl}/jobs/recruiter/${userId}`)
                .then(res => {
                    const jobList = Array.isArray(res.data) ? res.data : (res.data?.jobs || []);
                    setJobs(jobList);

                    const preferred = targetJobId || initialJobId;
                    if (preferred && jobList.some(j => String(j._id) === String(preferred))) {
                        setSelectedJobId(String(preferred));
                    } else if (jobList.length === 1) {
                        setSelectedJobId(String(jobList[0]._id));
                    } else {
                        setSelectedJobId('');
                    }
                })
                .catch(e => {
                    console.warn('[BUY-TICKETS-MODAL] Failed to fetch recruiter jobs:', e.message);
                })
                .finally(() => {
                    setJobsLoading(false);
                });
        }
    }, [isOpen, resolvedApiUrl, userId, targetJobId, initialJobId]);

    if (!isOpen) return null;

    const selectedPkg = packages.find(p => p.packageId === selectedPackageId) || packages[0];
    const activeSelectedJob = jobs.find(j => String(j._id) === String(selectedJobId));

    const handleCheckout = async () => {
        if (!user) {
            setErrorMsg('You must be logged in as a recruiter to purchase tickets.');
            return;
        }
        if (!activeSelectedJob) {
            setErrorMsg(jobs.length === 0
                ? 'Post a job first. Interview tickets must be assigned to a specific job.'
                : 'Select the job that these interview tickets should be assigned to.');
            return;
        }

        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            setErrorMsg('Failed to connect to payment gateway. Please check your internet connection.');
            setLoading(false);
            return;
        }

        try {
            const recruiterId = user.uid || user._id || user.id;

            // 1. Create order on backend (including jobId)
            const orderRes = await axios.post(`${resolvedApiUrl}/tickets/order`, {
                recruiterId,
                packageId: selectedPkg.packageId,
                jobId: selectedJobId
            });

            if (!orderRes.data?.success) {
                throw new Error(orderRes.data?.message || 'Failed to initialize ticket order.');
            }

            const { orderId, amount, currency, key } = orderRes.data;

            // 2. Open Razorpay Modal
            const options = {
                key: key || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_Sr8a8DZ72jBYCu',
                amount: amount,
                currency: currency || 'INR',
                name: 'Hire1Percent',
                description: `Purchase ${selectedPkg.ticketCount} Interview Tickets${activeSelectedJob ? ` for ${activeSelectedJob.title}` : ''}`,
                image: 'https://www.hire1percent.com/logo.png',
                order_id: orderId,
                handler: async function (response) {
                    setVerifying(true);
                    setLoading(false);

                    try {
                        // 3. Verify signature on backend & credit tickets to specific job
                        const verifyRes = await axios.post(`${resolvedApiUrl}/tickets/verify`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            packageId: selectedPkg.packageId,
                            recruiterId,
                            jobId: selectedJobId
                        });

                        if (verifyRes.data?.success) {
                            const jobNameText = activeSelectedJob ? ` for "${activeSelectedJob.title}"` : '';
                            setSuccessMsg(`Success! ${selectedPkg.ticketCount} interview tickets credited${jobNameText} to your wallet.`);
                            
                            try {
                                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                                storedUser.isPro = true;
                                storedUser.hiringPattern = 'Premium Recruiter';
                                storedUser.availableTickets = verifyRes.data?.wallet?.availableTickets;
                                localStorage.setItem('user', JSON.stringify(storedUser));

                                if (verifyRes.data?.tokens) {
                                    localStorage.setItem('authSessionTokens', JSON.stringify(verifyRes.data.tokens));
                                    if (verifyRes.data.tokens.accessToken) {
                                        localStorage.setItem('accessTokenUUID', verifyRes.data.tokens.accessToken);
                                    }
                                }
                                if (verifyRes.data?.client) {
                                    localStorage.setItem('clientCredentials', JSON.stringify(verifyRes.data.client));
                                }
                            } catch (e) {}

                            window.dispatchEvent(new Event('wallet-update'));

                            setTimeout(() => {
                                if (onSuccess) onSuccess(verifyRes.data);
                                onClose();
                            }, 1500);
                        } else {
                            setErrorMsg(verifyRes.data?.message || 'Verification could not be confirmed.');
                        }
                    } catch (verifyErr) {
                        console.error('[BUY-TICKETS-MODAL] Verification failed:', verifyErr);
                        setErrorMsg(verifyErr.response?.data?.message || 'Payment verification failed.');
                    } finally {
                        setVerifying(false);
                    }
                },
                prefill: {
                    name: user.name || '',
                    email: user.email || ''
                },
                theme: {
                    color: '#2563EB'
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (resp) {
                setErrorMsg(`Payment failed: ${resp.error?.description || 'Transaction cancelled.'}`);
                setLoading(false);
            });
            rzp.open();
        } catch (err) {
            console.error('[BUY-TICKETS-MODAL] Order creation failed:', err);
            setErrorMsg(err.response?.data?.message || err.message || 'Failed to start payment checkout.');
            setLoading(false);
        }
    };

    return (
        <div className="buy-tickets-modal-overlay fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 6 }}
                transition={{ duration: 0.18 }}
                className="buy-tickets-modal-container relative w-full max-w-[980px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                style={{ maxHeight: 'calc(100vh - 20px)' }}
            >
                {/* 1. Header — High contrast, crisp white text guaranteed */}
                <div 
                    className="modal-header px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0"
                    style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                            <Ticket size={20} style={{ color: '#60a5fa' }} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black tracking-tight" style={{ color: '#ffffff' }}>
                                    Buy Interview Tickets
                                </h2>
                                <span 
                                    className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
                                    style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(96, 165, 250, 0.4)' }}
                                >
                                    Instant Credit
                                </span>
                            </div>
                            <p className="text-[11px] font-medium" style={{ color: '#94a3b8' }}>
                                1 Ticket = 1 Full Candidate Assessment, Proctored Coding & AI Interview
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="Close"
                        style={{ color: '#cbd5e1' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 2. Subbar — Balance & Policy Info */}
                <div 
                    className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0"
                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                >
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-700" style={{ color: '#334155' }}>Current Balance:</span>
                        <span 
                            className="px-2.5 py-0.5 rounded-full font-black text-xs inline-flex items-center gap-1"
                            style={{ 
                                backgroundColor: currentTickets > 0 ? '#dcfce7' : '#fee2e2',
                                color: currentTickets > 0 ? '#166534' : '#991b1b',
                                border: `1px solid ${currentTickets > 0 ? '#bbf7d0' : '#fecaca'}`
                            }}
                        >
                            {currentTickets} {currentTickets === 1 ? 'Ticket' : 'Tickets'} Available
                        </span>
                        {activeSelectedJob && (
                            <span 
                                className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                                style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                            >
                                Job: {activeSelectedJob.title}
                            </span>
                        )}
                    </div>
                    <div className="text-[11px] font-medium" style={{ color: '#64748b' }}>
                        ⚡ Job posting is 100% free · Tickets only deducted when candidate starts
                    </div>
                </div>

                {/* 3. Job Selector (Purchases are always assigned to one job) */}
                {jobs.length === 1 && (
                    <div className="mx-5 mt-2.5 py-1.5 px-3 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs shrink-0">
                        <div className="flex items-center gap-2 text-slate-800 font-semibold truncate">
                            <Briefcase size={14} className="text-blue-600 shrink-0" />
                            <span>Assigning tickets to:</span>
                            <strong className="text-blue-900 truncate">{jobs[0].title}</strong>
                        </div>
                        <span 
                            className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0 shadow-2xs"
                            style={{ color: '#ffffff', backgroundColor: '#2563eb' }}
                        >
                            Active Requisition
                        </span>
                    </div>
                )}

                {jobs.length >= 2 && (
                    <div className="mx-5 mt-2.5 py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0">
                        <label className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0" style={{ color: '#334155' }}>
                            <Briefcase size={14} className="text-blue-600" />
                            <span>Target Requisition:</span>
                        </label>
                        <select
                            value={selectedJobId}
                            onChange={(e) => setSelectedJobId(e.target.value)}
                            className="flex-1 max-w-sm px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                            style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                        >
                            <option value="" style={{ color: '#64748b', backgroundColor: '#ffffff' }}>Select a job...</option>
                            {jobs.map((j, idx) => (
                                <option key={j._id} value={j._id} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                                    Job #{idx + 1}: {j.title} {j.company ? `(${j.company})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {jobsLoading && (
                    <div className="mx-5 mt-2.5 py-2 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 shrink-0">
                        Loading your posted jobs...
                    </div>
                )}

                {!jobsLoading && jobs.length === 0 && (
                    <div className="mx-5 mt-2.5 py-2.5 px-3 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 shrink-0 flex items-center justify-between gap-3">
                        <span>Post a job first. Every ticket package is assigned to one job so candidates can only use that job’s ticket balance.</span>
                        <button
                            type="button"
                            onClick={() => {
                                onClose?.();
                                navigate('/recruiter/post-job');
                            }}
                            className="px-3 py-1.5 rounded-md bg-slate-900 text-white font-bold whitespace-nowrap"
                        >
                            Post a Job
                        </button>
                    </div>
                )}

                {/* 4. Body Content — Error/Success alerts & 4 Package Cards */}
                <div className="px-5 py-3 flex-1 overflow-hidden flex flex-col justify-between">
                    {/* Error / Success Alerts */}
                    {errorMsg && (
                        <div className="mb-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0 text-rose-600" />
                            <span className="font-semibold">{errorMsg}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div className="mb-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                            <Sparkles size={15} className="shrink-0 text-emerald-600" />
                            <span className="font-semibold">{successMsg}</span>
                        </div>
                    )}

                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-600" style={{ color: '#475569' }}>
                            Select Candidate Assessment Package:
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400" style={{ color: '#94a3b8' }}>
                            Unused tickets never expire
                        </span>
                    </div>

                    {/* 4 Cards Grid — Perfect fit, no scrolling */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {packages.map((pkg) => {
                            const isSelected = selectedPackageId === pkg.packageId;
                            const IconComp = pkg.icon || Ticket;

                            return (
                                <div
                                    key={pkg.packageId}
                                    onClick={() => setSelectedPackageId(pkg.packageId)}
                                    className={`relative p-3.5 rounded-xl border-2 transition-all duration-150 cursor-pointer flex flex-col justify-between select-none ${
                                        isSelected 
                                            ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20' 
                                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 shadow-2xs'
                                    }`}
                                    style={{
                                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                        borderColor: isSelected ? '#2563eb' : '#e2e8f0'
                                    }}
                                >
                                    {pkg.popular && (
                                        <div 
                                            className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-xs"
                                            style={{ backgroundColor: '#d97706' }}
                                        >
                                            ★ Most Popular
                                        </div>
                                    )}

                                    <div>
                                        {/* Top Icon & Badge */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div 
                                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold shadow-2xs"
                                                style={{ 
                                                    backgroundColor: isSelected ? '#2563eb' : '#f1f5f9', 
                                                    color: isSelected ? '#ffffff' : '#1e293b' 
                                                }}
                                            >
                                                <IconComp size={16} />
                                            </div>
                                            <span 
                                                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border"
                                                style={{
                                                    backgroundColor: pkg.badgeBg || (isSelected ? '#dbeafe' : '#f8fafc'),
                                                    color: pkg.badgeText || (isSelected ? '#1e40af' : '#475569'),
                                                    borderColor: isSelected ? '#bfdbfe' : '#e2e8f0'
                                                }}
                                            >
                                                {pkg.badge}
                                            </span>
                                        </div>

                                        {/* Package Title */}
                                        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight" style={{ color: '#0f172a' }}>
                                            {pkg.name}
                                        </h3>

                                        {/* Price */}
                                        <div className="mt-1 flex items-baseline gap-1">
                                            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight" style={{ color: '#0f172a' }}>
                                                ₹{pkg.price.toLocaleString('en-IN')}
                                            </span>
                                        </div>

                                        {/* Ticket Count & Cost per candidate */}
                                        <div className="mt-0.5 text-xs font-black" style={{ color: '#2563eb' }}>
                                            {pkg.ticketCount} Candidate Tickets
                                        </div>
                                        <p className="text-[10px] font-semibold text-slate-500" style={{ color: '#64748b' }}>
                                            (₹{Math.round(pkg.price / pkg.ticketCount)} / interview)
                                        </p>

                                        {/* 4 Feature Bullets */}
                                        <ul className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1.5">
                                            {pkg.features.slice(0, 4).map((feat, fIdx) => (
                                                <li key={fIdx} className="text-[11px] leading-tight flex items-start gap-1.5" style={{ color: '#334155' }}>
                                                    <Check size={12} className="text-blue-600 shrink-0 mt-0.5" strokeWidth={3} />
                                                    <span className="font-medium truncate">{feat}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Card Select Button */}
                                    <div className="mt-3">
                                        {isSelected ? (
                                            <div 
                                                className="ticket-btn-selected w-full py-1.5 px-2 rounded-lg text-[11px] font-black uppercase tracking-wider text-center shadow-xs cursor-pointer"
                                                style={{
                                                    backgroundColor: '#0f172a',
                                                    color: '#ffffff'
                                                }}
                                            >
                                                <span style={{ color: '#ffffff' }}>✓ Selected</span>
                                            </div>
                                        ) : (
                                            <div 
                                                className="ticket-btn-unselected w-full py-1.5 px-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-center border transition shadow-2xs hover:bg-slate-100 cursor-pointer"
                                                style={{
                                                    backgroundColor: '#f8fafc',
                                                    color: '#0f172a',
                                                    borderColor: '#cbd5e1'
                                                }}
                                            >
                                                <span style={{ color: '#0f172a' }}>Select Package</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 5. Footer — Guaranteed visible high-contrast action buttons */}
                <div 
                    className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0"
                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                >
                    <div className="flex items-center gap-2.5 text-xs">
                        <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                        <div className="leading-tight">
                            <span className="font-bold text-slate-800" style={{ color: '#1e293b' }}>100% Secure Razorpay Checkout</span>
                            <span className="block text-[10px] text-slate-500" style={{ color: '#64748b' }}>Instant ticket credit & automatic client activation</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                            style={{ backgroundColor: '#ffffff', color: '#334155', borderColor: '#cbd5e1' }}
                        >
                            <span style={{ color: '#334155' }}>Cancel</span>
                        </button>
                        <button
                            type="button"
                            disabled={loading || verifying || jobsLoading || !activeSelectedJob}
                            onClick={handleCheckout}
                            className="ticket-btn-checkout px-5 py-2 rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                            style={{ 
                                backgroundColor: '#2563eb', 
                                color: '#ffffff'
                            }}
                        >
                            {verifying ? (
                                <>
                                    <Loader2 size={15} className="animate-spin text-white" />
                                    <span style={{ color: '#ffffff' }} className="font-extrabold">Verifying Payment...</span>
                                </>
                            ) : loading ? (
                                <>
                                    <Loader2 size={15} className="animate-spin text-white" />
                                    <span style={{ color: '#ffffff' }} className="font-extrabold">Opening Checkout...</span>
                                </>
                            ) : (
                                <>
                                    <Ticket size={15} style={{ color: '#ffffff' }} />
                                    <span style={{ color: '#ffffff' }} className="font-extrabold">
                                        {!activeSelectedJob
                                            ? (jobs.length === 0 ? 'Post a Job First' : 'Select a Job First')
                                            : `Buy ${selectedPkg.ticketCount} Tickets (₹${selectedPkg.price.toLocaleString('en-IN')})`}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
