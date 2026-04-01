import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const ScalingModels = () => {
    return (
        <section id="hiring-models" className="py-24 bg-slate-50">
            <div className="container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl font-bold text-gray-900 mb-6">Flexible Hiring Models</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Choose the model that fits your current stage. From rapid scaling to building your long-term internal team.
                    </p>
                </motion.div>

                <div className="overflow-x-auto rounded-[2rem] border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="p-6 text-xl font-bold text-gray-900">Feature</th>
                                <th className="p-6 text-xl font-bold text-blue-400">Managed Remote</th>
                                <th className="p-6 text-xl font-bold text-teal-400">Direct Hire</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                                <td className="p-6 font-semibold text-gray-800">Management</td>
                                <td className="p-6 text-gray-600">Hire1percent manages payroll, legal, and compliance.</td>
                                <td className="p-6 text-gray-600">Startup hires directly and manages all admin.</td>
                            </tr>
                            <tr className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                                <td className="p-6 font-semibold text-gray-800">Daily Ops</td>
                                <td className="p-6 text-gray-600">Startup only manages direct work and tasks.</td>
                                <td className="p-6 text-gray-600">Hire1percent supports the initial setup phase.</td>
                            </tr>
                            <tr className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                                <td className="p-6 font-semibold text-gray-800">Benefit</td>
                                <td className="p-6 text-gray-600">Zero administrative burden for the founder.</td>
                                <td className="p-6 text-gray-600">Direct relationship and long-term integration.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};

export default ScalingModels;
