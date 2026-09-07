import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, CheckCircle2, ChevronDown, BookOpen, ArrowRight, Sparkles, Calendar, Layers } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import SEO from '../../components/SEO';
import { SEO_PAGES_CONTENT } from '../../utils/aeoContent';
import { generateWebPageSchema, generateFAQPageSchema, generateBreadcrumbSchema } from '../../utils/schemas';

export default function AutomatedHiring() {
  const content = SEO_PAGES_CONTENT.automatedHiring;
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Automated Hiring', url: '/automated-hiring' }
  ];

  const schemas = [
    generateWebPageSchema({
      title: content.title,
      description: content.description,
      url: content.canonicalUrl,
      breadcrumbs
    }),
    generateFAQPageSchema(content.faqs),
    generateBreadcrumbSchema(breadcrumbs)
  ];

  return (
    <div className="min-h-screen bg-[#0c0f16] text-white selection:bg-emerald-500/30">
      <SEO 
        title={content.title}
        description={content.description}
        canonicalUrl={content.canonicalUrl}
        schema={schemas}
      />
      <Navbar />

      <main id="main-content" className="pt-32 pb-24">
        {/* Hero Section */}
        <section aria-labelledby="auto-hero-heading" className="container mx-auto px-6 text-center max-w-5xl mb-24">
          <header>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-wider mb-6">
              <Zap size={14} /> High-Velocity Hiring Pipelines
            </div>
            <h1 id="auto-hero-heading" className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
              {content.heading}
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-10">
              {content.subheading}
            </p>
          </header>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <Link 
              to="/?book-calibration=true" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-500/20"
            >
              <Calendar size={18} /> Schedule Workflow Demo
            </Link>
            <Link 
              to="/pricing" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all"
            >
              View Pricing <ArrowRight size={16} />
            </Link>
          </div>

          <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 text-left max-w-4xl mx-auto">
            <p className="text-gray-300 leading-relaxed text-base md:text-lg">
              {content.overview}
            </p>
          </div>
        </section>

        {/* Key Features Section */}
        <section aria-labelledby="auto-features-heading" className="container mx-auto px-6 max-w-5xl mb-24">
          <div className="text-center mb-12">
            <h2 id="auto-features-heading" className="text-3xl font-extrabold tracking-tight mb-4">
              Key Advantages of Automated Technical Hiring
            </h2>
            <p className="text-gray-400">
              Replace manual bottlenecks with scalable, rule-based screening workflows.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "70% Faster Cycle Times", desc: "Automate candidate invitations, skills testing, proctoring checks, and scorecards immediately upon application." },
              { title: "Standardized Evaluation Bar", desc: "Every developer is evaluated against identical algorithmic complexity tests and architectural rubrics." },
              { title: "24/7 Candidate Self-Scheduling", desc: "Global candidates complete coding assessments and async video interviews whenever they are most productive." },
              { title: "Elimination of Manual Data Entry", desc: "Results and status updates sync automatically into your central applicant database without copy-pasting." }
            ].map((feature, idx) => (
              <article key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Definitions Section */}
        <section aria-labelledby="auto-defs-heading" className="container mx-auto px-6 max-w-5xl mb-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 text-emerald-400 text-xs font-black uppercase tracking-wider mb-4">
              <BookOpen size={12} /> Architectural Concepts
            </div>
            <h2 id="auto-defs-heading" className="text-3xl font-extrabold tracking-tight mb-4">
              Automation Definitions &amp; Protocols
            </h2>
          </div>

          <dl className="grid md:grid-cols-2 gap-6">
            {content.definitions.map((def, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/8">
                <dt className="text-base font-bold text-emerald-400 mb-2">{def.term}</dt>
                <dd className="text-sm text-gray-300 leading-relaxed">{def.definition}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* FAQ Section */}
        <section aria-labelledby="auto-faq-heading" className="container mx-auto px-6 max-w-4xl mb-24">
          <div className="text-center mb-12">
            <h2 id="auto-faq-heading" className="text-3xl md:text-4xl font-black tracking-tight mb-4">
              Frequently Asked Questions: Automated Hiring
            </h2>
            <p className="text-gray-400">Everything you need to know about automated recruitment pipelines.</p>
          </div>

          <div className="space-y-4">
            {content.faqs.map((faq, idx) => (
              <details 
                key={idx} 
                open={idx === 0}
                className="group rounded-2xl bg-white/5 border border-white/8 p-6 transition-all duration-200"
              >
                <summary className="font-bold text-base md:text-lg flex items-center justify-between gap-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                  <span>{faq.question}</span>
                  <ChevronDown size={20} className="text-emerald-400 transition-transform duration-200 group-open:rotate-180 shrink-0" />
                </summary>
                <div className="pt-4 mt-4 border-t border-white/5 text-sm text-gray-300 leading-relaxed">
                  <p>{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <nav aria-label="Related Recruitment Solutions" className="container mx-auto px-6 max-w-5xl border-t border-white/10 pt-16">
          <h2 className="text-xl font-bold mb-6 text-center text-gray-400">Explore Other Hire1Percent Solutions</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <Link to="/ai-interview-platform" className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/40 text-sm font-semibold text-gray-300 hover:text-white transition-all">
              AI Interview Platform &rarr;
            </Link>
            <Link to="/ai-recruitment-software" className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/40 text-sm font-semibold text-gray-300 hover:text-white transition-all">
              AI Recruitment Software &rarr;
            </Link>
            <Link to="/candidate-screening" className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-teal-500/40 text-sm font-semibold text-gray-300 hover:text-white transition-all">
              Candidate Screening &rarr;
            </Link>
            <Link to="/resume-analysis" className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/40 text-sm font-semibold text-gray-300 hover:text-white transition-all">
              Resume Intelligence &rarr;
            </Link>
          </div>
        </nav>
      </main>

      <Footer />
    </div>
  );
}
