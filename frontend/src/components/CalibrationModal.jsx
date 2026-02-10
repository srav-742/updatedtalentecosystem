import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, Mail, Phone, ArrowRight } from 'lucide-react';

const CalibrationModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Save lead first
            await fetch("https://updatedtalent-backend.onrender.com/api/save-calibration-lead", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            // Instead of redirecting away, we show the embed inside the modal
            setIsSubmitted(true);
        } catch (error) {
            console.error("Error saving lead:", error);
            alert("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`relative w-full ${isSubmitted ? 'max-w-4xl' : 'max-w-lg'} bg-[#0c0f16] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500`}
                    >
                        <div className={isSubmitted ? "p-4" : "p-8 md:p-10"}>
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 z-10 p-2 text-gray-400 hover:text-white transition-colors bg-black/50 rounded-full"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {!isSubmitted ? (
                                <>
                                    <div className="mb-8">
                                        <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-6">
                                            <Calendar className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Book a Calibration Call</h3>
                                        <p className="text-gray-400">Fill in your details to continue to booking.</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400 ml-1">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="John Doe"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400 ml-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                <input
                                                    type="email"
                                                    required
                                                    placeholder="john@company.com"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400 ml-1">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                <input
                                                    type="tel"
                                                    required
                                                    placeholder="+1 (555) 000-0000"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center group disabled:opacity-50"
                                        >
                                            {loading ? (
                                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    Continue to Booking
                                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="relative w-full h-[650px] overflow-hidden rounded-2xl bg-white mt-4">
                                    {/* The clipping container: we set a height and hide overflow to clip the branding at the bottom */}
                                    <iframe
                                        src={`https://cal.com/sravya-dhadi-ccq7oo/technical-calibration-call?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}&embed=true`}
                                        className="w-full h-[calc(100%+60px)] border-none"
                                        style={{ marginBottom: '-60px' }}
                                        title="Booking Calendar"
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CalibrationModal;
