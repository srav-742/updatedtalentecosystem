/**
 * NoiseWarningOverlay.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Floating overlay component that reacts to useNoiseDetector state.
 * Shows warning banner, mute button, and muted-indicator during
 * AI Interview and Skill Assessment sessions.
 *
 * NEW FILE - does NOT modify any existing files.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, MicOff, Mic, X, Volume2 } from 'lucide-react';

const AUTO_DISMISS_MS = 7000;

export default function NoiseWarningOverlay({
    showWarning,
    warningCount,
    isMuted,
    mute,
    unmute,
    dismissWarning,
    maxWarnings = 3,
}) {
    const autoDismissRef = useRef(null);

    // Auto-dismiss the warning banner (not the muted indicator) after 7 seconds
    useEffect(() => {
        if (showWarning && !isMuted) {
            if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
            autoDismissRef.current = setTimeout(() => {
                dismissWarning();
            }, AUTO_DISMISS_MS);
        }
        return () => {
            if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
        };
    }, [showWarning, isMuted, dismissWarning]);

    const isVisible = showWarning;
    const isRepeated = warningCount >= 2;
    const isMax = warningCount >= maxWarnings;

    // Colour palette based on severity
    const palette = isMuted
        ? {
              bg: 'rgba(30, 58, 138, 0.92)',      // blue-900
              border: 'rgba(147, 197, 253, 0.35)', // blue-300
              accent: '#93c5fd',                   // blue-300
              text: '#eff6ff',                     // blue-50
              sub: '#bfdbfe',                      // blue-200
          }
        : isMax
        ? {
              bg: 'rgba(127, 29, 29, 0.94)',       // red-900
              border: 'rgba(252, 165, 165, 0.35)', // red-300
              accent: '#fca5a5',                   // red-300
              text: '#fff1f2',                     // rose-50
              sub: '#fecaca',                      // red-200
          }
        : isRepeated
        ? {
              bg: 'rgba(120, 53, 15, 0.93)',       // amber-900
              border: 'rgba(253, 186, 116, 0.35)', // orange-300
              accent: '#fdba74',                   // orange-300
              text: '#fff7ed',                     // orange-50
              sub: '#fed7aa',                      // orange-200
          }
        : {
              bg: 'rgba(20, 83, 45, 0.92)',        // green-900
              border: 'rgba(134, 239, 172, 0.35)', // green-300
              accent: '#86efac',                   // green-300
              text: '#f0fdf4',                     // green-50
              sub: '#bbf7d0',                      // green-200
          };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    key="noise-overlay"
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        zIndex: 9999,
                        maxWidth: '340px',
                        width: 'calc(100vw - 48px)',
                        background: palette.bg,
                        border: `1px solid ${palette.border}`,
                        borderRadius: '20px',
                        padding: '18px 20px',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        color: palette.text,
                        fontFamily: 'inherit',
                    }}
                    role="alert"
                    aria-live="polite"
                >
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {/* Icon */}
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: `${palette.accent}22`,
                            border: `1px solid ${palette.accent}44`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            {isMuted
                                ? <MicOff size={17} color={palette.accent} />
                                : <Volume2 size={17} color={palette.accent} />
                            }
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                lineHeight: 1.3,
                                color: palette.text,
                                margin: 0,
                            }}>
                                {isMuted
                                    ? 'Microphone muted'
                                    : isMax
                                    ? `Noise detected (${warningCount}/${maxWarnings})`
                                    : isRepeated
                                    ? `Background noise detected again (${warningCount}/${maxWarnings})`
                                    : 'Background noise detected'
                                }
                            </p>
                            <p style={{
                                fontSize: '11.5px',
                                color: palette.sub,
                                margin: '4px 0 0',
                                lineHeight: 1.5,
                            }}>
                                {isMuted
                                    ? 'Remember to unmute before you start answering.'
                                    : isMax
                                    ? 'Please mute your microphone to avoid disruptions.'
                                    : 'Ensure a clean, quiet environment for best results.'
                                }
                            </p>
                        </div>

                        {/* Dismiss X (only when not muted) */}
                        {!isMuted && (
                            <button
                                onClick={dismissWarning}
                                aria-label="Dismiss noise warning"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: palette.sub,
                                    padding: '2px',
                                    flexShrink: 0,
                                    lineHeight: 0,
                                    opacity: 0.7,
                                    transition: 'opacity 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '14px',
                    }}>
                        {isMuted ? (
                            /* Unmute button */
                            <button
                                onClick={unmute}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '9px 14px',
                                    borderRadius: '10px',
                                    background: palette.accent,
                                    color: '#1e3a5f',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'opacity 0.15s, transform 0.12s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(0.98)'; }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                <Mic size={14} />
                                Unmute Microphone
                            </button>
                        ) : (
                            <>
                                {/* Mute button */}
                                <button
                                    onClick={mute}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '9px 14px',
                                        borderRadius: '10px',
                                        background: palette.accent,
                                        color: '#1a1a1a',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'opacity 0.15s, transform 0.12s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(0.98)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    <MicOff size={14} />
                                    Mute My Mic
                                </button>

                                {/* Dismiss button */}
                                <button
                                    onClick={dismissWarning}
                                    style={{
                                        padding: '9px 14px',
                                        borderRadius: '10px',
                                        background: 'transparent',
                                        color: palette.sub,
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: `1px solid ${palette.border}`,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'opacity 0.15s, transform 0.12s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(0.98)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    Dismiss
                                </button>
                            </>
                        )}
                    </div>

                    {/* Progress dots for repeated warnings */}
                    {warningCount > 0 && !isMuted && (
                        <div style={{ display: 'flex', gap: '5px', marginTop: '12px', justifyContent: 'center' }}>
                            {Array.from({ length: maxWarnings }).map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: i < warningCount ? palette.accent : `${palette.accent}33`,
                                        transition: 'background 0.3s',
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Auto-dismiss progress bar (only when not muted) */}
                    {!isMuted && (
                        <motion.div
                            key={`progress-${warningCount}`}
                            initial={{ scaleX: 1 }}
                            animate={{ scaleX: 0 }}
                            transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
                            style={{
                                height: '2px',
                                background: `${palette.accent}60`,
                                borderRadius: '1px',
                                marginTop: '12px',
                                originX: 0,
                                transformOrigin: 'left center',
                            }}
                        />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
