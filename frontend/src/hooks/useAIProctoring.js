import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

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
    phoneConfidenceThreshold: 0.45, // Lowered to 0.45 to detect mobile phones perfectly and reliably
    sideGazeRatioLow: 0.35,       // Gaze horizontal ratio < this → looking to the left
    sideGazeRatioHigh: 0.65,      // Gaze horizontal ratio > this → looking to the right
    detectionIntervalMs: 500,     // How often to run FaceMesh frame analysis
    objectDetectionIntervalMs: 1000, // Run check every 1 second
    onnxLoadTimeoutMs: 8000,      // Max time to wait for ONNX model before fallback
};

// ─── CDN URLs ───────────────────────────────────────────────────────────────
const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619";
const CAMERA_UTILS_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074";

const SUSPICIOUS_OBJECTS = {
    "cell phone": { type: "PHONE_DETECTED", label: "Cell phone", ranking: 6 },
    "remote": { type: "PHONE_DETECTED", label: "Remote control/device", ranking: 6 },
    "laptop": { type: "OBJECT_DETECTED", label: "Secondary laptop/computer", ranking: 6 },
    "book": { type: "OBJECT_DETECTED", label: "Book/reading material", ranking: 5 },
    "tv": { type: "OBJECT_DETECTED", label: "Television/monitor", ranking: 6 },
    "backpack": { type: "OBJECT_DETECTED", label: "Backpack/bag", ranking: 4 },
    "handbag": { type: "OBJECT_DETECTED", label: "Handbag/bag", ranking: 4 },
    "suitcase": { type: "OBJECT_DETECTED", label: "Suitcase", ranking: 4 },
    "keyboard": { type: "OBJECT_DETECTED", label: "External keyboard", ranking: 3 },
    "mouse": { type: "OBJECT_DETECTED", label: "External mouse", ranking: 3 }
};

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
    const T = useMemo(() => ({ ...DEFAULT_THRESHOLDS, ...userThresholds }), [userThresholds]);

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
    const processFaceMeshResultsRef = useRef(null);

    // Cooldown refs to avoid spamming violations
    const lastViolationTimeRef = useRef({});
    const VIOLATION_COOLDOWN_MS = 5000;

    // No-person timeout
    const noPersonTimerRef = useRef(null);

    // Gaze sweep tracking
    const gazeHistoryRef = useRef([]); // [{ratio, ts}]

    // Side gaze tracking (looking away/to the side continuously)
    const sideGazeStartRef = useRef(null);
    const sideGazeViolationEmittedRef = useRef(false);

    // Streaks for filtering false positive detections
    const multipleFacesStreakRef = useRef(0);
    const objectStreakRef = useRef({});

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
                    minDetectionConfidence: 0.75, // Increased from 0.5 to prevent background false positives
                    minTrackingConfidence: 0.75, // Increased from 0.5 to stabilize face tracking
                });

                mesh.onResults((results) => {
                    if (!isActiveRef.current) return;
                    processFaceMeshResultsRef.current?.(results);
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

    // ── Initialize Object Detection (COCO-SSD) ──────────────────────────────
    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        const initObjectDetection = async () => {
            try {
                console.log("[AI-Proctoring] Initializing TensorFlow backend...");
                await tf.ready();
                
                if (cancelled) return;

                console.log("[AI-Proctoring] Loading COCO-SSD neural network (mobilenet_v2)...");
                const model = await cocoSsd.load({ base: "mobilenet_v2" });

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
        
        // Filter out faces that are too small (e.g. background photos/reflections)
        const validFaces = faces.filter(face => {
            if (!face || face.length < 10) return false;
            let minX = 1, maxX = 0, minY = 1, maxY = 0;
            for (let i = 0; i < face.length; i++) {
                const pt = face[i];
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
            }
            const width = maxX - minX;
            const height = maxY - minY;
            return width > 0.15 && height > 0.15; // Must be at least 15% of frame width/height
        });

        const count = validFaces.length;
        setFaceCount(count);

        // ── Presence detection ──────────────────────────────────────────────
        if (count === 0) {
            multipleFacesStreakRef.current = 0;
            if (!noPersonTimerRef.current) {
                noPersonTimerRef.current = setTimeout(() => {
                    if (isActiveRef.current) {
                        emitViolation(
                            "NO_PEOPLE",
                            "No face detected in camera frame for over 2 seconds. (Ranking: 4)",
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
            multipleFacesStreakRef.current += 1;
            if (multipleFacesStreakRef.current >= 3) { // Require 3 consecutive frames (~1.5s) to trigger
                emitViolation(
                    "MULTIPLE_PEOPLE",
                    `${count} faces detected in camera frame. (Ranking: 7)`,
                    { faceCount: count }
                );
            }
        } else {
            multipleFacesStreakRef.current = 0;
        }

        // Process the primary face (index 0) for gaze and head pose
        const face = validFaces[0];
        setLandmarks(face);

        let isLookingSide = false;

        // Nose tip = 1, Left cheek = 234, Right cheek = 454
        const nose = face[1];
        const leftCheek = face[234];
        const rightCheek = face[454];

        if (nose && leftCheek && rightCheek) {
            const distLeft = euclidean(nose, leftCheek);
            const distRight = euclidean(nose, rightCheek);
            const ratio = distRight > 0.001 ? distLeft / distRight : 1;
            setHeadTurnRatio(ratio);

            if (ratio > T.headTurnRatioHigh || ratio < T.headTurnRatioLow) {
                isLookingSide = true;
                const direction = ratio > T.headTurnRatioHigh ? "right" : "left";
                const violationType = isAnsweringRef.current
                    ? "HEAD_TURNED_WHILE_ANSWERING"
                    : "HEAD_TURNED";
                emitViolation(
                    violationType,
                    `Head turned excessively to the ${direction}. (Ranking: 3)`,
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

                if (avgGaze < T.sideGazeRatioLow || avgGaze > T.sideGazeRatioHigh) {
                    isLookingSide = true;
                }

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
                                "Rhythmic horizontal eye movement detected (possible reading pattern). (Ranking: 4)",
                                { directionChanges, gazeRatio: avgGaze }
                            );
                            // Clear history after firing to avoid repeated triggers
                            gazeHistoryRef.current = [];
                        }
                    }
                }
            }
        }

        // ── Continuous Side-Looking Tracking (sees the side for 4+ seconds) ──
        if (isLookingSide) {
            if (!sideGazeStartRef.current) {
                sideGazeStartRef.current = Date.now();
            } else {
                const elapsed = Date.now() - sideGazeStartRef.current;
                if (elapsed >= 4000 && !sideGazeViolationEmittedRef.current) {
                    sideGazeViolationEmittedRef.current = true;
                    const violationType = isAnsweringRef.current
                        ? "EYE_LOOKING_AWAY_WHILE_ANSWERING"
                        : "EYE_LOOKING_AWAY";
                    emitViolation(
                        violationType,
                        `Candidate looked away/to the side for more than 4 seconds. (Ranking: 8)`,
                        { duration: elapsed / 1000, seesSide: true }
                    );
                }
            }
        } else {
            sideGazeStartRef.current = null;
            sideGazeViolationEmittedRef.current = false;
        }
    }, [T, emitViolation, headTurnRatio]);

    useEffect(() => {
        processFaceMeshResultsRef.current = processFaceMeshResults;
    }, [processFaceMeshResults]);

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
                    console.log("[AI-Proctoring] COCO-SSD predictions:", predictions);

                    const activeObjects = new Set();
                    for (const pred of predictions) {
                        const objConfig = SUSPICIOUS_OBJECTS[pred.class];
                        if (objConfig && pred.score >= T.phoneConfidenceThreshold) {
                            activeObjects.add(pred.class);
                            objectStreakRef.current[pred.class] = (objectStreakRef.current[pred.class] || 0) + 1;
                            if (objectStreakRef.current[pred.class] >= 1) { // Alert immediately on first detection to ensure real-time response
                                emitViolation(
                                    objConfig.type,
                                    `${objConfig.label} detected in camera frame. (Ranking: ${objConfig.ranking})`,
                                    { confidence: pred.score, bbox: pred.bbox, label: objConfig.label }
                                );
                            }
                        }
                    }

                    // Reset streak for objects not detected in this frame
                    for (const key of Object.keys(objectStreakRef.current)) {
                        if (!activeObjects.has(key)) {
                            objectStreakRef.current[key] = 0;
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
