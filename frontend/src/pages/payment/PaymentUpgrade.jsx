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
    ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PaymentUpgrade() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [walletLoading, setWalletLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [user, setUser] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");

    // Load logged-in user from localStorage on mount and fetch wallet balance
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                setWalletBalance(parsed.walletBalance || 0);

                const uid = parsed.uid || parsed._id || parsed.id;
                if (uid) {
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                    axios.get(`${apiUrl}/wallet/balance/${uid}`)
                        .then(res => {
                            if (res.data && res.data.success) {
                                setWalletBalance(res.data.balance);
                            }
                        })
                        .catch(err => console.error("Failed to fetch fresh wallet balance:", err));
                }
            } catch (err) {
                console.error("Failed to parse user details from local storage.", err);
            }
        }
    }, []);

    const handleWalletPayment = async () => {
        if (!user) {
            setErrorMsg("You must be logged in to make a payment.");
            return;
        }

        setWalletLoading(true);
        setErrorMsg("");

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const userId = user.uid || user._id || user.id;

            const res = await axios.post(`${apiUrl}/wallet/pay-upgrade`, {
                userId,
                amount: 10
            });

            if (res.data && res.data.success) {
                setPaymentSuccess(true);
                const newBal = res.data.balance;
                const updatedUser = {
                    ...user,
                    hiringPattern: "Premium Recruiter",
                    isPro: true,
                    walletBalance: newBal
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                setWalletBalance(newBal);
                window.dispatchEvent(new Event('wallet-update'));
            } else {
                setErrorMsg(res.data?.message || "Failed to upgrade using wallet.");
            }
        } catch (err) {
            console.error("Wallet payment error:", err);
            setErrorMsg(err.response?.data?.message || "Could not complete wallet payment.");
        } finally {
            setWalletLoading(false);
        }
    };


    const handlePayment = async () => {
        if (!user) {
            setErrorMsg("You must be logged in to make a payment.");
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
            // Get Backend base URL
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            // 2. Request Order ID from the Express server
            const orderRes = await axios.post(`${apiUrl}/payments/order`, {
                amount: 10, // ₹10 INR (Testing Phase)
                userId: user.uid || user._id
            });

            if (!orderRes.data || !orderRes.data.success) {
                throw new Error("Server failed to create order.");
            }

            const { orderId, amount, currency } = orderRes.data;

            // 3. Configure Razorpay checkout options
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_Sr8a8DZ72jBYCu',
                amount: amount,
                currency: currency,
                name: "Talent EcoSystem",
                description: "Upgrade to Premium Recruiter",
                image: "https://hire1percent.com/assets/logo.png", // Optional brand logo
                order_id: orderId,
                handler: async function (response) {
                    setVerifying(true);
                    setLoading(false);
                    try {
                        // 4. Submit response metadata for secure backend signature verification
                        const verifyRes = await axios.post(`${apiUrl}/payments/verify`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (verifyRes.data && verifyRes.data.success) {
                            setPaymentSuccess(true);
                            
                            // Update localStorage user record to premium
                            const updatedUser = { 
                                ...user, 
                                hiringPattern: "Premium Recruiter",
                                isPro: true
                            };
                            localStorage.setItem('user', JSON.stringify(updatedUser));
                            setUser(updatedUser);
                        } else {
                            setErrorMsg("Payment verification failed. Please contact support.");
                        }
                    } catch (verifyErr) {
                        console.error("Verification server error:", verifyErr);
                        setErrorMsg("A server error occurred during transaction verification.");
                    } finally {
                        setVerifying(false);
                    }
                },
                prefill: {
                    name: user.name || "Valued User",
                    email: user.email || "",
                    contact: user.phone || ""
                },
                notes: {
                    userId: user.uid || user._id,
                    purpose: "Premium Recruiter Subscription Upgrade"
                },
                theme: {
                    color: "#3b82f6" // Beautiful brand matching blue color theme
                },
                modal: {
                    ondismiss: function() {
                        setLoading(false);
                    }
                }
            };

            const rzpPaymentObject = new window.Razorpay(options);
            rzpPaymentObject.open();
        } catch (err) {
            console.error("[PAYMENT-CHECKOUT-ERROR]:", err);
            setErrorMsg(err.response?.data?.message || "Could not initialize checkout. Please try again later.");
            setLoading(false);
        }
    };

    const premiumFeatures = [
        "Unlimited automated AI video interviews",
        "Deep semantic talent search algorithm filter",
        "Advanced speech-to-text candidate transcripts",
        "Real-time proctoring & violation audits",
        "Premium dedicated account support 24/7",
        "Export CSV reports & candidate metrics"
    ];

    // Build the mailto url dynamically for admin activation request
    const mailSubject = encodeURIComponent(`Recruiter Premium License Activation Request - ${user?.name || 'Recruiter'}`);
    const mailBody = encodeURIComponent(
        `Hello Admin,\n\nI would like to request Premium License activation for my recruiter account on Hire1Percent.\n\nAccount Details:\n- Name: ${user?.name || 'N/A'}\n- Email: ${user?.email || 'N/A'}\n- User ID: ${user?.uid || user?._id || 'N/A'}\n\nPlease update my profile to isPro=true and hiringPattern="Premium Recruiter" in the MongoDB users collection.\n\nThank you!`
    );
    const mailtoUrl = `mailto:admin@hire1percent.com?subject=${mailSubject}&body=${mailBody}`;

    return (
        <div className="min-h-screen bg-[#0c0f16] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none z-0" />
            
            <div className="w-full max-w-lg bg-[#111622]/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10">
                
                {/* Back Button */}
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors duration-200 mb-6 group cursor-pointer"
                >
                    <ArrowLeft size={14} className="transform group-hover:-translate-x-0.5 transition-transform duration-200" />
                    Back
                </button>

                <AnimatePresence mode="wait">
                    {!paymentSuccess ? (
                        <motion.div
                            key="pay-form"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="flex flex-col"
                        >
                            {/* Premium Crown Icon Header */}
                            <div className="flex justify-center mb-6">
                                <div className="p-4 bg-blue-500/15 text-blue-400 rounded-2xl shadow-inner border border-blue-500/10 relative">
                                    <Crown size={32} />
                                    <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                                </div>
                            </div>

                            <h1 className="text-3xl font-extrabold text-center tracking-tight">
                                Get <span className="bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent">Premium Access</span>
                            </h1>
                            <p className="text-slate-400 text-center text-sm mt-2 leading-relaxed">
                                Unlock locked candidate video playbacks, transcripts, resume scores, and advanced AI matching badges.
                            </p>

                            {/* Plan Card info */}
                            <div className="mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-200">Premium Upgrade</h3>
                                        <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Manual Database Activation</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xl font-black text-slate-400">Admin Approved</span>
                                        <p className="text-[9px] text-slate-400">Free to request</p>
                                    </div>
                                </div>

                                <div className="space-y-3.5 mt-4">
                                    {premiumFeatures.map((feat, idx) => (
                                        <div key={idx} className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-[#1e293b] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check className="text-blue-400" size={12} />
                                            </div>
                                            <span className="text-xs text-slate-300">{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Error alerts */}
                            {errorMsg && (
                                <div className="mt-6 flex items-start gap-2.5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                    <AlertTriangle size={16} className="flex-shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* Payment Upgrade Action Card */}
                            <div className="mt-6 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-center space-y-4">
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    To activate your premium license key in the database and unlock full candidate tracking features, choose your preferred payment method below.
                                </p>
                                
                                <div className="space-y-3">
                                    {/* Option A: Pay via Wallet */}
                                    <button
                                        onClick={handleWalletPayment}
                                        disabled={walletLoading || loading || verifying}
                                        className="inline-flex w-full py-3.5 px-6 font-bold rounded-2xl bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 items-center justify-between cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-2">
                                            {walletLoading ? <Loader2 className="animate-spin" size={18} /> : <Wallet size={18} />}
                                            <span>Pay ₹10.00 via Wallet</span>
                                        </div>
                                        <span className="text-xs font-semibold px-2.5 py-1 bg-black/15 rounded-lg">
                                            Balance: ₹{walletBalance.toFixed(2)}
                                        </span>
                                    </button>

                                    {/* Option B: Pay via Razorpay */}
                                    <button
                                        onClick={handlePayment}
                                        disabled={loading || verifying || walletLoading}
                                        className="inline-flex w-full py-3.5 px-6 font-bold rounded-2xl bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 items-center justify-center gap-2.5 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} />
                                                Initializing Checkout...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard size={18} />
                                                Pay ₹10.00 INR via Razorpay (Card/UPI)
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>


                            <div className="flex items-center justify-center gap-2 mt-4 text-[9px] text-slate-500 uppercase tracking-widest font-semibold">
                                <ShieldCheck size={14} className="text-blue-400" />
                                Secure Checkout & Instant Role Activation
                            </div>

                        </motion.div>
                    ) : (
                        <motion.div
                            key="pay-success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center text-center py-6"
                        >
                            {/* Animated Success Badge */}
                            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/5 relative">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                                >
                                    <Sparkles size={36} />
                                </motion.div>
                            </div>

                            <h2 className="text-3xl font-black text-white leading-tight">
                                Welcome to <br />
                                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Premium Access!</span>
                            </h2>
                            
                            <p className="text-slate-400 text-sm mt-3 px-4 max-w-sm">
                                Your payment has been verified successfully. Premium features are now fully unlocked for your account.
                            </p>

                            <div className="w-full mt-8 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 flex flex-col gap-2">
                                <div className="flex justify-between">
                                    <span>Plan Details:</span>
                                    <span className="font-semibold text-slate-200">Premium Recruiter</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Amount Paid:</span>
                                    <span className="font-semibold text-slate-200">₹10.00 INR</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Status:</span>
                                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                        <Check size={12} /> Paid
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/recruiter/applicants')}
                                className="w-full mt-8 py-4 px-6 font-bold rounded-2xl bg-white text-[#0c0f16] hover:bg-slate-100 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                            >
                                Enter Recruiter Applicants Page
                            </button>

                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
