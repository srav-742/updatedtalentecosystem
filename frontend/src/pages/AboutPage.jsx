import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Users, Target, Zap, ShieldCheck, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const AboutPage = () => {
    return (
        <div className="min-h-screen bg-[#0c0f16] text-white">
            <Navbar />

            <main className="pt-32 pb-20">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-20"
                    >
                        <h1 className="text-5xl md:text-6xl font-bold mb-6">About hire1percent</h1>
                        <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                            We are redefining the future of recruitment by bridging the gap between talent and opportunity
                            through an intelligent, decentralized, and skill-driven ecosystem.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-12 mb-32">
                        {/* Recruiter Section */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group"
                        >
                            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-8 group-hover:scale-110 transition-transform">
                                <Briefcase className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-bold mb-6">For the Recruiter</h2>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                Streamline your hiring process with AI-driven precision. No more sorting through hundreds of unqualified resumes.
                                Our platform ensures you only see the candidates who actually fit your requirements.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "Post jobs with specific skill weightage",
                                    "Automatic AI resume screening & scoring",
                                    "Automated technical assessments",
                                    "AI-proctored mock interviews",
                                    "Data-backed shortlisting system"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Candidate Section */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-teal-500/30 transition-all group"
                        >
                            <div className="w-16 h-16 bg-teal-500/20 rounded-2xl flex items-center justify-center text-teal-400 mb-8 group-hover:scale-110 transition-transform">
                                <Users className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-bold mb-6">For the Candidate</h2>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                Empower your career with skill validation. Stop wondering why your application was rejected.
                                Get real-time feedback and prove your worth through our automated testing suite.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "Build an AI-optimized professional profile",
                                    "Real-time resume matching feedback",
                                    "Skill-based assessments to earn badges",
                                    "Practice with AI mock interviews",
                                    "Direct matching with top companies"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>

                    {/* Mission & Vision */}
                    <div className="grid md:grid-cols-3 gap-8 mb-20">
                        {[
                            { icon: <Target className="text-purple-400" />, title: "Our Mission", desc: "To create a transparent and efficient hiring landscape where skills speak louder than credentials." },
                            { icon: <Zap className="text-yellow-400" />, title: "Our Vision", desc: "A world where every talent finds their perfect fit through fair and unbiased AI-driven matching." },
                            { icon: <Heart className="text-red-400" />, title: "Our Values", desc: "Transparency, skill-first approach, and empowering the community to thrive." }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 rounded-3xl bg-white/5 border border-white/5"
                            >
                                <div className="mb-4">{item.icon}</div>
                                <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default AboutPage;
