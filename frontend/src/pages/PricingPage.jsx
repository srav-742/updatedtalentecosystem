import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Check, Sparkles, ArrowRight, ShieldCheck, 
    RefreshCw, Layers, HelpCircle, ChevronDown, 
    Zap, Compass, Calendar
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { 
    PLANS, 
    formatCents, 
    formatEffectiveRate, 
    getPlanCtaUrl, 
    ROLLOVER_EXAMPLE,
    PRICING_CATALOG_VERSION 
} from '../utils/pricingCatalog';
import { generateWebPageSchema, generateBreadcrumbSchema } from '../utils/schemas';

const PricingPage = () => {
    const [theme, setTheme] = useState(() => localStorage.getItem('landing-theme') || 'dark');
    const [openFaqIndex, setOpenFaqIndex] = useState(null);

    const isLight = theme === 'light';

    const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'Pricing', url: '/pricing' }
    ];

    const schemas = [
        generateWebPageSchema({
            title: 'Assessment Pricing & Credit Packages | Hire1Percent',
            description: 'Transparent pricing for technical assessments with 4-layer anti-cheat. Pay as you go ($7.50) or choose monthly plans with automatic credit rollover.',
            url: '/pricing',
            breadcrumbs
        }),
        generateBreadcrumbSchema(breadcrumbs)
    ];

    const pricingFaqs = [
        {
            q: 'How does billing work for assessment credits?',
            a: 'A credit is consumed only when a candidate completes an assessment and their verified evaluation report is generated. Incomplete sessions, abandoned invitations, or technical aborts do not consume your balance.'
        },
        {
            q: 'How does the grant-lot rollover work?',
            a: 'Unused monthly base and bonus credits carry forward into subsequent billing cycles while retaining their distinct grant-lot identity. For example, 4 unused Starter credits from September combine with 12 new October credits to give you 16 active credits (not 20). Rolled-over credits are consumed first (FIFO).'
        },
        {
            q: 'Can I purchase additional credits if I exceed my monthly allocation?',
            a: 'Yes. You can purchase additional pay-as-you-go credits at any time ($7.50 each) or upgrade your plan to Growth or Enterprise directly from your dashboard.'
        },
        {
            q: 'What is included with Scale & Enterprise plans?',
            a: 'Enterprise plans include volume discounts for 100+ monthly assessments, custom ATS integrations (Greenhouse, Lever, Workday), custom question banks, and dedicated account management.'
        }
    ];

    return (
        <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isLight ? 'bg-white text-gray-900' : 'bg-[#0a0d14] text-white'}`}>
            <SEO 
                title="Assessment Pricing & Credit Plans | Hire1Percent"
                description="Transparent pricing for technical assessments with 4-layer anti-cheat. Starter ($50/mo, 12 credits), Growth ($100/mo, 25 credits), Pay-as-you-go ($7.50). Unused credits roll over."
                canonical="https://www.hire1percent.com/pricing"
                schemas={schemas}
            />

            <Navbar theme={theme} onToggleTheme={() => setTheme(isLight ? 'dark' : 'light')} />

            <main className="flex-grow pt-28 pb-20">
                <div className="container mx-auto px-6 max-w-7xl">
                    {/* Header */}
                    <div className="text-center space-y-4 mb-16 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold tracking-widest uppercase">
                            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Versioned Catalog: {PRICING_CATALOG_VERSION}</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                            Simple, Predictable Assessment Pricing
                        </h1>
                        <p className={`text-base sm:text-lg leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                            Pay only for completed assessment scorecards. No hidden onboarding fees or recurring lock-in. Unused credits roll over automatically.
                        </p>
                    </div>

                    {/* 4 Pricing Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
                        {PLANS.map((plan) => {
                            const isPopular = plan.popular;
                            return (
                                <div 
                                    key={plan.plan_id}
                                    className={`rounded-3xl p-7 border relative flex flex-col justify-between transition-all ${
                                        isPopular 
                                            ? 'bg-gradient-to-b from-blue-900/30 to-[#0c101d] border-blue-500/60 shadow-2xl shadow-blue-500/15' 
                                            : isLight 
                                                ? 'bg-white border-gray-200 shadow-md' 
                                                : 'bg-[#101422] border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {isPopular && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-md">
                                            Most Popular
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <h2 className="text-xl font-bold">{plan.name}</h2>
                                            <span className="text-[10px] font-mono text-gray-400">{plan.plan_id}</span>
                                        </div>
                                        <p className={`text-xs mb-6 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {plan.description}
                                        </p>

                                        {/* Price */}
                                        <div className="mb-4">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-extrabold">
                                                    {formatCents(plan.amount_cents, { showCents: false })}
                                                </span>
                                                {plan.is_monthly && !plan.is_custom && (
                                                    <span className="text-xs text-gray-400">/month</span>
                                                )}
                                            </div>

                                            {/* Credit Breakdown */}
                                            {!plan.is_custom && (
                                                <div className="mt-2 text-xs font-semibold text-blue-400">
                                                    {plan.is_monthly ? (
                                                        <span>{plan.base_credits} base + {plan.bonus_credits} bonus = {plan.total_credits} credits</span>
                                                    ) : (
                                                        <span>1 assessment credit</span>
                                                    )}
                                                </div>
                                            )}

                                            {plan.is_custom && (
                                                <div className="mt-2 text-xs font-semibold text-teal-400">
                                                    100+ assessments / month
                                                </div>
                                            )}

                                            {/* Effective Rate */}
                                            <div className="mt-1 text-[11px] text-gray-400">
                                                Effective: {formatEffectiveRate(plan)} per assessment
                                            </div>
                                        </div>

                                        {/* Feature Checklist */}
                                        <ul className="space-y-3 pt-4 border-t border-white/10 text-xs text-gray-300 mb-8">
                                            {plan.features.map((f, fIdx) => (
                                                <li key={fIdx} className="flex items-start gap-2">
                                                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                                    <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Link 
                                        to={getPlanCtaUrl(plan.plan_id)}
                                        className={`w-full py-3.5 rounded-xl text-xs font-bold text-center block transition-all shadow-md active:scale-95 ${
                                            isPopular 
                                                ? 'bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white' 
                                                : 'bg-white/10 hover:bg-white/15 text-white'
                                        }`}
                                    >
                                        {plan.cta_label} &rarr;
                                    </Link>
                                </div>
                            );
                        })}
                    </div>

                    {/* ─── GRANT-LOT ROLLOVER LEDGER EXPLANATION ────────────────────── */}
                    <div className={`p-8 sm:p-10 rounded-3xl border mb-20 ${
                        isLight ? 'bg-blue-50/60 border-blue-200' : 'bg-[#101728] border-blue-500/30'
                    }`}>
                        <div className="max-w-3xl mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/20 text-blue-400 text-xs font-mono mb-2">
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Grant-Lot Rollover Accounting</span>
                            </div>
                            <h2 className="text-2xl font-bold">How Unused Credits Carry Forward</h2>
                            <p className={`text-sm mt-2 leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                Hire1Percent uses an audit-grade grant-lot ledger. When your subscription renews, unconsumed credits from your previous billing cycle roll into the new month while preserving their original grant-lot identity.
                            </p>
                        </div>

                        {/* Rollover Example Box */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm">
                            <div className="p-5 rounded-2xl bg-black/20 border border-white/10 space-y-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">1. Previous Month (Sep)</span>
                                <div className="text-base font-bold text-white">Starter Grant: 12 Credits</div>
                                <p className="text-gray-400 text-xs">
                                    8 assessments completed. <strong>{ROLLOVER_EXAMPLE.previous_grant.remaining} unused credits</strong> remain at cycle end.
                                </p>
                            </div>

                            <div className="p-5 rounded-2xl bg-black/20 border border-white/10 space-y-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">2. Next Renewal (Oct)</span>
                                <div className="text-base font-bold text-blue-400">New Grant: 12 Credits</div>
                                <p className="text-gray-400 text-xs">
                                    10 base credits + 2 bonus credits allocated for the new billing cycle.
                                </p>
                            </div>

                            <div className="p-5 rounded-2xl bg-blue-600/20 border border-blue-500/40 space-y-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 block">3. Total Available (Oct)</span>
                                <div className="text-2xl font-extrabold text-white">
                                    {ROLLOVER_EXAMPLE.total_available} Active Credits
                                </div>
                                <p className="text-blue-200 text-xs">
                                    4 rollover credits + 12 new credits = 16 available. {ROLLOVER_EXAMPLE.note}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* FAQs */}
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center space-y-2 mb-8">
                            <h2 className="text-2xl font-bold">Frequently Asked Questions About Pricing</h2>
                        </div>
                        <div className="space-y-4">
                            {pricingFaqs.map((faq, idx) => {
                                const isOpen = openFaqIndex === idx;
                                return (
                                    <div 
                                        key={idx}
                                        className={`rounded-2xl border transition-all ${
                                            isLight ? 'bg-white border-gray-200' : 'bg-[#101422] border-white/10'
                                        }`}
                                    >
                                        <button
                                            onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                                            className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm"
                                            aria-expanded={isOpen}
                                        >
                                            <span>{faq.q}</span>
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
                                        </button>
                                        {isOpen && (
                                            <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-400 border-t border-white/5 leading-relaxed">
                                                {faq.a}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>

            <Footer theme={theme} />
        </div>
    );
};

export default PricingPage;
