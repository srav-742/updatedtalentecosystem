import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Shield } from 'lucide-react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import RecruiterSection from '../components/RecruiterSection';
import JobSeekerSection from '../components/JobSeekerSection';
import WhyChooseUs from '../components/WhyChooseUs';
import RiskShield from '../components/RiskShield';
import ScalingModels from '../components/ScalingModels';
import FounderFAQs from '../components/FounderFAQs';
import FlowDiagram from '../components/FlowDiagram';
import BlogSection from '../components/BlogSection';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { V5_SERVICE_RETIREMENT } from '../utils/v5Content';

const LandingPage = () => {
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') return 'light';
        return localStorage.getItem('landing-theme') || 'light';
    });

    useEffect(() => {
        localStorage.setItem('landing-theme', theme);
    }, [theme]);

    const isLight = theme === 'light';

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isLight ? 'bg-white text-gray-900 selection:bg-blue-500/20' : 'bg-[#0c0f16] text-white selection:bg-blue-500/30'}`}>
            <SEO 
                title="Staffing Service Notice | Hire1Percent" 
                description={V5_SERVICE_RETIREMENT.body} 
                canonical="https://www.hire1percent.com/service" 
                noindex={true}
            />
            <Navbar
                theme={theme}
                onToggleTheme={() => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')}
            />

            {/* V5 Approved Retirement Notice Banner */}
            <div className="pt-24 px-6">
                <div className="max-w-5xl mx-auto my-8 p-6 sm:p-8 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                                <span>{V5_SERVICE_RETIREMENT.heading}</span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-2xl">
                                {V5_SERVICE_RETIREMENT.body}
                            </p>
                            <div className="text-xs text-gray-400 pt-1">
                                <span>{V5_SERVICE_RETIREMENT.contact_label} </span>
                                <Link to={V5_SERVICE_RETIREMENT.contact_link} className="text-amber-400 font-semibold underline hover:text-amber-300">
                                    Contact Support
                                </Link>
                            </div>
                        </div>

                        <Link 
                            to={V5_SERVICE_RETIREMENT.cta_link}
                            className="px-6 py-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all flex items-center gap-2 shrink-0"
                        >
                            <span>{V5_SERVICE_RETIREMENT.cta_label}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Preserved Legacy Staffing Content for Historical Reference */}
            <Hero theme={theme} />
            <RecruiterSection theme={theme} />
            <WhyChooseUs theme={theme} />
            <JobSeekerSection theme={theme} />
            <FlowDiagram theme={theme} />
            <RiskShield theme={theme} />
            <ScalingModels theme={theme} />
            <BlogSection theme={theme} />
            <FounderFAQs theme={theme} />
            <CTA theme={theme} />
            <Footer theme={theme} />
        </div>
    );
};

export default LandingPage;
