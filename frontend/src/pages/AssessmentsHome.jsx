import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './AssessmentsHome.css';

// Lazy-load CalibrationModal for booking demo
const CalibrationModal = lazy(() => import('../components/CalibrationModal'));

const AssessmentsHome = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeFaqs, setActiveFaqs] = useState({});
    const [showCookie, setShowCookie] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('book-calibration') === 'true' || params.get('book-demo') === 'true' || params.get('plan')) {
            setIsModalOpen(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const cookieConsent = localStorage.getItem('h1p-cookie-consent');
        if (!cookieConsent) {
            // Show cookie after 1.5 seconds if user hasn't made a choice yet
            const timer = setTimeout(() => setShowCookie(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const toggleFaq = (index) => {
        setActiveFaqs(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const handleAcceptCookies = () => {
        localStorage.setItem('h1p-cookie-consent', 'accepted');
        setShowCookie(false);
    };

    const handleRejectCookies = () => {
        localStorage.setItem('h1p-cookie-consent', 'rejected');
        setShowCookie(false);
    };

    const scrollToSection = (id) => {
        setMenuOpen(false);
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const scrollToReport = () => {
        setMenuOpen(false);
        const el = document.getElementById('report-preview');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('report-highlight');
            setTimeout(() => {
                el.classList.remove('report-highlight');
            }, 2200);
        }
    };

    const faqs = [
        {
            q: "What happens in one candidate assessment?",
            a: "Candidates complete a role-relevant coding task, respond to a disclosed mid-task requirement update, and explain their submitted code in an immediate 3-minute AI video defense. The reviewer report connects unit test results with code evolution and 4-layer anti-cheat evidence."
        },
        {
            q: "How does the 4-layer protocol help identify AI-assisted cheating?",
            a: "Hire1Percent combines environment and biometric checks, keystroke and AST code evolution, a code-specific 3-minute AI video defense, and mid-task requirement updates with LLM-signature detection. Reviewers can assess these signals together rather than relying on a single browser lock."
        },
        {
            q: "What makes the 3-minute video defense different?",
            a: "The AI prompt refers directly to the candidate’s own code submission and test outcomes—asking why they chose a data structure or how they would resolve a failing edge case—so reviewers can check comprehension beside the code."
        },
        {
            q: "Do candidates know requirements will change mid-task?",
            a: "Yes. The two-stage format is disclosed in the assessment instructions before the timer begins, and the updated requirement is presented clearly inside the editor before final submission."
        },
        {
            q: "How do bonus assessments and rollover work?",
            a: "Starter ($50/month) includes 10 base and 2 bonus assessments; Growth ($100/month) includes 20 base and 5 bonus assessments. Unused monthly base and bonus assessments roll into the next month."
        },
        {
            q: "What types of assessments does Hire1Percent support?",
            a: "Hire1Percent supports practical coding assessments, basic skill assessments, and AI interviews. Teams can focus on the technical and role-relevant skills they need to evaluate before moving candidates forward."
        }
    ];

    return (
        <div className="h1p-navy-page">
            <SEO 
                title="Hire1Percent — Evidence-led engineering assessments" 
                description="Hire1Percent helps hiring teams screen candidates with coding assessments, basic assessments, and AI interviews, supported by role-relevant coding evidence, live requirement adaptation, spoken code defense, and 4-layer authorship signals." 
                canonicalUrl="/" 
            />

            {/* Header & Sticky Navigation */}
            <header>
                <div className="wrap nav">
                    <a className="brand" href="#hero" onClick={(e) => { e.preventDefault(); scrollToSection('hero'); }} aria-label="Hire1Percent home">
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
                    </a>
                    
                    <nav className={`navlinks ${menuOpen ? 'mobile-open' : ''}`} id="navlinks" aria-label="Main navigation">
                        <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }}>How it works</a>
                        <a href="#anti-cheat" onClick={(e) => { e.preventDefault(); scrollToSection('anti-cheat'); }}>4-layer anti-cheat</a>
                        <a href="#report-preview" onClick={(e) => { e.preventDefault(); scrollToReport(); }}>Sample report</a>
                        <a href="#candidate-experience" onClick={(e) => { e.preventDefault(); scrollToSection('candidate-experience'); }}>Candidate experience</a>
                        <Link to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
                    </nav>

                    <div className="nav-actions">
                        <Link className="login" to="/login">Log in</Link>
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
                {/* Hero Section */}
                <section className="hero" id="hero">
                    <div className="wrap hero-grid">
                        <div>
                            <div className="eyebrow">Coding assessments · Basic assessments · AI interviews</div>
                            <h1>Assess How Candidates Code, Adapt, and <span className="accent">Defend Their Decisions</span>—Before You Book the Interview.</h1>
                            <p className="hero-copy">
                                Hire1Percent helps teams screen candidates through coding assessments, basic skill checks, and AI interviews. Go deeper on coding with a practical role-relevant task, a live mid-task requirement change, and a 3-minute AI code defense—supported by a 4-layer anti-cheat protocol. Bring test results, adaptation behaviour, and candidate reasoning into one review before booking a senior engineering interview.
                            </p>
                            <div className="hero-actions">
                                <button className="btn" type="button" onClick={() => setIsModalOpen(true)}>
                                    Book a 15-minute demo <span>↗</span>
                                </button>
                                <button className="btn btn-light" type="button" onClick={scrollToReport}>
                                    Explore an assessment report <span>↗</span>
                                </button>
                            </div>
                            <div className="support">
                                <b>✓</b> Review the task, test failures &amp; explanation transcript — no signup required.
                            </div>
                            <div className="hero-note">
                                <span className="check">✓</span>
                                <span><strong>One clear review.</strong> Results, code evolution, live adaptation &amp; authorship evidence.</span>
                            </div>
                        </div>

                        {/* Assessment Report Preview Aside */}
                        <aside className="report assessment-sheet" id="report-preview" aria-label="Assessment report preview">
                            <div className="sheet-windowbar">
                                <span className="window-dots"><i></i><i></i><i></i></span>
                                <span>ASSESSMENT REPORT <b>·</b> BACKEND ENGINEER</span>
                                <span className="sheet-lock">CANDIDATE REVIEW</span>
                            </div>
                            <div className="sheet-candidate">
                                <div className="candidate-avatar" role="img" aria-label="Candidate profile illustration"></div>
                                <div className="candidate-meta">
                                    <strong>Backend Engineer</strong>
                                    <span>Python <b>·</b> Event processing task</span>
                                </div>
                                <div className="candidate-id">
                                    <span>ASSESSMENT ID</span>
                                    <strong>H1P-2048</strong>
                                </div>
                            </div>
                            <div className="sheet-score-panel">
                                <div className="score-ring">
                                    <div>
                                        <strong>8</strong>
                                        <span>/ 10</span>
                                    </div>
                                </div>
                                <div className="score-main">
                                    <div className="score-main-top">
                                        <strong>Assessment result</strong>
                                        <span className="followup-badge"><i></i> FOLLOW-UP ADVISED</span>
                                    </div>
                                    <div className="score-caption">Unit tests passed</div>
                                    <div className="score-meter">
                                        <span style={{ width: '80%' }}></span>
                                    </div>
                                    <div className="score-minmax">
                                        <span>0 tests</span>
                                        <b>80% passed</b>
                                        <span>10 tests</span>
                                    </div>
                                </div>
                            </div>

                            <div className="sheet-metrics">
                                <div className="sheet-metric">
                                    <span className="metric-symbol pass">✓</span>
                                    <div>
                                        <strong>8</strong>
                                        <small>Tests passed</small>
                                    </div>
                                </div>
                                <div className="sheet-metric">
                                    <span className="metric-symbol fail">!</span>
                                    <div>
                                        <strong>2</strong>
                                        <small>Review points</small>
                                    </div>
                                </div>
                                <div className="sheet-metric">
                                    <span className="metric-symbol layer">◈</span>
                                    <div>
                                        <strong>4 / 4</strong>
                                        <small>Evidence layers</small>
                                    </div>
                                </div>
                            </div>

                            <div className="sheet-block recruiter-block">
                                <div className="sheet-section-label">
                                    <span>01</span> RECRUITER SUMMARY <b>PLAIN ENGLISH</b>
                                </div>
                                <p>The solution handles basic cases and adjacent repeats. Adaptation is incomplete: an older event arriving late moves the latest timestamp backwards, and a duplicate event separated by another event is counted twice.</p>
                            </div>

                            <div className="sheet-block review-block">
                                <div className="sheet-section-label">
                                    <span>02</span> PRIORITY REVIEW POINTS <b>2 FLAGS</b>
                                </div>
                                <div className="review-row">
                                    <div className="review-code">T09</div>
                                    <div className="review-content">
                                        <strong>Latest timestamp moves backwards</strong>
                                        <span>Line 11 <b>·</b> Needs max(timestamp) handling</span>
                                    </div>
                                    <span className="review-alert">!</span>
                                </div>
                                <div className="review-row">
                                    <div className="review-code">T10</div>
                                    <div className="review-content">
                                        <strong>Non-adjacent duplicate counted twice</strong>
                                        <span>Lines 6–7, 12 <b>·</b> Needs a batch-wide seen-ID set</span>
                                    </div>
                                    <span className="review-alert">!</span>
                                </div>
                            </div>

                            <div className="sheet-evidence">
                                <div className="sheet-section-label">
                                    <span>03</span> AUTHORSHIP &amp; SESSION EVIDENCE <b>CAPTURED</b>
                                </div>
                                <div className="evidence-chips">
                                    <span><i>✓</i> Workspace lock</span>
                                    <span><i>✓</i> AST checkpoints</span>
                                    <span><i>✓</i> Code defense</span>
                                    <span><i>✓</i> Requirement diff</span>
                                </div>
                            </div>

                            <div className="sheet-footer">
                                <span><b>ASSESSMENT SNAPSHOT</b> · Coding, adaptation &amp; authorship evidence</span>
                                <button type="button" onClick={scrollToReport}>View full report ↗</button>
                            </div>
                        </aside>
                    </div>
                </section>

                {/* 4 Interlocking Layers Strip */}
                <div className="layer-strip">
                    <div className="wrap">
                        <div className="strip-heading">4 interlocking anti-cheat layers built into every assessment</div>
                        <div className="layers">
                            <div className="layer-mini">
                                <div className="layer-num">01</div>
                                <div>
                                    <strong>Environment &amp; Biometric Lock</strong>
                                    <small>Workspace context</small>
                                </div>
                            </div>
                            <div className="layer-mini">
                                <div className="layer-num">02</div>
                                <div>
                                    <strong>Keystroke &amp; AST Evolution</strong>
                                    <small>How the code took shape</small>
                                </div>
                            </div>
                            <div className="layer-mini">
                                <div className="layer-num">03</div>
                                <div>
                                    <strong>3-Minute AI Code Defense</strong>
                                    <small>Explain the submitted code</small>
                                </div>
                            </div>
                            <div className="layer-mini">
                                <div className="layer-num">04</div>
                                <div>
                                    <strong>Live Changes &amp; LLM Signals</strong>
                                    <small>Adaptation under new criteria</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* How It Works Section */}
                <section className="section section-white" id="how-it-works">
                    <div className="wrap">
                        <div className="section-head">
                            <div className="eyebrow">One unified assessment workflow</div>
                            <h2>See the Result, the Code Evolution, and the Reasoning Behind It.</h2>
                            <p>Follow every candidate from role alignment through live coding, requirement adaptation, and spoken explanation. Give recruiters a clear shortlist summary and engineering leads the technical evidence behind it.</p>
                        </div>

                        <div className="steps">
                            <article className="step">
                                <div className="step-no">01 / ALIGN</div>
                                <h3>Set the role and assessment</h3>
                                <p>Match applicants against the role’s stack requirements with a practical coding task. Separate unproven resume claims from what the assessment demonstrates.</p>
                            </article>
                            <article className="step">
                                <div className="step-no">02 / ASSESS</div>
                                <h3>Test coding and live adaptation</h3>
                                <p>Candidates work in an instrumented cloud sandbox while unit tests, keystrokes, and AST code evolution are captured. A disclosed mid-task requirement update asks them to refactor before submission.</p>
                            </article>
                            <article className="step">
                                <div className="step-no">03 / VERIFY</div>
                                <h3>Ask candidates to defend their code</h3>
                                <p>Immediately after submission, an AI prompt asks about their own implementation. Candidates have 3 minutes to explain a data structure, edge case, or trade-off in an asynchronous video response.</p>
                            </article>
                        </div>

                        <div className="scorecard-row">
                            <div>
                                <div className="eyebrow">Inside the unified scorecard</div>
                                <h3>A Score Starts the Conversation. The Evidence Makes It Useful.</h3>
                                <p>Turn a pass/fail result into specific, useful follow-up questions for the technical interview.</p>
                                <button className="text-link" type="button" onClick={scrollToReport}>
                                    Explore the full candidate report →
                                </button>
                            </div>
                            <div className="evidence-list">
                                <div className="evidence-item"><span className="check">✓</span>Plain-English recruiter summary and pinpointed interview questions</div>
                                <div className="evidence-item"><span className="check">✓</span>Unit test breakdown with expected vs. actual outputs</div>
                                <div className="evidence-item"><span className="check">✓</span>Submitted code linked to AST evolution checkpoints</div>
                                <div className="evidence-item"><span className="check">✓</span>Mid-task requirement update and before/after code diff</div>
                                <div className="evidence-item"><span className="check">✓</span>Code-specific AI prompt, 3-minute response, searchable transcript</div>
                                <div className="evidence-item"><span className="check">✓</span>4-layer session telemetry and LLM-signature analysis</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Anti-Cheat Section */}
                <section className="section" id="anti-cheat">
                    <div className="wrap">
                        <div className="section-head">
                            <div className="eyebrow">4-layer anti-cheat protocol</div>
                            <h2>Why Cheaters Fail: A 4-Layer Compounding Obstacle Course.</h2>
                            <p>An assessment score is worthless if you cannot trust who wrote the code. Hire1Percent combines continuous context telemetry, live requirement changes, and immediate on-camera code defense—rather than relying on a browser lock alone.</p>
                        </div>

                        <div className="timeline">
                            <div className="timepoint">
                                <b>00:00 · Layers 1 + 2</b>
                                <strong>Lock the workspace. Track code evolution.</strong>
                                <p>Environment checks and AST telemetry run continuously during coding.</p>
                            </div>
                            <div className="timepoint">
                                <b>07:00 · Layer 4</b>
                                <strong>Change the constraints mid-task.</strong>
                                <p>A new requirement tests whether the candidate can adapt existing logic.</p>
                            </div>
                            <div className="timepoint">
                                <b>17:45 · Layer 3</b>
                                <strong>Defend the submitted code.</strong>
                                <p>A code-specific AI video prompt follows final submission.</p>
                            </div>
                        </div>

                        <div className="protocol-grid">
                            <article className="protocol">
                                <div className="num">01</div>
                                <div>
                                    <h3>Environment &amp; Biometric Lock</h3>
                                    <p>Secures the assessment environment from second zero with fullscreen enforcement, clipboard and DOM paste telemetry, multi-monitor detection, and continuous gaze and face-presence verification.</p>
                                    <div className="tag-row">
                                        <span className="tag">Fullscreen events</span>
                                        <span className="tag">Clipboard / paste logs</span>
                                        <span className="tag">Multi-display checks</span>
                                        <span className="tag">Gaze &amp; face presence</span>
                                    </div>
                                </div>
                            </article>
                            <article className="protocol">
                                <div className="num">02</div>
                                <div>
                                    <h3>Keystroke &amp; Code-Evolution Telemetry</h3>
                                    <p>Captures keystroke cadence and Abstract Syntax Tree (AST) progression to replay how the code took shape—helping reviewers distinguish iterative debugging from line-by-line transcription.</p>
                                    <div className="tag-row">
                                        <span className="tag">Keystroke cadence</span>
                                        <span className="tag">AST checkpoints</span>
                                        <span className="tag">Refactor sequence</span>
                                        <span className="tag">Transcription burst flags</span>
                                    </div>
                                </div>
                            </article>
                            <article className="protocol">
                                <div className="num">03</div>
                                <div>
                                    <h3>AI Conversational Code Defense</h3>
                                    <p>Immediately after submission, an AI prompt grounded in the candidate’s own code asks them to explain a specific data-structure choice, edge case, or trade-off on camera in 3 minutes.</p>
                                    <div className="tag-row">
                                        <span className="tag">3-minute response</span>
                                        <span className="tag">Code-specific prompt</span>
                                        <span className="tag">Searchable transcript</span>
                                    </div>
                                    <button className="text-link" type="button" onClick={scrollToReport}>See the code-specific explanation →</button>
                                </div>
                            </article>
                            <article className="protocol">
                                <div className="num">04</div>
                                <div>
                                    <h3>Mid-Assessment Updates &amp; LLM-Signature Detection</h3>
                                    <p>Introduces a live requirement change while code is being worked on, measuring how a candidate refactors existing logic, with automated LLM-signature detection as another evidence signal.</p>
                                    <div className="tag-row">
                                        <span className="tag">Requirement history</span>
                                        <span className="tag">Before / after diff</span>
                                        <span className="tag">Refactor locality</span>
                                        <span className="tag">LLM-signature scan</span>
                                    </div>
                                </div>
                            </article>
                        </div>
                        <p className="note">AST (Abstract Syntax Tree) is a structural map of code. It tracks how functions, loops, and conditions evolve over time rather than simply counting characters.</p>
                        <div style={{ textAlign: 'center', marginTop: '28px' }}>
                            <button className="btn" type="button" onClick={scrollToReport}>Explore all 4 layers in the sample report ↗</button>
                        </div>
                    </div>
                </section>

                {/* Candidate Experience Section */}
                <section className="section engineer" id="candidate-experience">
                    <div className="wrap engineer-grid">
                        <div>
                            <div className="eyebrow">For engineers taking the assessment</div>
                            <h2>Give Your Engineering Approach a Place in the Review.</h2>
                            <p className="engineer-copy">Senior engineers hate black-box algorithm riddles that auto-reject on a minor edge case. With Hire1Percent, you work on a practical engineering task, respond when a realistic requirement changes, and explain the decisions in your own code so your reasoning is reviewed alongside the test score.</p>
                            <Link className="btn" to="/candidate/jobs">See the candidate preparation guide ↗</Link>
                            <p className="note">Need an accommodation or technical help with an invited assessment? <Link className="text-link" to="/contact?topic=assessment-support">Get assessment help →</Link></p>
                        </div>
                        <div className="candidate-cards">
                            <article className="candidate-card">
                                <span className="check">1</span>
                                <div>
                                    <strong>Know the format before you begin</strong>
                                    <p>Review the task format, expected duration, permitted tools, and recording requirements. Instructions explain upfront that a requirement update will occur during coding.</p>
                                </div>
                            </article>
                            <article className="candidate-card">
                                <span className="check">2</span>
                                <div>
                                    <strong>Work through a practical problem</strong>
                                    <p>The backend example explores repeated event deliveries and out-of-order data—real-world systems skills the hiring team wants to examine.</p>
                                </div>
                            </article>
                            <article className="candidate-card">
                                <span className="check">3</span>
                                <div>
                                    <strong>Explain the choices you made</strong>
                                    <p>Use the 3-minute code defense to discuss a trade-off, recognize a limitation, or describe how you would fix a failing test case. A polished presentation style isn’t required.</p>
                                </div>
                            </article>
                        </div>
                    </div>
                </section>

                {/* Pricing & Demo Section */}
                <section className="section section-white" id="pricing-and-demo">
                    <div className="wrap">
                        <div className="section-head">
                            <div className="eyebrow">Candidate assessment packages &amp; ROI</div>
                            <h2>Match Your Assessment Allowance to Your Hiring Volume.</h2>
                            <p>One saved 60-minute senior engineering interview pays for an entire month of assessments. Choose a monthly package with free bonus assessments and automatic next-month rollover, or pay as you go.</p>
                        </div>

                        <div className="pricing-grid">
                            <article className="price-card">
                                <h3>Pay as you go</h3>
                                <div className="price">$7.50 <small>/ assessment</small></div>
                                <div className="allowance">Purchase individually<small>No monthly commitment</small></div>
                                <ul>
                                    <li>Buy assessments as needed</li>
                                    <li>Simple, flexible usage</li>
                                </ul>
                                <button className="btn btn-light" type="button" onClick={() => setIsModalOpen(true)}>
                                    Discuss pay as you go
                                </button>
                            </article>

                            <article className="price-card featured">
                                <span className="popular">12 ASSESSMENTS</span>
                                <h3>Starter</h3>
                                <div className="price">$50 <small>/ month</small></div>
                                <div className="allowance">12 assessments / month<small>10 base + 2 bonus · ~$4.17 each</small></div>
                                <ul>
                                    <li>Bonus assessments included</li>
                                    <li>Unused credits roll over</li>
                                </ul>
                                <button className="btn" type="button" onClick={() => setIsModalOpen(true)}>
                                    Discuss Starter
                                </button>
                            </article>

                            <article className="price-card">
                                <span className="popular">25 ASSESSMENTS</span>
                                <h3>Growth</h3>
                                <div className="price">$100 <small>/ month</small></div>
                                <div className="allowance">25 assessments / month<small>20 base + 5 bonus · $4 each</small></div>
                                <ul>
                                    <li>Bonus assessments included</li>
                                    <li>Unused credits roll over</li>
                                </ul>
                                <button className="btn btn-light" type="button" onClick={() => setIsModalOpen(true)}>
                                    Discuss Growth
                                </button>
                            </article>

                            <article className="price-card">
                                <h3>Scale &amp; Enterprise</h3>
                                <div className="price">Custom</div>
                                <div className="allowance">100+ assessments / month<small>Custom volume pool</small></div>
                                <ul>
                                    <li>Volume-tiered pricing</li>
                                    <li>Dedicated onboarding</li>
                                    <li>Custom role tasks</li>
                                </ul>
                                <button className="btn btn-light" type="button" onClick={() => setIsModalOpen(true)}>
                                    Discuss Scale
                                </button>
                            </article>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <Link className="text-link" to="/pricing">View full package details &amp; rollover math →</Link>
                        </div>

                        {/* FAQs */}
                        <div className="faq">
                            <h3>Frequently asked questions</h3>
                            {faqs.map((item, idx) => (
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

                {/* Closing Banner */}
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
                                <button 
                                    className="btn" 
                                    type="button"
                                    style={{ background: 'transparent', borderColor: '#ffffff70' }} 
                                    onClick={scrollToReport}
                                >
                                    Explore an assessment report
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="footer">
                <div className="wrap">
                    <div className="footer-top">
                        <div className="footer-brand-column">
                            <a className="brand" href="#hero" onClick={(e) => { e.preventDefault(); scrollToSection('hero'); }} aria-label="Hire1Percent home">
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
                            </a>
                            <p className="footer-desc">
                                Technical assessment and screening platform that brings role-relevant code, live requirement adaptation, spoken code defense, and 4-layer anti-cheat evidence into one review.
                            </p>
                        </div>
                        <nav className="footer-links" aria-label="Explore">
                            <h4>Explore</h4>
                            <button type="button" onClick={scrollToReport}>Sample report</button>
                            <Link to="/pricing">Pricing</Link>
                            <a href="#candidate-experience" onClick={(e) => { e.preventDefault(); scrollToSection('candidate-experience'); }}>For engineers</a>
                        </nav>
                        <nav className="footer-links" aria-label="Company and support">
                            <h4>Company &amp; support</h4>
                            <Link to="/privacy">Security and privacy</Link>
                            <Link to="/privacy">Privacy Policy</Link>
                            <Link to="/terms">Terms</Link>
                            <Link to="/contact">Contact</Link>
                            <button type="button" onClick={() => setShowCookie(true)}>
                                Cookie settings
                            </button>
                        </nav>
                    </div>
                    <div className="footer-bottom">
                        <span>© 2026 Hire1Percent. All rights reserved.</span>
                        <span>Technical assessment. Clear evidence. Better interviews.</span>
                    </div>
                </div>
            </footer>

            {/* Cookie Choices Banner */}
            <div className={`cookie ${showCookie ? 'show' : ''}`} id="cookie">
                <strong>Cookie choices</strong>
                <p>We use essential cookies to run this site. With your permission, we also use optional cookies to understand site usage and support marketing.</p>
                <div className="cookie-actions">
                    <button className="btn" type="button" onClick={handleAcceptCookies}>Accept optional cookies</button>
                    <button className="btn btn-light" type="button" onClick={handleRejectCookies}>Reject optional cookies</button>
                </div>
            </div>

            {/* Live Demo Booking Modal */}
            <Suspense fallback={null}>
                {isModalOpen && (
                    <CalibrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
                )}
            </Suspense>
        </div>
    );
};

export default AssessmentsHome;
