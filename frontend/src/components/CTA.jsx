import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const FinalCTA = ({ theme = 'light' }) => {
    const isLight = theme === 'light';

    return (
        <section className="py-24 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-teal-500/10 -z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full -z-10" />

            <div className="container mx-auto px-6">
                <div className={`relative mx-auto max-w-4xl rounded-[3rem] border p-12 text-center backdrop-blur-xl md:p-20 ${isLight ? 'border-gray-200 bg-white/90 shadow-xl' : 'border-white/10 bg-[#0c0f16]/50 shadow-2xl'}`}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <h2 className={`mb-6 text-4xl font-bold md:text-5xl ${isLight ? 'text-gray-900' : 'text-white'}`}>Stop Spending. Start Shipping.</h2>
                        <p className={`mb-12 text-xl ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            Get 3 verified AI engineer profiles in 14 days.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link to="/signup" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/20 text-center">
                                Request Candidate Deck
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default FinalCTA;
