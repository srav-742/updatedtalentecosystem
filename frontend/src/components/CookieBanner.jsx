import React, { useState, useEffect } from 'react';
import { Cookie, X, ExternalLink, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import cookieManager from '../utils/cookieManager';
import { V5_COOKIE_CONSENT } from '../utils/v5Content';

const CookieBanner = () => {
    const [show, setShow] = useState(false);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

    useEffect(() => {
        const consent = cookieManager.getConsent();
        if (!consent) {
            const timer = setTimeout(() => setShow(true), 1200);
            return () => clearTimeout(timer);
        } else {
            setAnalyticsAllowed(!!consent.accepted);
        }
    }, []);

    // Listen for custom event from footer or other links
    useEffect(() => {
        const handleOpen = () => {
            const consent = cookieManager.getConsent();
            setAnalyticsAllowed(consent ? !!consent.accepted : false);
            setShow(true);
            setShowCustomizer(true);
        };
        window.addEventListener('open-cookie-settings', handleOpen);
        return () => window.removeEventListener('open-cookie-settings', handleOpen);
    }, []);

    const handleAcceptAll = () => {
        cookieManager.setConsent({
            accepted: true,
            essential: true,
            analytics: true,
            timestamp: new Date().toISOString()
        });
        setShow(false);
        setShowCustomizer(false);
    };

    const handleRejectOptional = () => {
        cookieManager.setConsent({
            accepted: false,
            essential: true,
            analytics: false,
            timestamp: new Date().toISOString()
        });
        setShow(false);
        setShowCustomizer(false);
    };

    const handleSaveCustom = () => {
        cookieManager.setConsent({
            accepted: analyticsAllowed,
            essential: true,
            analytics: analyticsAllowed,
            timestamp: new Date().toISOString()
        });
        setShow(false);
        setShowCustomizer(false);
    };

    if (!show) return null;

    return (
        <aside
            role="region"
            aria-label="Cookie consent banner"
            className="fixed bottom-6 left-6 right-6 z-[9999] md:max-w-xl md:left-auto animate-in fade-in slide-in-from-bottom-6 duration-300"
        >
            <div className="bg-[#121620]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/60 text-white">
                <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <Cookie className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-base font-bold text-white tracking-wide">
                                {V5_COOKIE_CONSENT.title}
                            </h2>
                            <button 
                                onClick={() => setShow(false)}
                                className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                aria-label="Close cookie banner"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed mb-4">
                            {V5_COOKIE_CONSENT.body}{' '}
                            <Link to={V5_COOKIE_CONSENT.policy_link} className="text-blue-400 hover:underline inline-flex items-center gap-1 font-medium">
                                Cookie Policy <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </Link>
                        </p>

                        {/* Granular settings drawer if toggled */}
                        {showCustomizer && (
                            <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 text-xs">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-semibold text-white">Essential Cookies</span>
                                        <p className="text-gray-400 text-[11px]">Required for login, secure exam sessions, and core navigation.</p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px]">Always active</span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                    <div>
                                        <span className="font-semibold text-white">Analytics & Performance</span>
                                        <p className="text-gray-400 text-[11px]">Helps us analyze traffic and platform usability.</p>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        checked={analyticsAllowed}
                                        onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                                        aria-label="Allow analytics cookies"
                                        className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-[#0c0f16]"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2.5 pt-1">
                            {!showCustomizer ? (
                                <>
                                    <button
                                        onClick={handleAcceptAll}
                                        className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
                                    >
                                        {V5_COOKIE_CONSENT.accept_label}
                                    </button>
                                    <button
                                        onClick={handleRejectOptional}
                                        className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all border border-white/10 active:scale-95"
                                    >
                                        {V5_COOKIE_CONSENT.reject_label}
                                    </button>
                                    <button
                                        onClick={() => setShowCustomizer(true)}
                                        className="px-3 py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-gray-400 hover:text-white text-xs font-medium transition-all inline-flex items-center gap-1.5"
                                        aria-label="Customize cookie settings"
                                    >
                                        <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                                        {V5_COOKIE_CONSENT.settings_label}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSaveCustom}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md"
                                    >
                                        Save Preferences
                                    </button>
                                    <button
                                        onClick={handleRejectOptional}
                                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all"
                                    >
                                        {V5_COOKIE_CONSENT.reject_label}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default CookieBanner;
