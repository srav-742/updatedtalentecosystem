import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, Mail, Phone, ArrowRight, Building, Target } from 'lucide-react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

const CalibrationModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        roleForHiring: ''
    });
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [detectedCountry, setDetectedCountry] = useState('us'); // Primary default: USA
    const [hasRequestedLocation, setHasRequestedLocation] = useState(false);

    const requestLocationAccess = () => {
        if (navigator.geolocation && !hasRequestedLocation) {
            setHasRequestedLocation(true);
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await res.json();
                        if (data.address && data.address.country_code) {
                            const country = data.address.country_code.toLowerCase();
                            console.log("Country Detected:", country);
                            setDetectedCountry(country);
                        }
                    } catch (error) {
                        console.error("Location-based country refinement failed:", error);
                    }
                },
                (error) => {
                    console.warn("Location access denied or unavailable. Falling back to US (+1).");
                }
            );
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await fetch("https://updatedtalent-backend.onrender.com/api/save-calibration-lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto overflow-x-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/90 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 40 }}
                        className={`relative w-full ${isSubmitted ? 'max-w-5xl' : 'max-w-lg'} bg-[#0c0f16] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.15)] transition-all duration-700 my-auto`}
                    >
                        <div className={isSubmitted ? "p-4" : "p-10 md:p-12"}>
                            <button
                                onClick={onClose}
                                className="absolute top-8 right-8 z-10 p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-full"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {!isSubmitted ? (
                                <>
                                    <div className="mb-8 text-center">
                                        <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-blue-500/20">
                                            <Calendar className="w-8 h-8 text-blue-500" />
                                        </div>
                                        <h3 className="text-3xl font-bold text-white mb-2">Talent Calibration Call</h3>
                                        <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
                                            Align your hiring intelligence, role clarity, and candidate quality.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400 ml-1">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="John Doe"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400 ml-1">Work Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                                                <input
                                                    type="email"
                                                    required
                                                    placeholder="john@company.com"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400 ml-1">Phone Number</label>
                                            <div onFocus={requestLocationAccess} onClick={requestLocationAccess}>
                                                <PhoneInput
                                                    key={detectedCountry}
                                                    defaultCountry={detectedCountry}
                                                    value={formData.phone}
                                                    onChange={(phone) => setFormData({ ...formData, phone })}
                                                    className="w-full"
                                                    inputClassName="!w-full !bg-white/5 !border-white/10 !rounded-xl !py-7 !pl-12 !text-white !placeholder:text-gray-600 !focus:outline-none !focus:ring-2 !focus:ring-blue-500/50 !transition-all !h-auto !text-base"
                                                    countrySelectorStyleProps={{
                                                        buttonClassName: "!bg-transparent !border-none !left-2 !absolute !top-1/2 !-translate-y-1/2 !flex !items-center !justify-center !z-20",
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400 ml-1">Company Name</label>
                                            <div className="relative">
                                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Your Company"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                    value={formData.company}
                                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400 ml-1">Role for Hiring</label>
                                            <div className="relative">
                                                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. Senior AI Engineer"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                    value={formData.roleForHiring}
                                                    onChange={(e) => setFormData({ ...formData, roleForHiring: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || !formData.name || !formData.email || !formData.phone || !formData.company || !formData.roleForHiring}
                                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-2xl mt-4 flex items-center justify-center group disabled:opacity-50 transition-all shadow-xl shadow-blue-500/20"
                                        >
                                            {loading ? (
                                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    Continue to Calibration
                                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="relative w-full h-[600px] md:h-[800px] overflow-y-auto rounded-3xl bg-white mt-4 border-8 border-[#0c0f16] shadow-2xl custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
                                    <iframe
                                        src={`https://cal.com/sravya-dhadi-ccq7oo/technical-calibration-call?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}&embed=true`}
                                        className="w-full h-[1200px] border-none"
                                        scrolling="no"
                                        title="Booking Calendar"
                                        style={{ marginTop: '-45px', marginBottom: '-115px', display: 'block' }}
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
