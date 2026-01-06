import React from 'react';
import { motion } from 'framer-motion';
import { User, Target, Award, CheckCircle, Rocket } from 'lucide-react';

const steps = [
    {
        icon: <User className="w-6 h-6" />,
        title: "Create Profile / Upload Resume",
        desc: "Upload your resume or build one using our AI resume builder."
    },
    {
        icon: <Target className="w-6 h-6" />,
        title: "Skill Matching",
        desc: "See how well your skills match job requirements."
    },
    {
        icon: <Award className="w-6 h-6" />,
        title: "Assessments & Mock Interviews",
        desc: "Prove your skills through tests and AI-driven interviews."
    },
    {
        icon: <CheckCircle className="w-6 h-6" />,
        title: "Get Shortlisted",
        desc: "Only qualified candidates move forward — no random rejections."
    }
];

const JobSeekerSection = () => {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                    <div className="lg:w-1/2">
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-6"
                        >
                            <div className="w-12 h-12 bg-teal-500/20 rounded-2xl flex items-center justify-center text-teal-400">
                                <Rocket className="w-6 h-6" />
                            </div>
                            <h2 className="text-4xl font-bold text-white">For Candidates</h2>
                            <p className="text-xl text-gray-400 leading-relaxed">
                                Build your profile, improve your skills, and get matched
                                to jobs where you truly fit.
                            </p>

                            <div className="space-y-4 pt-4">
                                {steps.map((step, idx) => (
                                    <div key={idx} className="flex flex-row-reverse items-start gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 text-right">
                                        <div className="mt-1 w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
                                            {step.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">{step.title}</h4>
                                            <p className="text-gray-500 text-sm">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    <div className="lg:w-1/2 relative">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="relative z-10 p-2 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-[2.5rem] border border-white/10"
                        >
                            <div className="bg-[#0c0f16] rounded-[2rem] p-8 border border-white/10 overflow-hidden">
                                {/* Mock UI for Job Seeker Dashboard */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center">
                                            <User className="w-8 h-8 text-teal-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-40 bg-white/20 rounded" />
                                            <div className="h-3 w-24 bg-white/10 rounded" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <div className="text-xs text-gray-500 mb-1">Resume Match</div>
                                            <div className="text-2xl font-bold text-teal-400">92%</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <div className="text-xs text-gray-500 mb-1">Assessment</div>
                                            <div className="text-2xl font-bold text-blue-400">8.5/10</div>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 to-blue-500/10 border border-teal-500/20">
                                        <div className="text-sm font-semibold text-white mb-2">Ready for Interview?</div>
                                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full w-3/4 bg-teal-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Decorative circles */}
                        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-teal-600/20 rounded-full blur-[80px] -z-10" />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default JobSeekerSection;
