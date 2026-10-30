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
            await fetch("https://updatedtalentecosystem-kl0c.onrender.com/api/save-calibration-lead", {
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
                        className="fixed inset-0 bg-[#20263A]/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className={`relative w-full ${isSubmitted ? 'max-w-5xl' : 'max-w-lg'} bg-white border border-[#E3E5EC] rounded-[2rem] overflow-hidden shadow-[0_25px_70px_rgba(32,38,58,0.2)] transition-all duration-500 my-auto`}
                    >
                        <div className={isSubmitted ? "p-6 sm:p-8" : "p-8 sm:p-10"}>
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 z-20 p-2 text-[#5E6577] hover:text-[#20263A] bg-[#F8F8FA] hover:bg-[#E3E5EC] rounded-full transition-colors cursor-pointer border border-[#E3E5EC]/60"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {!isSubmitted ? (
                                <>
                                    <div className="mb-8 text-center relative">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EBDD] border border-[#E6BC6B]/40 text-[#C99A45] text-[11px] font-bold uppercase tracking-wider mb-4">
                                            15-Minute Demo
                                        </div>
                                        <div className="w-16 h-16 bg-[#20263A] text-[#E6BC6B] rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-md border border-[#D4AC5F]/30">
                                            <Calendar className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-2xl sm:text-3xl font-extrabold text-[#20263A] mb-2 tracking-tight">
                                            Book a 15-Minute Demo
                                        </h3>
                                        <p className="text-[#5E6577] text-sm leading-relaxed max-w-sm mx-auto">
                                            Align your hiring intelligence, role parameters, and candidate quality.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-[#5E6577] uppercase tracking-wider ml-1 block">
                                                Full Name
                                            </label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9AA0B2] group-focus-within:text-[#20263A] transition-colors z-10" />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="John Doe"
                                                    className="w-full bg-[#F8F8FA] border border-[#E3E5EC] rounded-xl py-3.5 pl-12 pr-4 text-[#20263A] placeholder:text-[#9AA0B2] focus:outline-none focus:bg-white focus:border-[#20263A] focus:ring-2 focus:ring-[#20263A]/10 transition-all text-sm font-medium"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-[#5E6577] uppercase tracking-wider ml-1 block">
                                                Work Email
                                            </label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9AA0B2] group-focus-within:text-[#20263A] transition-colors z-10" />
                                                <input
                                                    type="email"
                                                    required
                                                    placeholder="john@company.com"
                                                    className="w-full bg-[#F8F8FA] border border-[#E3E5EC] rounded-xl py-3.5 pl-12 pr-4 text-[#20263A] placeholder:text-[#9AA0B2] focus:outline-none focus:bg-white focus:border-[#20263A] focus:ring-2 focus:ring-[#20263A]/10 transition-all text-sm font-medium"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-[#5E6577] uppercase tracking-wider ml-1 block">
                                                Phone Number
                                            </label>
                                            <div onFocus={requestLocationAccess} onClick={requestLocationAccess} className="group">
                                                <PhoneInput
                                                    key={detectedCountry}
                                                    defaultCountry={detectedCountry}
                                                    value={formData.phone}
                                                    onChange={(phone) => setFormData({ ...formData, phone })}
                                                    className="w-full"
                                                    inputClassName="!w-full !bg-[#F8F8FA] !border-[#E3E5EC] !rounded-xl !py-3.5 !pl-12 !text-[#20263A] !placeholder:text-[#9AA0B2] !focus:outline-none !focus:bg-white !focus:border-[#20263A] !focus:ring-2 !focus:ring-[#20263A]/10 !transition-all !h-auto !text-sm !font-medium"
                                                    countrySelectorStyleProps={{
                                                        buttonClassName: "!bg-transparent !border-none !left-2 !absolute !top-1/2 !-translate-y-1/2 !flex !items-center !justify-center !z-20",
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-[#5E6577] uppercase tracking-wider ml-1 block">
                                                Company Name
                                            </label>
                                            <div className="relative group">
                                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9AA0B2] group-focus-within:text-[#20263A] transition-colors z-10" />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Your Company"
                                                    className="w-full bg-[#F8F8FA] border border-[#E3E5EC] rounded-xl py-3.5 pl-12 pr-4 text-[#20263A] placeholder:text-[#9AA0B2] focus:outline-none focus:bg-white focus:border-[#20263A] focus:ring-2 focus:ring-[#20263A]/10 transition-all text-sm font-medium"
                                                    value={formData.company}
                                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-[#5E6577] uppercase tracking-wider ml-1 block">
                                                Role for Hiring
                                            </label>
                                            <div className="relative group">
                                                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9AA0B2] group-focus-within:text-[#20263A] transition-colors z-10" />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. Senior AI Engineer"
                                                    className="w-full bg-[#F8F8FA] border border-[#E3E5EC] rounded-xl py-3.5 pl-12 pr-4 text-[#20263A] placeholder:text-[#9AA0B2] focus:outline-none focus:bg-white focus:border-[#20263A] focus:ring-2 focus:ring-[#20263A]/10 transition-all text-sm font-medium"
                                                    value={formData.roleForHiring}
                                                    onChange={(e) => setFormData({ ...formData, roleForHiring: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || !formData.name || !formData.email || !formData.phone || !formData.company || !formData.roleForHiring}
                                            className="w-full py-4 bg-[#20263A] hover:bg-[#151A2D] text-white font-bold rounded-xl mt-5 flex items-center justify-center gap-2 group disabled:opacity-50 transition-all shadow-[0_6px_20px_rgba(32,38,58,0.18)] hover:-translate-y-0.5 active:translate-y-0 text-sm cursor-pointer"
                                        >
                                            {loading ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    Continue to Demo Scheduling
                                                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between pb-4 border-b border-[#E3E5EC] mb-3 px-1">
                                        <div>
                                            <h4 className="text-lg font-bold text-[#20263A]">Select Your Demo Time</h4>
                                            <p className="text-xs text-[#5E6577]">Choose a 15-minute slot that works best for your team.</p>
                                        </div>
                                    </div>
                                    <div className="relative w-full h-[600px] md:h-[750px] overflow-y-auto rounded-2xl bg-white border border-[#E3E5EC] shadow-sm custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
                                        <iframe
                                            src={`https://cal.com/sravya-dhadi-ccq7oo/technical-calibration-call?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}&embed=true`}
                                            className="w-full h-[1200px] border-none"
                                            scrolling="no"
                                            title="Booking Calendar"
                                            style={{ marginTop: '-45px', marginBottom: '-115px', display: 'block' }}
                                        />
                                    </div>
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
