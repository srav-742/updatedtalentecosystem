import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import './AssessmentsHome.css';

// Lazy-load CalibrationModal for booking demo
const CalibrationModal = lazy(() => import('../components/CalibrationModal'));

const PricingPage = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeFaqs, setActiveFaqs] = useState({ 0: true });

    // Interactive ROI Calculator State
    const [candidatesCount, setCandidatesCount] = useState(15);
    const [engineerHourlyRate, setEngineerHourlyRate] = useState(150);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('book-calibration') === 'true' || params.get('book-demo') === 'true' || params.get('plan')) {
            setIsModalOpen(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const toggleFaq = (index) => {
        setActiveFaqs(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    // Calculate Recommended Plan & ROI
    const getRecommendedPlan = (count) => {
        if (count <= 5) return { name: 'Pay as you go', monthlyCost: count * 7.5, unitCost: 7.5, allowance: `${count} assessments` };
        if (count <= 12) return { name: 'Starter', monthlyCost: 50, unitCost: (50 / 12), allowance: '12 assessments / mo' };
        if (count <= 25) return { name: 'Growth', monthlyCost: 100, unitCost: (100 / 25), allowance: '25 assessments / mo' };
        return { name: 'Scale & Enterprise', monthlyCost: Math.round(count * 3.5), unitCost: 3.5, allowance: `${count}+ custom pool` };
    };

    const recommended = getRecommendedPlan(candidatesCount);
    // Typical pass rate through technical screening is ~30%. That means 70% of candidates who would have taken a 60-min engineer interview are filtered out early with evidence.
    const savedInterviews = Math.max(1, Math.round(candidatesCount * 0.7));
    const savedHours = savedInterviews; // 1 hr per live interview
    const grossSavings = savedHours * engineerHourlyRate;
    const netSavings = Math.max(0, grossSavings - recommended.monthlyCost);
    const roiMultiplier = recommended.monthlyCost > 0 ? (grossSavings / recommended.monthlyCost).toFixed(1) : 0;

    const pricingFaqs = [
        {
            q: "How does automatic next-month rollover work?",
            a: "In traditional assessment tools, unused candidate invitations expire at midnight on your monthly billing date. With Hire1Percent, every unused base assessment and bonus assessment automatically carries over into your next month's available pool as long as your subscription is active. For example, if you use only 8 of your 12 Starter assessments in Month 1, the remaining 4 roll over—giving you 16 available assessments in Month 2."
        },
        {
            q: "What are bonus assessments and how do I receive them?",
            a: "Bonus assessments are complimentary evaluations included automatically with monthly subscription plans. The Starter plan ($50/mo) includes 2 bonus assessments each month (10 base + 2 bonus = 12 total), and the Growth plan ($100/mo) includes 5 bonus assessments each month (20 base + 5 bonus = 25 total). Unused bonus assessments also roll over automatically."
        },
        {
            q: "How does the ROI math work for technical screening?",
            a: "A typical 60-minute technical interview costs an engineering team between $100 and $250 in senior engineer salary and opportunity cost. When candidates complete a Hire1Percent assessment first, hiring teams objectively identify non-viable submissions (poor AST evolution, failing test edge cases, or incoherent video defense) before scheduling a live interview. Saving just one 60-minute interview covers the entire cost of a monthly Starter package."
        },
        {
            q: "Are all 4 anti-cheat layers included in every package?",
            a: "Yes. Every single assessment—including Pay as you go—runs through the complete 4-layer verification protocol: (1) Environment & biometric checks, (2) Keystroke rhythm & AST code evolution replay, (3) Code-specific 3-minute AI video defense, and (4) Mid-task requirement adaptation with LLM signature detection."
        },
        {
            q: "What happens if I need more assessments than my monthly allowance?",
            a: "If you exhaust your monthly allowance and accumulated rollover credits, you can easily top up additional assessments at your discounted subscriber unit rate ($4.17 for Starter, $4.00 for Growth) without having to switch tiers mid-billing cycle."
        },
        {
            q: "Can I cancel or pause my subscription at any time?",
            a: "Yes. Subscriptions are billed on a flexible month-to-month basis with no long-term contracts. You can pause or cancel at any time from your recruiter dashboard. Unused rollover credits remain accessible through the end of your paid billing period."
        }
    ];

    return (
        <div className="h1p-navy-page">
            <SEO 
                title="Pricing & Rollover Math — Candidate Assessment Packages | Hire1Percent" 
                description="Transparent pricing for candidate assessments: Starter ($50/mo, 12 assessments), Growth ($100/mo, 25 assessments), and Pay as you go ($7.50/ea). Automatic rollover math and free monthly bonus credits." 
                canonicalUrl="/pricing" 
            />

            {/* Header & Sticky Navigation (Identical to Homepage) */}
            <header>
                <div className="wrap nav">
                    <Link className="brand" to="/" aria-label="Hire1Percent home">
                        <span className="brand-mark" aria-hidden="true">
                            <img 
                                src="/logo-icon.png" 
                                alt="Hire1Percent logo" 
                                width="43" 
                                height="43" 
                                onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                                className="brand-logo-img" 
                            />
                        </span>
                        <span className="wordmark">Hire<span>1Percent</span></span>
                    </Link>
                    
                    <nav className={`navlinks ${menuOpen ? 'mobile-open' : ''}`} id="navlinks" aria-label="Main navigation">
                        <a href="/#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
                        <a href="/#anti-cheat" onClick={() => setMenuOpen(false)}>4-layer anti-cheat</a>
                        <Link to="/sample-report" onClick={() => setMenuOpen(false)}>Sample report</Link>
                        <a href="/#candidate-experience" onClick={() => setMenuOpen(false)}>Candidate experience</a>
                        <Link to="/pricing" onClick={() => setMenuOpen(false)} style={{ color: '#C99A45', fontWeight: 800 }}>Pricing</Link>
                        <Link to="/blog" onClick={() => setMenuOpen(false)}>Blog</Link>
                    </nav>

                    <div className="nav-actions">
                        <Link className="login" to="/login">Log in</Link>
                        <Link className="login" to="/signup">Sign up</Link>
                        <button className="btn" type="button" onClick={() => setIsModalOpen(true)}>
                            Book a 15-minute demo <span>↗</span>
                        </button>
                        <button 
                            className="mobile-menu" 
                            id="menuToggle" 
                            aria-label="Open navigation" 
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen(!menuOpen)}
                        >
                            {menuOpen ? '×' : '☰'}
                        </button>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero Header */}
                <section className="hero" id="pricing-hero">
                    <div className="wrap" style={{ textAlign: 'center', maxWidth: '860px', margin: '0 auto' }}>
                        <div className="eyebrow" style={{ justifyContent: 'center' }}>Candidate assessment packages &amp; rollover math</div>
                        <h1 style={{ margin: '18px auto 16px', maxWidth: '800px' }}>
                            Match Your Assessment Allowance to <span className="accent">Your Exact Volume.</span>
                        </h1>
                        <p className="hero-copy" style={{ maxWidth: '720px', margin: '0 auto 24px', fontSize: '16px' }}>
                            One saved 60-minute senior engineering interview pays for an entire month of assessments. Choose a monthly package with free bonus assessments and automatic next-month rollover, or pay as you go.
                        </p>
                    </div>
                </section>

                {/* 4 Packages Grid */}
                <section className="section section-white" id="packages">
                    <div className="wrap">
                        <div className="section-head">
                            <div className="eyebrow">Candidate assessment packages &amp; ROI</div>
                            <h2>Choose the Plan That Fits Your Hiring Volume.</h2>
                            <p>Every tier includes all 4 anti-cheat layers, mid-task requirement adaptation, AST code replay, and 3-minute video defense.</p>
                        </div>

                        <div className="pricing-grid">
                            {/* Pay as you go */}
                            <article className="price-card">
                                <h3>Pay as you go</h3>
                                <div className="price">$7.50 <small>/ assessment</small></div>
                                <div className="allowance">Purchase individually<small>No monthly commitment</small></div>
                                <ul>
                                    <li>Buy assessments as needed</li>
                                    <li>Simple, flexible usage</li>
                                    <li>Full 4-layer anti-cheat suite</li>
                                    <li>AST code evolution &amp; keystrokes</li>
                                    <li>3-minute AI video defense</li>
                                    <li>Individual candidate invite links</li>
                                </ul>
                                <button className="btn btn-light" type="button" onClick={() => setIsModalOpen(true)}>
                                    Discuss pay as you go
                                </button>
                            </article>

                            {/* Starter (Featured) */}
                            <article className="price-card featured">
                                <span className="popular">12 ASSESSMENTS · POPULAR</span>
                                <h3>Starter</h3>
                                <div className="price">$50 <small>/ month</small></div>
                                <div className="allowance">12 assessments / month<small>10 base + 2 bonus · ~$4.17 each</small></div>
                                <ul>
                                    <li>Bonus assessments included</li>
                                    <li>Unused credits roll over</li>
                                    <li>Save 44% vs pay-as-you-go</li>
                                    <li>Full 4-layer anti-cheat suite</li>
                                    <li>AST code evolution &amp; keystrokes</li>
                                    <li>3-minute AI video defense</li>
                                    <li>Candidate ranking scorecard</li>
                                </ul>
                                <button className="btn" type="button" onClick={() => setIsModalOpen(true)}>
                                    Discuss Starter
                                </button>
                            </article>

                            {/* Growth */}
                            <article className="price-card">
                                <span className="popular">25 ASSESSMENTS · BEST VALUE</span>
                                <h3>Growth</h3>
                                <div className="price">$100 <small>/ month</small></div>
                                <div className="allowance">25 assessments / month<small>20 base + 5 bonus · $4 each</small></div>
                                <ul>
                                    <li>Bonus assessments included</li>
                                    <li>Unused credits roll over</li>
                                    <li>Save 47% vs pay-as-you-go</li>
                                    <li>Priority assessment scoring</li>
                                    <li>Custom benchmark thresholds</li>
                                    <li>Multi-reviewer collaboration</li>
                                    <li>Priority technical support</li>
                                </ul>
                                <button className="btn btn-light" type="button" onClick={() => setIsModalOpen(true)}>
                                    Discuss Growth
                                </button>
                            </article>

                            {/* Scale & Enterprise */}
                            <article className="price-card">
                                <h3>Scale &amp; Enterprise</h3>
                                <div className="price">Custom</div>
                                <div className="allowance">100+ assessments / month<small>Custom volume pool</small></div>
                                <ul>
                                    <li>Volume-tiered pricing</li>
                                    <li>Dedicated onboarding</li>
                                    <li>Custom role tasks built for stack</li>
                                    <li>Native ATS integrations</li>
                                    <li>Dedicated CSM &amp; custom SLA</li>
                                </ul>
                                <button className="btn btn-light" type="button" onClick={() => setIsModalOpen(true)}>
                                    Discuss Scale
                                </button>
                            </article>
                        </div>
                    </div>
                </section>

                {/* THE ROLLOVER MATH DEEP DIVE SECTION */}
                <section className="section" id="rollover-math" style={{ background: '#F8F8FA' }}>
                    <div className="wrap">
                        <div className="section-head">
                            <div className="eyebrow">Zero-waste budget architecture</div>
                            <h2>How Next-Month Rollover Math Works.</h2>
                            <p>Hiring velocity changes from sprint to sprint. In traditional assessment platforms, you lose any unused candidate test invitations at the end of every monthly billing cycle. With Hire1Percent, every single unused assessment automatically rolls over into your next month's pool.</p>
                        </div>

                        {/* 4-Step Rollover Flow Cards */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '16px',
                            marginBottom: '32px'
                        }}>
                            <div style={{
                                background: 'white',
                                border: '1px solid var(--line)',
                                borderRadius: '14px',
                                padding: '24px 20px',
                                boxShadow: 'var(--shadow)'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: '#20263A',
                                    color: '#E6BC6B',
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontWeight: 800,
                                    fontSize: '13px',
                                    marginBottom: '14px'
                                }}>1</div>
                                <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 8px', color: 'var(--navy)' }}>Monthly Allocation</h4>
                                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                                    Starter grants <strong>12 assessments</strong> (10 base + 2 bonus) on Day 1 of your monthly billing cycle.
                                </p>
                            </div>

                            <div style={{
                                background: 'white',
                                border: '1px solid var(--line)',
                                borderRadius: '14px',
                                padding: '24px 20px',
                                boxShadow: 'var(--shadow)'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: '#C99A45',
                                    color: 'white',
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontWeight: 800,
                                    fontSize: '13px',
                                    marginBottom: '14px'
                                }}>2</div>
                                <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 8px', color: 'var(--navy)' }}>Active Evaluation</h4>
                                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                                    You run <strong>7 candidate assessments</strong> during the month. <strong>5 assessments</strong> remain unused.
                                </p>
                            </div>

                            <div style={{
                                background: 'white',
                                border: '1px solid var(--line)',
                                borderRadius: '14px',
                                padding: '24px 20px',
                                boxShadow: 'var(--shadow)'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: '#287748',
                                    color: 'white',
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontWeight: 800,
                                    fontSize: '13px',
                                    marginBottom: '14px'
                                }}>3</div>
                                <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 8px', color: 'var(--navy)' }}>Automatic Rollover</h4>
                                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                                    The <strong>5 unused credits</strong> automatically roll over into next month. Zero expire or get confiscated.
                                </p>
                            </div>

                            <div style={{
                                background: '#F4EBDD',
                                border: '1.5px solid #D4AC5F',
                                borderRadius: '14px',
                                padding: '24px 20px',
                                boxShadow: '0 8px 24px rgba(201, 154, 69, 0.12)'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: '#20263A',
                                    color: '#E6BC6B',
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontWeight: 800,
                                    fontSize: '13px',
                                    marginBottom: '14px'
                                }}>4</div>
                                <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 8px', color: '#8A6427' }}>Compounded Pool</h4>
                                <p style={{ fontSize: '13px', color: '#684F25', margin: 0, lineHeight: 1.6 }}>
                                    Month 2 opens with 12 fresh assessments + 5 rollover credits = <strong>17 assessments ready to deploy</strong>!
                                </p>
                            </div>
                        </div>

                        {/* Bonus Credits & Protection Callout Box */}
                        <div style={{
                            background: 'white',
                            border: '1px solid var(--line)',
                            borderRadius: '14px',
                            padding: '28px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '24px'
                        }}>
                            <div>
                                <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#C99A45' }}>★</span> Free Monthly Bonus Credits
                                </h4>
                                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                                    Starter grants <strong>2 free bonus assessments</strong> every month (24/year, $180 value). Growth grants <strong>5 free bonus assessments</strong> every month (60/year, $450 value). Bonus credits roll over just like base credits.
                                </p>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#287748' }}>✓</span> Unused Credit Protection
                                </h4>
                                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                                    As long as your monthly subscription is active, your rolled-over assessments never expire. Accumulate credits during slow hiring months so your budget is fully prepared for future high-volume hiring sprints.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* INTERACTIVE ASSESSMENT & ROI CALCULATOR */}
                <section className="section section-white" id="calculator">
                    <div className="wrap">
                        <div className="section-head">
                            <div className="eyebrow">Interactive ROI &amp; volume calculator</div>
                            <h2>Calculate Your Team's Time &amp; Cost Savings.</h2>
                            <p>See how much senior engineering interview time and budget your team recovers by screening with objective evidence.</p>
                        </div>

                        <div style={{
                            background: '#F8F8FA',
                            border: '1px solid var(--line)',
                            borderRadius: '18px',
                            padding: 'clamp(24px, 4vw, 42px)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: '36px',
                            alignItems: 'center'
                        }}>
                            {/* Sliders */}
                            <div>
                                <div style={{ marginBottom: '28px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <label htmlFor="candidates-input" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                                            Candidates to assess per month:
                                        </label>
                                        <span style={{
                                            fontSize: '17px',
                                            fontWeight: 800,
                                            color: 'var(--navy)',
                                            background: '#F4EBDD',
                                            padding: '4px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #D4AC5F'
                                        }}>
                                            {candidatesCount} candidates
                                        </span>
                                    </div>
                                    <input 
                                        id="candidates-input"
                                        type="range" 
                                        min="2" 
                                        max="60" 
                                        value={candidatesCount} 
                                        onChange={(e) => setCandidatesCount(Number(e.target.value))}
                                        style={{ width: '100%', accentColor: '#C99A45', cursor: 'pointer', height: '6px' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                                        <span>2 (Occasional)</span>
                                        <span>12 (Starter)</span>
                                        <span>25 (Growth)</span>
                                        <span>60+ (Scale)</span>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <label htmlFor="hourly-input" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                                            Senior Engineer hourly rate:
                                        </label>
                                        <span style={{
                                            fontSize: '17px',
                                            fontWeight: 800,
                                            color: 'var(--navy)',
                                            background: '#F4EBDD',
                                            padding: '4px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #D4AC5F'
                                        }}>
                                            ${engineerHourlyRate} / hour
                                        </span>
                                    </div>
                                    <input 
                                        id="hourly-input"
                                        type="range" 
                                        min="80" 
                                        max="250" 
                                        step="10"
                                        value={engineerHourlyRate} 
                                        onChange={(e) => setEngineerHourlyRate(Number(e.target.value))}
                                        style={{ width: '100%', accentColor: '#C99A45', cursor: 'pointer', height: '6px' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                                        <span>$80/hr (Mid)</span>
                                        <span>$150/hr (Senior)</span>
                                        <span>$250/hr (Principal)</span>
                                    </div>
                                </div>

                                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                                    <strong>How it works:</strong> Approximately 70% of candidate submissions fail edge tests, show AI copy-paste anomalies in AST history, or fail their 3-minute code defense. Screening them out upfront saves ~{savedHours} live senior engineering interview hours every month.
                                </p>
                            </div>

                            {/* ROI Results Card */}
                            <div style={{
                                background: 'white',
                                border: '1.5px solid var(--line)',
                                borderRadius: '16px',
                                padding: '28px',
                                boxShadow: 'var(--shadow)'
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: '4px' }}>
                                    Recommended Plan
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--navy)', letterSpacing: '-.04em' }}>
                                        {recommended.name}
                                    </span>
                                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#C99A45' }}>
                                        ${recommended.monthlyCost} <small style={{ fontSize: '11px', color: 'var(--muted)' }}>/ mo</small>
                                    </span>
                                </div>

                                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', display: 'grid', gap: '10px', fontSize: '13px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                                        <span>Effective unit rate:</span>
                                        <strong style={{ color: 'var(--ink)' }}>${recommended.unitCost.toFixed(2)} / assessment</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                                        <span>Engineer interview hours saved:</span>
                                        <strong style={{ color: '#287748' }}>~{savedHours} senior engineer hours</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                                        <span>Gross engineer salary saved:</span>
                                        <strong style={{ color: 'var(--ink)' }}>${grossSavings.toLocaleString()}</strong>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderTop: '1px solid var(--line)',
                                        paddingTop: '12px',
                                        marginTop: '4px',
                                        fontSize: '15px',
                                        fontWeight: 800
                                    }}>
                                        <span style={{ color: 'var(--navy)' }}>Net Monthly Savings:</span>
                                        <span style={{ color: '#287748' }}>+${netSavings.toLocaleString()} ({roiMultiplier}x ROI)</span>
                                    </div>
                                </div>

                                <button 
                                    type="button" 
                                    className="btn btn-lime"
                                    onClick={() => setIsModalOpen(true)}
                                    style={{ width: '100%', marginTop: '20px', padding: '12px' }}
                                >
                                    Discuss {recommended.name} ↗
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FEATURE COMPARISON TABLE */}
                <section className="section" id="comparison" style={{ background: '#F8F8FA' }}>
                    <div className="wrap">
                        <div className="section-head">
                            <div className="eyebrow">Full package comparison</div>
                            <h2>Compare Package Capabilities.</h2>
                            <p>Detailed breakdown of candidate assessment allowances, anti-cheat features, and technical support across all packages.</p>
                        </div>

                        <div style={{
                            background: 'white',
                            border: '1px solid var(--line)',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow)'
                        }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: '#F4EBDD', borderBottom: '1px solid #D4AC5F' }}>
                                            <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--navy)' }}>Capability</th>
                                            <th style={{ padding: '16px 16px', fontWeight: 800, color: 'var(--navy)' }}>Pay As You Go</th>
                                            <th style={{ padding: '16px 16px', fontWeight: 800, color: '#8A6427', background: '#F0E2CD' }}>Starter (Popular)</th>
                                            <th style={{ padding: '16px 16px', fontWeight: 800, color: 'var(--navy)' }}>Growth</th>
                                            <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--navy)' }}>Scale &amp; Enterprise</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ color: 'var(--ink)' }}>
                                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                                            <td style={{ padding: '14px 20px', fontWeight: 600 }}>Monthly assessments</td>
                                            <td style={{ padding: '14px 16px' }}>On-demand</td>
                                            <td style={{ padding: '14px 16px', fontWeight: 800, color: '#8A6427', background: '#FAFAF7' }}>12 (10 base + 2 bonus)</td>
                                            <td style={{ padding: '14px 16px', fontWeight: 700 }}>25 (20 base + 5 bonus)</td>
                                            <td style={{ padding: '14px 20px' }}>100+ volume pool</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                                            <td style={{ padding: '14px 20px', fontWeight: 600 }}>Automatic rollover math</td>
                                            <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>—</td>
                                            <td style={{ padding: '14px 16px', fontWeight: 800, color: '#287748', background: '#FAFAF7' }}>✓ Included</td>
                                            <td style={{ padding: '14px 16px', fontWeight: 800, color: '#287748' }}>✓ Included</td>
                                            <td style={{ padding: '14px 20px', fontWeight: 800, color: '#287748' }}>✓ Included</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                                            <td style={{ padding: '14px 20px', fontWeight: 600 }}>Effective rate per assessment</td>
                                            <td style={{ padding: '14px 16px' }}>$7.50</td>
                                            <td style={{ padding: '14px 16px', fontWeight: 800, color: '#8A6427', background: '#FAFAF7' }}>~$4.17 (save 44%)</td>
                                            <td style={{ padding: '14px 16px', fontWeight: 700 }}>$4.00 (save 47%)</td>
                                            <td style={{ padding: '14px 20px' }}>Volume discounts</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                                            <td style={{ padding: '14px 20px', fontWeight: 600 }}>4-layer anti-cheat protocol</td>
                                            <td style={{ padding: '14px 16px', color: '#287748' }}>✓ Included</td>
                                            <td style={{ padding: '14px 16px', color: '#287748', background: '#FAFAF7' }}>✓ Included</td>
                                            <td style={{ padding: '14px 16px', color: '#287748' }}>✓ Included</td>
                                            <td style={{ padding: '14px 20px', color: '#287748' }}>✓ Included</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                                            <td style={{ padding: '14px 20px', fontWeight: 600 }}>AST code evolution &amp; keystrokes</td>
                                            <td style={{ padding: '14px 16px', color: '#287748' }}>✓ Included</td>
                                            <td style={{ padding: '14px 16px', color: '#287748', background: '#FAFAF7' }}>✓ Included</td>
                                            <td style={{ padding: '14px 16px', color: '#287748' }}>✓ Included</td>
                                            <td style={{ padding: '14px 20px', color: '#287748' }}>✓ Included</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                                            <td style={{ padding: '14px 20px', fontWeight: 600 }}>Mid-task requirement update</td>
                                            <td style={{ padding: '14px 16px', color: '#287748' }}>✓ Included</td>
                                            <td style={{ padding: '14px 16px', color: '#287748', background: '#FAFAF7' }}>✓ Included</td>
                                            <td style={{ padding: '14px 16px', color: '#287748' }}>✓ Included</td>
                                            <td style={{ padding: '14px 20px', color: '#287748' }}>✓ Included</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                                            <td style={{ padding: '14px 20px', fontWeight: 600 }}>3-minute AI spoken code defense</td>
                                            <td style={{ padding: '14px 16px', color: '#287748' }}>✓ Included</td>
                                            <td style={{ padding: '14px 16px', color: '#287748', background: '#FAFAF7' }}>✓ Included</td>
                                            <td style={{ padding: '14px 16px', color: '#287748' }}>✓ Included</td>
                                            <td style={{ padding: '14px 20px', color: '#287748' }}>✓ Included</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                                            <td style={{ padding: '14px 20px', fontWeight: 600 }}>Custom role coding tasks</td>
                                            <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>—</td>
                                            <td style={{ padding: '14px 16px', color: 'var(--muted)', background: '#FAFAF7' }}>—</td>
                                            <td style={{ padding: '14px 16px' }}>Standard library</td>
                                            <td style={{ padding: '14px 20px', fontWeight: 800, color: '#287748' }}>✓ Custom crafted for stack</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                                            <td style={{ padding: '14px 20px', fontWeight: 600 }}>Native ATS integrations</td>
                                            <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>—</td>
                                            <td style={{ padding: '14px 16px', color: 'var(--muted)', background: '#FAFAF7' }}>—</td>
                                            <td style={{ padding: '14px 16px' }}>Webhook export</td>
                                            <td style={{ padding: '14px 20px', fontWeight: 800, color: '#287748' }}>✓ Greenhouse, Lever, Ashby</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '14px 20px', fontWeight: 600 }}>Support tier</td>
                                            <td style={{ padding: '14px 16px' }}>Email / Community</td>
                                            <td style={{ padding: '14px 16px', background: '#FAFAF7' }}>Standard Email</td>
                                            <td style={{ padding: '14px 16px' }}>Priority Email</td>
                                            <td style={{ padding: '14px 20px', fontWeight: 800, color: '#8A6427' }}>Dedicated CSM &amp; SLA</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQs Section (Exact Homepage Styling) */}
                <section className="section section-white" id="faqs">
                    <div className="wrap">
                        <div className="faq" style={{ margin: '0 auto' }}>
                            <div className="eyebrow" style={{ justifyContent: 'center' }}>Transparent Answers</div>
                            <h3 style={{ marginTop: '12px' }}>Frequently Asked Questions</h3>
                            {pricingFaqs.map((item, idx) => (
                                <div key={idx} className={`faq-item ${activeFaqs[idx] ? 'open' : ''}`}>
                                    <button 
                                        className="faq-q" 
                                        aria-expanded={Boolean(activeFaqs[idx])}
                                        onClick={() => toggleFaq(idx)}
                                    >
                                        <span>{item.q}</span>
                                        <span>+</span>
                                    </button>
                                    <div className="faq-a">
                                        {item.a}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Closing Banner (Exact Homepage Styling) */}
                <section className="closing">
                    <div className="wrap">
                        <div className="closing-panel">
                            <div className="closing-copy">
                                <h2>Bring 1 Open Engineering Role. Inspect the Assessment Your Team Would Review.</h2>
                                <p>Explore the coding task, mid-task requirement change, AST code evolution, and 3-minute video defense workflow in a focused 15-minute live walkthrough.</p>
                            </div>
                            <div className="closing-actions">
                                <button className="btn btn-lime" type="button" onClick={() => setIsModalOpen(true)}>
                                    Book a 15-minute demo ↗
                                </button>
                                <Link 
                                    className="btn" 
                                    style={{ background: 'transparent', borderColor: '#ffffff70' }} 
                                    to="/sample-report"
                                >
                                    Explore an assessment report
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer (Exact Homepage Styling) */}
            <footer className="footer">
                <div className="wrap">
                    <div className="footer-top">
                        <div className="footer-brand-column">
                            <Link className="brand" to="/" aria-label="Hire1Percent home">
                                <span className="brand-mark" aria-hidden="true">
                                    <img 
                                        src="/logo-icon.png" 
                                        alt="Hire1Percent logo" 
                                        width="39" 
                                        height="39" 
                                        onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                                        className="brand-logo-img" 
                                    />
                                </span>
                                <span className="wordmark">Hire<span>1Percent</span></span>
                            </Link>
                            <p className="footer-desc">
                                Technical assessment and screening platform that brings role-relevant code, live requirement adaptation, spoken code defense, and 4-layer anti-cheat evidence into one review.
                            </p>
                        </div>
                        <nav className="footer-links" aria-label="Explore">
                            <h4>Explore</h4>
                            <Link to="/sample-report">Sample report</Link>
                            <Link to="/pricing">Pricing</Link>
                            <a href="/#candidate-experience">For engineers</a>
                            <Link to="/blog">Blog</Link>
                        </nav>
                        <nav className="footer-links" aria-label="Company and support">
                            <h4>Company &amp; support</h4>
                            <Link to="/privacy">Security and privacy</Link>
                            <Link to="/privacy">Privacy Policy</Link>
                            <Link to="/terms">Terms</Link>
                            <Link to="/contact">Contact</Link>
                        </nav>
                    </div>
                    <div className="footer-bottom">
                        <span>© 2026 Hire1Percent. All rights reserved.</span>
                        <span>Technical assessment. Clear evidence. Better interviews.</span>
                    </div>
                </div>
            </footer>

            {/* Live Demo Booking Modal */}
            <Suspense fallback={null}>
                {isModalOpen && (
                    <CalibrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
                )}
            </Suspense>
        </div>
    );
};

export default PricingPage;
