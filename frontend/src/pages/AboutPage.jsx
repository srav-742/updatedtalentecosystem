import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Users, Target, Zap, ShieldCheck, Heart, ChevronDown, BookOpen, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { ABOUT_FAQS, ABOUT_DEFINITIONS } from '../utils/aeoContent';
import { generateWebPageSchema, generateFAQPageSchema, generateBreadcrumbSchema } from '../utils/schemas';

const AboutPage = () => {
    const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'About', url: '/about' }
    ];

    const schemas = [
        generateWebPageSchema({
            title: 'About Hire1Percent - AI-Driven Technical Recruitment Platform',
            description: 'Learn about Hire1Percent, our mission to eliminate hiring friction through objective skill validation, AI video interviews, and verified developer pipelines.',
            url: '/about',
            breadcrumbs
        }),
        generateFAQPageSchema(ABOUT_FAQS),
        generateBreadcrumbSchema(breadcrumbs)
    ];

    return (
        <div className="min-h-screen bg-[#0c0f16] text-white selection:bg-blue-500/30">
            <SEO 
                title="About Us - AI Technical Recruitment Platform | Hire1Percent" 
                description="Learn about Hire1Percent's mission to revolutionize technical recruitment with AI-powered skill assessments, proctoring, and fair evaluation." 
                canonicalUrl="/about"
                schema={schemas}
            />
            <Navbar />

            <main id="main-content" className="pt-32 pb-20">
                <div className="container mx-auto px-6">
                    {/* Header */}
                    <header className="text-center mb-20 max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/8 text-blue-400 text-xs font-black uppercase tracking-wider mb-6">
                            About Our Mission
                        </div>
                        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
                            About <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">Hire1Percent</span>
                        </h1>
                        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                            We are redefining the future of technical hiring by replacing credential-based gatekeeping with verified, objective skill evaluation powered by artificial intelligence.
                        </p>
                    </header>

                    {/* Dual Persona Sections */}
                    <section aria-labelledby="stakeholder-heading" className="mb-28">
                        <h2 id="stakeholder-heading" className="sr-only">Solutions for Recruiters and Candidates</h2>
                        <div className="grid md:grid-cols-2 gap-12">
                            {/* Recruiter Section */}
                            <article className="p-8 md:p-10 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
                                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-8 group-hover:scale-110 transition-transform">
                                    <Briefcase className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold mb-4">For Recruiters &amp; Engineering Leaders</h3>
                                <p className="text-gray-300 mb-8 leading-relaxed">
                                    Streamline technical hiring with machine precision. Stop spending hours sifting through inflated resumes and coordinating repetitive first-round screening calls.
                                </p>
                                <ul className="space-y-4 mb-8">
                                    {[
                                        "Role-specific skill assessments in 20+ programming languages",
                                        "Automatic semantic resume scoring and ATS gap analysis",
                                        "Built-in proctoring with tab-switch and multi-face detection",
                                        "Automated asynchronous AI video interviews",
                                        "Unified candidate insights dashboard and ranking"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/candidate-screening" className="inline-flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300">
                                    Explore Candidate Screening Tools <ArrowRight size={14} />
                                </Link>
                            </article>

                            {/* Candidate Section */}
                            <article className="p-8 md:p-10 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-teal-500/30 transition-all group">
                                <div className="w-16 h-16 bg-teal-500/20 rounded-2xl flex items-center justify-center text-teal-400 mb-8 group-hover:scale-110 transition-transform">
                                    <Users className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold mb-4">For Candidates &amp; Engineers</h3>
                                <p className="text-gray-300 mb-8 leading-relaxed">
                                    Empower your engineering career through merit-based skill verification. Prove your code capabilities directly without relying on school pedigree or brand names.
                                </p>
                                <ul className="space-y-4 mb-8">
                                    {[
                                        "AI-optimized skill profiling and competency insights",
                                        "Objective code benchmarking and algorithmic challenges",
                                        "Real-time feedback on test cases and execution efficiency",
                                        "Convenient asynchronous video interview participation",
                                        "Direct placement consideration with top engineering teams"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/ai-interview-platform" className="inline-flex items-center gap-2 text-sm font-bold text-teal-400 hover:text-teal-300">
                                    Learn About AI Video Interviews <ArrowRight size={14} />
                                </Link>
                            </article>
                        </div>
                    </section>

                    {/* Mission & Vision Section (Fixed Heading Hierarchy to H2 + H3) */}
                    <section aria-labelledby="mission-heading" className="mb-28">
                        <div className="text-center mb-12">
                            <h2 id="mission-heading" className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                                Our Mission, Vision &amp; Core Principles
                            </h2>
                            <p className="text-gray-400 max-w-2xl mx-auto">
                                The values guiding how we engineer fair, transparent, and scalable recruitment technologies.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { icon: <Target className="text-purple-400 w-6 h-6" />, title: "Our Mission", desc: "To create a transparent, objective hiring landscape where genuine engineering competence speaks louder than resume pedigree." },
                                { icon: <Zap className="text-yellow-400 w-6 h-6" />, title: "Our Vision", desc: "A global recruitment ecosystem where every engineering talent is matched to exceptional opportunities through fair, bias-resistant AI evaluation." },
                                { icon: <Heart className="text-red-400 w-6 h-6" />, title: "Our Values", desc: "Uncompromising integrity, meritocracy, transparent rubrics, and engineering empowerment across the global talent community." }
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="p-8 rounded-3xl bg-white/5 border border-white/8 hover:border-white/15 transition-all"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6">{item.icon}</div>
                                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Core Definitions / Glossary */}
                    <section aria-labelledby="about-def-heading" className="mb-28">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/8 text-teal-400 text-xs font-black uppercase tracking-wider mb-4">
                                <BookOpen size={12} /> Architectural Concepts
                            </div>
                            <h2 id="about-def-heading" className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                                The Foundation of Objective Talent Assessment
                            </h2>
                            <p className="text-gray-400 max-w-2xl mx-auto">
                                Key definitions that underpin our verification models and candidate benchmarking standards.
                            </p>
                        </div>

                        <dl className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                            {ABOUT_DEFINITIONS.map((def, idx) => (
                                <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/8">
                                    <dt className="text-base font-bold text-teal-400 mb-2">{def.term}</dt>
                                    <dd className="text-sm text-gray-300 leading-relaxed">{def.definition}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    {/* About FAQ Section */}
                    <section aria-labelledby="about-faq-heading" className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 id="about-faq-heading" className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                                Frequently Asked Questions About Our Platform
                            </h2>
                            <p className="text-gray-400">
                                Answers to common questions regarding our mission, integrity protocols, and candidate fairness.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {ABOUT_FAQS.map((faq, idx) => (
                                <details 
                                    key={idx} 
                                    open={idx === 0}
                                    className="group rounded-2xl bg-white/5 border border-white/8 p-6 transition-all duration-200"
                                >
                                    <summary className="font-bold text-lg flex items-center justify-between gap-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
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
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default AboutPage;
