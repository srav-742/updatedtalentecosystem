import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import RecruiterSection from '../components/RecruiterSection';
import JobSeekerSection from '../components/JobSeekerSection';
import WhyChooseUs from '../components/WhyChooseUs';
import RiskShield from '../components/RiskShield';
import ScalingModels from '../components/ScalingModels';
import FounderFAQs from '../components/FounderFAQs';
import FlowDiagram from '../components/FlowDiagram';
import CTA from '../components/CTA';
import Footer from '../components/Footer';

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
            <Navbar
                theme={theme}
                onToggleTheme={() => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')}
            />
            <Hero theme={theme} />
            <RecruiterSection theme={theme} />
            <WhyChooseUs theme={theme} />
            <JobSeekerSection theme={theme} />
            <FlowDiagram theme={theme} />
            <RiskShield theme={theme} />
            <ScalingModels theme={theme} />
            <FounderFAQs theme={theme} />
            <CTA theme={theme} />
            <Footer theme={theme} />
        </div>
    );
};

export default LandingPage;
