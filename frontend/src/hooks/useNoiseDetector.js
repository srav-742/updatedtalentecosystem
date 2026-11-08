/**
 * useNoiseDetector.js
 * Real-time ambient noise detection hook for AI Interview & Skill Assessment.
 * Taps into an ALREADY-OPEN MediaStream - no new getUserMedia calls.
 * Uses Web Audio API AnalyserNode to measure RMS loudness every animation frame.
 * NEW FILE - does NOT modify any existing files.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useNoiseDetector(micStream, options = {}) {
    const {
        enabled = true,
        threshold = 42,
        sustainMs = 2000,
        warningCooldownMs = 8000,
        maxWarnings = 3,
    } = options;

    const [noiseLevel, setNoiseLevel] = useState('silent');
    const [isNoisy, setIsNoisy] = useState(false);
    const [warningCount, setWarningCount] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showWarning, setShowWarning] = useState(false);

    const analyserRef        = useRef(null);
    const audioContextRef    = useRef(null);
    const sourceRef          = useRef(null);
    const rafRef             = useRef(null);
    const sustainedSinceRef  = useRef(null);
    const lastWarnedAtRef    = useRef(0);
    const warningCountRef    = useRef(0);
    const isMutedRef         = useRef(false);

    const mute = useCallback(() => {
        if (!micStream) return;
        micStream.getAudioTracks().forEach(t => { t.enabled = false; });
        isMutedRef.current = true;
        setIsMuted(true);
        setShowWarning(true);
    }, [micStream]);

    const unmute = useCallback(() => {
        if (!micStream) return;
        micStream.getAudioTracks().forEach(t => { t.enabled = true; });
        isMutedRef.current = false;
        setIsMuted(false);
    }, [micStream]);

    const dismissWarning = useCallback(() => {
        setShowWarning(false);
    }, []);

    useEffect(() => {
        if (!enabled || !micStream) return;

        const audioTracks = micStream.getAudioTracks();
        if (!audioTracks.length) return;

        let cancelled = false;

        const setup = async () => {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                audioContextRef.current = ctx;

                if (ctx.state === 'suspended') {
                    await ctx.resume();
                }

                const source = ctx.createMediaStreamSource(micStream);
                sourceRef.current = source;

                const analyser = ctx.createAnalyser();
                analyser.fftSize = 512;
                analyser.smoothingTimeConstant = 0.6;
                analyserRef.current = analyser;

                source.connect(analyser);

                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                const tick = () => {
                    if (cancelled) return;
                    rafRef.current = requestAnimationFrame(tick);

                    analyser.getByteFrequencyData(dataArray);

                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        sum += dataArray[i] * dataArray[i];
                    }
                    const rms = Math.sqrt(sum / dataArray.length);

                    let level = 'silent';
                    if (rms > threshold * 1.8) level = 'very_loud';
                    else if (rms > threshold * 1.3) level = 'loud';
                    else if (rms > threshold) level = 'normal';
                    setNoiseLevel(level);

                    const isLoud = rms > threshold;
                    setIsNoisy(isLoud);

                    if (isLoud && !isMutedRef.current) {
                        if (sustainedSinceRef.current === null) {
                            sustainedSinceRef.current = Date.now();
                        } else {
                            const elapsed = Date.now() - sustainedSinceRef.current;
                            if (elapsed >= sustainMs) {
                                const timeSinceLastWarn = Date.now() - lastWarnedAtRef.current;
                                if (timeSinceLastWarn >= warningCooldownMs) {
                                    lastWarnedAtRef.current = Date.now();
                                    sustainedSinceRef.current = null;

                                    warningCountRef.current += 1;
                                    setWarningCount(warningCountRef.current);
                                    setShowWarning(true);
                                }
                            }
                        }
                    } else {
                        sustainedSinceRef.current = null;
                    }
                };

                rafRef.current = requestAnimationFrame(tick);
            } catch (err) {
                console.warn('[useNoiseDetector] AudioContext setup failed:', err);
            }
        };

        setup();

        return () => {
            cancelled = true;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            try { sourceRef.current?.disconnect(); } catch (_) {}
            try { analyserRef.current?.disconnect(); } catch (_) {}
            try { audioContextRef.current?.close(); } catch (_) {}
            sourceRef.current = null;
            analyserRef.current = null;
            audioContextRef.current = null;
            sustainedSinceRef.current = null;
        };
    }, [micStream, enabled, threshold, sustainMs, warningCooldownMs]);

    return {
        noiseLevel,
        isNoisy,
        warningCount,
        isMuted,
        mute,
        unmute,
        dismissWarning,
        showWarning,
        maxWarnings,
    };
}
