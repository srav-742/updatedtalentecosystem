import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const FinalCTA = () => {
    return (
        <section className="py-24 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-teal-500/10 -z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full -z-10" />

            <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto rounded-[3rem] p-12 md:p-20 border border-white/10 bg-[#0c0f16]/50 backdrop-blur-xl text-center shadow-2xl relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Ready to Hire or Get Hired?</h2>
                        <p className="text-xl text-gray-400 mb-12">
                            Join Web3 Talent Eco System and experience smart, skill-based hiring.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link to="/signup" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/20 text-center">
                                Sign Up as Recruiter
                            </Link>
                            <Link to="/signup" className="w-full sm:w-auto px-10 py-5 bg-white text-black font-bold rounded-2xl hover:bg-gray-100 transition-all shadow-xl text-center">
                                Sign Up as Candidate
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default FinalCTA;
