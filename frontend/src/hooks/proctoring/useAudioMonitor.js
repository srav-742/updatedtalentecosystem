import { useEffect, useRef, useState } from "react";

/**
 * useAudioMonitor
 * ──────────────────────────────────────────────────────────────────────────────
 * Web Audio API monitoring hook.
 * Analyzes audio frequency and decibel level to detect multiple voices,
 * sudden loud background noises, or continuous talking patterns.
 * ──────────────────────────────────────────────────────────────────────────────
 */

export function useAudioMonitor({ isActive = false, mediaStream = null }) {
    const [audioSignals, setAudioSignals] = useState({
        level: 0,
        multipleVoices: false,
        backgroundNoise: false,
    });

    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const rafIdRef = useRef(null);

    useEffect(() => {
        if (!isActive || !mediaStream) return;

        const audioTracks = mediaStream.getAudioTracks();
        if (audioTracks.length === 0) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(mediaStream);
            const analyser = audioCtx.createAnalyser();

            analyser.fftSize = 256;
            source.connect(analyser);

            audioCtxRef.current = audioCtx;
            analyserRef.current = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            let highVolumeFrameCount = 0;

            const analyze = () => {
                if (!analyserRef.current) return;

                analyserRef.current.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const avgLevel = sum / bufferLength;

                // Frequency distribution variance to estimate multiple sound sources/voices
                let variance = 0;
                for (let i = 0; i < bufferLength; i++) {
                    variance += Math.pow(dataArray[i] - avgLevel, 2);
                }
                variance = variance / bufferLength;

                const multipleVoices = avgLevel > 45 && variance > 600;
                const backgroundNoise = avgLevel > 70;

                if (avgLevel > 40) {
                    highVolumeFrameCount += 1;
                } else {
                    highVolumeFrameCount = Math.max(0, highVolumeFrameCount - 1);
                }

                setAudioSignals({
                    level: Math.round(avgLevel),
                    multipleVoices,
                    backgroundNoise,
                });

                rafIdRef.current = requestAnimationFrame(analyze);
            };

            rafIdRef.current = requestAnimationFrame(analyze);
        } catch (err) {
            console.warn("[Audio Monitor] Web Audio initialization failed:", err.message);
        }

        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, [isActive, mediaStream]);

    return { audioSignals };
}
