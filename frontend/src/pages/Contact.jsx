import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './AssessmentsHome.css';
import { generateWebPageSchema, generateBreadcrumbSchema, generateFAQPageSchema } from '../utils/schemas';

const CONTACT_FAQS = [
  {
    q: "How quickly do candidates receive technical help during an active assessment?",
    a: "For candidates currently in an active or scheduled assessment session encountering connection, browser, or webcam interruptions, our assessment technical support team monitors requests with typical response times under 15–30 minutes. Email us directly at contact@hire1percent.com with your assessment session link."
  },
  {
    q: "What accommodations does Hire1Percent support for candidates?",
    a: "We support extended timer allocations (1.5x or 2x time), alternative color-contrast modes, custom assistive technology calibrations, and modified video defense options for candidates with speech or hearing accommodations. Requests can be submitted prior to beginning the assessment."
  },
  {
    q: "What happens if my browser or internet crashes mid-assessment?",
    a: "Your code state and AST history are continuously synced in real time. If your network drops or your browser closes, your work is saved up to the last keystroke. Simply reopen your assessment link. If your session is locked or the timer expired due to a technical glitch, contact us with your session URL for an immediate reset."
  },
  {
    q: "How do hiring teams schedule technical onboarding & ATS integration?",
    a: "Enterprise and growth accounts receive dedicated technical onboarding, private proctoring calibration sessions, and turnkey ATS integrations (Greenhouse, Lever, Ashby, Workday). You can reach out directly via contact@hire1percent.com to schedule your onboarding session."
  }
];

const Contact = () => {
  const [searchParams] = useSearchParams();
  const topicParam = searchParams.get('topic');
  const isAssessmentSupport = topicParam === 'assessment-support';

  const [menuOpen, setMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: isAssessmentSupport ? 'Candidate Assessment Support & Accommodations' : 'Schedule a 15-Minute Platform Demo',
    sessionUrl: '',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [activeFaqs, setActiveFaqs] = useState({ 0: true });

  const toggleFaq = (index) => {
    setActiveFaqs(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  useEffect(() => {
    if (isAssessmentSupport) {
      setFormData(prev => ({
        ...prev,
        subject: 'Candidate Assessment Support & Accommodations'
      }));
    }
  }, [isAssessmentSupport]);

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Contact & Support', url: '/contact' }
  ];

  const schemas = [
    generateWebPageSchema({
      title: 'Contact & Assessment Support - Hire1Percent',
      description: 'Get help with candidate assessments, accommodation requests, enterprise demos, and technical proctoring assistance.',
      url: '/contact',
      breadcrumbs
    }),
    generateFAQPageSchema(CONTACT_FAQS),
    generateBreadcrumbSchema(breadcrumbs)
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = [
      `Name: ${formData.name}`,
      `Email: ${formData.email}`,
      `Assessment session: ${formData.sessionUrl || 'Not provided'}`,
      '',
      formData.message
    ].join('\n');
    window.location.href = `mailto:contact@hire1percent.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  };

  return (
    <div className="h1p-navy-page">
      <SEO 
        title="Contact & Assessment Support | Hire1Percent" 
        description="Candidate assessment assistance, accommodation requests, technical proctoring support, and enterprise sales inquiries." 
        canonicalUrl="/contact"
        schema={schemas}
      />
      
      {/* Header & Sticky Navigation (Matches Homepage Theme) */}
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
            <Link to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
            <Link to="/blog" onClick={() => setMenuOpen(false)}>Blog</Link>
          </nav>

          <div className="nav-actions">
            <Link className="login" to="/login">Log in</Link>
            <Link className="login" to="/signup">Sign up</Link>
            <Link className="btn" to="/?book-demo=true">
              Book a 15-minute demo <span>↗</span>
            </Link>
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
        <section className="hero" id="contact-hero">
          <div className="wrap" style={{ textAlign: 'center', maxWidth: '860px', margin: '0 auto' }}>
            <div className="eyebrow" style={{ justifyContent: 'center' }}>
              {isAssessmentSupport ? 'Candidate Assessment Support' : 'Dedicated Support & Assistance'}
            </div>
            <h1 style={{ margin: '18px auto 16px', maxWidth: '800px' }}>
              How Can We <span className="accent">Support You?</span>
            </h1>
            <p className="hero-copy" style={{ maxWidth: '720px', margin: '0 auto 24px', fontSize: '16px' }}>
              Have questions regarding an active candidate assessment, accommodation requests, ATS integrations, or platform demonstrations? Our engineering support team is here to assist.
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="section section-white">
          <div className="wrap">
            {/* Special Accommodation Banner */}
            {isAssessmentSupport && (
              <div style={{
                background: '#F4EBDD',
                border: '1.5px solid #D4AC5F',
                borderRadius: '14px',
                padding: '24px 28px',
                marginBottom: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '18px'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: '#20263A',
                  color: '#E6BC6B',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 900,
                  fontSize: '20px',
                  flexShrink: 0
                }}>
                  ♿
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#8A6427', margin: '0 0 4px' }}>
                    Candidate Assessment Support &amp; Accommodations
                  </h3>
                  <p style={{ fontSize: '13px', color: '#684F25', margin: 0, lineHeight: 1.6 }}>
                    If you are completing an invited assessment and need accommodation (extra time, assistive software), experienced a connection drop, or need technical help, submit the form below or email us directly at <a href="mailto:contact@hire1percent.com" style={{ textDecoration: 'underline', fontWeight: 800 }}>contact@hire1percent.com</a>. Active candidate sessions are prioritized.
                  </p>
                </div>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '40px',
              alignItems: 'start'
            }}>
              {/* Left Column: Direct Channels */}
              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{
                  border: '1px solid var(--line)',
                  borderRadius: '14px',
                  padding: '26px 24px',
                  background: isAssessmentSupport ? '#FCF9F3' : 'white',
                  borderColor: isAssessmentSupport ? '#D4AC5F' : 'var(--line)',
                  boxShadow: 'var(--shadow)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#20263A',
                      color: '#E6BC6B',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '16px'
                    }}>🎧</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--navy)' }}>
                        Candidate Assessment Support
                      </h4>
                      <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Session help, accommodations &amp; resets</small>
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                    For active assessment sessions, webcam permissions, code submission help, or accommodation requests:
                  </p>
                  <p style={{ margin: '0 0 6px', fontSize: '13px' }}>
                    Email: <a href="mailto:contact@hire1percent.com?subject=Assessment%20Support" style={{ fontWeight: 800, color: '#C99A45', textDecoration: 'underline' }}>contact@hire1percent.com</a>
                  </p>
                  <small style={{ color: '#287748', fontWeight: 700, fontSize: '11px' }}>
                    ⏱ Typical active session response: Under 15–30 mins
                  </small>
                </div>

                <div style={{
                  border: '1px solid var(--line)',
                  borderRadius: '14px',
                  padding: '26px 24px',
                  background: 'white',
                  boxShadow: 'var(--shadow)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#20263A',
                      color: '#E6BC6B',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '16px'
                    }}>💼</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--navy)' }}>
                        Enterprise &amp; Hiring Teams
                      </h4>
                      <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Demos, ATS integrations &amp; pilots</small>
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                    For recruiters and engineering leaders looking to explore the assessment engine, customize role challenges, or configure ATS webhooks:
                  </p>
                  <p style={{ margin: '0 0 6px', fontSize: '13px' }}>
                    Email: <a href="mailto:contact@hire1percent.com?subject=Enterprise%20Inquiry" style={{ fontWeight: 800, color: 'var(--navy)', textDecoration: 'underline' }}>contact@hire1percent.com</a>
                  </p>
                  <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                    ⏱ Typical enterprise response: Under 2–4 hours
                  </small>
                </div>

                <div style={{
                  border: '1px solid var(--line)',
                  borderRadius: '14px',
                  padding: '22px 24px',
                  background: 'white'
                }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 800, color: 'var(--navy)' }}>
                    Grievance Officer
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.6 }}>
                    For legal disputes or data protection concerns under India IT Act compliance:
                  </p>
                  <p style={{ margin: '0 0 6px', fontSize: '13px' }}>
                    Email: <a href="mailto:grievance@hire1percent.com" style={{ fontWeight: 800, color: 'var(--navy)', textDecoration: 'underline' }}>grievance@hire1percent.com</a>
                  </p>
                  <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Tech Hub, Bengaluru, India</small>
                </div>

                <div style={{
                  border: '1px solid var(--line)',
                  borderRadius: '14px',
                  padding: '22px 24px',
                  background: 'white'
                }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 800, color: 'var(--navy)' }}>
                    Compliance, SOC2 &amp; GDPR
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                    All candidate biometric and video proctoring telemetry is encrypted at rest and in transit. SOC2 documentation and GDPR compliance agreements available upon request.
                  </p>
                </div>
              </div>

              {/* Right Column: Direct Contact Form */}
              <div style={{
                background: 'white',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                padding: 'clamp(24px, 4vw, 36px)',
                boxShadow: 'var(--shadow)'
              }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--navy)', margin: '0 0 6px' }}>
                  Send a Direct Message
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 24px' }}>
                  Your email app will open with your inquiry ready to send.
                </p>

                {submitted ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                    <div style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      background: '#EDF5EE',
                      color: '#287748',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '26px',
                      margin: '0 auto 16px'
                    }}>✓</div>
                    <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--navy)', margin: '0 0 8px' }}>
                      Email Draft Ready
                    </h4>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
                      Your email app should open with your message addressed to <strong>contact@hire1percent.com</strong>. If it did not open, email us directly.
                    </p>
                    <button 
                      type="button" 
                      className="btn btn-light" 
                      onClick={() => setSubmitted(false)}
                      style={{ fontSize: '12px' }}
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label htmlFor="contact-name" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
                        Your Full Name
                      </label>
                      <input 
                        id="contact-name"
                        type="text" 
                        required 
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Alex Morgan"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid var(--line)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-email" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
                        Email Address
                      </label>
                      <input 
                        id="contact-email"
                        type="email" 
                        required 
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="alex@company.com"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid var(--line)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-subject" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
                        Inquiry Topic
                      </label>
                      <select 
                        id="contact-subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid var(--line)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          background: 'white',
                          outline: 'none',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="Candidate Assessment Support & Accommodations">
                          Candidate Assessment Support &amp; Accommodations
                        </option>
                        <option value="Schedule a 15-Minute Platform Demo">
                          Schedule a 15-Minute Platform Demo
                        </option>
                        <option value="Technical Assessment & Proctoring Questions">
                          Technical Assessment &amp; Proctoring Questions
                        </option>
                        <option value="ATS Integration Consultation">
                          ATS Integration Consultation
                        </option>
                        <option value="Billing & Subscription Inquiries">
                          Billing &amp; Subscription Inquiries
                        </option>
                        <option value="General Inquiries">
                          General Inquiries
                        </option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="contact-session-url" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
                        Assessment Session Link or Code <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(Optional)</span>
                      </label>
                      <input 
                        id="contact-session-url"
                        type="text" 
                        value={formData.sessionUrl}
                        onChange={(e) => setFormData({ ...formData, sessionUrl: e.target.value })}
                        placeholder="https://hire1percent.com/assessment/... or ID"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid var(--line)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-message" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
                        How Can We Help You?
                      </label>
                      <textarea 
                        id="contact-message"
                        rows="4" 
                        required 
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder={isAssessmentSupport ? "Please describe your accommodation request, or the technical issue encountered during your assessment..." : "Tell us about your team size, hiring goals, and tech stack..."}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid var(--line)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit'
                        }}
                      ></textarea>
                    </div>

                    <button 
                      type="submit" 
                      className="btn" 
                      style={{ width: '100%', padding: '13px', marginTop: '4px' }}
                    >
                      Send Inquiry ↗
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* FAQs Accordion */}
            <div className="faq" style={{ marginTop: '72px' }}>
              <div className="eyebrow" style={{ justifyContent: 'center' }}>Support Guidance</div>
              <h3 style={{ marginTop: '12px' }}>Frequently Asked Support Questions</h3>
              {CONTACT_FAQS.map((item, idx) => (
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
      </main>

      {/* Footer (Matches Homepage Theme) */}
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
    </div>
  );
};

export default Contact;
