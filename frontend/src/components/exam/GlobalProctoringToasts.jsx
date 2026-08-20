import React, { useState, useEffect } from 'react';
import { AlertTriangle, Camera, Eye, Smartphone, Users } from 'lucide-react';

/**
 * GlobalProctoringToasts
 * ──────────────────────────────────────────────────────────────────────────────
 * A drop-in global listener that intercepts proctoring violation requests 
 * and renders toast notifications. Requires ZERO modifications to existing
 * exam wrapper logic.
 * ──────────────────────────────────────────────────────────────────────────────
 */
export default function GlobalProctoringToasts() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const [resource, config] = args;
            const url = typeof resource === 'string' ? resource : resource?.url;

            if (url && (url.includes('/proctoring-enhanced/violation') || url.includes('/proctoring-pipeline/event') || url.includes('/proctoring/violation'))) {
                try {
                    const body = config?.body ? JSON.parse(config.body) : {};
                    const type = body.type || body.eventType || "VIOLATION_DETECTED";
                    const detail = body.detail || body.reason || "Integrity policy flagged.";
                    
                    const newToast = { id: Date.now() + Math.random(), type, detail };
                    
                    setToasts(prev => {
                        // Prevent duplicate toasts in short succession
                        if (prev.length > 0 && prev[prev.length - 1].type === type && (Date.now() - prev[prev.length - 1].id < 2000)) {
                            return prev;
                        }
                        return [...prev, newToast];
                    });

                    // Auto-remove toast after 5 seconds
                    setTimeout(() => {
                        setToasts(prev => prev.filter(t => t.id !== newToast.id));
                    }, 5000);
                } catch (e) {
                    console.warn("[GlobalProctoringToasts] Failed to parse intercepted violation payload", e);
                }
            }
            return originalFetch(...args);
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-6 z-[99999] flex flex-col gap-3 max-w-sm pointer-events-none">
            {toasts.map((toast) => {
                const getToastIcon = () => {
                    const t = toast.type?.toUpperCase() || "";
                    if (t.includes("PHONE") || t.includes("OBJECT")) return <Smartphone className="text-red-500 shrink-0" size={18} />;
                    if (t.includes("PEOPLE") || t.includes("FACE")) return <Users className="text-orange-500 shrink-0" size={18} />;
                    if (t.includes("EYE") || t.includes("LOOKING")) return <Eye className="text-amber-500 shrink-0" size={18} />;
                    if (t.includes("HEAD") || t.includes("TURN")) return <Camera className="text-amber-500 shrink-0" size={18} />;
                    return <AlertTriangle className="text-amber-500 shrink-0" size={18} />;
                };

                return (
                    <div
                        key={toast.id}
                        className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-amber-200/40 bg-white/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md transition-all duration-300 animate-in slide-in-from-left-5 fade-in"
                        style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
                    >
                        {getToastIcon()}
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                {toast.type.replace(/_/g, " ")}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold leading-relaxed text-gray-700">
                                {toast.detail}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
