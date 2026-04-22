import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PricingCalculator from '../components/PricingCalculator';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Sparkles, Building2, UserCircle, ArrowRight } from 'lucide-react';

const PricingPage = () => {
    const navigate = useNavigate();
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') return 'dark';
        return localStorage.getItem('landing-theme') || 'dark';
    });

    useEffect(() => {
        localStorage.setItem('landing-theme', theme);
    }, [theme]);

    const isLight = theme === 'light';

    const pricingTiers = [
        {
            title: "Managed Hiring",
            fee: "12%",
            description: "Zero administrative burden. We handle everything while you focus on building your product.",
            features: [
                "Hire1percent manages payroll",
                "Legal & Compliance handling",
                "Full project management support",
                "90-day talent guarantee",
                "Dedicated Account Manager"
            ],
            color: "blue",
            icon: <Building2 className="text-blue-500" size={32} />,
            popular: true
        },
        {
            title: "Direct Hire",
            fee: "18%",
            description: "Hire elite talent directly into your company. We source, you manage the relationship.",
            features: [
                "Startup hires directly",
                "Startup manages payroll & admin",
                "Initial setup phase support",
                "90-day talent guarantee",
                "Unlimited sourcing rounds"
            ],
            color: "teal",
            icon: <UserCircle className="text-teal-400" size={32} />,
            popular: false
        }
    ];

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isLight ? 'bg-white text-gray-900' : 'bg-[#0c0f16] text-white'}`}>
            <Navbar
                theme={theme}
                onToggleTheme={() => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')}
            />

            {/* Hero Section */}
            <section className="pt-32 pb-20 overflow-hidden relative">
                {/* Background Decor */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] opacity-20 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500 blur-[150px] rounded-full opacity-20" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center max-w-3xl mx-auto"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-sm font-bold mb-6">
                            <Sparkles size={16} />
                            <span>Transparent Pricing</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black mb-8 leading-tight">
                            Hire the Top 1% <br />
                            <span className="bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">Simple, Fair, Scalable.</span>
                        </h1>
                        <p className={`text-lg mb-12 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            No setup fees. No recurring management fees. <br className="hidden md:block" />
                            Just a transparent percentage of the salary for every successful hire.
                        </p>
                    </motion.div>

                    {/* Pricing Tiers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-32">
                        {pricingTiers.map((tier, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: idx === 0 ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className={`relative group p-8 rounded-[2.5rem] border transition-all hover:scale-[1.02] ${isLight
                                    ? 'bg-white border-gray-200 shadow-xl'
                                    : 'bg-[#111622] border-white/10 shadow-2xl'
                                    } ${tier.popular ? (isLight ? 'ring-2 ring-blue-500' : 'ring-2 ring-blue-500/50') : ''}`}
                            >
                                {tier.popular && (
                                    <div className="absolute -top-4 right-8 px-4 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                        Most Popular
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-8">
                                    <div className={`p-4 rounded-2xl ${isLight ? 'bg-gray-100' : 'bg-white/5'}`}>
                                        {tier.icon}
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-4xl font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>{tier.fee}</div>
                                        <div className={`text-sm font-bold uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>of Salary</div>
                                    </div>
                                </div>

                                <h3 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>{tier.title}</h3>
                                <p className={`text-sm mb-8 leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {tier.description}
                                </p>

                                <div className="space-y-4 mb-10">
                                    {tier.features.map((feature, fIdx) => (
                                        <div key={fIdx} className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                                                <Check className="text-green-500" size={14} />
                                            </div>
                                            <span className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => navigate('/signup', { state: { role: 'recruiter' } })}
                                    className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${tier.popular
                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 hover:-translate-y-1'
                                        : (isLight ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white/5 text-white hover:bg-white/10')
                                        }`}>
                                    Get Started <ArrowRight size={18} />
                                </button>
                            </motion.div>
                        ))}
                    </div>

                    {/* Calculator Section */}
                    <div className="max-w-6xl mx-auto mb-32">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-black mb-6 italic tracking-tight">Fee Calculator</h2>
                            <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>
                                Get an instant estimate of your hiring investment based on our clear and transparent models.
                            </p>
                        </div>
                        <PricingCalculator theme={theme} />
                    </div>

                    {/* Trust Banner */}
                    <div className={`p-12 rounded-[3.5rem] text-center border ${isLight ? 'bg-slate-50 border-gray-100' : 'bg-white/[0.02] border-white/5'}`}>
                        <h4 className="text-sm font-black uppercase tracking-[0.3em] text-blue-500 mb-8">Trusted by Global Teams</h4>
                        <div className="flex flex-wrap justify-center items-center gap-12 opacity-40 grayscale contrast-125">
                            {/* Placeholders for logos */}
                            <span className="text-2xl font-black tracking-tighter">TECHSTAR</span>
                            <span className="text-2xl font-black tracking-tighter">VELOCITY</span>
                            <span className="text-2xl font-black tracking-tighter">NEXUS AI</span>
                            <span className="text-2xl font-black tracking-tighter">PRISM</span>
                        </div>
                    </div>
                </div>
            </section>

            <Footer theme={theme} />
        </div>
    );
};

export default PricingPage;
