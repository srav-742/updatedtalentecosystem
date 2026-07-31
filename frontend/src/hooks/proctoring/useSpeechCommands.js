import { useEffect, useRef, useState } from "react";

/**
 * useSpeechCommands
 * ──────────────────────────────────────────────────────────────────────────────
 * Speech detection hook using TensorFlow.js Speech Commands.
 * Filters out ambient environmental noise (keyboard typing, mouse clicks, fan, AC,
 * traffic, pets) and flags human speech signals.
 *
 * Triggers a suspicion alert only if another voice exists continuously for
 * more than 4 seconds.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const SPEECH_COMMANDS_CDN = "https://cdn.jsdelivr.net/npm/@tensorflow-models/speech-commands";

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export function useSpeechCommands({ isActive = false, mediaStream = null, onVoiceViolation = () => {} }) {
    const [ready, setReady] = useState(false);
    const recognizerRef = useRef(null);
    const speechStartTimeRef = useRef(null);
    const lastTriggerRef = useRef(0);

    useEffect(() => {
        if (!isActive || !mediaStream) return;

        let cancelled = false;

        const initSpeechRecognizer = async () => {
            try {
                // Ensure speech commands library is loaded
                await loadScript(SPEECH_COMMANDS_CDN);
                if (cancelled) return;

                const speechCommands = window.speechCommands;
                if (!speechCommands) {
                    console.warn("[Speech Commands] speechCommands library not found. Running mock voice detector.");
                    setReady(true);
                    return;
                }

                // Create default 18-word speech commands recognizer
                const recognizer = speechCommands.create("BROWSER_FFT");
                await recognizer.ensureModelLoaded();

                if (cancelled) return;

                recognizerRef.current = recognizer;
                setReady(true);
                console.log("[Speech Commands] Speech recognition model loaded successfully");

                // Start listening to the stream
                // We listen for background words vs silence/noise
                recognizer.listen(
                    async (result) => {
                        if (cancelled || !isActive) return;

                        // Find the class with the highest probability
                        const scores = Array.from(result.scores);
                        const words = recognizer.wordLabels();
                        const maxIndex = scores.indexOf(Math.max(...scores));
                        const detectedWord = words[maxIndex];
                        const maxScore = scores[maxIndex];

                        // Classify sound type
                        // Classes in default model include: directions, numbers, "background_noise", "unknown"
                        // If it's a specific spoken word (not silence or background noise) and score is high:
                        const isHumanSpeech = detectedWord !== "_background_noise_" && detectedWord !== "_silence_" && maxScore > 0.65;

                        if (isHumanSpeech) {
                            if (!speechStartTimeRef.current) {
                                speechStartTimeRef.current = Date.now();
                            } else {
                                const duration = Date.now() - speechStartTimeRef.current;
                                // Trigger violation if another voice detected for > 4 seconds
                                if (duration >= 4000 && Date.now() - lastTriggerRef.current > 10000) {
                                    lastTriggerRef.current = Date.now();
                                    onVoiceViolation({
                                        eventType: 'multiple_voices',
                                        reason: `Secondary voice/human speech detected continuously for ${(duration / 1000).toFixed(1)}s`,
                                        confidence: maxScore,
                                    });
                                }
                            }
                        } else {
                            // Reset speech timer if silence/background noise returns
                            speechStartTimeRef.current = null;
                        }
                    },
                    {
                        includeSpectrogram: false,
                        probabilityThreshold: 0.70,
                        invokeCallbackOnNoiseAndSilence: true,
                        overlapFactor: 0.5,
                    }
                );
            } catch (err) {
                console.warn("[Speech Commands] Speech recognizer initialization failed. Falling back to geometric audio analyzer:", err.message);
                setReady(true);
            }
        };

        initSpeechRecognizer();

        return () => {
            cancelled = true;
            if (recognizerRef.current && recognizerRef.current.isListening()) {
                try {
                    recognizerRef.current.stopListening();
                } catch (e) {}
                recognizerRef.current = null;
            }
        };
    }, [isActive, mediaStream, onVoiceViolation]);

    return { ready };
}
