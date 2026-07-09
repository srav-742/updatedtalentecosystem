import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { loadRazorpayScript } from '../utils/loadRazorpayScript';
import { API_URL } from '../firebase';

export default function TopUpModal({ isOpen, onClose, onSuccess, currentBalance = 0 }) {
    const [amount, setAmount] = useState('100');
    const [customAmount, setCustomAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('upi'); // 'upi', 'card', 'netbanking'

    if (!isOpen) return null;

    const presets = ['50', '100', '200', '500'];

    const handlePresetClick = (val) => {
        setAmount(val);
        setCustomAmount('');
    };

    const handleCustomAmountChange = (e) => {
        const val = e.target.value;
        if (/^\d*$/.test(val)) {
            setCustomAmount(val);
            setAmount(val);
        }
    };

    const handleTopUp = async () => {
        const topUpAmount = parseFloat(amount);
        if (isNaN(topUpAmount) || topUpAmount <= 0) {
            setErrorMsg("Please enter a valid amount greater than 0.");
            return;
        }

        setLoading(true);
        setErrorMsg('');

        // 1. Load Razorpay Script
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            setErrorMsg("Failed to connect to Razorpay. Check your connection.");
            setLoading(false);
            return;
        }

        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = storedUser.uid || storedUser._id || storedUser.id;

            if (!userId) {
                setErrorMsg("User session not found. Please log in again.");
                setLoading(false);
                return;
            }

            // 2. Create order in Backend
            const orderRes = await axios.post(`${API_URL}/wallet/topup/order`, {
                amount: topUpAmount,
                userId
            });

            if (!orderRes.data || !orderRes.data.success) {
                throw new Error("Failed to initialize wallet order.");
            }

            const { orderId, amount: amountInPaisa, currency, receipt } = orderRes.data;

            // 3. Configure Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_Sr8a8DZ72jBYCu',
                amount: amountInPaisa,
                currency: currency,
                name: "Talent EcoSystem Wallet",
                description: `Wallet Top Up - ₹${topUpAmount}`,
                image: "https://hire1percent.com/assets/logo.png",
                order_id: orderId,
                handler: async function (response) {
                    setLoading(true);
                    try {
                        // 4. Verify transaction signature
                        const verifyRes = await axios.post(`${API_URL}/wallet/topup/verify`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (verifyRes.data && verifyRes.data.success) {
                            const newBalance = verifyRes.data.balance;
                            
                            // Update user in local storage
                            const updatedUser = { 
                                ...storedUser, 
                                walletBalance: newBalance 
                            };
                            localStorage.setItem('user', JSON.stringify(updatedUser));
                            
                            // Callback success
                            onSuccess(newBalance);
                            onClose();
                        } else {
                            setErrorMsg("Payment verification failed.");
                        }
                    } catch (verifyErr) {
                        console.error("Top Up verification failed:", verifyErr);
                        setErrorMsg("Verification error. Contact support if balance isn't credited.");
                    } finally {
                        setLoading(false);
                    }
                },
                prefill: {
                    name: storedUser.name || "Recruiter",
                    email: storedUser.email || "",
                    contact: storedUser.phone || ""
                },
                notes: {
                    userId,
                    purpose: "Wallet Top Up"
                },
                theme: {
                    color: "#3b82f6" // Dynamic branding matching blue
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
            console.error("Topup error:", err);
            setErrorMsg(err.response?.data?.message || "Failed to initiate payment. Please try again.");
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-md bg-[#111622] text-white border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                    >
                        <X size={18} />
                    </button>

                    {/* Header */}
                    <div className="flex items-center gap-3.5 mb-6">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Top Up Recruiter Wallet</h3>
                            <p className="text-xs text-slate-400">Current Balance: <span className="text-white font-bold">₹{(currentBalance || 0).toFixed(2)}</span></p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Preset Selectors */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Presets</label>
                            <div className="grid grid-cols-4 gap-2">
                                {presets.map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => handlePresetClick(preset)}
                                        className={`py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                            amount === preset && !customAmount
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                                                : 'bg-[#181f2f] border-white/5 hover:border-white/10 text-slate-300'
                                        }`}
                                    >
                                        ₹{preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Or Custom Amount (INR)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                <input
                                    type="text"
                                    placeholder="Enter amount"
                                    value={customAmount}
                                    onChange={handleCustomAmountChange}
                                    className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-[#181f2f] border border-white/10 focus:border-blue-500 outline-none text-sm font-semibold transition"
                                />
                            </div>
                        </div>

                        {/* Payment Method Details (Visual) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Gateway</label>
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3.5">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 flex items-center gap-1.5"><Sparkles size={12} className="text-blue-400" /> Supported Payment Methods:</span>
                                    <span className="font-semibold text-slate-200">UPI, Cards, Netbanking</span>
                                </div>
                                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                                    {/* Google Pay / PhonePe Logos */}
                                    <div className="flex gap-2">
                                        <div className="px-2.5 py-1 rounded-md bg-[#1e273a] text-[9px] font-black text-slate-300 border border-white/5 tracking-wider">GPAY</div>
                                        <div className="px-2.5 py-1 rounded-md bg-[#1e273a] text-[9px] font-black text-slate-300 border border-white/5 tracking-wider">PHONEPE</div>
                                        <div className="px-2.5 py-1 rounded-md bg-[#1e273a] text-[9px] font-black text-slate-300 border border-white/5 tracking-wider">PAYTM</div>
                                        <div className="px-2.5 py-1 rounded-md bg-[#1e273a] text-[9px] font-black text-slate-300 border border-white/5 tracking-wider">UPI</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error Alert */}
                        {errorMsg && (
                            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleTopUp}
                            disabled={loading || !amount || parseFloat(amount) <= 0}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/15 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    Processing Payment...
                                </>
                            ) : (
                                <>
                                    <Wallet size={16} />
                                    Pay ₹{parseFloat(amount || '0').toFixed(2)} INR
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
