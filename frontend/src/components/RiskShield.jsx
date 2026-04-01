import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, RotateCcw, DollarSign } from 'lucide-react';

const RiskShield = ({ theme = 'light' }) => {
    const isLight = theme === 'light';

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
        <section id="safety" className={`py-24 relative overflow-hidden ${isLight ? 'bg-slate-50' : 'bg-[#0c0f16]'}`}>
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
                    <h2 className={`mb-6 text-4xl font-bold md:text-5xl ${isLight ? 'text-gray-900' : 'text-white'}`}>Built for Startup Safety</h2>
                    <p className={`mx-auto max-w-2xl text-xl ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
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
                            className={`group rounded-[2.5rem] p-8 transition-all ${isLight ? 'border border-gray-200 bg-white shadow-sm hover:border-gray-300' : 'border border-white/10 bg-white/5 hover:border-white/20'}`}
                        >
                            <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${isLight ? 'bg-slate-100' : 'bg-white/5'}`}>
                                {item.icon}
                            </div>
                            <h4 className={`mb-4 text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{item.title}</h4>
                            <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
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
