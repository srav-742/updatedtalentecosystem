import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useHandAnalyzer
 * ──────────────────────────────────────────────────────────────────────────────
 * MediaPipe Hands analyzer hook.
 * Detects 21 3D hand landmarks per hand, classifies hand positions (near ear,
 * near lap, leaving frame), and cross-references with object detection signals.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const HANDS_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915";

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

export function useHandAnalyzer({ isActive = false, videoElement = null }) {
    const [ready, setReady] = useState(false);
    const [handPositions, setHandPositions] = useState([]);

    const handsRef = useRef(null);

    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        const initHands = async () => {
            try {
                await loadScript(`${HANDS_CDN}/hands.js`);
                if (cancelled) return;

                const Hands = window.Hands;
                if (!Hands) return;

                const hands = new Hands({
                    locateFile: (file) => `${HANDS_CDN}/${file}`,
                });

                hands.setOptions({
                    maxNumHands: 2,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.7,
                    minTrackingConfidence: 0.7,
                });

                hands.onResults((results) => {
                    if (cancelled) return;

                    const multiHandLandmarks = results.multiHandLandmarks || [];
                    const positions = multiHandLandmarks.map((hand, idx) => {
                        const wrist = hand[0];
                        const indexTip = hand[8];

                        // Classify position in normalized coords
                        let position = 'normal';
                        if (wrist.y > 0.85) {
                            position = 'near_lap';
                        } else if (wrist.y < 0.4 && (wrist.x < 0.25 || wrist.x > 0.75)) {
                            position = 'near_ear';
                        } else if (wrist.x < 0.05 || wrist.x > 0.95 || wrist.y < 0.05) {
                            position = 'leaving_frame';
                        }

                        return {
                            handIndex: idx,
                            position,
                            wrist: { x: wrist.x * 640, y: wrist.y * 480 },
                            indexTip: { x: indexTip.x * 640, y: indexTip.y * 480 },
                        };
                    });

                    setHandPositions(positions);
                });

                await hands.initialize();
                if (!cancelled) {
                    handsRef.current = hands;
                    setReady(true);
                }
            } catch (err) {
                console.warn("[Hand Analyzer] MediaPipe Hands load failed:", err.message);
            }
        };

        initHands();

        return () => {
            cancelled = true;
        };
    }, [isActive]);

    const processFrame = useCallback(async () => {
        if (!ready || !handsRef.current || !videoElement || videoElement.readyState < 2) return;
        try {
            await handsRef.current.send({ image: videoElement });
        } catch (e) {
            // Frame processing error
        }
    }, [ready, videoElement]);

    return {
        ready,
        handPositions,
        processFrame,
    };
}
