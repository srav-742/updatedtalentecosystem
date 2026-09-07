import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, ChevronDown, BookOpen, ArrowRight, Sparkles, Calendar, Code } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import SEO from '../../components/SEO';
import { SEO_PAGES_CONTENT } from '../../utils/aeoContent';
import { generateWebPageSchema, generateFAQPageSchema, generateBreadcrumbSchema } from '../../utils/schemas';

export default function CandidateScreening() {
  const content = SEO_PAGES_CONTENT.candidateScreening;
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Candidate Screening', url: '/candidate-screening' }
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
    <div className="min-h-screen bg-[#0c0f16] text-white selection:bg-teal-500/30">
      <SEO 
        title={content.title}
        description={content.description}
        canonicalUrl={content.canonicalUrl}
        schema={schemas}
      />
      <Navbar />

      <main id="main-content" className="pt-32 pb-24">
        {/* Hero Section */}
        <section aria-labelledby="screening-hero-heading" className="container mx-auto px-6 text-center max-w-5xl mb-24">
          <header>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400 text-xs font-black uppercase tracking-wider mb-6">
              <ShieldCheck size={14} /> Proctored Technical Verification
            </div>
            <h1 id="screening-hero-heading" className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
              {content.heading}
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-10">
              {content.subheading}
            </p>
          </header>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <Link 
              to="/?book-calibration=true" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-teal-500/20"
            >
              <Calendar size={18} /> Schedule Assessment Demo
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
        <section aria-labelledby="screening-features-heading" className="container mx-auto px-6 max-w-5xl mb-24">
          <div className="text-center mb-12">
            <h2 id="screening-features-heading" className="text-3xl font-extrabold tracking-tight mb-4">
              Multi-Layered Candidate Screening Tools
            </h2>
            <p className="text-gray-400">
              Verify hands-on coding ability and problem-solving aptitude before panel interviews.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "Live Browser-Based IDE", desc: "Interactive development environment supporting unit tests, linting, syntax highlighting, and execution across 20+ stacks." },
              { title: "Active Proctoring Suite", desc: "Monitors fullscreen lock, clipboard paste events, dual-screen setups, and external device connections in real time." },
              { title: "Automated Code Analysis", desc: "Scores submissions on algorithmic time complexity (Big-O), memory allocation, code maintainability, and test coverage." },
              { title: "Objective Candidate Leaderboards", desc: "Ranks applicants dynamically based on verified scores, removing bias and pedigree speculation." }
            ].map((feature, idx) => (
              <article key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-500/30 transition-all">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-teal-400 shrink-0 mt-1" />
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
        <section aria-labelledby="screening-defs-heading" className="container mx-auto px-6 max-w-5xl mb-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/8 text-teal-400 text-xs font-black uppercase tracking-wider mb-4">
              <BookOpen size={12} /> Verification Terminology
            </div>
            <h2 id="screening-defs-heading" className="text-3xl font-extrabold tracking-tight mb-4">
              Screening &amp; Assessment Definitions
            </h2>
          </div>

          <dl className="grid md:grid-cols-2 gap-6">
            {content.definitions.map((def, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/8">
                <dt className="text-base font-bold text-teal-400 mb-2">{def.term}</dt>
                <dd className="text-sm text-gray-300 leading-relaxed">{def.definition}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* FAQ Section */}
        <section aria-labelledby="screening-faq-heading" className="container mx-auto px-6 max-w-4xl mb-24">
          <div className="text-center mb-12">
            <h2 id="screening-faq-heading" className="text-3xl md:text-4xl font-black tracking-tight mb-4">
              Frequently Asked Questions: Candidate Screening
            </h2>
            <p className="text-gray-400">Common questions about pre-employment skill validation.</p>
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
                  <ChevronDown size={20} className="text-teal-400 transition-transform duration-200 group-open:rotate-180 shrink-0" />
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
            <Link to="/resume-analysis" className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/40 text-sm font-semibold text-gray-300 hover:text-white transition-all">
              Resume Intelligence &rarr;
            </Link>
            <Link to="/automated-hiring" className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/40 text-sm font-semibold text-gray-300 hover:text-white transition-all">
              Automated Pipelines &rarr;
            </Link>
          </div>
        </nav>
      </main>

      <Footer />
    </div>
  );
}
