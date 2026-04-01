import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Shield, Eye, MousePointerClick } from 'lucide-react';
import useTabLock from '../hooks/useTabLock';

const TabLockGuard = ({
    maxWarnings = 3,
    onMaxWarningsExceeded,
    isActive = false,
    children
}) => {
    const {
        warnings,
        showWarning,
        lastViolationType,
        isTerminated,
        dismissWarning
    } = useTabLock({
        maxWarnings,
        onMaxWarningsExceeded,
        isActive
    });

    if (!isActive) {
        return children;
    }

    const getViolationMessage = (type) => {
        switch (type) {
            case 'tab_switch':
                return 'Tab switching detected!';
            case 'window_blur':
                return 'Window focus lost!';
            case 'keyboard_new_tab':
            case 'keyboard_new_window':
                return 'Opening new tabs/windows is not allowed!';
            case 'keyboard_address_bar':
                return 'Navigation is disabled during assessment!';
            case 'keyboard_close_tab':
            case 'keyboard_close_window':
                return 'Closing the assessment is not allowed!';
            case 'keyboard_screenshot':
                return 'Screenshots are not permitted!';
            case 'keyboard_devtools':
                return 'Developer tools access is restricted!';
            case 'context_menu':
                return 'Right-click is disabled during assessment!';
            default:
                return 'Prohibited action detected!';
        }
    };

    const getViolationIcon = (type) => {
        if (type?.includes('keyboard')) {
            return <MousePointerClick className="w-8 h-8" />;
        }
        if (type === 'context_menu') {
            return <MousePointerClick className="w-8 h-8" />;
        }
        return <Eye className="w-8 h-8" />;
    };

    return (
        <>
            {children}

            <AnimatePresence>
                {/* Warning Modal */}
                {showWarning && !isTerminated && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={dismissWarning}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-red-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[28px] mx-auto flex items-center justify-center mb-6 shadow-sm border border-red-200">
                                <AlertTriangle size={40} />
                            </div>

                            <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">
                                Warning!
                            </h2>

                            <p className="text-gray-600 mb-6 text-center leading-relaxed">
                                {getViolationMessage(lastViolationType)}
                            </p>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-amber-900">
                                        Violations: {warnings} / {maxWarnings}
                                    </span>
                                    <div className="flex gap-1">
                                        {Array.from({ length: maxWarnings }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-3 h-3 rounded-full ${i < warnings
                                                        ? 'bg-red-500'
                                                        : 'bg-amber-200'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 text-center mb-6">
                                {maxWarnings - warnings} more violation(s) will terminate your assessment.
                            </p>

                            <button
                                onClick={dismissWarning}
                                className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg"
                            >
                                I Understand - Continue Assessment
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {/* Terminated Screen */}
                {isTerminated && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white rounded-[32px] p-10 max-w-lg w-full shadow-2xl border border-red-100"
                        >
                            <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[32px] mx-auto flex items-center justify-center mb-6 shadow-sm border border-red-200">
                                <Shield size={48} />
                            </div>

                            <h2 className="text-3xl font-black text-gray-900 mb-4 text-center">
                                Assessment Terminated
                            </h2>

                            <p className="text-gray-600 mb-8 text-center leading-relaxed">
                                You have exceeded the maximum number of violations ({maxWarnings}).
                                Your assessment has been automatically submitted due to suspicious activity.
                            </p>

                            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
                                <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                                    <AlertTriangle size={18} />
                                    Violations Detected:
                                </h4>
                                <ul className="text-sm text-red-700 space-y-2">
                                    <li>• Excessive tab switching or window focus loss</li>
                                    <li>• Attempted use of keyboard shortcuts</li>
                                    <li>• Potential cheating behavior detected</li>
                                </ul>
                            </div>

                            <p className="text-xs text-gray-500 text-center mb-6">
                                This incident has been logged and will be reviewed.
                            </p>

                            <button
                                onClick={() => window.location.href = '/seeker'}
                                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
                            >
                                Return to Dashboard
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default TabLockGuard;
