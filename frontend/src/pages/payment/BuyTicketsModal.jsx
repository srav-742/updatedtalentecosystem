import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
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
        badge: 'Small Hiring',
        description: 'Perfect for quick hiring of 1-5 candidate assessments with comprehensive AI evaluation.',
        features: [
            '5 Candidate Assessments & Interviews',
            'Full Candidate Profiles & Resumes',
            'AI Integrity & Proctoring Summaries',
            'Speech-to-Text Transcripts'
        ],
        popular: false,
        icon: Zap,
        accentColor: 'from-blue-600 to-indigo-600',
        badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    },
    {
        packageId: 'growth',
        name: 'Growth Package',
        ticketCount: 25,
        price: 3999,
        badge: 'Most Popular · Best Value',
        description: 'Comprehensive high-speed screening for teams evaluating multiple roles simultaneously.',
        features: [
            '25 Candidate Assessments & Interviews',
            'AI Video Interview Playback & Defense',
            'Real-time Proctoring Logs & Replay Audit',
            'Priority Recruiter Support'
        ],
        popular: true,
        icon: Crown,
        accentColor: 'from-amber-500 to-yellow-500',
        badgeColor: 'bg-amber-500/15 text-amber-600 border-amber-500/30'
    },
    {
        packageId: 'business',
        name: 'Business Package',
        ticketCount: 50,
        price: 6999,
        badge: 'High Volume',
        description: 'Designed for scaling companies running regular department-level hiring drives.',
        features: [
            '50 Candidate Assessments & Interviews',
            'Custom Coding Challenges & AST Execution',
            'Deep Semantic Talent Search & Scorecards',
            'Candidate CSV/JSON Pipeline Exports'
        ],
        popular: false,
        icon: Users,
        accentColor: 'from-teal-500 to-emerald-500',
        badgeColor: 'bg-teal-500/10 text-teal-600 border-teal-500/20'
    },
    {
        packageId: 'enterprise',
        name: 'Enterprise Package',
        ticketCount: 100,
        price: 11999,
        badge: 'Enterprise Scale',
        description: 'Full-scale assessment capacity for campus drives and nationwide hiring.',
        features: [
            '100+ Candidate Assessments & Interviews',
            'Multi-stage Coding, MCQ & AI Technical Interviews',
            'Dedicated Technical Support',
            'Continuous Proctoring & Candidate Audit History'
        ],
        popular: false,
        icon: Building2,
        accentColor: 'from-purple-600 to-pink-500',
        badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
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
    const [packages, setPackages] = useState(FALLBACK_PACKAGES);
    const [selectedPackageId, setSelectedPackageId] = useState('growth');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Jobs state
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(targetJobId || initialJobId || '');
    const [jobsLoading, setJobsLoading] = useState(false);

    const resolvedApiUrl = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        ? 'http://localhost:5000/api'
        : (API_URL || 'https://updatedtalentecosystem-kl0c.onrender.com/api');

    const userId = user?.uid || user?._id || user?.id;

    useEffect(() => {
        const preferred = targetJobId || initialJobId;
        if (preferred) {
            setSelectedJobId(String(preferred));
        }
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
                        accentColor: pkg.accentColor || (idx === 1 ? 'from-amber-500 to-yellow-500' : 'from-blue-600 to-indigo-600'),
                        badgeColor: pkg.badgeColor || 'bg-blue-500/10 text-blue-500 border-blue-500/20'
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
                    } else if (jobList.length >= 2 && !selectedJobId) {
                        setSelectedJobId(String(jobList[0]._id));
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

        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            setErrorMsg('Failed to connect to the payment gateway. Please check your internet connection.');
            setLoading(false);
            return;
        }

        try {
            const recruiterId = user.uid || user._id || user.id;

            // 1. Create order on backend (including jobId)
            const orderRes = await axios.post(`${resolvedApiUrl}/tickets/order`, {
                recruiterId,
                packageId: selectedPkg.packageId,
                jobId: selectedJobId || null
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
                            jobId: selectedJobId || null
                        });

                        if (verifyRes.data?.success) {
                            const jobNameText = activeSelectedJob ? ` for "${activeSelectedJob.title}"` : '';
                            setSuccessMsg(`Success! ${selectedPkg.ticketCount} interview tickets credited${jobNameText} to your wallet.`);
                            
                            // Synchronize local storage user details
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
        <div className="buy-tickets-modal-overlay fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2 }}
                className="buy-tickets-modal-container relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6"
            >
                {/* Header */}
                <div className="relative px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
                            <Ticket size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black tracking-tight" style={{ color: '#ffffff' }}>Buy Interview Tickets</h2>
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-extrabold text-blue-300 uppercase tracking-wider">
                                    Instant Credit
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5" style={{ color: '#cbd5e1' }}>
                                1 Ticket = 1 Full Candidate Assessment, Proctored Coding & AI Interview
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        title="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Sub-bar showing current wallet status */}
                <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-slate-700" style={{ color: '#334155' }}>Current Balance:</span>
                        <span className={`px-3 py-1 rounded-full font-black text-xs ${currentTickets > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                            {currentTickets} {currentTickets === 1 ? 'Ticket' : 'Tickets'} Available
                        </span>
                        {activeSelectedJob && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                                Target Job: {activeSelectedJob.title}
                            </span>
                        )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium" style={{ color: '#64748b' }}>
                        ⚡ Job posting is 100% free · Tickets only deducted when candidate starts
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8 space-y-6 max-h-[78vh] overflow-y-auto">
                    {/* Error / Success Messages */}
                    {errorMsg && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
                            <AlertCircle size={18} className="shrink-0 text-rose-600" />
                            <span className="font-semibold">{errorMsg}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-3">
                            <Sparkles size={18} className="shrink-0 text-emerald-600" />
                            <span className="font-semibold">{successMsg}</span>
                        </div>
                    )}

                    {/* Job Selection Mechanism:
                        1. If 1 job is posted -> Show dedicated assigned job card
                        2. If 2 or more jobs -> Show dropdown list with dedicated per-job ticket info
                    */}
                    {jobs.length === 1 && (
                        <div className="p-4.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200 flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                                    <Briefcase size={22} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-wider text-blue-600">Assigning Tickets Specifically To Job</div>
                                    <div className="text-base font-extrabold text-slate-900" style={{ color: '#0f172a' }}>{jobs[0].title}</div>
                                    {jobs[0].company && <div className="text-xs text-slate-500 font-semibold" style={{ color: '#64748b' }}>{jobs[0].company}</div>}
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white shadow-xs shrink-0">
                                Active Requisition
                            </span>
                        </div>
                    )}

                    {jobs.length >= 2 && (
                        <div className="p-4.5 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2" style={{ color: '#0f172a' }}>
                                    <Briefcase size={16} className="text-blue-600" />
                                    <span>Select Job to Purchase Dedicated Tickets For:</span>
                                </label>
                                <span className="text-[11px] text-slate-500 font-semibold" style={{ color: '#64748b' }}>
                                    Each job tracks its own candidate tickets
                                </span>
                            </div>
                            <div className="relative">
                                <select
                                    value={selectedJobId}
                                    onChange={(e) => setSelectedJobId(e.target.value)}
                                    className="w-full appearance-none px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs pr-10 cursor-pointer"
                                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                                >
                                    {jobs.map((j, idx) => (
                                        <option key={j._id} value={j._id} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                                            Job #{idx + 1}: {j.title} {j.company ? `(${j.company})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                            {activeSelectedJob && (
                                <p className="text-[11px] text-blue-600 font-bold pl-1 flex items-center gap-1.5" style={{ color: '#2563eb' }}>
                                    <Sparkles size={13} />
                                    <span>Purchased tickets will directly credit and unlock assessments for "{activeSelectedJob.title}".</span>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Ticket Packages Grid - Enhanced Contrast & Perfect Dimensions */}
                    <div>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-700" style={{ color: '#334155' }}>
                                Choose Ticket Package:
                            </span>
                            <span className="text-[11px] font-bold text-slate-500" style={{ color: '#64748b' }}>
                                Unused tickets never expire
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
                            {packages.map((pkg) => {
                                const isSelected = selectedPackageId === pkg.packageId;
                                const IconComp = pkg.icon || Ticket;

                                return (
                                    <div
                                        key={pkg.packageId}
                                        onClick={() => setSelectedPackageId(pkg.packageId)}
                                        className={`relative p-5.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[420px] ${
                                            isSelected 
                                                ? 'border-blue-600 bg-blue-50/70 shadow-xl shadow-blue-500/15 ring-2 ring-blue-500/20 scale-[1.01]' 
                                                : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50/80 shadow-xs hover:shadow-md'
                                        }`}
                                        style={{ backgroundColor: isSelected ? '#f0f7ff' : '#ffffff' }}
                                    >
                                        {pkg.popular && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                                                ★ Best Value
                                            </div>
                                        )}

                                        <div>
                                            {/* Card Top: Icon & Badge */}
                                            <div className="flex items-center justify-between mb-3.5">
                                                <div 
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs"
                                                    style={{ 
                                                        backgroundColor: isSelected ? '#2563eb' : '#f1f5f9', 
                                                        color: isSelected ? '#ffffff' : '#1e293b' 
                                                    }}
                                                >
                                                    <IconComp size={19} />
                                                </div>
                                                <span 
                                                    className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                                                    style={{
                                                        backgroundColor: isSelected ? '#dbeafe' : '#f8fafc',
                                                        color: isSelected ? '#1e40af' : '#475569',
                                                        borderColor: isSelected ? '#bfdbfe' : '#e2e8f0'
                                                    }}
                                                >
                                                    {pkg.badge || 'Package'}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-base font-black tracking-tight" style={{ color: '#0f172a' }}>
                                                {pkg.name}
                                            </h3>

                                            {/* Price */}
                                            <div className="mt-2.5 flex items-baseline gap-1">
                                                <span className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: '#0f172a' }}>
                                                    ₹{pkg.price.toLocaleString('en-IN')}
                                                </span>
                                            </div>

                                            {/* Ticket count */}
                                            <div className="mt-1 text-xs font-black" style={{ color: '#2563eb' }}>
                                                {pkg.ticketCount} Candidate Tickets
                                            </div>
                                            <p className="mt-0.5 text-[11px] font-semibold" style={{ color: '#64748b' }}>
                                                (₹{Math.round(pkg.price / pkg.ticketCount)} / interview)
                                            </p>

                                            {/* Feature list */}
                                            <ul className="mt-4 space-y-2.5 border-t border-slate-200 pt-3">
                                                {pkg.features.slice(0, 4).map((feat, fIdx) => (
                                                    <li key={fIdx} className="text-xs flex items-start gap-2" style={{ color: '#334155' }}>
                                                        <div 
                                                            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                                            style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}
                                                        >
                                                            <Check size={11} strokeWidth={3} />
                                                        </div>
                                                        <span className="leading-snug font-medium" style={{ color: '#334155' }}>{feat}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Select Button */}
                                        <div className="mt-5 pt-2">
                                            <div 
                                                className="w-full py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider text-center transition shadow-xs"
                                                style={{
                                                    backgroundColor: isSelected ? '#0f172a' : '#f8fafc',
                                                    color: isSelected ? '#ffffff' : '#334155',
                                                    border: isSelected ? '1px solid #0f172a' : '1px solid #e2e8f0'
                                                }}
                                            >
                                                {isSelected ? '✓ Selected' : 'Select Package'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Checkout Action Footer */}
                    <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-xs" style={{ color: '#475569' }}>
                            <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                            <div className="leading-tight">
                                <span className="font-bold text-slate-800" style={{ color: '#1e293b' }}>100% Secure Razorpay Checkout</span>
                                <span className="block text-[11px] text-slate-500" style={{ color: '#64748b' }}>Instant ticket credit & automatic client activation</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer w-full sm:w-auto"
                                style={{ color: '#334155', backgroundColor: '#ffffff' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={loading || verifying}
                                onClick={handleCheckout}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-extrabold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                                style={{ color: '#ffffff' }}
                            >
                                {verifying ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Verifying Payment...</span>
                                    </>
                                ) : loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Opening Checkout...</span>
                                    </>
                                ) : (
                                    <>
                                        <Ticket size={16} />
                                        <span>
                                            Buy {selectedPkg.ticketCount} Tickets{activeSelectedJob ? ` for ${activeSelectedJob.title}` : ''} (₹{selectedPkg.price.toLocaleString('en-IN')})
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
