import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Users, Briefcase, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero = () => {
    return (
        <section className="relative pt-32 pb-20 overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] -z-10" />

            <div className="container mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-sm font-medium mb-6">
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Next Gen AI-Powered Hiring
                    </span>

                    <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
                        AI-Powered Hiring & <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400">
                            Career Growth Platform
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-400 mb-12 leading-relaxed">
                        We connect recruiters with verified, skill-matched talent
                        and help candidates improve, qualify, and get hired.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link
                            to="/signup"
                            className="group flex items-center px-8 py-4 bg-white text-black font-semibold rounded-2xl hover:bg-gray-100 transition-all shadow-xl"
                        >
                            <Briefcase className="w-5 h-5 mr-3" />
                            Get Started as Recruiter
                            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>

                        <Link
                            to="/signup"
                            className="group flex items-center px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all backdrop-blur-sm"
                        >
                            <Users className="w-5 h-5 mr-3" />
                            Get Started as Candidate
                            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </motion.div>

                {/* Floating Stats or Logos could go here */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
                >
                    <Link to="/about" className="group p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Briefcase className="w-24 h-24" />
                        </div>
                        <h4 className="text-2xl font-bold mb-2 text-white group-hover:text-blue-400 transition-colors">About Us</h4>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-[80%]">
                            Discover how we're transforming the hiring ecosystem for recruiters and candidates through AI and Web3.
                        </p>
                        <div className="mt-4 flex items-center text-blue-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all">
                            Learn More <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                    </Link>

                    <a href="#how-it-works" className="group p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-teal-500/50 transition-all text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap className="w-24 h-24" />
                        </div>
                        <h4 className="text-2xl font-bold mb-2 text-white group-hover:text-teal-400 transition-colors">How it Works</h4>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-[80%]">
                            Experience the seamless flow of our platform, from posting a job to hiring your dream candidate.
                        </p>
                        <div className="mt-4 flex items-center text-teal-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all">
                            View Flow <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                    </a>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
