import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useAIProctoring
 * ──────────────────────────────────────────────────────────────────────────────
 * Core AI proctoring hook that runs lightweight neural networks in the
 * browser via WebGL / WASM to detect:
 *
 *   1. Head rotation  (MediaPipe FaceMesh — nose-to-cheek ratio)
 *   2. Gaze sweeps    (MediaPipe FaceMesh — iris horizontal ratio)
 *   3. Presence        (FaceMesh face count: 0 or >1)
 *   4. Phone / object  (YOLOv8 ONNX → COCO-SSD fallback)
 *
 * Models are loaded dynamically from CDNs to avoid bundler bloat.
 *
 * @param {Object}   options
 * @param {HTMLVideoElement|null} options.videoElement   - The <video> to process
 * @param {boolean}  options.isActive                    - Whether to run detection
 * @param {boolean}  options.isAnswering                 - Candidate is actively recording
 * @param {Function} options.onViolation                 - Callback (type, detail, meta)
 * @param {Object}   options.thresholds                  - Configurable thresholds
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ─── Default thresholds ─────────────────────────────────────────────────────
const DEFAULT_THRESHOLDS = {
    headTurnRatioHigh: 2.0,       // Nose-to-cheek ratio > this → looking far right
    headTurnRatioLow: 0.5,        // Nose-to-cheek ratio < this → looking far left
    gazeSwipeCount: 3,            // Consecutive left-right sweeps to trigger
    gazeSwipeWindowMs: 4000,      // Sliding window for sweep detection
    noPersonTimeoutMs: 2000,      // How long 0 faces before flagging
    phoneConfidenceThreshold: 0.5,
    detectionIntervalMs: 500,     // How often to run FaceMesh frame analysis
    objectDetectionIntervalMs: 2000, // How often to run object detection
    onnxLoadTimeoutMs: 8000,      // Max time to wait for ONNX model before fallback
};

// ─── CDN URLs ───────────────────────────────────────────────────────────────
const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619";
const CAMERA_UTILS_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074";

// ─── Helpers ────────────────────────────────────────────────────────────────
function euclidean(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export function useAIProctoring({
    videoElement = null,
    isActive = false,
    isAnswering = false,
    onViolation = () => {},
    thresholds: userThresholds = {},
}) {
    const T = { ...DEFAULT_THRESHOLDS, ...userThresholds };

    // ── State ───────────────────────────────────────────────────────────────
    const [faceMeshReady, setFaceMeshReady] = useState(false);
    const [objectModelReady, setObjectModelReady] = useState(false);
    const [objectModelType, setObjectModelType] = useState(null); // 'onnx' | 'coco-ssd'
    const [faceCount, setFaceCount] = useState(1);
    const [headTurnRatio, setHeadTurnRatio] = useState(1.0);
    const [gazeRatio, setGazeRatio] = useState(0.5);
    const [landmarks, setLandmarks] = useState(null);
    const [detections, setDetections] = useState([]);

    // ── Refs ────────────────────────────────────────────────────────────────
    const faceMeshRef = useRef(null);
    const cocoModelRef = useRef(null);
    const onnxSessionRef = useRef(null);
    const canvasRef = useRef(null);
    const rafIdRef = useRef(null);
    const objectRafRef = useRef(null);
    const isActiveRef = useRef(isActive);
    const isAnsweringRef = useRef(isAnswering);
    const videoRef = useRef(videoElement);
    const onViolationRef = useRef(onViolation);

    // Cooldown refs to avoid spamming violations
    const lastViolationTimeRef = useRef({});
    const VIOLATION_COOLDOWN_MS = 5000;

    // No-person timeout
    const noPersonTimerRef = useRef(null);

    // Gaze sweep tracking
    const gazeHistoryRef = useRef([]); // [{ratio, ts}]

    // Keep refs current
    useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
    useEffect(() => { isAnsweringRef.current = isAnswering; }, [isAnswering]);
    useEffect(() => { videoRef.current = videoElement; }, [videoElement]);
    useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);

    // ── Violation emitter with cooldown ──────────────────────────────────────
    const emitViolation = useCallback((type, detail, meta = {}) => {
        const now = Date.now();
        const lastTime = lastViolationTimeRef.current[type] || 0;
        if (now - lastTime < VIOLATION_COOLDOWN_MS) return;
        lastViolationTimeRef.current[type] = now;

        onViolationRef.current(type, detail, {
            ...meta,
            timestamp: new Date().toISOString(),
            isAnswering: isAnsweringRef.current,
        });
    }, []);

    // ── Initialize MediaPipe FaceMesh ───────────────────────────────────────
    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        const initFaceMesh = async () => {
            try {
                console.log("[AI-Proctoring] Loading MediaPipe FaceMesh script...");
                await loadScript(`${MEDIAPIPE_CDN}/face_mesh.js`);

                if (cancelled) return;

                const FaceMesh = window.FaceMesh;
                if (!FaceMesh) {
                    console.warn("[AI-Proctoring] FaceMesh class not found on window after script load");
                    return;
                }

                console.log("[AI-Proctoring] Initializing FaceMesh engine...");
                const mesh = new FaceMesh({
                    locateFile: (file) => `${MEDIAPIPE_CDN}/${file}`,
                });

                mesh.setOptions({
                    maxNumFaces: 3,
                    refineLandmarks: true,  // Enables 10-point iris mesh
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                mesh.onResults((results) => {
                    if (!isActiveRef.current) return;
                    processFaceMeshResults(results);
                });

                await mesh.initialize();

                if (cancelled) return;

                faceMeshRef.current = mesh;
                setFaceMeshReady(true);
                console.log("[AI-Proctoring] MediaPipe FaceMesh initialized successfully");
            } catch (err) {
                console.error("[AI-Proctoring] FaceMesh initialization failed:", err);
            }
        };

        initFaceMesh();

        return () => {
            cancelled = true;
        };
    }, [isActive]);

    // ── Initialize Object Detection (ONNX → COCO-SSD fallback) ─────────────
    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        const initObjectDetection = async () => {
            try {
                console.log("[AI-Proctoring] Loading @tensorflow/tfjs backend registry...");
                await import("@tensorflow/tfjs");
                
                if (cancelled) return;

                console.log("[AI-Proctoring] Dynamically importing @tensorflow-models/coco-ssd...");
                const cocoSsdModule = await import("@tensorflow-models/coco-ssd");
                const cocoSsd = cocoSsdModule.default || cocoSsdModule;

                if (!cocoSsd || typeof cocoSsd.load !== "function") {
                    console.warn("[AI-Proctoring] COCO-SSD load function not found on imported module");
                    return;
                }

                console.log("[AI-Proctoring] Loading COCO-SSD neural network...");
                const model = await cocoSsd.load();

                if (cancelled) return;

                cocoModelRef.current = model;
                setObjectModelReady(true);
                setObjectModelType("coco-ssd");
                console.log("[AI-Proctoring] COCO-SSD model loaded successfully");
            } catch (err) {
                console.warn("[AI-Proctoring] COCO-SSD load failed:", err);
            }
        };

        initObjectDetection();

        return () => {
            cancelled = true;
        };
    }, [isActive]);

    // ── Process FaceMesh results ────────────────────────────────────────────
    const processFaceMeshResults = useCallback((results) => {
        const faces = results.multiFaceLandmarks || [];
        const count = faces.length;
        setFaceCount(count);

        // ── Presence detection ──────────────────────────────────────────────
        if (count === 0) {
            if (!noPersonTimerRef.current) {
                noPersonTimerRef.current = setTimeout(() => {
                    if (isActiveRef.current) {
                        emitViolation(
                            "NO_PEOPLE",
                            "No face detected in camera frame for over 2 seconds.",
                            { faceCount: 0 }
                        );
                    }
                    noPersonTimerRef.current = null;
                }, T.noPersonTimeoutMs);
            }
            setLandmarks(null);
            return;
        }

        // Clear no-person timer if face reappears
        if (noPersonTimerRef.current) {
            clearTimeout(noPersonTimerRef.current);
            noPersonTimerRef.current = null;
        }

        if (count > 1) {
            emitViolation(
                "MULTIPLE_PEOPLE",
                `${count} faces detected in camera frame.`,
                { faceCount: count }
            );
        }

        // Process the primary face (index 0) for gaze and head pose
        const face = faces[0];
        setLandmarks(face);

        // ── Head turn detection ─────────────────────────────────────────────
        // Landmark indices: Nose tip = 1, Left cheek = 234, Right cheek = 454
        const nose = face[1];
        const leftCheek = face[234];
        const rightCheek = face[454];

        if (nose && leftCheek && rightCheek) {
            const distLeft = euclidean(nose, leftCheek);
            const distRight = euclidean(nose, rightCheek);
            const ratio = distRight > 0.001 ? distLeft / distRight : 1;
            setHeadTurnRatio(ratio);

            if (ratio > T.headTurnRatioHigh || ratio < T.headTurnRatioLow) {
                const direction = ratio > T.headTurnRatioHigh ? "right" : "left";
                const violationType = isAnsweringRef.current
                    ? "HEAD_TURNED_WHILE_ANSWERING"
                    : "HEAD_TURNED";
                emitViolation(
                    violationType,
                    `Head turned excessively to the ${direction} (ratio: ${ratio.toFixed(2)}).`,
                    { headTurnRatio: ratio, direction }
                );
            }
        }

        // ── Gaze (iris) tracking ────────────────────────────────────────────
        // With refineLandmarks, iris landmarks are at indices:
        //   Left eye iris center: 468
        //   Right eye iris center: 473
        //   Left eye corners: 33 (inner), 133 (outer)
        //   Right eye corners: 362 (inner), 263 (outer)
        if (face.length > 473) {
            const leftIris = face[468];
            const leftInner = face[33];
            const leftOuter = face[133];
            const rightIris = face[473];
            const rightInner = face[362];
            const rightOuter = face[263];

            if (leftIris && leftInner && leftOuter && rightIris && rightInner && rightOuter) {
                // Compute horizontal ratio for each eye (0 = far left, 1 = far right)
                const leftEyeWidth = euclidean(leftInner, leftOuter);
                const leftIrisOffset = euclidean(leftIris, leftOuter);
                const leftRatio = leftEyeWidth > 0.001 ? leftIrisOffset / leftEyeWidth : 0.5;

                const rightEyeWidth = euclidean(rightInner, rightOuter);
                const rightIrisOffset = euclidean(rightIris, rightOuter);
                const rightRatio = rightEyeWidth > 0.001 ? rightIrisOffset / rightEyeWidth : 0.5;

                const avgGaze = (leftRatio + rightRatio) / 2;
                setGazeRatio(avgGaze);

                // Track gaze direction changes over time for sweep detection
                const now = Date.now();
                const history = gazeHistoryRef.current;
                history.push({ ratio: avgGaze, ts: now });

                // Remove entries outside the sliding window
                while (history.length > 0 && now - history[0].ts > T.gazeSwipeWindowMs) {
                    history.shift();
                }

                // Count direction changes (left→right or right→left)
                if (history.length >= 3) {
                    let directionChanges = 0;
                    for (let i = 2; i < history.length; i++) {
                        const prev = history[i - 1].ratio - history[i - 2].ratio;
                        const curr = history[i].ratio - history[i - 1].ratio;
                        // A sign flip indicates a direction reversal
                        if ((prev > 0.02 && curr < -0.02) || (prev < -0.02 && curr > 0.02)) {
                            directionChanges++;
                        }
                    }

                    if (directionChanges >= T.gazeSwipeCount) {
                        // Also check head is relatively still
                        const headIsStill =
                            headTurnRatio >= T.headTurnRatioLow &&
                            headTurnRatio <= T.headTurnRatioHigh;

                        if (headIsStill) {
                            const violationType = isAnsweringRef.current
                                ? "EYE_LOOKING_AWAY_WHILE_ANSWERING"
                                : "EYE_LOOKING_AWAY";
                            emitViolation(
                                violationType,
                                "Rhythmic horizontal eye movement detected (possible reading pattern).",
                                { directionChanges, gazeRatio: avgGaze }
                            );
                            // Clear history after firing to avoid repeated triggers
                            gazeHistoryRef.current = [];
                        }
                    }
                }
            }
        }
    }, [T, emitViolation, headTurnRatio]);

    // ── FaceMesh frame loop ─────────────────────────────────────────────────
    useEffect(() => {
        if (!isActive || !faceMeshReady || !videoElement) return;

        let lastFrameTime = 0;

        const tick = async (timestamp) => {
            if (!isActiveRef.current) return;

            if (timestamp - lastFrameTime >= T.detectionIntervalMs) {
                lastFrameTime = timestamp;

                const video = videoRef.current;
                if (video && video.readyState >= 2 && faceMeshRef.current) {
                    try {
                        await faceMeshRef.current.send({ image: video });
                    } catch (err) {
                        // FaceMesh may fail on certain frames, continue
                    }
                }
            }

            rafIdRef.current = requestAnimationFrame(tick);
        };

        rafIdRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [isActive, faceMeshReady, videoElement, T.detectionIntervalMs]);

    // ── Object detection loop (COCO-SSD) ────────────────────────────────────
    useEffect(() => {
        if (!isActive || !objectModelReady || !videoElement) return;

        const intervalId = setInterval(async () => {
            if (!isActiveRef.current) return;

            const video = videoRef.current;
            if (!video || video.readyState < 2) return;

            try {
                if (cocoModelRef.current) {
                    const predictions = await cocoModelRef.current.detect(video);
                    setDetections(predictions || []);

                    for (const pred of predictions) {
                        if (pred.class === "cell phone" && pred.score >= T.phoneConfidenceThreshold) {
                            emitViolation(
                                "PHONE_DETECTED",
                                `Cell phone detected in camera frame (confidence: ${(pred.score * 100).toFixed(1)}%).`,
                                { confidence: pred.score, bbox: pred.bbox }
                            );
                        }
                    }
                }
            } catch (err) {
                // Object detection frame error, continue
            }
        }, T.objectDetectionIntervalMs);

        return () => clearInterval(intervalId);
    }, [isActive, objectModelReady, videoElement, T, emitViolation]);

    // ── Cleanup on unmount ──────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            if (noPersonTimerRef.current) clearTimeout(noPersonTimerRef.current);
            faceMeshRef.current = null;
            cocoModelRef.current = null;
            onnxSessionRef.current = null;
        };
    }, []);

    return {
        faceMeshReady,
        objectModelReady,
        objectModelType,
        faceCount,
        headTurnRatio,
        gazeRatio,
        landmarks,
        detections,
    };
}
