import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const ScalingModels = ({ theme = 'light' }) => {
    const isLight = theme === 'light';

    return (
        <section id="hiring-models" className={`py-24 ${isLight ? 'bg-slate-50' : 'bg-white/5'}`}>
            <div className="container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className={`text-4xl font-bold mb-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>Flexible Hiring Models</h2>
                    <p className={`max-w-2xl mx-auto ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Choose the model that fits your current stage. From rapid scaling to building your long-term internal team.
                    </p>
                </motion.div>

                <div className={`overflow-x-auto rounded-[2rem] ${isLight ? 'border border-gray-200 bg-white shadow-sm' : 'border border-white/10 bg-[#0c0f16] shadow-xl'}`}>
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className={isLight ? 'border-b border-gray-200' : 'border-b border-white/10'}>
                                <th className={`p-6 text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>Feature</th>
                                <th className="p-6 text-xl font-bold text-blue-400">Managed Remote</th>
                                <th className="p-6 text-xl font-bold text-teal-400">Direct Hire</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className={`transition-colors ${isLight ? 'border-b border-gray-100 hover:bg-slate-50' : 'border-b border-white/5 hover:bg-white/[0.02]'}`}>
                                <td className={`p-6 font-semibold ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>Management</td>
                                <td className={`p-6 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Hire1percent manages payroll, legal, and compliance.</td>
                                <td className={`p-6 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Startup hires directly and manages all admin.</td>
                            </tr>
                            <tr className={`transition-colors ${isLight ? 'border-b border-gray-100 hover:bg-slate-50' : 'border-b border-white/5 hover:bg-white/[0.02]'}`}>
                                <td className={`p-6 font-semibold ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>Daily Ops</td>
                                <td className={`p-6 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Startup only manages direct work and tasks.</td>
                                <td className={`p-6 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Hire1percent supports the initial setup phase.</td>
                            </tr>
                            <tr className={`transition-colors ${isLight ? 'border-b border-gray-100 hover:bg-slate-50' : 'border-b border-white/5 hover:bg-white/[0.02]'}`}>
                                <td className={`p-6 font-semibold ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>Benefit</td>
                                <td className={`p-6 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Zero administrative burden for the founder.</td>
                                <td className={`p-6 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Direct relationship and long-term integration.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};

export default ScalingModels;
