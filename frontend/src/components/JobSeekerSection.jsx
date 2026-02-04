import React from 'react';
import { motion } from 'framer-motion';
import { User, Target, Award, CheckCircle, Rocket } from 'lucide-react';

const steps = [
    {
        icon: <User className="w-6 h-6" />,
        title: "Ownership Mindset",
        desc: "Engineers take full responsibility for their modules, just like any internal core team member."
    },
    {
        icon: <Target className="w-6 h-6" />,
        title: "Silicon Valley Communication",
        desc: "Fluent, proactive, and professional communication that bridges the gap between timezones."
    },
    {
        icon: <Award className="w-6 h-6" />,
        title: "Deep Integration",
        desc: "We ensure our talent works within your tools, your slack, and your culture."
    },
    {
        icon: <CheckCircle className="w-6 h-6" />,
        title: "Long-term Collaboration",
        desc: "No freelancers or gig-workers. We focus on building stable, long-lasting engineering teams."
    }
];

const JobSeekerSection = () => {
    return (
        <section id="team-culture" className="py-24 relative overflow-hidden">
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
                            <h2 className="text-4xl font-bold text-white">Not Outsourcing. Integration.</h2>
                            <p className="text-xl text-gray-400 leading-relaxed">
                                Our engineers aren't outsiders. They are core team members who
                                care about your product as much as you do.
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
                            <div className="bg-[#0c0f16] rounded-[2rem] p-8 border border-white/10 overflow-hidden text-center">
                                <div className="space-y-6">
                                    <div className="text-2xl font-bold text-white">Team Alignment</div>
                                    <div className="flex justify-center -space-x-4">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className="w-16 h-16 rounded-full border-4 border-[#0c0f16] bg-teal-500/20 flex items-center justify-center overflow-hidden">
                                                <div className="w-full h-full bg-gradient-to-br from-teal-500 to-blue-500 opacity-60" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        "They aren't just developers; they are partners in our vision."
                                    </div>
                                    <div className="flex justify-center gap-4">
                                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-teal-400 border border-teal-500/20">Slack Integrated</span>
                                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-blue-400 border border-blue-500/20">Daily Syncs</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-teal-600/20 rounded-full blur-[80px] -z-10" />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default JobSeekerSection;
