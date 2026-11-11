import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { loadRazorpayScript } from '../../utils/loadRazorpayScript';
import { 
    CreditCard, 
    ShieldCheck, 
    Loader2, 
    Check, 
    Sparkles, 
    AlertTriangle,
    Wallet,
    Crown,
    ArrowLeft,
    Zap,
    Building2,
    Users,
    Ticket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../../utils/analytics';
import { API_URL } from '../../config';

const DEFAULT_PACKAGES = [
    {
        id: 'starter',
        packageId: 'starter',
        name: 'Starter Package',
        ticketCount: 5,
        price: 999,
        badge: 'Small Hiring',
        description: 'Ideal for single role hiring with fast AI candidate evaluations and full summaries.',
        features: [
            '5 Candidate Skill Assessments & Interviews',
            'Full Candidate Profiles & Resumes',
            'AI Integrity & Proctoring Summaries',
            'Speech-to-Text Candidate Transcripts',
            'Automated Gateway Client Credentials'
        ],
        icon: Zap,
        popular: false,
        accentColor: 'from-blue-600 to-indigo-600',
        badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
        id: 'growth',
        packageId: 'growth',
        name: 'Growth Package',
        ticketCount: 25,
        price: 3999,
        badge: 'Most Popular · Best Value',
        description: 'Comprehensive screening for teams evaluating multiple roles simultaneously.',
        features: [
            '25 Candidate Skill Assessments & Interviews',
            'Candidate AI Video Interview Playback',
            'Real-time Proctoring Logs & Replay Audit',
            'Instant OAuth Session Token & Gateway Entitlement',
            'Priority Recruiter Support'
        ],
        icon: Crown,
        popular: true,
        accentColor: 'from-amber-500 to-yellow-400',
        badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    },
    {
        id: 'business',
        packageId: 'business',
        name: 'Business Package',
        ticketCount: 50,
        price: 6999,
        badge: 'High Volume',
        description: 'Designed for scaling companies running regular department-level hiring drives.',
        features: [
            '50 Candidate Skill Assessments & Interviews',
            'Custom Coding Challenges & AST Execution',
            'Deep Semantic Talent Search & Scorecards',
            'Candidate CSV/JSON Pipeline Exports',
            'Dedicated Account Manager'
        ],
        icon: Users,
        popular: false,
        accentColor: 'from-teal-500 to-emerald-400',
        badgeColor: 'bg-teal-500/10 text-teal-300 border-teal-500/20'
    },
    {
        id: 'enterprise',
        packageId: 'enterprise',
        name: 'Enterprise Package',
        ticketCount: 100,
        price: 11999,
        badge: 'Enterprise Scale',
        description: 'Full-scale assessment capacity for campus drives and nationwide hiring.',
        features: [
            '100+ Candidate Skill Assessments & Interviews',
            'Multi-stage Coding, MCQ & AI Technical Interviews',
            'Dedicated Technical Support',
            'Continuous Proctoring & Candidate Audit History',
            '99.9% Uptime SLA Guarantee'
        ],
        icon: Building2,
        popular: false,
        accentColor: 'from-purple-600 to-pink-500',
        badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/20'
    }
];

export default function PaymentUpgrade() {
    const navigate = useNavigate();
    const [packages, setPackages] = useState(DEFAULT_PACKAGES);
    const [selectedPlanId, setSelectedPlanId] = useState('growth');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [user, setUser] = useState(null);
    const [availableTickets, setAvailableTickets] = useState(0);
    const [totalPurchased, setTotalPurchased] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');

    const selectedPlan = packages.find(p => p.id === selectedPlanId || p.packageId === selectedPlanId) || packages[1] || packages[0];
    const resolvedApiUrl = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        ? 'http://localhost:5000/api'
        : (API_URL || import.meta.env.VITE_API_URL || 'https://updatedtalentecosystem-kl0c.onrender.com/api');

    // Load logged-in user from localStorage on mount and fetch fresh ticket wallet
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                const uid = parsed.uid || parsed._id || parsed.id;
                if (uid) {
                    axios.get(`${resolvedApiUrl}/tickets/wallet/${uid}`)
                        .then(res => {
                            if (res.data?.success && res.data.wallet) {
                                setAvailableTickets(res.data.wallet.availableTickets || 0);
                                setTotalPurchased(res.data.wallet.totalPurchased || 0);
                            }
                        })
                        .catch(err => console.warn("Failed to fetch fresh ticket wallet:", err.message));

                    // Fetch recruiter jobs
                    axios.get(`${resolvedApiUrl}/jobs/recruiter/${uid}`)
                        .then(res => {
                            const jobList = Array.isArray(res.data) ? res.data : (res.data?.jobs || []);
                            setJobs(jobList);
                            if (jobList.length >= 1) {
                                setSelectedJobId(String(jobList[0]._id));
                            }
                        })
                        .catch(err => console.warn("Failed to fetch recruiter jobs:", err.message));
                }
            } catch (err) {
                console.error("Failed to parse user details from local storage.", err);
            }
        }

        // Fetch dynamic ticket packages
        axios.get(`${resolvedApiUrl}/tickets/packages`)
            .then(res => {
                if (res.data?.success && Array.isArray(res.data.packages) && res.data.packages.length > 0) {
                    const mapped = res.data.packages.map((pkg, idx) => ({
                        id: pkg.packageId,
                        packageId: pkg.packageId,
                        name: pkg.name,
                        ticketCount: pkg.ticketCount,
                        price: pkg.price,
                        badge: pkg.badge || (idx === 1 ? 'Best Value' : 'Package'),
                        description: pkg.description,
                        features: pkg.features || [],
                        icon: idx === 1 ? Crown : idx === 2 ? Users : idx === 3 ? Building2 : Zap,
                        popular: Boolean(pkg.popular || idx === 1),
                        accentColor: pkg.accentColor || (idx === 1 ? 'from-amber-500 to-yellow-400' : 'from-blue-600 to-indigo-600'),
                        badgeColor: pkg.badgeColor || 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }));
                    setPackages(mapped);
                }
            })
            .catch(e => console.warn("Failed to fetch ticket packages:", e.message));
    }, [resolvedApiUrl]);

    const handlePayment = async () => {
        if (!user) {
            setErrorMsg("You must be logged in as a recruiter to purchase tickets.");
            return;
        }

        setLoading(true);
        setErrorMsg("");
        
        // 1. Dynamically load Razorpay Checkout Script
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            setErrorMsg("Failed to connect to the payment gateway. Please check your internet connection.");
            setLoading(false);
            return;
        }

        try {
            const recruiterId = user.uid || user._id || user.id;

            // 2. Request Order ID from backend ticket endpoint
            const orderRes = await axios.post(`${resolvedApiUrl}/tickets/order`, {
                recruiterId,
                packageId: selectedPlan.packageId || selectedPlan.id,
                jobId: selectedJobId || null
            });

            if (!orderRes.data || !orderRes.data.success) {
                throw new Error(orderRes.data?.message || "Server failed to create ticket order.");
            }

            const { orderId, amount, currency, key } = orderRes.data;

            // Track GA4 begin_checkout event
            trackEvent('begin_checkout', {
                value: selectedPlan.price,
                currency: currency || 'INR',
                items: [{ item_id: selectedPlan.id, item_name: selectedPlan.name, price: selectedPlan.price, quantity: selectedPlan.ticketCount }]
            });

            // 3. Configure Razorpay checkout options
            const options = {
                key: key || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_Sr8a8DZ72jBYCu',
                amount: amount,
                currency: currency || 'INR',
                name: "Hire1Percent",
                description: `Purchase ${selectedPlan.ticketCount} Interview Tickets`,
                image: "https://www.hire1percent.com/logo.png",
                order_id: orderId,
                handler: async function (response) {
                    setVerifying(true);
                    setLoading(false);
                    try {
                        // 4. Submit response metadata for signature verification & ticket credit
                        const verifyRes = await axios.post(`${resolvedApiUrl}/tickets/verify`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            packageId: selectedPlan.packageId || selectedPlan.id,
                            recruiterId,
                            jobId: selectedJobId || null
                        });

                        if (verifyRes.data && verifyRes.data.success) {
                            setPaymentSuccess(true);
                            const updatedWallet = verifyRes.data.wallet;
                            const newAvailable = updatedWallet ? updatedWallet.availableTickets : (availableTickets + selectedPlan.ticketCount);
                            setAvailableTickets(newAvailable);
                            
                            // Track GA4 purchase event
                            trackEvent('purchase', {
                                transaction_id: response.razorpay_payment_id,
                                value: selectedPlan.price,
                                currency: currency || 'INR',
                                payment_method: 'razorpay',
                                items: [{ item_id: selectedPlan.id, item_name: selectedPlan.name, price: selectedPlan.price, quantity: selectedPlan.ticketCount }]
                            });
                            
                            // Update localStorage user record
                            const updatedUser = { 
                                ...user, 
                                hiringPattern: "Premium Recruiter",
                                isPro: true,
                                availableTickets: newAvailable
                            };
                            localStorage.setItem('user', JSON.stringify(updatedUser));
                            if (verifyRes.data.tokens) {
                                localStorage.setItem('authSessionTokens', JSON.stringify(verifyRes.data.tokens));
                                if (verifyRes.data.tokens.accessToken) {
                                    localStorage.setItem('accessTokenUUID', verifyRes.data.tokens.accessToken);
                                }
                            }
                            if (verifyRes.data.client) {
                                localStorage.setItem('clientCredentials', JSON.stringify(verifyRes.data.client));
                            }
                            setUser(updatedUser);
                            window.dispatchEvent(new Event('wallet-update'));
                        } else {
                            setErrorMsg(verifyRes.data?.message || "Payment verification failed. Please contact support.");
                        }
                    } catch (verifyErr) {
                        console.error("Verification server error:", verifyErr);
                        setErrorMsg(verifyErr.response?.data?.message || "A server error occurred during transaction verification.");
                    } finally {
                        setVerifying(false);
                    }
                },
                prefill: {
                    name: user.name || "Valued Recruiter",
                    email: user.email || "",
                    contact: user.phone || ""
                },
                notes: {
                    recruiterId,
                    packageId: selectedPlan.id,
                    purpose: `Interview Ticket Purchase: ${selectedPlan.name}`
                },
                theme: {
                    color: selectedPlan.popular ? "#f59e0b" : "#3b82f6"
                },
                modal: {
                    ondismiss: function() {
                        setLoading(false);
                    }
                }
            };

            const rzpPaymentObject = new window.Razorpay(options);
            rzpPaymentObject.on('payment.failed', function (resp) {
                console.error("[PAYMENT-FAILED]:", resp.error);
                setErrorMsg(resp.error?.description || "Payment failed. Please try again.");
                setLoading(false);
            });
            rzpPaymentObject.open();
        } catch (err) {
            console.error("[PAYMENT-CHECKOUT-ERROR]:", err);
            setErrorMsg(err.response?.data?.message || err.message || "Could not initialize checkout. Please try again later.");
            setLoading(false);
        }
    };

    return (
        <div className="payment-upgrade-view min-h-screen bg-[#0c0f16] text-white flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-600/10 blur-[160px] rounded-full pointer-events-none z-0" />
            <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-amber-500/5 blur-[140px] rounded-full pointer-events-none z-0" />

            <div className="w-full max-w-6xl relative z-10">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/recruiter/applicants')} 
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors duration-200 mb-6 group cursor-pointer bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5"
                >
                    <ArrowLeft size={14} className="transform group-hover:-translate-x-0.5 transition-transform duration-200" />
                    Back to Applicants
                </button>

                <AnimatePresence mode="wait">
                    {!paymentSuccess ? (
                        <motion.div
                            key="pay-form"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="flex flex-col items-center"
                        >
                            {/* Header */}
                            <div className="text-center max-w-2xl mx-auto mb-10">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
                                    <Ticket size={14} /> Interview Ticket Model
                                </div>
                                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                                    Buy <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">Interview Tickets</span>
                                </h1>
                                <p className="text-slate-400 text-sm md:text-base mt-3 leading-relaxed">
                                    1 Ticket = 1 Candidate Assessment & AI Interview. Job posting is 100% free. Tickets are only deducted when an eligible candidate starts an assessment.
                                </p>

                                {/* Wallet Summary Pill */}
                                <div className="mt-4 inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs">
                                    <span className="text-slate-400">Available Tickets:</span>
                                    <span className="font-extrabold text-emerald-400 text-sm">{availableTickets}</span>
                                    <span className="text-slate-600">|</span>
                                    <span className="text-slate-400">Total Purchased:</span>
                                    <span className="font-bold text-slate-200">{totalPurchased}</span>
                                </div>
                            </div>

                            {/* Job Selection: 1 job -> shown directly; 2+ jobs -> dropdown list */}
                            {jobs.length === 1 && (
                                <div className="w-full max-w-xl mx-auto mb-8 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Tickets Assigned To Job</span>
                                            <div className="text-sm font-extrabold text-white">{jobs[0].title}</div>
                                            {jobs[0].company && <div className="text-xs text-slate-400">{jobs[0].company}</div>}
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        Selected Job
                                    </span>
                                </div>
                            )}

                            {jobs.length >= 2 && (
                                <div className="w-full max-w-xl mx-auto mb-8 p-4.5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                            <Building2 size={16} className="text-blue-400" />
                                            <span>Select Job to Purchase Tickets For:</span>
                                        </label>
                                        <span className="text-[11px] text-slate-400">Job-specific tickets</span>
                                    </div>
                                    <select
                                        value={selectedJobId}
                                        onChange={(e) => setSelectedJobId(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-900 border border-white/20 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                    >
                                        {jobs.map((j, idx) => (
                                            <option key={j._id} value={j._id}>
                                                Job {idx + 1}: {j.title} {j.company ? `(${j.company})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* 4 Pricing Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-10">
                                {packages.map((plan) => {
                                    const IconComponent = plan.icon || Ticket;
                                    const isSelected = selectedPlanId === plan.id || selectedPlanId === plan.packageId;
                                    return (
                                        <div
                                            key={plan.id}
                                            onClick={() => setSelectedPlanId(plan.id)}
                                            className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer ${
                                                isSelected
                                                    ? 'bg-[#151c2d] border-2 border-blue-400 shadow-2xl shadow-blue-500/20 scale-[1.02]'
                                                    : 'bg-[#111622]/80 hover:bg-[#141b2a] border border-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            {/* Top Popular Badge */}
                                            {plan.popular && (
                                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-black text-[11px] font-black uppercase tracking-wider shadow-lg">
                                                    {plan.badge}
                                                </div>
                                            )}

                                            <div>
                                                {/* Header Row */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className={`p-3 rounded-2xl border ${plan.badgeColor}`}>
                                                        <IconComponent size={22} />
                                                    </div>
                                                    {!plan.popular && (
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border ${plan.badgeColor}`}>
                                                            {plan.badge}
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-lg font-bold text-white mb-1" style={{ color: '#ffffff' }}>{plan.name}</h3>
                                                <div className="text-xs font-bold text-blue-400 mb-2">
                                                    {plan.ticketCount} Candidate Tickets
                                                </div>
                                                <p className="text-slate-400 text-xs leading-relaxed mb-4 min-h-[32px]">
                                                    {plan.description}
                                                </p>

                                                {/* Price */}
                                                <div className="flex items-baseline gap-1 mb-4 pb-4 border-b border-white/5">
                                                    <span className="text-3xl font-black text-white price-amount" style={{ color: '#ffffff' }}>
                                                        ₹{plan.price.toLocaleString('en-IN')}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        (₹{Math.round(plan.price / plan.ticketCount)}/ea)
                                                    </span>
                                                </div>

                                                {/* Features List */}
                                                <div className="space-y-2.5 mb-6">
                                                    {plan.features.map((feat, idx) => (
                                                        <div key={idx} className="flex items-start gap-2">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                <Check className="text-blue-400" size={9} />
                                                            </div>
                                                            <span className="text-[11px] text-slate-300 leading-snug">{feat}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Card Select Button */}
                                            <button
                                                type="button"
                                                className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                                                }`}
                                            >
                                                {isSelected ? 'Selected Package' : 'Choose Package'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Error Message */}
                            {errorMsg && (
                                <div className="mb-6 w-full max-w-md p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
                                    <AlertTriangle size={18} className="flex-shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* Sticky / Floating Checkout Bar */}
                            <div className="w-full max-w-md bg-[#131826]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl">
                                <div className="flex items-center justify-between text-xs text-slate-300">
                                    <span>Selected Package:</span>
                                    <span className="font-bold text-white">{selectedPlan.name} ({selectedPlan.ticketCount} Tickets)</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-300 pb-2 border-b border-white/5">
                                    <span>Total Price:</span>
                                    <span className="text-lg font-black text-amber-300">₹{selectedPlan.price.toLocaleString('en-IN')}</span>
                                </div>

                                <button
                                    onClick={handlePayment}
                                    disabled={loading || verifying}
                                    className="w-full py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {verifying ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Verifying Payment...</span>
                                        </>
                                    ) : loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Connecting to Razorpay...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard size={16} />
                                            <span>Proceed to Razorpay Checkout</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Security Badges */}
                            <div className="mt-8 flex items-center gap-6 text-slate-500 text-xs">
                                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> 256-Bit SSL Encrypted</span>
                                <span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-blue-400" /> Instant Ticket Credit</span>
                                <span className="inline-flex items-center gap-1.5"><Crown size={14} className="text-amber-400" /> Gateway Authorization</span>
                            </div>
                        </motion.div>
                    ) : (
                        /* Success View */
                        <motion.div
                            key="pay-success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#121724] border border-emerald-500/20 rounded-3xl p-8 md:p-12 max-w-xl mx-auto text-center shadow-2xl relative"
                        >
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6">
                                <Sparkles size={32} />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
                                Tickets Successfully Credited!
                            </h2>
                            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                                You have added <strong className="text-emerald-400">+{selectedPlan.ticketCount} interview tickets</strong> to your wallet. Candidates can now begin skill assessments for your jobs.
                            </p>

                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-8 max-w-sm mx-auto text-xs space-y-1 text-slate-300">
                                <div className="flex justify-between">
                                    <span>Updated Available Balance:</span>
                                    <strong className="text-emerald-400 font-bold">{availableTickets} Tickets</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Client RBAC Status:</span>
                                    <strong className="text-blue-400">Active (MySQL 8.4)</strong>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/recruiter/applicants')}
                                className="w-full py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 cursor-pointer"
                            >
                                Continue to Applicants
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
