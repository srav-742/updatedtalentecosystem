import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, BarChart3, TrendingUp } from 'lucide-react';

const reasons = [
    {
        icon: <Zap className="w-8 h-8 text-yellow-400" />,
        title: "AI & ML Specialists",
        desc: "Our engineers are experts in LLMs, RAG systems, and vector databases. They don't just write code; they build intelligent systems.",
        link: "problem-solution"
    },
    {
        icon: <ShieldCheck className="w-8 h-8 text-green-400" />,
        title: "IIT-Vetted Quality",
        desc: "We only source from the top 1% of Indian engineering talent, primarily from IITs, ensuring a world-class technical foundation.",
        link: "how-it-works"
    },
    {
        icon: <BarChart3 className="w-8 h-8 text-blue-400" />,
        title: "Rigorous Technical Vetting",
        desc: "Every candidate undergoes real-world project testing and deep technical interviews by our team of expert AI architects.",
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
        <section className="py-24 bg-white/5" id="elite-talent">
            <div className="container mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <h2 className="text-4xl font-bold mb-4">The Elite Talent Standard</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        We don't just find developers. We provide AI specialists who function
                        as a core part of your engineering team.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
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
