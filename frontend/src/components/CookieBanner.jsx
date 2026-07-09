import { useState, useEffect } from 'react';
import cookieManager from '../utils/cookieManager';

const CookieBanner = () => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Check if consent already exists
        const consent = cookieManager.getConsent();
        if (!consent) {
            // Small delay for better UX
            const timer = setTimeout(() => setShow(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        cookieManager.setConsent({ accepted: true, timestamp: new Date().toISOString() });
        setShow(false);
    };

    const handleDecline = () => {
        // Essential cookies only
        cookieManager.setConsent({ accepted: false, type: 'essential', timestamp: new Date().toISOString() });
        setShow(false);
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 left-6 right-6 z-[9999] md:max-w-xl md:left-auto"
                >
                    <div className="bg-[#121620]/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl shadow-black/50">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                <Cookie className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-white">We Value Your Privacy</h4>
                                    <button 
                                        onClick={() => setShow(false)}
                                        className="p-1 rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                    We use cookies to enhance your experience, analyze site traffic, and deliver personalized job matches. By clicking "Accept All", you agree to our use of cookies.
                                    <Link to="/cookies" className="text-blue-400 hover:underline ml-1 inline-flex items-center gap-1">
                                        Learn more <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleAccept}
                                        className="flex-1 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all"
                                    >
                                        Accept All
                                    </button>
                                    <button
                                        onClick={handleDecline}
                                        className="flex-1 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-bold transition-all"
                                    >
                                        Essential Only
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CookieBanner;
