import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, BarChart3, TrendingUp } from 'lucide-react';

const reasons = [
    {
        icon: <Zap className="w-8 h-8 text-yellow-400" />,
        title: "Unified Platform",
        desc: "Recruiters and candidates use the same trusted system.",
        link: "how-it-works"
    },
    {
        icon: <ShieldCheck className="w-8 h-8 text-green-400" />,
        title: "AI-Driven Decisions",
        desc: "Hiring based on skills, not guesswork.",
        link: "recruiter-features"
    },
    {
        icon: <BarChart3 className="w-8 h-8 text-blue-400" />,
        title: "Transparent Scoring",
        desc: "Resume match, assessment, and interview scores are visible.",
        link: "seeker-features"
    },
    {
        icon: <TrendingUp className="w-8 h-8 text-purple-400" />,
        title: "Career Growth Focused",
        desc: "Not just hiring — we help candidates improve.",
        link: "cta"
    }
];

const WhyChooseUs = () => {
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <section className="py-24 bg-white/5" id="features">
            <div className="container mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <h2 className="text-4xl font-bold mb-4">Why Web3 Talent Eco System?</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Our platform bridges the gap between talent and opportunity with
                        cutting-edge AI technology.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {reasons.map((reason, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -10 }}
                            onClick={() => scrollToSection(reason.link)}
                            className="p-8 rounded-[2rem] bg-[#0c0f16] border border-white/10 hover:border-blue-500/50 transition-all group cursor-pointer"
                        >
                            <div className="mb-6 p-4 rounded-2xl bg-white/5 inline-block group-hover:bg-blue-500/10 transition-colors">
                                {reason.icon}
                            </div>
                            <h4 className="text-xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors">{reason.title}</h4>
                            <p className="text-gray-500 text-sm leading-relaxed mb-6">
                                {reason.desc}
                            </p>
                            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                Explore Feature <span>→</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default WhyChooseUs;
