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
                        AI Talent for Scale
                    </span>
                    <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-[1.1]">
                        Scale Your AI Team <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400">
                            Without the SF Burn Rate
                        </span>
                    </h1>

                    <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-400 mb-12 leading-relaxed">
                        Access the <span className="text-white font-semibold">top 1% of IIT-vetted AI engineers.</span><br />
                        We help AI startups save money by managing payroll, legal, and compliance work.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link
                            to="/signup"
                            className="group flex items-center px-8 py-4 bg-white text-black font-semibold rounded-2xl hover:bg-gray-100 transition-all shadow-xl"
                        >
                            <Zap className="w-5 h-5 mr-3 text-blue-600" />
                            Book a Technical Calibration Call
                            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>

                        <button
                            onClick={() => document.getElementById('elite-talent')?.scrollIntoView({ behavior: 'smooth' })}
                            className="group flex items-center px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all backdrop-blur-sm"
                        >
                            <Users className="w-5 h-5 mr-3" />
                            View Sample Profiles
                            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
