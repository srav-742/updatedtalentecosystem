import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, RotateCcw, DollarSign } from 'lucide-react';

const RiskShield = () => {
    const guarantees = [
        {
            icon: <Zap className="w-6 h-6 text-yellow-400" />,
            title: "Zero Platform Fee",
            desc: "The first month has zero platform fee. Experience the quality before you commit to the partnership."
        },
        {
            icon: <RotateCcw className="w-6 h-6 text-blue-400" />,
            title: "Free Replacement",
            desc: "If the candidate doesn't meet your expectations within the first 90 days, we provide a replacement at no cost."
        },
        {
            icon: <DollarSign className="w-6 h-6 text-green-400" />,
            title: "No Advance Payment",
            desc: "Pay as you go. No upfront retainers or hidden sourcing fees. Scaling becomes completely risk-free."
        }
    ];

    return (
        <section id="safety" className="py-24 relative overflow-hidden bg-[#0c0f16]">
            <div className="container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-green-500/20 bg-green-500/10 text-green-400 text-sm font-medium mb-6">
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Risk-Free Vetting
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Built for Startup Safety</h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        We are so confident in our vetting process that we shoulder the risk for you.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {guarantees.map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
                        >
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                {item.icon}
                            </div>
                            <h4 className="text-xl font-bold text-white mb-4">{item.title}</h4>
                            <p className="text-gray-400 leading-relaxed text-sm">
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default RiskShield;
