import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { logDiag, recordError, recordInferenceTime, getOrCreateDiagnostics } from "../utils/proctoringDiagnostics";
import * as tf from '@tensorflow/tfjs';
import { useYOLODetector } from './proctoring/useYOLODetector';

/**
 * useAIProctoring
 * ──────────────────────────────────────────────────────────────────────────────
 * Core AI proctoring hook that runs lightweight neural networks in the
 * browser via WebGL / WASM to detect:
 *
 *   1. Head rotation  (MediaPipe FaceMesh — nose-to-cheek ratio)
 *   2. Gaze sweeps    (MediaPipe FaceMesh — iris horizontal ratio)
 *   3. Presence        (FaceMesh face count: 0 or >1)
 *   4. Phone / object  (COCO-SSD / YOLO fallback)
 *
 * Models are loaded dynamically from local storage or CDNs with resilient failovers.
 *
 * Repair notes (2026-09):
 *   - Added video readiness polling (readyState >= 2 AND videoWidth > 0)
 *   - Added debug logging gated by ?debug=true URL param
 *   - Added EAR-based blink filtering to prevent false gaze-away flags
 *   - Added hysteresis on head turn thresholds to prevent jitter
 *   - Added 3-frame moving average on gaze ratio for temporal smoothing
 *   - Added 5-second calibration baseline for per-candidate thresholds
 *   - Added null checks on iris landmarks (468, 473)
 *   - Head-compensated gaze: when head yaw exceeds threshold, combined
 *     look-away timer handles both — prevents double-counting
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ── Debug mode ───────────────────────────────────────────────────────────────
const IS_DEBUG = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get("debug") === "true";

function debugLog(category, ...args) {
    if (!IS_DEBUG) return;
    console.log(`[PROCTORING][${category}]`, ...args);
}

// ── Thresholds ───────────────────────────────────────────────────────────────
const DEFAULT_THRESHOLDS = {
    // Head turn detection (tuned so natural 15°-20° turns trigger immediately)
    headTurnRatioHigh: 1.14,       // Nose-to-cheek ratio > this → looking right
    headTurnRatioLow: 0.88,        // Nose-to-cheek ratio < this → looking left
    noseEyeOffsetHigh: 0.045,      // Nose-to-eye center normalized offset
    noseEyeOffsetLow: -0.045,
    // Hysteresis: return-to-normal thresholds
    headTurnReturnHigh: 1.08,      // Must drop below this to return to center from "right"
    headTurnReturnLow: 0.92,       // Must rise above this to return to center from "left"
    noseEyeOffsetReturnHigh: 0.025,
    noseEyeOffsetReturnLow: -0.025,
    // Vertical head pitch
    pitchDownRatio: 1.30,          // Forehead-to-nose vs nose-to-chin ratio > this → looking down
    pitchUpRatio: 0.76,            // Ratio < this → looking up
    pitchDownReturn: 1.20,
    pitchUpReturn: 0.84,
    // Gaze sweeps
    gazeSwipeCount: 3,             // Consecutive left-right sweeps to trigger
    gazeSwipeWindowMs: 4000,       // Sliding window for sweep detection
    // Presence
    noPersonTimeoutMs: 4000,       // 4.0 seconds no face before NO_PEOPLE (1.0-4.0s is HEAD_TURNED)
    // Object detection
    phoneConfidenceThreshold: 0.35,
    objectConfidenceThreshold: 0.35,
    phoneRequiredFrames: 1,        // Fast confirmation on phone detection
    objectRequiredFrames: 2,
    // Gaze thresholds (calibrated to physiological lateral eye movement in stationary face)
    sideGazeRatioLow: 0.44,       // Gaze horizontal ratio < this → looking left
    sideGazeRatioHigh: 0.56,      // Gaze horizontal ratio > this → looking right
    // Gaze hysteresis
    sideGazeReturnLow: 0.47,      // Must rise above this to return from "left gaze"
    sideGazeReturnHigh: 0.53,     // Must drop below this to return from "right gaze"
    // Vertical gaze
    vertGazeRatioLow: 0.30,       // Looking up with eyes
    vertGazeRatioHigh: 0.70,      // Looking down with eyes
    vertGazeReturnLow: 0.36,
    vertGazeReturnHigh: 0.64,
    // Timing
    detectionIntervalMs: 200,     // 5 frames per second for immediate 1.0s responsiveness
    objectDetectionIntervalMs: 1000,
    onnxLoadTimeoutMs: 8000,
    // EAR (Eye Aspect Ratio) for blink detection
    earBlinkThreshold: 0.16,      // EAR below this = eyes closed (blink)
    // Calibration
    calibrationDurationMs: 1000,  // 1.0 second baseline capture
    // Temporal smoothing
    gazeSmoothingWindow: 3,       // 3-frame moving average for gaze ratio
};

const MEDIAPIPE_CDN_URLS = [
    "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619",
    "https://unpkg.com/@mediapipe/face_mesh@0.4.1633559619",
];

const TFJS_CDN_URLS = [
    "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/tensorflow/4.20.0/tf.min.js",
    "https://unpkg.com/@tensorflow/tfjs@4.20.0/dist/tf.min.js",
];

const COCO_SSD_CDN_URLS = [
    "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js",
    "https://unpkg.com/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js",
];

// Strictly restricted to actual cheating objects: phones, cheat notes/books, and audio eavesdropping devices.
// Ordinary room items (monitors, laptops, keyboards, mice, TVs, cups, bottles) are excluded to prevent false positives.
const SUSPICIOUS_OBJECTS = {
    // ── COCO-80 Classes (CDN YOLO model + COCO-SSD fallback) ──
    "cell phone": { type: "PHONE_DETECTED", label: "Cell phone", ranking: 2 },
    "book": { type: "OBJECT_DETECTED", label: "Book/notes", ranking: 2 },

    // ── Open Images V7 Classes (local YOLO OIV7 model) ──
    "Mobile phone": { type: "PHONE_DETECTED", label: "Cell phone", ranking: 2 },
    "Telephone": { type: "PHONE_DETECTED", label: "Cell phone", ranking: 2 },
    "Corded phone": { type: "PHONE_DETECTED", label: "Phone detected", ranking: 2 },
    "Ipod": { type: "PHONE_DETECTED", label: "Mobile device", ranking: 2 },
    "Tablet computer": { type: "OBJECT_DETECTED", label: "Tablet device", ranking: 2 },
    "Tablet": { type: "OBJECT_DETECTED", label: "Tablet device", ranking: 2 },
    "Book": { type: "OBJECT_DETECTED", label: "Book/notes", ranking: 2 },
    "Ring binder": { type: "OBJECT_DETECTED", label: "Binder/notebook", ranking: 2 },
    "Headphones": { type: "OBJECT_DETECTED", label: "Earphones/Headphones", ranking: 2 },
    "headphones": { type: "OBJECT_DETECTED", label: "Earphones/Headphones", ranking: 2 },
};

// Case-insensitive lookup for detected object classes
function getSuspiciousObjectConfig(className) {
    if (!className) return null;
    const direct = SUSPICIOUS_OBJECTS[className];
    if (direct) return direct;
    const lower = className.toLowerCase().trim();
    for (const [k, v] of Object.entries(SUSPICIOUS_OBJECTS)) {
        if (k.toLowerCase().trim() === lower) {
            return v;
        }
    }
    return null;
}

function euclidean(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate Eye Aspect Ratio (EAR) for blink detection.
 * Uses 6 eye landmarks in standard order: [outer, top1, top2, inner, bottom1, bottom2]
 */
function calculateEAR(eyeLandmarks) {
    if (!eyeLandmarks || eyeLandmarks.length < 6) return 1.0; // default open
    const v1 = euclidean(eyeLandmarks[1], eyeLandmarks[5]);
    const v2 = euclidean(eyeLandmarks[2], eyeLandmarks[4]);
    const h = euclidean(eyeLandmarks[0], eyeLandmarks[3]);
    if (h < 0.001) return 1.0;
    return (v1 + v2) / (2.0 * h);
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

async function loadScriptWithFailover(urls) {
    let lastErr = null;
    for (const url of urls) {
        try {
            await loadScript(url);
            return true;
        } catch (e) {
            lastErr = e;
            console.warn(`[AI-Proctoring] CDN script load failed from ${url}:`, e.message);
        }
    }
    throw lastErr || new Error("All script CDN sources failed");
}

let cachedCocoModel = null;
let tfInitPromise = null;

const initTfAndModel = async (modelUrl) => {
    if (cachedCocoModel) return cachedCocoModel;

    if (tfInitPromise) {
        return tfInitPromise;
    }

    tfInitPromise = (async () => {
        const startTime = Date.now();
        logDiag("AI Proctoring", "Initializing TFJS & COCO-SSD on main thread...");

        const diag = getOrCreateDiagnostics();

        logDiag("AI Proctoring", "Setting up WebGL backend...");
        try {
            await tf.setBackend("webgl");
            await tf.ready();
            if (diag) {
                diag.tfBackend = "webgl";
                diag.tfReady = true;
            }
            logDiag("AI Proctoring", "WebGL backend initialized successfully.");
        } catch (webglErr) {
            logDiag("AI Proctoring", `WebGL failed (${webglErr.message}), falling back to CPU backend...`);
            try {
                await tf.setBackend("cpu");
                await tf.ready();
                if (diag) {
                    diag.tfBackend = "cpu";
                    diag.tfReady = true;
                }
                logDiag("AI Proctoring", "CPU backend initialized successfully.");
            } catch (cpuErr) {
                recordError("tf-init", cpuErr);
                throw cpuErr;
            }
        }

        try {
            let model;
            if (modelUrl) {
                try {
                    logDiag("AI Proctoring", `Loading COCO-SSD model from ${modelUrl}`);
                    model = await cocoSsd.load({ modelUrl });
                } catch (localLoadErr) {
                    logDiag("AI Proctoring", `Local model load failed (${localLoadErr.message}), falling back to default CDN model...`);
                    model = await cocoSsd.load();
                }
            } else {
                model = await cocoSsd.load();
            }

            try {
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = 1;
                tempCanvas.height = 1;
                await model.detect(tempCanvas);
                logDiag("AI Proctoring", "Model warm-up inference successful.");
            } catch (warmupErr) {
                logDiag("AI Proctoring", "WebGL warm-up failed, forcing CPU fallback...");
                await tf.setBackend("cpu");
                await tf.ready();
                if (diag) diag.tfBackend = "cpu";
            }

            cachedCocoModel = model;
            if (diag) diag.modelLoaded = true;
            logDiag("AI Proctoring", `COCO-SSD loaded successfully in ${Date.now() - startTime}ms.`);
            return model;
        } catch (modelLoadErr) {
            recordError("model-load", modelLoadErr);
            throw modelLoadErr;
        }
    })().catch((err) => {
        tfInitPromise = null;
        throw err;
    });

    return tfInitPromise;
};

export function useAIProctoring({
    videoElement = null,
    isActive = false,
    isAnswering = false,
    onViolation = () => {},
    thresholds: userThresholds = {},
}) {
    const T = useMemo(() => ({ ...DEFAULT_THRESHOLDS, ...userThresholds }), [userThresholds]);

    const [faceMeshReady, setFaceMeshReady] = useState(false);
    const [objectModelReady, setObjectModelReady] = useState(false);
    const [objectModelType, setObjectModelType] = useState(null); // 'onnx' | 'coco-ssd'
    const [faceCount, setFaceCount] = useState(1);
    const [headTurnRatio, setHeadTurnRatio] = useState(1.0);
    const [gazeRatio, setGazeRatio] = useState(0.5);
    const [landmarks, setLandmarks] = useState(null);
    const [detections, setDetections] = useState([]);

    const faceMeshRef = useRef(null);
    const detectionCanvasRef = useRef(null);

    const { modelReady: yoloModelReady, engineType, detectFrame } = useYOLODetector({
        isActive,
        videoElement,
    });

    useEffect(() => {
        setObjectModelReady(yoloModelReady);
        setObjectModelType(engineType);
    }, [yoloModelReady, engineType]);

    const rafIdRef = useRef(null);
    const isActiveRef = useRef(isActive);
    const isAnsweringRef = useRef(isAnswering);
    const videoRef = useRef(videoElement);
    const onViolationRef = useRef(onViolation);
    const processFaceMeshResultsRef = useRef(null);

    const lastViolationTimeRef = useRef({});
    const VIOLATION_COOLDOWN_MS = 2500;
    const PHONE_VIOLATION_COOLDOWN_MS = 3000;
    const OBJECT_VIOLATION_COOLDOWN_MS = 3000;

    const noPersonStartRef = useRef(null);
    const noPersonViolationEmittedRef = useRef(false);
    const lastNoPersonEmitTimeRef = useRef(0);

    // Dedicated Head Turn tracking (strictly 1.0s)
    const headTurnStartRef = useRef(null);
    const headTurnViolationEmittedRef = useRef(false);
    const lastHeadTurnEmitTimeRef = useRef(0);
    const headTurnCenterFramesRef = useRef(0);

    // Dedicated Eye Gaze tracking (strictly 1.0s)
    const eyeGazeStartRef = useRef(null);
    const eyeGazeViolationEmittedRef = useRef(false);
    const lastEyeGazeEmitTimeRef = useRef(0);
    const eyeGazeCenterFramesRef = useRef(0);

    // Face loss tracking (>35° head turn away drops FaceMesh frontal tracking)
    const faceLostStartRef = useRef(null);
    const lastSeenFaceTimeRef = useRef(Date.now());
    const faceLostViolationEmittedRef = useRef(false);

    // Hysteresis state: tracks whether head is currently in "turned" state
    const headTurnedStateRef = useRef(false);
    const headTurnDirectionRef = useRef(null);
    // Hysteresis state for gaze
    const gazeAwayStateRef = useRef(false);

    const gazeHistoryRef = useRef([]);
    const multipleFacesStreakRef = useRef(0);
    const objectHistoryRef = useRef({});

    // Offscreen canvas and concurrency control for FaceMesh
    const faceCanvasRef = useRef(null);
    const isProcessingFrameRef = useRef(false);

    // ── Calibration state ────────────────────────────────────────────────────
    const calibrationStartRef = useRef(null);
    const calibrationSamplesRef = useRef({ headRatios: [], gazeRatios: [] });
    const calibrationDoneRef = useRef(false);
    const calibrationBaselineRef = useRef({ headRatio: 1.0, gazeRatio: 0.5 });

    // ── Temporal smoothing buffer ────────────────────────────────────────────
    const gazeSmoothingBufferRef = useRef([]);

    // ── Frame counter for debug ──────────────────────────────────────────────
    const frameCountRef = useRef(0);
    const loopStartedRef = useRef(false);

    useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
    useEffect(() => { isAnsweringRef.current = isAnswering; }, [isAnswering]);
    useEffect(() => { videoRef.current = videoElement; }, [videoElement]);
    useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);

    const emitViolation = useCallback((type, detail, meta = {}) => {
        const now = Date.now();
        const lastTime = lastViolationTimeRef.current[type] || 0;
        const cooldown = type === 'PHONE_DETECTED'
            ? PHONE_VIOLATION_COOLDOWN_MS
            : type === 'OBJECT_DETECTED'
                ? OBJECT_VIOLATION_COOLDOWN_MS
                : VIOLATION_COOLDOWN_MS;
        if (now - lastTime < cooldown) return;
        lastViolationTimeRef.current[type] = now;

        debugLog("EVENT", `CONFIRMED: ${type} — ${detail}`);

        onViolationRef.current(type, detail, {
            ...meta,
            timestamp: new Date().toISOString(),
            isAnswering: isAnsweringRef.current,
        });
    }, []);

    // ── MediaPipe FaceMesh Initialization ─────────────────────────────────────
    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        const initFaceMesh = async () => {
            try {
                debugLog("INIT", "Loading MediaPipe FaceMesh script...");
                console.log('[PROCTORING] Loading MediaPipe FaceMesh...');
                logDiag("AI-Proctoring", "Loading MediaPipe FaceMesh script...");
                await loadScriptWithFailover(MEDIAPIPE_CDN_URLS.map(u => `${u}/face_mesh.js`));

                if (cancelled) return;

                const FaceMesh = window.FaceMesh;
                if (!FaceMesh) {
                    console.error('[PROCTORING] CRITICAL: FaceMesh class not found after script load. AI detection will NOT work.');
                    debugLog("INIT", "ERROR: FaceMesh class not found on window after script load");
                    logDiag("AI-Proctoring", "FaceMesh class not found on window after script load");
                    return;
                }

                debugLog("INIT", "Initializing FaceMesh engine...");
                logDiag("AI-Proctoring", "Initializing FaceMesh engine...");
                const mesh = new FaceMesh({
                    locateFile: (file) => `${MEDIAPIPE_CDN_URLS[0]}/${file}`,
                });

                mesh.setOptions({
                    maxNumFaces: 3,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.40,
                    minTrackingConfidence: 0.40,
                });

                mesh.onResults((results) => {
                    if (!isActiveRef.current) return;
                    processFaceMeshResultsRef.current?.(results);
                });

                await mesh.initialize();

                if (cancelled) return;

                faceMeshRef.current = mesh;
                setFaceMeshReady(true);
                console.log('[PROCTORING] ✓ MediaPipe FaceMesh initialized successfully');
                debugLog("INIT", "MediaPipe FaceMesh initialized successfully ✓");
                logDiag("AI-Proctoring", "MediaPipe FaceMesh initialized successfully");
            } catch (err) {
                console.error('[PROCTORING] CRITICAL: FaceMesh initialization FAILED:', err.message);
                debugLog("INIT", "ERROR: FaceMesh initialization failed:", err.message);
                recordError("facemesh-init", err);
            }
        };

        initFaceMesh();

        return () => {
            cancelled = true;
        };
    }, [isActive]);

    // COCO-SSD initialization removed (handled by useYOLODetector)

    // ── Apply temporal smoothing to gaze ratio ───────────────────────────────
    const smoothGazeRatio = useCallback((rawRatio) => {
        const buffer = gazeSmoothingBufferRef.current;
        buffer.push(rawRatio);
        if (buffer.length > T.gazeSmoothingWindow) {
            buffer.shift();
        }
        const sum = buffer.reduce((a, b) => a + b, 0);
        return sum / buffer.length;
    }, [T.gazeSmoothingWindow]);

    // ── Process FaceMesh results ────────────────────────────────────────────
    const processFaceMeshResults = useCallback((results) => {
        const now = Date.now();
        const faces = results.multiFaceLandmarks || [];

        frameCountRef.current += 1;

        // ── Start calibration timer on FIRST face results (not only on iris) ──
        // This ensures calibration completes even if iris landmarks aren't available.
        if (!calibrationDoneRef.current) {
            if (!calibrationStartRef.current) {
                calibrationStartRef.current = now;
                console.log('[PROCTORING] Calibration started (1.5-second baseline capture)');
                debugLog("CALIBRATION", "Starting 1.5-second calibration baseline...");
            }
            if (now - calibrationStartRef.current >= T.calibrationDurationMs) {
                calibrationDoneRef.current = true;
                console.log('[PROCTORING] ✓ Calibration complete — detection is now active');
                debugLog("CALIBRATION", "Calibration complete — violations will now be emitted");
            }
        }

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
            // 0.03 allows background faces (such as people standing nearby) to be detected
            return width > 0.03 && height > 0.03;
        });

        // Sort by area so the closest candidate in front is always index 0
        validFaces.sort((a, b) => {
            let aMinX = 1, aMaxX = 0, aMinY = 1, aMaxY = 0;
            let bMinX = 1, bMaxX = 0, bMinY = 1, bMaxY = 0;
            for (let i = 0; i < a.length; i++) {
                if (a[i].x < aMinX) aMinX = a[i].x;
                if (a[i].x > aMaxX) aMaxX = a[i].x;
                if (a[i].y < aMinY) aMinY = a[i].y;
                if (a[i].y > aMaxY) aMaxY = a[i].y;
            }
            for (let i = 0; i < b.length; i++) {
                if (b[i].x < bMinX) bMinX = b[i].x;
                if (b[i].x > bMaxX) bMaxX = b[i].x;
                if (b[i].y < bMinY) bMinY = b[i].y;
                if (b[i].y > bMaxY) bMaxY = b[i].y;
            }
            return ((bMaxX - bMinX) * (bMaxY - bMinY)) - ((aMaxX - aMinX) * (aMaxY - aMinY));
        });

        const count = validFaces.length;
        setFaceCount(count);

        if (frameCountRef.current % 20 === 0) {
            debugLog("FACE", `faces=${count}, frame=#${frameCountRef.current}`);
        }

        if (count === 0) {
            multipleFacesStreakRef.current = 0;
            const timeSinceLastFace = now - lastSeenFaceTimeRef.current;
            if (!faceLostStartRef.current) {
                faceLostStartRef.current = now;
            }
            const elapsed = now - faceLostStartRef.current;

            // If candidate was present recently (< 10s), 0 faces for >= 1.0s means they turned head away completely (>35°)
            if (timeSinceLastFace < 10000 && elapsed >= 1000 && elapsed < (T.noPersonTimeoutMs || 4000)) {
                const canEmit = !faceLostViolationEmittedRef.current || (now - lastHeadTurnEmitTimeRef.current >= 2500);
                if (canEmit && isActiveRef.current) {
                    const direction = headTurnDirectionRef.current || "away";
                    const violationType = isAnsweringRef.current ? "HEAD_TURNED_WHILE_ANSWERING" : "HEAD_TURNED";
                    console.log(`[PROCTORING] ✔ Head turned completely away (${direction}) for ${(elapsed / 1000).toFixed(1)}s`);
                    emitViolation(
                        violationType,
                        `Candidate turned head ${direction} away from screen for over ${(elapsed / 1000).toFixed(1)} seconds. (Ranking: 1)`,
                        { duration: elapsed / 1000, direction }
                    );
                    faceLostViolationEmittedRef.current = true;
                    lastHeadTurnEmitTimeRef.current = now;
                }
            } else if (elapsed >= (T.noPersonTimeoutMs || 4000)) {
                // Prolonged absence (> 4.0 seconds) flags NO_PEOPLE
                const canEmit = !noPersonViolationEmittedRef.current || (now - lastNoPersonEmitTimeRef.current >= 3000);
                if (canEmit && isActiveRef.current) {
                    emitViolation(
                        "NO_PEOPLE",
                        `No face detected in camera frame for ${(elapsed / 1000).toFixed(1)} seconds (candidate moved away). (Ranking: 1)`,
                        { faceCount: 0, duration: elapsed / 1000 }
                    );
                    noPersonViolationEmittedRef.current = true;
                    lastNoPersonEmitTimeRef.current = now;
                }
            }
            setLandmarks(null);
            return;
        }

        // Face is present, update presence tracker
        lastSeenFaceTimeRef.current = now;
        faceLostStartRef.current = null;
        faceLostViolationEmittedRef.current = false;
        noPersonStartRef.current = null;
        noPersonViolationEmittedRef.current = false;

        if (count > 1) {
            multipleFacesStreakRef.current += 1;
            // 2 frames at 200ms = 400ms confirmation of multiple faces
            if (multipleFacesStreakRef.current >= 2) {
                emitViolation(
                    "MULTIPLE_PEOPLE",
                    `${count} faces detected in camera frame. (Ranking: 2)`,
                    { faceCount: count }
                );
                multipleFacesStreakRef.current = 0;
            }
        } else {
            multipleFacesStreakRef.current = 0;
        }

        const face = validFaces[0];
        setLandmarks(face);

        const nose = face[1];
        const leftCheek = face[234];
        const rightCheek = face[454];
        const leftEyeOuter = face[33];
        const rightEyeOuter = face[263];

        let isHeadTurnedNow = false;
        let headTurnDirection = null;
        let currentHeadTurnRatio = 1.0;

        if (nose && leftCheek && rightCheek) {
            const distLeft = euclidean(nose, leftCheek);
            const distRight = euclidean(nose, rightCheek);
            currentHeadTurnRatio = distRight > 0.001 ? distLeft / distRight : 1.0;
            setHeadTurnRatio(currentHeadTurnRatio);

            let noseEyeOffset = 0;
            if (leftEyeOuter && rightEyeOuter) {
                const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
                const eyeWidth = euclidean(leftEyeOuter, rightEyeOuter);
                noseEyeOffset = eyeWidth > 0.001 ? (nose.x - eyeMidX) / eyeWidth : 0;
            }

            // ── Horizontal Head Turn Hysteresis ─────────────────────────────
            if (!headTurnedStateRef.current) {
                if (currentHeadTurnRatio > (T.headTurnRatioHigh || 1.14) || noseEyeOffset > (T.noseEyeOffsetHigh || 0.045)) {
                    isHeadTurnedNow = true;
                    headTurnDirection = "right";
                    headTurnedStateRef.current = true;
                    headTurnDirectionRef.current = "right";
                } else if (currentHeadTurnRatio < (T.headTurnRatioLow || 0.88) || noseEyeOffset < (T.noseEyeOffsetLow || -0.045)) {
                    isHeadTurnedNow = true;
                    headTurnDirection = "left";
                    headTurnedStateRef.current = true;
                    headTurnDirectionRef.current = "left";
                }
            } else {
                const prevDir = headTurnDirectionRef.current;
                if (prevDir === "right") {
                    if (currentHeadTurnRatio < (T.headTurnReturnHigh || 1.08) && noseEyeOffset < (T.noseEyeOffsetReturnHigh || 0.025)) {
                        headTurnedStateRef.current = false;
                        headTurnDirectionRef.current = null;
                    } else {
                        isHeadTurnedNow = true;
                        headTurnDirection = "right";
                    }
                } else if (prevDir === "left") {
                    if (currentHeadTurnRatio > (T.headTurnReturnLow || 0.92) && noseEyeOffset > (T.noseEyeOffsetReturnLow || -0.025)) {
                        headTurnedStateRef.current = false;
                        headTurnDirectionRef.current = null;
                    } else {
                        isHeadTurnedNow = true;
                        headTurnDirection = "left";
                    }
                }
            }
        }

        // ── Vertical Head Pitch (looking down / looking up) ────────────────
        if (face[10] && face[152] && nose) {
            const distForehead = euclidean(face[10], nose);
            const distChin = euclidean(nose, face[152]);
            const pitchRatio = distChin > 0.001 ? distForehead / distChin : 1.0;

            if (!headTurnedStateRef.current || headTurnDirectionRef.current === "down" || headTurnDirectionRef.current === "up") {
                if (pitchRatio > (T.pitchDownRatio || 1.30)) {
                    isHeadTurnedNow = true;
                    headTurnDirection = "down";
                    headTurnedStateRef.current = true;
                    headTurnDirectionRef.current = "down";
                } else if (pitchRatio < (T.pitchUpRatio || 0.76)) {
                    isHeadTurnedNow = true;
                    headTurnDirection = "up";
                    headTurnedStateRef.current = true;
                    headTurnDirectionRef.current = "up";
                } else if (headTurnDirectionRef.current === "down" && pitchRatio < (T.pitchDownReturn || 1.20)) {
                    headTurnedStateRef.current = false;
                    headTurnDirectionRef.current = null;
                } else if (headTurnDirectionRef.current === "up" && pitchRatio > (T.pitchUpReturn || 0.84)) {
                    headTurnedStateRef.current = false;
                    headTurnDirectionRef.current = null;
                } else if (headTurnDirectionRef.current === "down" || headTurnDirectionRef.current === "up") {
                    isHeadTurnedNow = true;
                    headTurnDirection = headTurnDirectionRef.current;
                }
            }
        }

        // ── Blink detection via EAR ──────────────────────────────────────────
        let isBlinking = false;
        if (face.length > 160) {
            const leftEyeLandmarks = [
                face[33], face[160], face[158],
                face[133], face[153], face[144]
            ];
            const leftEAR = calculateEAR(leftEyeLandmarks);

            if (face.length > 387) {
                const rightEyeLandmarks = [
                    face[263], face[387], face[385],
                    face[362], face[380], face[373]
                ];
                const rightEAR = calculateEAR(rightEyeLandmarks);
                const avgEAR = (leftEAR + rightEAR) / 2;
                isBlinking = avgEAR < (T.earBlinkThreshold || 0.16);
            } else {
                isBlinking = leftEAR < (T.earBlinkThreshold || 0.16);
            }
        }

        let isGazeAway = false;
        let avgGaze = 0.5;

        // ── Gaze detection: ONLY if not blinking and iris landmarks available ──
        if (!isBlinking && face.length > 473) {
            const leftIris = face[468];
            const rightIris = face[473];

            if (leftIris && rightIris && leftIris.x !== undefined && rightIris.x !== undefined &&
                face[33] && face[133] && face[362] && face[263]) {

                // Left eye horizontal span
                const lMinX = Math.min(face[33].x, face[133].x);
                const lMaxX = Math.max(face[33].x, face[133].x);
                const lWidth = lMaxX - lMinX;
                const lRatio = lWidth > 0.002 ? (leftIris.x - lMinX) / lWidth : 0.5;

                // Right eye horizontal span
                const rMinX = Math.min(face[362].x, face[263].x);
                const rMaxX = Math.max(face[362].x, face[263].x);
                const rWidth = rMaxX - rMinX;
                const rRatio = rWidth > 0.002 ? (rightIris.x - rMinX) / rWidth : 0.5;

                const rawGaze = (lRatio + rRatio) / 2;
                avgGaze = smoothGazeRatio(rawGaze);
                setGazeRatio(avgGaze);

                // Vertical gaze check (looking up/down with eyes)
                let isVerticalGazeAway = false;
                if (face[159] && face[145] && face[386] && face[374]) {
                    const lTop = Math.min(face[159].y, face[145].y);
                    const lBottom = Math.max(face[159].y, face[145].y);
                    const lH = lBottom - lTop;
                    const lVert = lH > 0.002 ? (leftIris.y - lTop) / lH : 0.5;

                    const rTop = Math.min(face[386].y, face[374].y);
                    const rBottom = Math.max(face[386].y, face[374].y);
                    const rH = rBottom - rTop;
                    const rVert = rH > 0.002 ? (rightIris.y - rTop) / rH : 0.5;

                    const avgVert = (lVert + rVert) / 2;
                    if (avgVert < (T.vertGazeRatioLow || 0.30) || avgVert > (T.vertGazeRatioHigh || 0.70)) {
                        isVerticalGazeAway = true;
                    }
                }

                // Gaze hysteresis
                if (!gazeAwayStateRef.current) {
                    if (avgGaze < (T.sideGazeRatioLow || 0.44) || avgGaze > (T.sideGazeRatioHigh || 0.56) || isVerticalGazeAway) {
                        isGazeAway = true;
                        gazeAwayStateRef.current = true;
                    }
                } else {
                    if (avgGaze >= (T.sideGazeReturnLow || 0.47) && avgGaze <= (T.sideGazeReturnHigh || 0.53) && !isVerticalGazeAway) {
                        gazeAwayStateRef.current = false;
                    } else {
                        isGazeAway = true;
                    }
                }

                // Gaze sweep detection (rhythmic reading pattern)
                const gazeHistory = gazeHistoryRef.current;
                gazeHistory.push({ ratio: avgGaze, ts: now });
                while (gazeHistory.length > 0 && now - gazeHistory[0].ts > T.gazeSwipeWindowMs) {
                    gazeHistory.shift();
                }

                if (gazeHistory.length >= 3) {
                    let directionChanges = 0;
                    for (let i = 2; i < gazeHistory.length; i++) {
                        const prev = gazeHistory[i - 1].ratio - gazeHistory[i - 2].ratio;
                        const curr = gazeHistory[i].ratio - gazeHistory[i - 1].ratio;
                        if ((prev > 0.02 && curr < -0.02) || (prev < -0.02 && curr > 0.02)) {
                            directionChanges++;
                        }
                    }

                    if (directionChanges >= T.gazeSwipeCount) {
                        const violationType = isAnsweringRef.current
                            ? "EYE_LOOKING_AWAY_WHILE_ANSWERING"
                            : "EYE_LOOKING_AWAY";
                        emitViolation(
                            violationType,
                            "Rhythmic horizontal eye movement detected (possible reading pattern). (Ranking: 1)",
                            { directionChanges, gazeRatio: avgGaze }
                        );
                        gazeHistoryRef.current = [];
                    }
                }
            }
        }

        // ── 1. HEAD TURN TEMPORAL RULE (Strictly 1.0s) ──────────────────────
        if (isHeadTurnedNow) {
            headTurnCenterFramesRef.current = 0;
            if (!headTurnStartRef.current) {
                headTurnStartRef.current = now;
                console.log(`[PROCTORING] Head turn started: dir=${headTurnDirection}, ratio=${currentHeadTurnRatio.toFixed(3)}`);
                debugLog("HEAD", `Head turn started (${headTurnDirection})`);
            } else {
                const elapsed = now - headTurnStartRef.current;
                if (elapsed >= 1000) {
                    const canEmit = !headTurnViolationEmittedRef.current || (now - lastHeadTurnEmitTimeRef.current >= 2500);
                    if (canEmit && isActiveRef.current) {
                        const dir = headTurnDirection || "away";
                        const violationType = isAnsweringRef.current ? "HEAD_TURNED_WHILE_ANSWERING" : "HEAD_TURNED";
                        console.log(`[PROCTORING] ✔ CONFIRMED: ${violationType} (${dir}) for ${(elapsed / 1000).toFixed(1)}s`);
                        emitViolation(
                            violationType,
                            `Candidate turned head ${dir} away from screen for over ${(elapsed / 1000).toFixed(1)} seconds. (Ranking: 1)`,
                            {
                                duration: elapsed / 1000,
                                direction: dir,
                                headTurnRatio: currentHeadTurnRatio,
                                gazeRatio: avgGaze,
                            }
                        );
                        headTurnViolationEmittedRef.current = true;
                        lastHeadTurnEmitTimeRef.current = now;
                    }
                }
            }
        } else {
            // Grace period: require 2 consecutive center frames (300-400ms) before resetting timer
            headTurnCenterFramesRef.current = (headTurnCenterFramesRef.current || 0) + 1;
            if (headTurnCenterFramesRef.current >= 2) {
                headTurnStartRef.current = null;
                headTurnViolationEmittedRef.current = false;
                headTurnedStateRef.current = false;
                headTurnDirectionRef.current = null;
            }
        }

        // ── 2. EYE GAZE LOOK-AWAY TEMPORAL RULE (Strictly 1.0s) ─────────────
        // Only track gaze look-away if head is centered (prevent double counting)
        if (isGazeAway && !isHeadTurnedNow && !isBlinking) {
            eyeGazeCenterFramesRef.current = 0;
            if (!eyeGazeStartRef.current) {
                eyeGazeStartRef.current = now;
                console.log(`[PROCTORING] Gaze look-away started: ratio=${avgGaze.toFixed(3)}`);
                debugLog("GAZE", `Gaze look-away started`);
            } else {
                const elapsed = now - eyeGazeStartRef.current;
                if (elapsed >= 1000) {
                    const canEmit = !eyeGazeViolationEmittedRef.current || (now - lastEyeGazeEmitTimeRef.current >= 2500);
                    if (canEmit && isActiveRef.current) {
                        const violationType = isAnsweringRef.current ? "EYE_LOOKING_AWAY_WHILE_ANSWERING" : "EYE_LOOKING_AWAY";
                        console.log(`[PROCTORING] ✔ CONFIRMED: ${violationType} for ${(elapsed / 1000).toFixed(1)}s (ratio=${avgGaze.toFixed(3)})`);
                        emitViolation(
                            violationType,
                            `Candidate looked away from screen for over ${(elapsed / 1000).toFixed(1)} seconds. (Ranking: 1)`,
                            {
                                duration: elapsed / 1000,
                                gazeRatio: avgGaze,
                            }
                        );
                        eyeGazeViolationEmittedRef.current = true;
                        lastEyeGazeEmitTimeRef.current = now;
                    }
                }
            }
        } else if (!isBlinking) {
            // Grace period: require 2 consecutive center gaze frames before resetting timer
            eyeGazeCenterFramesRef.current = (eyeGazeCenterFramesRef.current || 0) + 1;
            if (eyeGazeCenterFramesRef.current >= 2) {
                eyeGazeStartRef.current = null;
                eyeGazeViolationEmittedRef.current = false;
                gazeAwayStateRef.current = false;
            }
        }

        if (frameCountRef.current % 20 === 0) {
            debugLog("HEAD", `ratio=${currentHeadTurnRatio.toFixed(3)}, turned=${isHeadTurnedNow}, dir=${headTurnDirection || 'center'}`);
            debugLog("GAZE", `ratio=${avgGaze.toFixed(3)}, away=${isGazeAway}, blinking=${isBlinking}`);
        }
    }, [T, emitViolation, smoothGazeRatio]);

    useEffect(() => {
        processFaceMeshResultsRef.current = processFaceMeshResults;
    }, [processFaceMeshResults]);

    // ── FaceMesh frame loop with Offscreen Canvas & Concurrency Lock ─────────
    useEffect(() => {
        if (!isActive || !faceMeshReady || !videoElement) return;

        let lastFrameTime = 0;
        let videoReadyLogged = false;

        const tick = async (timestamp) => {
            if (!isActiveRef.current) return;

            const video = videoRef.current;

            // Video readiness gate: ensure video is playing with positive dimensions
            if (!video || video.readyState < 2 || video.videoWidth === 0) {
                if (!videoReadyLogged) {
                    console.log(`[PROCTORING] Waiting for video... readyState=${video?.readyState}, width=${video?.videoWidth}, srcObject=${!!video?.srcObject}`);
                    debugLog("VIDEO", `Waiting for video... readyState=${video?.readyState}, width=${video?.videoWidth}`);
                    videoReadyLogged = true;
                }
                rafIdRef.current = requestAnimationFrame(tick);
                return;
            }

            if (!loopStartedRef.current) {
                console.log(`[PROCTORING] ✓ Video ready (${video.videoWidth}x${video.videoHeight}) — Frame analysis loop STARTED (200ms sampling)`);
                debugLog("VIDEO", `Video element ready ✓ readyState=${video.readyState}, width=${video.videoWidth}, height=${video.videoHeight}`);
                debugLog("LOOP", "PROCTORING_LOOP_STARTED — frame analysis is now active");
                loopStartedRef.current = true;
                videoReadyLogged = true;
            }

            if (timestamp - lastFrameTime >= T.detectionIntervalMs) {
                lastFrameTime = timestamp;

                if (faceMeshRef.current && !isProcessingFrameRef.current) {
                    isProcessingFrameRef.current = true;
                    try {
                        // Use offscreen 2D canvas to guarantee uncorrupted, unmirrored pixel buffer
                        if (!faceCanvasRef.current) {
                            faceCanvasRef.current = document.createElement("canvas");
                        }
                        const canvas = faceCanvasRef.current;
                        const w = video.videoWidth || 640;
                        const h = video.videoHeight || 480;
                        if (canvas.width !== w || canvas.height !== h) {
                            canvas.width = w;
                            canvas.height = h;
                        }
                        const ctx = canvas.getContext("2d", { willReadFrequently: true });
                        ctx.drawImage(video, 0, 0, w, h);

                        await faceMeshRef.current.send({ image: canvas });
                    } catch (err) {
                        debugLog("FRAME", `FaceMesh send error: ${err.message}`);
                    } finally {
                        isProcessingFrameRef.current = false;
                    }
                }
            }

            rafIdRef.current = requestAnimationFrame(tick);
        };

        rafIdRef.current = requestAnimationFrame(tick);
        debugLog("LOOP", "FaceMesh frame loop registered (200ms interval)");

        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            loopStartedRef.current = false;
        };
    }, [isActive, faceMeshReady, videoElement, T.detectionIntervalMs]);

    // ── Object detection loop (YOLO via useYOLODetector) ───────────
    useEffect(() => {
        if (!isActive || !objectModelReady || !videoElement) return;

        const intervalId = setInterval(async () => {
            if (!isActiveRef.current) return;

            try {
                const predictions = await detectFrame();
                if (!predictions || !Array.isArray(predictions)) return;

                setDetections(predictions);

                // ── Detect Multiple People via YOLO/COCO-SSD ────────────────
                // MediaPipe FaceMesh can miss people standing in background or at an angle.
                // YOLO/COCO-SSD detects whole bodies and faces reliably across the room.
                const peopleInFrame = predictions.filter(p => {
                    const cls = (p.class || '').toLowerCase().trim();
                    return (
                        cls === 'person' ||
                        cls === 'man' ||
                        cls === 'woman' ||
                        cls === 'boy' ||
                        cls === 'girl' ||
                        cls === 'human face' ||
                        cls === 'human head'
                    ) && p.score >= 0.35;
                });

                if (peopleInFrame.length > 1) {
                    multipleFacesStreakRef.current += 1;
                    if (multipleFacesStreakRef.current >= 2) {
                        emitViolation(
                            "MULTIPLE_PEOPLE",
                            `${peopleInFrame.length} people detected in camera frame. (Ranking: 2)`,
                            { faceCount: peopleInFrame.length }
                        );
                        multipleFacesStreakRef.current = 0;
                    }
                }

                const activeObjects = new Map();
                predictions.forEach(p => {
                    const objConfig = getSuspiciousObjectConfig(p.class);
                    if (objConfig) {
                        const isPhone = objConfig.type === "PHONE_DETECTED";
                        const threshold = isPhone
                            ? (T.phoneConfidenceThreshold || 0.35)
                            : (T.objectConfidenceThreshold || 0.35);
                        if (p.score >= threshold) {
                            activeObjects.set(p.class, { config: objConfig, score: p.score });
                        }
                    }
                });

                const WINDOW_SIZE = 2;
                Object.keys(SUSPICIOUS_OBJECTS).forEach(objType => {
                    const history = objectHistoryRef.current[objType] || [];
                    const isDetectedThisFrame = activeObjects.has(objType);
                    
                    const objConfig = getSuspiciousObjectConfig(objType);
                    if (!objConfig) return;

                    const isPhone = objConfig.type === "PHONE_DETECTED";
                    const threshold = isPhone ? (T.phoneConfidenceThreshold || 0.35) : (T.objectConfidenceThreshold || 0.35);
                    const match = predictions.find(p => (p.class || '').toLowerCase() === objType.toLowerCase() && p.score >= threshold);
                    const score = match ? match.score : 0;

                    history.push({ detected: isDetectedThisFrame, score });
                    if (history.length > WINDOW_SIZE) {
                        history.shift();
                    }
                    objectHistoryRef.current[objType] = history;

                    const detectedFramesCount = history.filter(h => h.detected).length;
                    const averageConfidence = detectedFramesCount > 0 
                        ? history.filter(h => h.detected).reduce((sum, h) => sum + h.score, 0) / detectedFramesCount 
                        : 0;

                    const requiredFrames = isPhone ? 1 : 2;
                    const isConfirmed = detectedFramesCount >= requiredFrames && averageConfidence >= threshold;

                    if (isConfirmed) {
                        emitViolation(
                            objConfig.type,
                            `${objConfig.label} detected in camera frame (Temporal confirmation: ${detectedFramesCount}/${WINDOW_SIZE} frames, avg conf: ${(averageConfidence * 100).toFixed(0)}%). (Ranking: ${objConfig.ranking})`,
                            { confidence: averageConfidence, label: objConfig.label }
                        );
                    }
                });
            } catch (err) {
                recordError("yolo-frame-detect", err);
            }
        }, T.objectDetectionIntervalMs);

        return () => clearInterval(intervalId);
    }, [isActive, objectModelReady, videoElement, T, emitViolation, detectFrame]);

    // Reset calibration state when session ends
    useEffect(() => {
        if (!isActive) {
            calibrationStartRef.current = null;
            calibrationSamplesRef.current = { headRatios: [], gazeRatios: [] };
            calibrationDoneRef.current = false;
            calibrationBaselineRef.current = { headRatio: 1.0, gazeRatio: 0.5 };
            gazeSmoothingBufferRef.current = [];
            frameCountRef.current = 0;
            loopStartedRef.current = false;
            headTurnedStateRef.current = false;
            headTurnDirectionRef.current = null;
            gazeAwayStateRef.current = false;
        }
    }, [isActive]);

    useEffect(() => {
        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            faceMeshRef.current = null;
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
