import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Search, FileText, UserCheck, Briefcase, TrendingUp, Zap } from 'lucide-react';

const steps = [
    {
        icon: <Zap className="w-6 h-6" />,
        title: "The Problem",
        desc: "AI engineers in the US cost $250k–$300k/year. High burn rate kills startups before they find PMF."
    },
    {
        icon: <Search className="w-6 h-6" />,
        title: "The Solution",
        desc: "Hire1percent provides the same elite quality for a fraction of the cost, extending your runway indefinitely."
    },
    {
        icon: <CheckCircle2 className="w-6 h-6" />,
        title: "The Outcome",
        desc: "Startups save money, scale their engineering team faster, and focus entirely on building product."
    }
];

const RecruiterSection = () => {
    return (
        <section id="problem-solution" className="py-24 bg-white/5 relative overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="lg:w-1/2">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-6"
                        >
                            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-400">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h2 className="text-4xl font-bold text-white">Why Founders Care</h2>
                            <p className="text-xl text-gray-400 leading-relaxed">
                                Recruitment shouldn't be a death sentence for your runway.
                                We solve the talent-cost paradox for AI startups.
                            </p>

                            <div className="space-y-4 pt-4">
                                {steps.map((step, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                                        <div className="mt-1 w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
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
                            className="relative z-10 p-2 bg-gradient-to-br from-blue-500/20 to-teal-500/20 rounded-[2.5rem] border border-white/10"
                        >
                            <div className="bg-[#0c0f16] rounded-[2rem] p-8 border border-white/10 overflow-hidden">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="text-white font-semibold">Elite Talent Match</div>
                                        <div className="h-8 w-24 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] font-bold">CALIBRATED</div>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { name: "Senior AI Engineer", match: "98%", score: "94" },
                                            { name: "MLOps Specialist", match: "95%", score: "91" },
                                            { name: "Fullstack (AI Focus)", match: "92%", score: "88" }
                                        ].map((candidate, i) => (
                                            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-[10px] font-bold">IIT</div>
                                                    <div className="space-y-1">
                                                        <div className="text-sm font-medium text-white">{candidate.name}</div>
                                                        <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-400 w-[80%]" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 text-[10px]">
                                                    <span className="text-green-400">Match: {candidate.match}</span>
                                                    <span className="text-blue-400">Technical: {candidate.score}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                        <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] -z-10" />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default RecruiterSection;
