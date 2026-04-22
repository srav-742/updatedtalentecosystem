import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calculator, TrendingUp, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

const PricingCalculator = ({ theme = 'dark' }) => {
    const navigate = useNavigate();
    const isLight = theme === 'light';
    const [salary, setSalary] = useState(30); // Default 30 LPA
    const [hiringType, setHiringType] = useState('managed'); // 'managed' or 'direct'

    const hire1PercentFee = hiringType === 'managed' ? (salary * 0.12) : (salary * 0.18);

    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 1,
    });

    const formatLakhs = (val) => {
        return `₹${val.toFixed(2)}L`;
    };

    return (
        <div className={`p-8 rounded-[2.5rem] border ${isLight ? 'bg-white border-gray-200 shadow-xl' : 'bg-[#111622] border-white/10 shadow-2xl shadow-blue-500/10'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Left Side: Inputs */}
                <div className="space-y-8">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Calculator className="text-blue-500" size={24} />
                            </div>
                            <h3 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>Fee Calculator</h3>
                        </div>
                        <p className={`text-sm mb-8 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            Estimate your projected hiring costs with our simple fee structure.
                        </p>
                    </div>

                    {/* Hiring Type Selection */}
                    <div className="space-y-4">
                        <label className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>Hiring Model</label>
                        <div className={`flex p-1 rounded-2xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                            <button
                                onClick={() => setHiringType('managed')}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${hiringType === 'managed'
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : (isLight ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-400 hover:bg-white/5')
                                    }`}
                            >
                                Managed Hiring (12%)
                            </button>
                            <button
                                onClick={() => setHiringType('direct')}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${hiringType === 'direct'
                                    ? 'bg-teal-500 text-white shadow-lg'
                                    : (isLight ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-400 hover:bg-white/5')
                                    }`}
                            >
                                Direct Hiring (18%)
                            </button>
                        </div>
                    </div>

                    {/* Salary Input */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <label className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>Annual Salary (CTC)</label>
                            <div className={`text-3xl font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>₹{salary} <span className="text-lg font-medium text-gray-500">LPA</span></div>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="100"
                            step="1"
                            value={salary}
                            onChange={(e) => setSalary(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:bg-gray-700"
                        />
                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                            <span>₹5L</span>
                            <span>₹25L</span>
                            <span>₹50L</span>
                            <span>₹75L</span>
                            <span>₹100L+</span>
                        </div>
                    </div>

                    <div className={`p-6 rounded-2xl border ${isLight ? 'bg-blue-50 border-blue-100' : 'bg-blue-500/5 border-blue-500/20'}`}>
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${isLight ? 'bg-white' : 'bg-blue-500/20'}`}>
                                <Zap className="text-blue-500" size={20} />
                            </div>
                            <div>
                                <h4 className={`font-bold mb-1 ${isLight ? 'text-blue-900' : 'text-blue-400'}`}>Transparent Hiring</h4>
                                <p className={`text-sm leading-relaxed ${isLight ? 'text-blue-700/80' : 'text-blue-300/60'}`}>
                                    At <span className="font-bold">₹{salary} LPA</span>, your investment in top-tier talent is only <span className="font-bold text-green-400">{formatLakhs(hire1PercentFee)}</span>. No hidden management or setup costs.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Results */}
                <div className={`relative p-8 rounded-[2rem] overflow-hidden ${isLight ? 'bg-slate-50' : 'bg-white/[0.02]'}`}>
                    {/* Background Glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 blur-[100px] rounded-full" />

                    <div className="relative z-10 space-y-8">
                        <h4 className={`text-lg font-bold uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>Estimated Fee</h4>

                        {/* Main Result Card */}
                        <motion.div
                            key={hire1PercentFee}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`p-8 rounded-3xl border-2 transition-all ${isLight ? 'bg-white border-blue-500 shadow-xl' : 'bg-[#1a2130] border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.2)]'}`}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-bold text-blue-500 tracking-wider">hire1percent</span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-400'}`}>Best Value</span>
                            </div>
                            <div className={`text-5xl font-black mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                {formatLakhs(hire1PercentFee)}
                            </div>
                            <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                Full talent assessment & support included.
                            </p>
                        </motion.div>

                        {/* Feature Highlights inside Result Area */}
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="text-green-500" size={18} />
                                <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Full talent assessment included</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="text-green-500" size={18} />
                                <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>90-day replacement guarantee</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="text-green-500" size={18} />
                                <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Dedicated hiring manager</span>
                            </div>
                        </div>

                        {/* CTA Button */}
                        <button
                            onClick={() => navigate('/signup', { state: { role: 'recruiter' } })}
                            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group"
                        >
                            Start Hiring Now
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-12 border-t border-gray-200/10 dark:border-white/5">
                {[
                    { icon: <ShieldCheck className="text-blue-500" />, title: "No Hidden Costs", desc: "One-time fee per successful hire." },
                    { icon: <CheckCircle2 className="text-teal-500" />, title: "90-Day Guarantee", desc: "Refund or free replacement if they leave." },
                    { icon: <TrendingUp className="text-purple-500" />, title: "3x Faster", desc: "Go from JD to offer in just 7 days." }
                ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isLight ? 'bg-gray-100' : 'bg-white/5'}`}>
                            {item.icon}
                        </div>
                        <div>
                            <h5 className={`font-bold text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>{item.title}</h5>
                            <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PricingCalculator;
