import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PricingCalculator from '../components/PricingCalculator';
import SEO from '../components/SEO';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Sparkles, Building2, UserCircle, ArrowRight, ChevronDown, BookOpen } from 'lucide-react';
import { PRICING_FAQS, PRICING_DEFINITIONS } from '../utils/aeoContent';
import { generateWebPageSchema, generateFAQPageSchema, generateBreadcrumbSchema } from '../utils/schemas';

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

    const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'Pricing', url: '/pricing' }
    ];

    const schemas = [
        generateWebPageSchema({
            title: 'Pricing Plans - Transparent AI Recruitment & Technical Screening | Hire1Percent',
            description: 'Simple, transparent, and fair pricing for technical recruitment. Discover managed hiring, direct hire fees, and ROI calculators.',
            url: '/pricing',
            breadcrumbs
        }),
        generateFAQPageSchema(PRICING_FAQS),
        generateBreadcrumbSchema(breadcrumbs)
    ];

    const pricingTiers = [
        {
            title: "Managed Hiring",
            fee: "12%",
            description: "Zero administrative burden. We handle payroll, legal compliance, and candidate vetting while you focus on shipping product.",
            features: [
                "Hire1Percent manages payroll",
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
            description: "Hire elite engineers directly into your organization. We source, proctor, and interview; you manage the ongoing relationship.",
            features: [
                "Direct employment relationship",
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
            <SEO 
                title="Pricing Plans - AI Recruitment & Technical Screening | Hire1Percent" 
                description="Simple, transparent, and fair pricing for AI recruitment, proctored coding assessments, and technical hiring." 
                canonicalUrl="/pricing"
                schema={schemas}
            />
            <Navbar
                theme={theme}
                onToggleTheme={() => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')}
            />

            <main id="main-content">
                {/* Hero Section */}
                <section aria-labelledby="pricing-hero-heading" className="pt-32 pb-20 overflow-hidden relative">
                    {/* Background Decor */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] opacity-20 pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500 blur-[150px] rounded-full opacity-20" />
                    </div>

                    <div className="container mx-auto px-6 relative z-10">
                        <header className="text-center max-w-3xl mx-auto mb-16">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-sm font-bold mb-6">
                                <Sparkles size={16} />
                                <span>Transparent Pricing</span>
                            </div>
                            <h1 id="pricing-hero-heading" className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                                How Does Hire1Percent Pricing Work? <br />
                                <span className="bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">Simple, Fair, Scalable.</span>
                            </h1>
                            <p className={`text-lg leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                No hidden setup fees. No recurring management retainers. <br className="hidden md:block" />
                                Just a transparent percentage of salary for every verified hire you make.
                            </p>
                        </header>

                        {/* Pricing Tiers */}
                        <section aria-label="Subscription Models" className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-32">
                            {pricingTiers.map((tier, idx) => (
                                <article
                                    key={idx}
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

                                    <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>{tier.title}</h2>
                                    <p className={`text-sm mb-8 leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {tier.description}
                                    </p>

                                    <ul className="space-y-4 mb-10">
                                        {tier.features.map((feature, fIdx) => (
                                            <li key={fIdx} className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                                                    <Check className="text-green-500" size={14} />
                                                </div>
                                                <span className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => navigate('/signup', { state: { role: 'recruiter' } })}
                                        className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${tier.popular
                                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 hover:-translate-y-1'
                                            : (isLight ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white/5 text-white hover:bg-white/10')
                                            }`}>
                                        Get Started <ArrowRight size={18} />
                                    </button>
                                </article>
                            ))}
                        </section>

                        {/* Calculator Section */}
                        <section aria-labelledby="calc-heading" className="max-w-6xl mx-auto mb-32">
                            <div className="text-center mb-16">
                                <h2 id="calc-heading" className="text-3xl md:text-4xl font-black mb-6 tracking-tight">
                                    How Much Does It Cost to Hire Engineers with Hire1Percent?
                                </h2>
                                <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>
                                    Get an instant estimate of your hiring investment based on role salary and engagement model.
                                </p>
                            </div>
                            <PricingCalculator theme={theme} />
                        </section>

                        {/* Pricing Definitions */}
                        <section aria-labelledby="pricing-terms-heading" className="max-w-5xl mx-auto mb-28">
                            <div className="text-center mb-12">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/8 text-teal-400 text-xs font-black uppercase tracking-wider mb-4">
                                    <BookOpen size={12} /> Pricing Terms
                                </div>
                                <h2 id="pricing-terms-heading" className="text-3xl font-extrabold tracking-tight mb-4">
                                    Key Hiring &amp; Billing Concepts
                                </h2>
                                <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>
                                    Understand the terminology behind our transparent billing structure.
                                </p>
                            </div>

                            <dl className="grid md:grid-cols-2 gap-6">
                                {PRICING_DEFINITIONS.map((def, idx) => (
                                    <div key={idx} className={`p-6 rounded-2xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/8'}`}>
                                        <dt className="text-base font-bold text-teal-400 mb-2">{def.term}</dt>
                                        <dd className={`text-sm leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{def.definition}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>

                        {/* Pricing FAQs */}
                        <section aria-labelledby="pricing-faq-heading" className="max-w-4xl mx-auto mb-20">
                            <div className="text-center mb-12">
                                <h2 id="pricing-faq-heading" className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                                    Frequently Asked Questions About Pricing
                                </h2>
                                <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>
                                    Clear answers to questions regarding fees, guarantees, and contracts.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {PRICING_FAQS.map((faq, idx) => (
                                    <details 
                                        key={idx} 
                                        open={idx === 0}
                                        className={`group rounded-2xl border p-6 transition-all duration-200 ${isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/8'}`}
                                    >
                                        <summary className="font-bold text-base md:text-lg flex items-center justify-between gap-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                                            <span>{faq.question}</span>
                                            <ChevronDown size={20} className="text-blue-500 transition-transform duration-200 group-open:rotate-180 shrink-0" />
                                        </summary>
                                        <div className={`pt-4 mt-4 border-t text-sm leading-relaxed ${isLight ? 'border-gray-100 text-gray-700' : 'border-white/5 text-gray-300'}`}>
                                            <p>{faq.answer}</p>
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </section>

                    </div>
                </section>
            </main>

            <Footer theme={theme} />
        </div>
    );
};

export default PricingPage;
