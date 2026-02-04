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

const FlowDiagram = () => {
    return (
        <section id="operations" className="py-24 overflow-hidden">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-3xl font-bold mb-16 text-white uppercase tracking-[0.2em]">Fullstack Operations Support</h2>
                <p className="text-gray-400 mb-12 max-w-2xl mx-auto">
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
                                className="px-6 py-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-semibold text-white/90 hover:bg-white/10 transition-colors shadow-lg"
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
