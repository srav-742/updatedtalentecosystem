import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const flowSteps = [
    "Payroll & Taxes",
    "Legal Contracts",
    "Compliance",
    "Equipment & IP",
    "PF / Benefits",
    "Local Laws"
];

const FlowDiagram = ({ theme = 'light' }) => {
    const isLight = theme === 'light';

    return (
        <section id="operations" className={`py-24 overflow-hidden ${isLight ? 'bg-white' : 'bg-transparent'}`}>
            <div className="container mx-auto px-6 text-center">
                <h2 className={`text-3xl font-bold mb-16 uppercase tracking-[0.2em] ${isLight ? 'text-gray-900' : 'text-white'}`}>Fullstack Operations Support</h2>
                <p className={`mb-12 max-w-2xl mx-auto ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    You focus on the product. We handle the people management and
                    administrative burden across the globe.
                </p>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    {flowSteps.map((step, idx) => (
                        <React.Fragment key={idx}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className={`px-6 py-4 rounded-xl text-sm font-semibold transition-colors ${isLight ? 'border border-gray-200 bg-white text-gray-900 hover:bg-slate-50 shadow-sm' : 'border border-white/10 bg-white/5 text-white/90 hover:bg-white/10 shadow-lg backdrop-blur-sm'}`}
                            >
                                {step}
                            </motion.div>
                            {idx < flowSteps.length - 1 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 + 0.05 }}
                                    className="hidden md:block"
                                >
                                    <ArrowRight className="w-5 h-5 text-blue-500/50" />
                                </motion.div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FlowDiagram;
