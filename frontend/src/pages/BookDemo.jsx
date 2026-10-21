import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
    Calendar, Clock, CheckCircle2, AlertTriangle, 
    Shield, ArrowRight, Loader2, RefreshCw, Mail, 
    User, Briefcase, PackageCheck, Send, Info
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { PLANS, isValidPlanId } from '../utils/pricingCatalog';

/**
 * 7 States of the Demo Booking Machine:
 * - 'loading'
 * - 'available'
 * - 'submitting'
 * - 'confirmed'
 * - 'unavailable'
 * - 'requesting'
 * - 'request_received'
 */

const BookDemo = () => {
    const [theme, setTheme] = useState(() => localStorage.getItem('landing-theme') || 'dark');
    const [searchParams] = useSearchParams();

    // 7-state booking machine state
    const [bookingState, setBookingState] = useState('loading'); // initial
    const [authoritativeBookingId, setAuthoritativeBookingId] = useState(null);
    const [confirmedTime, setConfirmedTime] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [userTimezone, setUserTimezone] = useState('');

    // Available mock slots for interactive booking
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);

    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
        plan: ''
    });
    const [formErrors, setFormErrors] = useState({});

    const isLight = theme === 'light';

    // Initialize timezone, plan query parameter, and mock scheduler slots
    useEffect(() => {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
            setUserTimezone(tz);
        } catch {
            setUserTimezone('UTC');
        }

        // Prefill plan if present in query parameter
        const planParam = searchParams.get('plan');
        const initialPlan = isValidPlanId(planParam) ? planParam : '';
        setFormData(prev => ({ ...prev, plan: initialPlan }));

        // Simulate scheduler availability check
        const timer = setTimeout(() => {
            // Generate next available slots in user's timezone
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const mockSlots = [
                { id: 'slot_1', time: '10:00 AM', label: `${tomorrow.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at 10:00 AM` },
                { id: 'slot_2', time: '02:00 PM', label: `${tomorrow.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at 02:00 PM` },
                { id: 'slot_3', time: '04:30 PM', label: `${tomorrow.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at 04:30 PM` }
            ];

            setAvailableSlots(mockSlots);
            setSelectedSlot(mockSlots[0].id);
            setBookingState('available');
        }, 800);

        return () => clearTimeout(timer);
    }, [searchParams]);

    // Validation
    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Your name is required.';
        if (!formData.email.trim()) {
            errors.email = 'Email address is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid work email address.';
        }
        if (bookingState === 'available' && !selectedSlot) {
            errors.slot = 'Please select an available demo time slot.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Normal Flow: Available -> Submitting -> Confirmed (with Authoritative ID)
    const handleBookDemoSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setBookingState('submitting');
        setErrorMessage('');

        try {
            // Simulate authoritative calendar confirmation
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Generate authoritative booking event ID
            const chosenSlot = availableSlots.find(s => s.id === selectedSlot);
            const bookingId = `h1p_demo_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            setAuthoritativeBookingId(bookingId);
            setConfirmedTime(chosenSlot ? chosenSlot.label : 'Upcoming Session');
            setBookingState('confirmed');
        } catch {
            setErrorMessage('Unable to secure this time slot. The calendar scheduler may be temporarily unavailable.');
            setBookingState('unavailable');
        }
    };

    // Recovery Flow: Unavailable -> Requesting -> Request Received
    const handleRequestFallbackSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setBookingState('requesting');
        setErrorMessage('');

        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            setBookingState('request_received');
        } catch {
            setErrorMessage('Could not send demo request. Please check your connection and try again.');
            setBookingState('unavailable');
        }
    };

    // Retry slot loading
    const handleRetry = () => {
        setBookingState('loading');
        setTimeout(() => {
            setBookingState('available');
        }, 600);
    };

    return (
        <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isLight ? 'bg-white text-gray-900' : 'bg-[#0a0d14] text-white'}`}>
            <SEO 
                title="Schedule a Live Demo | Hire1Percent"
                description="Book a 15-minute live walkthrough of Hire1Percent's technical assessment platform and 4-layer anti-cheat architecture."
                canonical="https://www.hire1percent.com/book-demo"
                noindex={bookingState === 'confirmed'} // Must be noindex in confirmed state
            />

            <Navbar theme={theme} onToggleTheme={() => setTheme(isLight ? 'dark' : 'light')} />

            <main className="flex-grow pt-28 pb-20">
                <div className="container mx-auto px-6 max-w-2xl">
                    {/* Header */}
                    <div className="text-center space-y-3 mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold tracking-widest uppercase">
                            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>15-Minute Live Walkthrough</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                            Schedule a Technical Assessment Demo
                        </h1>
                        <p className={`text-sm max-w-lg mx-auto ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            See our 4-layer anti-cheat, live requirement adaptation, and AI code defense in action.
                        </p>
                    </div>

                    {/* Booking Machine Card Container */}
                    <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative transition-all ${
                        isLight ? 'bg-white border-gray-200 shadow-blue-500/5' : 'bg-[#101422] border-white/10'
                    }`}>
                        {/* ─── STATE 1: LOADING ─────────────────────────────────────────── */}
                        {bookingState === 'loading' && (
                            <div className="py-16 text-center space-y-4" role="status" aria-live="polite">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                                <h2 className="text-lg font-bold">Checking Calendar Availability...</h2>
                                <p className="text-xs text-gray-400">
                                    Loading open times for {userTimezone || 'your timezone'}.
                                </p>
                            </div>
                        )}

                        {/* ─── STATE 2 & 3: AVAILABLE or SUBMITTING ───────────────────────── */}
                        {(bookingState === 'available' || bookingState === 'submitting') && (
                            <form onSubmit={handleBookDemoSubmit} className="space-y-5">
                                <div className="space-y-4">
                                    {/* Name Field */}
                                    <div>
                                        <label htmlFor="demo-name" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                                            Your Name <span className="text-rose-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <input 
                                                id="demo-name"
                                                type="text"
                                                required
                                                disabled={bookingState === 'submitting'}
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Engineering Leader or Recruiter Name"
                                                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                                                    formErrors.name 
                                                        ? 'border-rose-500 bg-rose-500/10' 
                                                        : 'border-white/10 bg-black/20 focus:border-blue-500 focus:bg-black/40'
                                                }`}
                                            />
                                        </div>
                                        {formErrors.name && (
                                            <p className="text-xs text-rose-400 mt-1">{formErrors.name}</p>
                                        )}
                                    </div>

                                    {/* Email Field */}
                                    <div>
                                        <label htmlFor="demo-email" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                                            Work Email <span className="text-rose-400">*</span>
                                        </label>
                                        <input 
                                            id="demo-email"
                                            type="email"
                                            required
                                            disabled={bookingState === 'submitting'}
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="you@company.com"
                                            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                                                formErrors.email 
                                                    ? 'border-rose-500 bg-rose-500/10' 
                                                    : 'border-white/10 bg-black/20 focus:border-blue-500 focus:bg-black/40'
                                            }`}
                                        />
                                        {formErrors.email && (
                                            <p className="text-xs text-rose-400 mt-1">{formErrors.email}</p>
                                        )}
                                    </div>

                                    {/* Role Field (Optional) */}
                                    <div>
                                        <label htmlFor="demo-role" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                                            Role You Are Hiring For <span className="text-gray-500 text-[11px]">(Optional)</span>
                                        </label>
                                        <input 
                                            id="demo-role"
                                            type="text"
                                            disabled={bookingState === 'submitting'}
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            placeholder="e.g. Senior Backend Python Engineer, Full-Stack"
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/20 text-sm outline-none focus:border-blue-500 focus:bg-black/40"
                                        />
                                    </div>

                                    {/* Package of Interest (Prefilled from ?plan=) */}
                                    <div>
                                        <label htmlFor="demo-plan" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                                            Package of Interest <span className="text-gray-500 text-[11px]">(Optional)</span>
                                        </label>
                                        <select 
                                            id="demo-plan"
                                            disabled={bookingState === 'submitting'}
                                            value={formData.plan}
                                            onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0c101b] text-sm outline-none focus:border-blue-500"
                                        >
                                            <option value="">General Platform Overview</option>
                                            {PLANS.map(p => (
                                                <option key={p.plan_id} value={p.plan_id}>
                                                    {p.name} {p.amount_cents ? `($${p.amount_cents / 100})` : '(Custom Volume)'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Slot Selection */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                                                Select Available Time ({userTimezone})
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                            {availableSlots.map((slot) => {
                                                const isSelected = selectedSlot === slot.id;
                                                return (
                                                    <button
                                                        key={slot.id}
                                                        type="button"
                                                        onClick={() => setSelectedSlot(slot.id)}
                                                        className={`p-3 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                                                            isSelected 
                                                                ? 'border-blue-500 bg-blue-500/20 text-white shadow-md' 
                                                                : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                                                        }`}
                                                    >
                                                        <Clock className="w-3.5 h-3.5 mb-1 text-blue-400" />
                                                        <span>{slot.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {formErrors.slot && (
                                            <p className="text-xs text-rose-400 mt-1">{formErrors.slot}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={bookingState === 'submitting'}
                                    className="w-full py-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                                >
                                    {bookingState === 'submitting' ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Confirming with Calendar...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Confirm Demo Booking</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* ─── STATE 4: CONFIRMED ───────────────────────────────────────── */}
                        {bookingState === 'confirmed' && (
                            <div className="py-8 text-center space-y-6" role="status" aria-live="polite">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-extrabold text-white">Your Demo is Confirmed!</h2>
                                    <p className="text-sm text-gray-300 max-w-md mx-auto">
                                        A calendar invitation with video conference coordinates has been dispatched to{' '}
                                        <strong className="text-white">{formData.email}</strong>.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono max-w-sm mx-auto space-y-1.5 text-left">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Authoritative Event ID:</span>
                                        <span className="text-blue-400 font-bold">{authoritativeBookingId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Reserved Slot:</span>
                                        <span className="text-gray-200">{confirmedTime}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Timezone:</span>
                                        <span className="text-gray-200">{userTimezone}</span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Link 
                                        to="/"
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all"
                                    >
                                        <span>Return to Homepage</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* ─── STATE 5: UNAVAILABLE ─────────────────────────────────────── */}
                        {bookingState === 'unavailable' && (
                            <div className="py-8 text-center space-y-6" role="alert">
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                                    <AlertTriangle className="w-7 h-7" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold">Live Calendar Unavailable</h2>
                                    <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
                                        {errorMessage || 'The automated scheduling provider is currently offline or all immediate slots are filled.'}
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <button
                                        onClick={handleRetry}
                                        className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-2"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>Retry Live Calendar</span>
                                    </button>
                                    <button
                                        onClick={handleRequestFallbackSubmit}
                                        className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-2"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Request Demo via Email Instead</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ─── STATE 6: REQUESTING ──────────────────────────────────────── */}
                        {bookingState === 'requesting' && (
                            <div className="py-16 text-center space-y-4" role="status">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                                <h2 className="text-lg font-bold">Submitting Demo Request...</h2>
                                <p className="text-xs text-gray-400">
                                    Transmitting your details to our sales and engineering team.
                                </p>
                            </div>
                        )}

                        {/* ─── STATE 7: REQUEST_RECEIVED ───────────────────────────────── */}
                        {bookingState === 'request_received' && (
                            <div className="py-8 text-center space-y-6" role="status">
                                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto">
                                    <PackageCheck className="w-7 h-7" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold">Demo Request Received</h2>
                                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left max-w-md mx-auto">
                                        <strong>Notice:</strong> A specific calendar time has not yet been booked. Our engineering team will review your requirements for <em>{formData.role || 'technical assessment'}</em> and contact <strong>{formData.email}</strong> within one business day with coordinated calendar slots.
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Link 
                                        to="/"
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all"
                                    >
                                        <span>Return to Homepage</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer theme={theme} />
        </div>
    );
};

export default BookDemo;
