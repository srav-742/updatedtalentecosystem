import React from 'react';
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
    return (
        <div className="min-h-screen bg-[#0c0f16] text-white selection:bg-blue-500/30">
            <Navbar />
            <Hero />
            <RecruiterSection />
            <WhyChooseUs />
            <JobSeekerSection />
            <FlowDiagram />
            <RiskShield />
            <ScalingModels />
            <FounderFAQs />
            <CTA />
            <Footer />
        </div>
    );
};

export default LandingPage;
