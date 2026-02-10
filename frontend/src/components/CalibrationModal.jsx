import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, Mail, Phone, ArrowRight, Building, Briefcase, BarChart, Target, Rocket } from 'lucide-react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

const CalibrationModal = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        role: '',
        hiringVolume: '',
        rolesHiringFor: '',
        primaryChallenge: '',
        calibrationGoal: ''
    });
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

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

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
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
                            <PhoneInput
                                defaultCountry="in"
                                value={formData.phone}
                                onChange={(phone) => setFormData({ ...formData, phone })}
                                className="w-full"
                                inputClassName="!w-full !bg-white/5 !border-white/10 !rounded-xl !py-7 !pl-12 !text-white !placeholder:text-gray-600 !focus:outline-none !focus:ring-2 !focus:ring-blue-500/50 !transition-all !h-auto !text-base"
                                countrySelectorStyleProps={{
                                    buttonClassName: "!bg-transparent !border-none !left-2 !absolute !top-1/2 !-translate-y-1/2 !flex !items-center !justify-center !z-20",
                                }}
                            />
                        </div>
                        <button
                            onClick={nextStep}
                            disabled={!formData.name || !formData.email || !formData.phone}
                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-2xl mt-4 flex items-center justify-center group disabled:opacity-50 transition-all"
                        >
                            Next Step
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 ml-1">Company</label>
                            <div className="relative">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    required
                                    placeholder="Tesla / OpenAI"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 ml-1">Your Role</label>
                            <div className="relative">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    required
                                    placeholder="VP of Engineering / CTO"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 ml-1">Hiring Volume</label>
                            <div className="relative">
                                <BarChart className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <select
                                    className="w-full bg-white/0 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none bg-[#1a1d24]"
                                    value={formData.hiringVolume}
                                    onChange={(e) => setFormData({ ...formData, hiringVolume: e.target.value })}
                                >
                                    <option value="" className="bg-[#0c0f16]">Select scope...</option>
                                    <option value="1-3" className="bg-[#0c0f16]">1-3 engineers / month</option>
                                    <option value="4-10" className="bg-[#0c0f16]">4-10 engineers / month</option>
                                    <option value="10+" className="bg-[#0c0f16]">10+ engineers / month</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={prevStep} className="flex-1 py-4 border border-white/10 text-gray-400 rounded-xl font-medium hover:bg-white/5">Back</button>
                            <button onClick={nextStep} disabled={!formData.company || !formData.role || !formData.hiringVolume} className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 group disabled:opacity-50">
                                Next Step
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 ml-1">Roles Hiring For</label>
                            <div className="relative">
                                <Target className="absolute left-4 top-6 w-5 h-5 text-gray-500" />
                                <textarea
                                    required
                                    placeholder="e.g. Senior AI Engineer, ML Ops..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white h-24 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                    value={formData.rolesHiringFor}
                                    onChange={(e) => setFormData({ ...formData, rolesHiringFor: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 ml-1">Primary Hiring Challenge</label>
                            <div className="relative">
                                <Rocket className="absolute left-4 top-6 w-5 h-5 text-gray-500" />
                                <textarea
                                    required
                                    placeholder="Speed, Quality, or Cost?"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white h-24 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                    value={formData.primaryChallenge}
                                    onChange={(e) => setFormData({ ...formData, primaryChallenge: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 ml-1">Calibration Goal</label>
                            <div className="relative">
                                <BarChart className="absolute left-4 top-6 w-5 h-5 text-gray-500" />
                                <textarea
                                    placeholder="What do you hope to achieve?"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white h-24 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                    value={formData.calibrationGoal}
                                    onChange={(e) => setFormData({ ...formData, calibrationGoal: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={prevStep} className="flex-1 py-4 border border-white/10 text-gray-400 rounded-xl font-medium hover:bg-white/5">Back</button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !formData.rolesHiringFor || !formData.primaryChallenge}
                                className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 group disabled:opacity-50 relative overflow-hidden"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Continue to Calibration
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
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
                        className={`relative w-full ${isSubmitted ? 'max-w-4xl' : 'max-w-lg'} bg-[#0c0f16] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.15)] transition-all duration-700`}
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
                                    <div className="mb-10 text-center">
                                        <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-8 mx-auto border border-blue-500/20">
                                            <Calendar className="w-8 h-8 text-blue-500" />
                                        </div>
                                        <h3 className="text-3xl font-bold text-white mb-3">Talent Calibration Call</h3>
                                        <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
                                            Align your hiring intelligence, role clarity, and candidate quality in one strategic session.
                                        </p>

                                        {/* Progress Bar */}
                                        <div className="flex items-center justify-center gap-2 mt-8">
                                            {[1, 2, 3].map((s) => (
                                                <div
                                                    key={s}
                                                    className={`h-1.5 rounded-full transition-all duration-500 ${s === step ? 'w-8 bg-blue-500' : s < step ? 'w-4 bg-teal-500' : 'w-4 bg-white/10'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <form onSubmit={(e) => e.preventDefault()} className="relative">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={step}
                                                initial={{ x: 20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                exit={{ x: -20, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                {renderStep()}
                                            </motion.div>
                                        </AnimatePresence>
                                    </form>
                                </>
                            ) : (
                                <div className="relative w-full h-[750px] overflow-hidden rounded-3xl bg-white mt-4 border-8 border-[#0c0f16]">
                                    <iframe
                                        src={`https://cal.com/sravya-dhadi-ccq7oo/technical-calibration-call?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}&embed=true`}
                                        className="w-full h-[calc(100%+65px)] border-none"
                                        style={{ marginBottom: '-65px' }}
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
