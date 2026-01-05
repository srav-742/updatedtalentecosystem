import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Search, FileText, UserCheck, Briefcase } from 'lucide-react';

const steps = [
    {
        icon: <FileText className="w-6 h-6" />,
        title: "Post Job Requirement",
        desc: "Add required skills and minimum selection percentage."
    },
    {
        icon: <Search className="w-6 h-6" />,
        title: "AI Filters Candidates",
        desc: "Only candidates with matching skills and scores are evaluated."
    },
    {
        icon: <UserCheck className="w-6 h-6" />,
        title: "Get Vetted Profiles",
        desc: "View resume match %, assessment score, and interview score."
    },
    {
        icon: <CheckCircle2 className="w-6 h-6" />,
        title: "Shortlist with Confidence",
        desc: "Hire candidates who cross your selection threshold."
    }
];

const RecruiterSection = () => {
    return (
        <section className="py-24 bg-white/5 relative overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="lg:w-1/2">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-6"
                        >
                            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <h2 className="text-4xl font-bold text-white">For Recruiters</h2>
                            <p className="text-xl text-gray-400 leading-relaxed">
                                Hire only the most suitable candidates using AI-based resume
                                matching, assessments, and interviews — all in one place.
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
                                {/* Mock UI for Recruiter Dashboard */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="h-4 w-32 bg-white/10 rounded" />
                                        <div className="h-8 w-24 bg-blue-600 rounded-lg" />
                                    </div>
                                    <div className="space-y-3">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-white/10" />
                                                    <div className="space-y-2">
                                                        <div className="h-3 w-24 bg-white/20 rounded" />
                                                        <div className="h-2 w-16 bg-white/10 rounded" />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 text-[10px] items-center">
                                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">Match: 95%</span>
                                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Score: 88</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Decorative circles */}
                        <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] -z-10" />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default RecruiterSection;
