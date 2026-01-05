import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import RecruiterSection from '../components/RecruiterSection';
import JobSeekerSection from '../components/JobSeekerSection';
import WhyChooseUs from '../components/WhyChooseUs';
import FlowDiagram from '../components/FlowDiagram';
import CTA from '../components/CTA';
import Footer from '../components/Footer';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-[#0c0f16] text-white selection:bg-blue-500/30">
            <Navbar />
            <Hero />
            <div id="recruiter-features">
                <RecruiterSection />
            </div>
            <div id="seeker-features">
                <JobSeekerSection />
            </div>
            <WhyChooseUs />
            <div id="how-it-works">
                <FlowDiagram />
            </div>
            <div id="cta">
                <CTA />
            </div>
            <Footer />
        </div>
    );
};

export default LandingPage;
