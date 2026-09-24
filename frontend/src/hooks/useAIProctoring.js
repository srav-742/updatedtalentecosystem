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
    // Head turn detection (relative to calibrated baseline)
    headTurnRatioHigh: 1.85,       // Relative ratio > this → looking right (calibrated for full display reading)
    headTurnRatioLow: 0.52,        // Relative ratio < this → looking left (calibrated for full display reading)
    noseEyeOffsetHigh: 0.14,       // Nose-to-eye center normalized offset
    noseEyeOffsetLow: -0.14,
    // Hysteresis: return-to-normal thresholds
    headTurnReturnHigh: 1.55,      // Must drop below this to return to center from "right"
    headTurnReturnLow: 0.65,       // Must rise above this to return to center from "left"
    noseEyeOffsetReturnHigh: 0.08,
    noseEyeOffsetReturnLow: -0.08,
    // Vertical head pitch (calibrated relative pitch is primary, raw is fallback)
    pitchDownRatio: 2.20,          // Forehead-to-nose vs nose-to-chin ratio > this → looking down (relaxed for screen reading)
    pitchUpRatio: 0.45,            // Ratio < this → looking up
    pitchDownReturn: 1.80,
    pitchUpReturn: 0.60,
    // Head turn & look-away duration required before flagging violation (3.5s continuous)
    headTurnMinDurationMs: 3500,   // Continuous turn for at least 3.5s before violation
    lookAwayDurationMs: 3500,      // Continuous gaze away for at least 3.5s before violation
    // Gaze sweeps
    gazeSwipeCount: 3,             // Consecutive left-right sweeps to trigger
    gazeSwipeWindowMs: 4000,       // Sliding window for sweep detection
    // Presence (fast confirmation when face not visible / candidate moved away)
    noPersonTimeoutMs: 1500,       // 1.5 seconds no face before NO_PEOPLE
    // Object detection (sensitive to phones and secondary objects)
    phoneConfidenceThreshold: 0.20,
    objectConfidenceThreshold: 0.22,
    phoneRequiredFrames: 1,        // Immediate 1-frame confirmation on phone detection
    objectRequiredFrames: 2,
    // Gaze thresholds (relative to calibrated resting eye position)
    sideGazeDelta: 0.24,           // Deviation from baseline > 0.24 → looking away (permits edge-of-screen reading)
    sideGazeRatioLow: 0.18,        // Absolute fallback low (< 0.18 = iris pinned to inner corner)
    sideGazeRatioHigh: 0.82,       // Absolute fallback high (> 0.82 = iris pinned to outer corner)
    // Gaze hysteresis
    sideGazeReturnLow: 0.26,
    sideGazeReturnHigh: 0.74,
    // Vertical gaze
    vertGazeRatioLow: 0.18,        // Looking up with eyes
    vertGazeRatioHigh: 0.82,       // Looking down with eyes
    vertGazeReturnLow: 0.25,
    vertGazeReturnHigh: 0.75,
    // Timing
    detectionIntervalMs: 200,      // 5 frames per second
    objectDetectionIntervalMs: 500, // 2 FPS on WebGL for immediate object detection response
    onnxLoadTimeoutMs: 8000,
    // EAR (Eye Aspect Ratio) for blink detection
    earBlinkThreshold: 0.13,       // EAR below this = true closed-eye blink
    // Calibration
    calibrationDurationMs: 1500,   // 1.5 second baseline capture
    // Temporal smoothing
    gazeSmoothingWindow: 3,        // 3-frame moving average for gaze ratio
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

// Configured suspicious objects for violation generation (cell phones and objects used by candidate)
const SUSPICIOUS_OBJECTS = {
    "cell phone": { type: "PHONE_DETECTED", label: "Cell phone", ranking: 2 },
    "remote": { type: "PHONE_DETECTED", label: "Cell phone", ranking: 2 },
    "telephone": { type: "PHONE_DETECTED", label: "Cell phone", ranking: 2 },
    "Mobile phone": { type: "PHONE_DETECTED", label: "Cell phone", ranking: 2 },
    "book": { type: "OBJECT_DETECTED", label: "Object used (Book/notes)", ranking: 2 },
    "Book": { type: "OBJECT_DETECTED", label: "Object used (Book/notes)", ranking: 2 },
    "tablet": { type: "OBJECT_DETECTED", label: "Object used (Tablet)", ranking: 2 },
    "Tablet": { type: "OBJECT_DETECTED", label: "Object used (Tablet)", ranking: 2 },
    "Tablet computer": { type: "OBJECT_DETECTED", label: "Object used (Tablet)", ranking: 2 },
    "tablet computer": { type: "OBJECT_DETECTED", label: "Object used (Tablet)", ranking: 2 },
    "object used": { type: "OBJECT_DETECTED", label: "Object used", ranking: 2 },
    "Object used": { type: "OBJECT_DETECTED", label: "Object used", ranking: 2 },
};

// Case-insensitive lookup for detected object classes
function getSuspiciousObjectConfig(className) {
    if (!className) return null;
    const lower = className.toLowerCase().trim();

    // Do NOT identify or flag any background fixtures, furniture, or ambient room items
    if (
        lower === 'chair' || lower === 'couch' || lower === 'sofa' || lower === 'bed' ||
        lower === 'tv' || lower === 'television' || lower === 'monitor' || lower.includes('monitor') ||
        lower === 'bottle' || lower === 'cup' || lower === 'mug' || lower.includes('cup') ||
        lower === 'backpack' || lower === 'handbag' || lower === 'suitcase' || lower === 'briefcase' ||
        lower === 'keyboard' || lower === 'mouse' || lower === 'clock' || lower === 'vase' ||
        lower === 'potted plant' || lower === 'scissors' || lower === 'table' || lower === 'desk' ||
        lower === 'dining table'
    ) {
        return null;
    }

    const direct = SUSPICIOUS_OBJECTS[className];
    if (direct) return direct;
    for (const [k, v] of Object.entries(SUSPICIOUS_OBJECTS)) {
        if (k.toLowerCase().trim() === lower) {
            return v;
        }
    }
    // Substring fallback for all phone variants
    if (lower.includes("phone") || lower === "telephone") {
        return { type: "PHONE_DETECTED", label: "Cell phone", ranking: 2 };
    }
    // Substring fallback for object used / tablet / book
    if (lower.includes("object used") || lower.includes("tablet") || lower.includes("book")) {
        return { type: "OBJECT_DETECTED", label: "Object used", ranking: 2 };
    }
    return null;
}

function euclidean(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function computeIoU(box1, box2) {
    if (!box1 || !box2) return 0;
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    const w = Math.max(0, x2 - x1);
    const h = Math.max(0, y2 - y1);
    const inter = w * h;
    const area1 = (box1.width || 0) * (box1.height || 0);
    const area2 = (box2.width || 0) * (box2.height || 0);
    const union = area1 + area2 - inter;
    return union > 0 ? inter / union : 0;
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

let faceMeshInstance = null;
let faceMeshInitPromise = null;

async function getOrInitFaceMesh() {
    if (faceMeshInstance) return faceMeshInstance;
    if (faceMeshInitPromise) return faceMeshInitPromise;

    faceMeshInitPromise = (async () => {
        const cdns = [
            "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619",
            "https://unpkg.com/@mediapipe/face_mesh@0.4.1633559619",
            "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh",
        ];

        let FaceMeshClass = typeof window !== 'undefined' ? window.FaceMesh : null;
        let activeCdn = cdns[0];

        if (!FaceMeshClass) {
            for (const cdn of cdns) {
                try {
                    console.log(`[PROCTORING] Fetching MediaPipe FaceMesh from ${cdn}...`);
                    await new Promise((resolve, reject) => {
                        if (typeof window !== 'undefined' && window.FaceMesh) {
                            resolve();
                            return;
                        }
                        const scriptUrl = `${cdn}/face_mesh.js`;
                        const existing = document.querySelector(`script[src="${scriptUrl}"]`);
                        if (existing) {
                            if (window.FaceMesh) return resolve();
                            existing.remove();
                        }
                        const script = document.createElement("script");
                        script.src = scriptUrl;
                        script.crossOrigin = "anonymous";
                        script.async = true;
                        script.onload = () => resolve();
                        script.onerror = (e) => reject(new Error(`Failed to load ${scriptUrl}`));
                        document.head.appendChild(script);
                    });

                    const start = Date.now();
                    while (!window.FaceMesh && (Date.now() - start < 3000)) {
                        await new Promise(r => setTimeout(r, 50));
                    }

                    if (window.FaceMesh) {
                        FaceMeshClass = window.FaceMesh;
                        activeCdn = cdn;
                        break;
                    }
                } catch (err) {
                    console.warn(`[PROCTORING] Failed loading script from ${cdn}:`, err.message);
                }
            }
        }

        if (!FaceMeshClass) {
            throw new Error("FaceMesh global class not found after script injection");
        }

        console.log(`[PROCTORING] Initializing FaceMesh instance via ${activeCdn}...`);
        const mesh = new FaceMeshClass({
            locateFile: (file) => `${activeCdn}/${file}`,
        });

        mesh.setOptions({
            maxNumFaces: 3,
            refineLandmarks: true,
            minDetectionConfidence: 0.40,
            minTrackingConfidence: 0.40,
        });

        await mesh.initialize();
        faceMeshInstance = mesh;
        console.log("[PROCTORING] ✓ MediaPipe FaceMesh initialized successfully");
        return mesh;
    })().catch(err => {
        faceMeshInitPromise = null;
        throw err;
    });

    return faceMeshInitPromise;
}

export function useAIProctoring({
    videoElement = null,
    isActive = false,
    isAnswering = false,
    onViolation = () => {},
    thresholds: userThresholds = {},
    enableSnapshots = true,
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
    const landmarksRef = useRef(null);
    const detectionCanvasRef = useRef(null);

    const { modelReady: yoloModelReady, yoloReady, cocoReady, engineType, detectFrame } = useYOLODetector({
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
    const enableSnapshotsRef = useRef(enableSnapshots);
    useEffect(() => { enableSnapshotsRef.current = enableSnapshots; }, [enableSnapshots]);
    const processFaceMeshResultsRef = useRef(null);

    const lastViolationTimeRef = useRef({});
    const VIOLATION_COOLDOWN_MS = 2500;
    const PHONE_VIOLATION_COOLDOWN_MS = 3000;
    const OBJECT_VIOLATION_COOLDOWN_MS = 3000;

    const noPersonStartRef = useRef(null);
    const noPersonViolationEmittedRef = useRef(false);
    const lastNoPersonEmitTimeRef = useRef(0);

    const multipleFacesViolationEmittedRef = useRef(false);
    const lastMultipleFacesEmitTimeRef = useRef(0);

    // Dedicated Head Turn tracking (2.5s continuous duration)
    const headTurnStartRef = useRef(null);
    const headTurnViolationEmittedRef = useRef(false);
    const lastHeadTurnEmitTimeRef = useRef(0);
    const headTurnCenterFramesRef = useRef(0);

    // Dedicated Eye Gaze tracking (2.5s continuous duration)
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
    const yoloZeroPeopleStreakRef = useRef(0);
    const objectHistoryRef = useRef({});

    // Offscreen canvas and concurrency control for FaceMesh
    const faceCanvasRef = useRef(null);
    const isProcessingFrameRef = useRef(false);

    // ── Calibration state ────────────────────────────────────────────────────
    const calibrationStartRef = useRef(null);
    const calibrationSamplesRef = useRef({ headRatios: [], noseOffsets: [], gazeRatios: [], pitchRatios: [] });
    const calibrationDoneRef = useRef(false);
    const calibrationBaselineRef = useRef({ headRatio: 1.0, noseOffset: 0.0, gazeRatio: 0.5, pitchRatio: 1.15 });

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

        // Capture offscreen evidence frame for audit trail without candidate visual disruption
        let snapshot = null;
        if (enableSnapshotsRef.current) {
            snapshot = meta.snapshot || null;
            if (!snapshot && videoRef.current && videoRef.current.videoWidth > 0) {
                try {
                    if (!detectionCanvasRef.current) {
                        detectionCanvasRef.current = document.createElement("canvas");
                    }
                    const snapCanvas = detectionCanvasRef.current;
                    snapCanvas.width = 320;
                    snapCanvas.height = 240;
                    const snapCtx = snapCanvas.getContext("2d");
                    snapCtx.drawImage(videoRef.current, 0, 0, 320, 240);
                    snapshot = snapCanvas.toDataURL("image/jpeg", 0.6);
                } catch (_) {
                    // silent offscreen capture fallback
                }
            }
        }

        const evidenceFrames = enableSnapshotsRef.current && meta.evidenceFrames && meta.evidenceFrames.length > 0
            ? meta.evidenceFrames
            : (snapshot ? [snapshot] : []);

        onViolationRef.current(type, detail, {
            ...meta,
            snapshot,
            evidenceFrames,
            timestamp: new Date().toISOString(),
            isAnswering: isAnsweringRef.current,
        });
    }, []);

    // ── MediaPipe FaceMesh Initialization ─────────────────────────────────────
    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        getOrInitFaceMesh()
            .then((mesh) => {
                if (cancelled) return;
                mesh.onResults((results) => {
                    if (!isActiveRef.current) return;
                    processFaceMeshResultsRef.current?.(results);
                });
                faceMeshRef.current = mesh;
                setFaceMeshReady(true);
                debugLog("INIT", "MediaPipe FaceMesh initialized successfully ✓");
                logDiag("AI-Proctoring", "MediaPipe FaceMesh initialized successfully");
            })
            .catch((err) => {
                console.error('[PROCTORING] CRITICAL: FaceMesh initialization FAILED:', err.message);
                debugLog("INIT", "ERROR: FaceMesh initialization failed: " + err.message);
                logDiag("AI-Proctoring", "FaceMesh initialization failed: " + err.message);
            });

        return () => {
            cancelled = true;
        };
    }, [isActive]);

    // ── Gaze Smoothing ───────────────────────────────────────────────────────
    const smoothGazeRatio = useCallback((rawRatio) => {
        const buffer = gazeSmoothingBufferRef.current;
        buffer.push(rawRatio);
        if (buffer.length > 5) buffer.shift();
        return buffer.reduce((a, b) => a + b, 0) / buffer.length;
    }, []);

    // ── FaceMesh Results Processing ──────────────────────────────────────────
    const processFaceMeshResults = useCallback((results) => {
        try {
            const now = Date.now();
            const faces = results.multiFaceLandmarks || [];

            frameCountRef.current += 1;

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
                // Filter out tiny noise patches, camera reflections, and pattern artifacts:
                // A genuine human face in the proctoring frame must be at least 0.065 (42px wide)
                if (width < 0.065 || height < 0.065) return false;
                if (face.length < 468) return false;
                if (face[33] && face[263] && Math.abs(face[33].x - face[263].x) < 0.020) return false;
                return true;
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

        // ── Case 1: No Face Detected in Frame (Absence or Profile Drop) ──────
        if (count === 0) {
            multipleFacesStreakRef.current = 0;
            if (!faceLostStartRef.current) {
                faceLostStartRef.current = now;
            }
            const elapsed = now - faceLostStartRef.current;

            // Profile turn memory: if the candidate was already in a turned state (yaw > 25°),
            // the face loss is due to cheek occlusion during an extreme head turn away.
            if (headTurnedStateRef.current && headTurnDirectionRef.current) {
                const dir = headTurnDirectionRef.current;
                const minTurnDuration = T.headTurnMinDurationMs || 3500;
                if (elapsed >= minTurnDuration) {
                    const canEmit = !faceLostViolationEmittedRef.current || (now - lastHeadTurnEmitTimeRef.current >= 3000);
                    if (canEmit && isActiveRef.current) {
                        const violationType = isAnsweringRef.current ? "HEAD_TURNED_WHILE_ANSWERING" : "HEAD_TURNED";
                        console.log(`[PROCTORING] ✔ Head turned completely away (${dir}) for ${(elapsed / 1000).toFixed(1)}s`);
                        emitViolation(
                            violationType,
                            `Candidate turned head ${dir} away from screen for over ${(elapsed / 1000).toFixed(1)} seconds. (Ranking: 1)`,
                            { duration: elapsed / 1000, direction: dir }
                        );
                        faceLostViolationEmittedRef.current = true;
                        lastHeadTurnEmitTimeRef.current = now;
                    }
                }
            } else if (elapsed >= (T.noPersonTimeoutMs || 1500)) {
                // Candidate moved away, stepped out, or camera was blocked/obscured
                const canEmit = !noPersonViolationEmittedRef.current || (now - lastNoPersonEmitTimeRef.current >= 3000);
                if (canEmit && isActiveRef.current) {
                    console.log(`[PROCTORING] ✔ No face detected for ${(elapsed / 1000).toFixed(1)}s`);
                    emitViolation(
                        "NO_PEOPLE",
                        `No face detected in camera frame for ${(elapsed / 1000).toFixed(1)} seconds (face not visible or candidate moved away). (Ranking: 1)`,
                        { faceCount: 0, duration: elapsed / 1000 }
                    );
                    noPersonViolationEmittedRef.current = true;
                    lastNoPersonEmitTimeRef.current = now;
                }
            }
            setLandmarks(null);
            landmarksRef.current = null;
            return;
        }

        // Face is present, update presence tracker
        lastSeenFaceTimeRef.current = now;
        faceLostStartRef.current = null;
        faceLostViolationEmittedRef.current = false;
        noPersonStartRef.current = null;
        noPersonViolationEmittedRef.current = false;

        // ── Multiple Faces Detection via FaceMesh ───────────────────────────
        if (count > 1) {
            multipleFacesStreakRef.current += 1;
            // 5 frames at 200ms = 1.0 second continuous confirmation of multiple genuine faces
            if (multipleFacesStreakRef.current >= 5) {
                const canEmit = !multipleFacesViolationEmittedRef.current || (now - lastMultipleFacesEmitTimeRef.current >= 4000);
                if (canEmit && isActiveRef.current) {
                    emitViolation(
                        "MULTIPLE_PEOPLE",
                        `${count} faces detected in camera frame. (Ranking: 2)`,
                        { faceCount: count }
                    );
                    multipleFacesViolationEmittedRef.current = true;
                    lastMultipleFacesEmitTimeRef.current = now;
                }
            }
        } else {
            multipleFacesStreakRef.current = 0;
            multipleFacesViolationEmittedRef.current = false;
        }

        const face = validFaces[0];
        setLandmarks(face);
        landmarksRef.current = face;

        const nose = face[1];
        const leftCheek = face[234];
        const rightCheek = face[454];
        const leftEyeOuter = face[33];
        const rightEyeOuter = face[263];

        let isHeadTurnedNow = false;
        let headTurnDirection = null;
        let currentHeadTurnRatio = 1.0;
        let noseEyeOffset = 0;

        if (nose && leftCheek && rightCheek) {
            const distLeft = euclidean(nose, leftCheek);
            const distRight = euclidean(nose, rightCheek);
            currentHeadTurnRatio = distRight > 0.001 ? distLeft / distRight : 1.0;
            setHeadTurnRatio(currentHeadTurnRatio);

            if (leftEyeOuter && rightEyeOuter) {
                const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
                const eyeWidth = euclidean(leftEyeOuter, rightEyeOuter);
                noseEyeOffset = eyeWidth > 0.001 ? (nose.x - eyeMidX) / eyeWidth : 0;
            }

            // ── Baseline Calibration: sample during first 1.5s ───────────────
            if (!calibrationDoneRef.current) {
                if (!calibrationStartRef.current) {
                    calibrationStartRef.current = now;
                    console.log('[PROCTORING] Calibration started (1.5-second baseline capture)');
                    debugLog("CALIBRATION", "Starting 1.5-second calibration baseline...");
                }
                calibrationSamplesRef.current.headRatios.push(currentHeadTurnRatio);
                if (!calibrationSamplesRef.current.noseOffsets) calibrationSamplesRef.current.noseOffsets = [];
                calibrationSamplesRef.current.noseOffsets.push(noseEyeOffset);

                // Sample pitch ratio during calibration
                if (face[10] && face[152] && nose) {
                    const distForehead = euclidean(face[10], nose);
                    const distChin = euclidean(nose, face[152]);
                    const calibPitch = distChin > 0.001 ? distForehead / distChin : 1.15;
                    if (!calibrationSamplesRef.current.pitchRatios) calibrationSamplesRef.current.pitchRatios = [];
                    calibrationSamplesRef.current.pitchRatios.push(calibPitch);
                }

                if (now - calibrationStartRef.current >= T.calibrationDurationMs) {
                    const samples = calibrationSamplesRef.current;
                    const avgHead = samples.headRatios.length > 0
                        ? samples.headRatios.reduce((a, b) => a + b, 0) / samples.headRatios.length
                        : 1.0;
                    const avgNoseOffset = samples.noseOffsets.length > 0
                        ? samples.noseOffsets.reduce((a, b) => a + b, 0) / samples.noseOffsets.length
                        : 0.0;
                    const avgGaze = samples.gazeRatios.length > 0
                        ? samples.gazeRatios.reduce((a, b) => a + b, 0) / samples.gazeRatios.length
                        : 0.5;
                    const avgPitch = samples.pitchRatios && samples.pitchRatios.length > 0
                        ? samples.pitchRatios.reduce((a, b) => a + b, 0) / samples.pitchRatios.length
                        : 1.15;

                    // Clamp calibration baseline to realistic human anatomical ranges
                    const clampedHead = Math.max(0.85, Math.min(1.25, avgHead));
                    const clampedPitch = Math.max(0.95, Math.min(1.30, avgPitch));
                    const clampedGaze = Math.max(0.46, Math.min(0.54, avgGaze));
                    const clampedNoseOffset = Math.max(-0.04, Math.min(0.04, avgNoseOffset));

                    calibrationBaselineRef.current = {
                        headRatio: clampedHead,
                        noseOffset: clampedNoseOffset,
                        gazeRatio: clampedGaze,
                        pitchRatio: clampedPitch,
                    };
                    calibrationDoneRef.current = true;
                    console.log(`[PROCTORING] ✓ Calibration complete: baselineHeadRatio=${clampedHead.toFixed(2)}, baselinePitch=${clampedPitch.toFixed(2)}, baselineNoseOffset=${clampedNoseOffset.toFixed(3)}, baselineGazeRatio=${clampedGaze.toFixed(2)}`);
                    debugLog("CALIBRATION", "Calibration complete", calibrationBaselineRef.current);
                }
            }

            const baselineRatio = calibrationBaselineRef.current.headRatio || 1.0;
            const baselineNose = calibrationBaselineRef.current.noseOffset || 0.0;
            const relRatio = currentHeadTurnRatio / baselineRatio;
            const relNoseOffset = noseEyeOffset - baselineNose;

            // Auto-recovery: If current head turn ratio and nose offset are well within normal human forward-facing limits,
            // candidate is definitely looking at the display. Force clear any sticky turned state.
            const isFacingDisplay = (currentHeadTurnRatio >= 0.55 && currentHeadTurnRatio <= 1.80) &&
                                    (Math.abs(relNoseOffset) <= 0.12);

            // ── Horizontal Head Turn Hysteresis with Baseline Compensation ──
            if (!headTurnedStateRef.current) {
                if (relRatio > (T.headTurnRatioHigh || 1.85) || relNoseOffset > (T.noseEyeOffsetHigh || 0.14)) {
                    isHeadTurnedNow = true;
                    headTurnDirection = "right";
                    headTurnedStateRef.current = true;
                    headTurnDirectionRef.current = "right";
                } else if (relRatio < (T.headTurnRatioLow || 0.52) || relNoseOffset < (T.noseEyeOffsetLow || -0.14)) {
                    isHeadTurnedNow = true;
                    headTurnDirection = "left";
                    headTurnedStateRef.current = true;
                    headTurnDirectionRef.current = "left";
                }
            } else {
                if (isFacingDisplay) {
                    headTurnedStateRef.current = false;
                    headTurnDirectionRef.current = null;
                } else {
                    const prevDir = headTurnDirectionRef.current;
                    if (prevDir === "right") {
                        if (relRatio < (T.headTurnReturnHigh || 1.55) && relNoseOffset < (T.noseEyeOffsetReturnHigh || 0.08)) {
                            headTurnedStateRef.current = false;
                            headTurnDirectionRef.current = null;
                        } else {
                            isHeadTurnedNow = true;
                            headTurnDirection = "right";
                        }
                    } else if (prevDir === "left") {
                        if (relRatio > (T.headTurnReturnLow || 0.65) && relNoseOffset > (T.noseEyeOffsetReturnLow || -0.08)) {
                            headTurnedStateRef.current = false;
                            headTurnDirectionRef.current = null;
                        } else {
                            isHeadTurnedNow = true;
                            headTurnDirection = "left";
                        }
                    }
                }
            }
        }

        // ── Vertical Head Pitch (looking down / looking up) ────────────────
        if (face[10] && face[152] && nose) {
            const distForehead = euclidean(face[10], nose);
            const distChin = euclidean(nose, face[152]);
            const pitchRatio = distChin > 0.001 ? distForehead / distChin : 1.0;
            const baselinePitch = calibrationBaselineRef.current.pitchRatio || 1.15;
            const relPitch = pitchRatio / baselinePitch;

            // Pitch within normal range for reading screen content from top to bottom
            const isPitchFacingDisplay = (pitchRatio >= 0.50 && pitchRatio <= 2.10) && (relPitch >= 0.55 && relPitch <= 1.50);

            // Only flag if relative pitch tilts drastically (> 55% downward tilt or < 50% upward tilt)
            // or if raw pitch ratio exceeds absolute bounds. This avoids false positives during normal screen reading.
            if (!headTurnedStateRef.current || headTurnDirectionRef.current === "down" || headTurnDirectionRef.current === "up") {
                if (relPitch > 1.55 || pitchRatio > (T.pitchDownRatio || 2.20)) {
                    isHeadTurnedNow = true;
                    headTurnDirection = "down";
                    headTurnedStateRef.current = true;
                    headTurnDirectionRef.current = "down";
                } else if (relPitch < 0.50 || pitchRatio < (T.pitchUpRatio || 0.45)) {
                    isHeadTurnedNow = true;
                    headTurnDirection = "up";
                    headTurnedStateRef.current = true;
                    headTurnDirectionRef.current = "up";
                } else if (isPitchFacingDisplay) {
                    if (headTurnDirectionRef.current === "down" || headTurnDirectionRef.current === "up") {
                        headTurnedStateRef.current = false;
                        headTurnDirectionRef.current = null;
                    }
                } else if (headTurnDirectionRef.current === "down" && (relPitch < 1.35 || pitchRatio < (T.pitchDownReturn || 1.80))) {
                    headTurnedStateRef.current = false;
                    headTurnDirectionRef.current = null;
                } else if (headTurnDirectionRef.current === "up" && (relPitch > 0.65 || pitchRatio > (T.pitchUpReturn || 0.60))) {
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
                isBlinking = avgEAR < (T.earBlinkThreshold || 0.13);
            } else {
                isBlinking = leftEAR < (T.earBlinkThreshold || 0.13);
            }
        }

        let isGazeAway = false;
        let avgGaze = 0.5;

        // ── Gaze Detection: Iris (preferred) or Eye-Contour Fallback ──────────
        if (face.length >= 468) {
            let lRatio = 0.5;
            let rRatio = 0.5;
            let isVerticalGazeAway = false;

            const hasIris = face.length > 473 && face[468] && face[473] &&
                            face[468].x !== undefined && face[473].x !== undefined;

            if (hasIris && face[33] && face[133] && face[362] && face[263]) {
                const leftIris = face[468];
                const rightIris = face[473];

                // Left eye horizontal span
                const lMinX = Math.min(face[33].x, face[133].x);
                const lMaxX = Math.max(face[33].x, face[133].x);
                const lWidth = lMaxX - lMinX;
                lRatio = lWidth > 0.002 ? (leftIris.x - lMinX) / lWidth : 0.5;

                // Right eye horizontal span
                const rMinX = Math.min(face[362].x, face[263].x);
                const rMaxX = Math.max(face[362].x, face[263].x);
                const rWidth = rMaxX - rMinX;
                rRatio = rWidth > 0.002 ? (rightIris.x - rMinX) / rWidth : 0.5;

                // Vertical gaze check (looking up/down with eyes)
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
                    if (avgVert < (T.vertGazeRatioLow || 0.18) || avgVert > (T.vertGazeRatioHigh || 0.82)) {
                        isVerticalGazeAway = true;
                    }
                }
            } else if (face[33] && face[133] && face[263] && face[362]) {
                // Fallback using eye contour centers if iris landmarks are not rendered
                const lEyeCenter = (face[159].x + face[145].x) / 2;
                const lMinX = Math.min(face[33].x, face[133].x);
                const lMaxX = Math.max(face[33].x, face[133].x);
                const lW = lMaxX - lMinX;
                lRatio = lW > 0.002 ? (lEyeCenter - lMinX) / lW : 0.5;

                const rEyeCenter = (face[386].x + face[374].x) / 2;
                const rMinX = Math.min(face[362].x, face[263].x);
                const rMaxX = Math.max(face[362].x, face[263].x);
                const rW = rMaxX - rMinX;
                rRatio = rW > 0.002 ? (rEyeCenter - rMinX) / rW : 0.5;
            }

            const rawGaze = (lRatio + rRatio) / 2;
            avgGaze = smoothGazeRatio(rawGaze);
            setGazeRatio(avgGaze);

            if (!calibrationDoneRef.current && calibrationSamplesRef.current) {
                calibrationSamplesRef.current.gazeRatios.push(avgGaze);
            }

            const baselineGaze = calibrationBaselineRef.current.gazeRatio || 0.5;
            const gazeDelta = avgGaze - baselineGaze;
            const deltaThreshold = T.sideGazeDelta || 0.24;

            // Gaze hysteresis (relative to calibrated baseline)
            if (!gazeAwayStateRef.current) {
                if (Math.abs(gazeDelta) > deltaThreshold || isVerticalGazeAway ||
                    avgGaze < (T.sideGazeRatioLow || 0.18) || avgGaze > (T.sideGazeRatioHigh || 0.82)) {
                    isGazeAway = true;
                    gazeAwayStateRef.current = true;
                }
            } else {
                if (Math.abs(gazeDelta) <= (deltaThreshold - 0.04) && !isVerticalGazeAway &&
                    avgGaze >= (T.sideGazeReturnLow || 0.26) && avgGaze <= (T.sideGazeReturnHigh || 0.74)) {
                    gazeAwayStateRef.current = false;
                } else {
                    isGazeAway = true;
                }
            }

            // Gaze tracking history (for analytics only - normal reading sweeps are NOT penalized as violations)
            const gazeHistory = gazeHistoryRef.current;
            gazeHistory.push({ ratio: avgGaze, ts: now });
            while (gazeHistory.length > 0 && now - gazeHistory[0].ts > (T.gazeSwipeWindowMs || 4000)) {
                gazeHistory.shift();
            }
        }

        // ── 1. HEAD TURN TEMPORAL RULE (3.5s continuous) ────────────────────
        if (isHeadTurnedNow) {
            headTurnCenterFramesRef.current = 0;
            if (!headTurnStartRef.current) {
                headTurnStartRef.current = now;
                console.log(`[PROCTORING] Head turn started: dir=${headTurnDirection}, ratio=${currentHeadTurnRatio.toFixed(3)}`);
                debugLog("HEAD", `Head turn started (${headTurnDirection})`);
            } else {
                const elapsed = now - headTurnStartRef.current;
                const minDuration = T.headTurnMinDurationMs || 3500;
                if (elapsed >= minDuration) {
                    const canEmit = !headTurnViolationEmittedRef.current || (now - lastHeadTurnEmitTimeRef.current >= 3000);
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
            // Clean immediate reset when candidate is facing screen: prevents stuck accumulated timers
            headTurnStartRef.current = null;
            headTurnViolationEmittedRef.current = false;
            headTurnedStateRef.current = false;
            headTurnDirectionRef.current = null;
            headTurnCenterFramesRef.current = 0;
        }

        // ── 2. EYE GAZE LOOK-AWAY TEMPORAL RULE (3.5s continuous) ───────────
        // Allow gaze look-away tracking whenever eyes are diverted and candidate is not mid-blink
        if (isGazeAway && !isBlinking) {
            eyeGazeCenterFramesRef.current = 0;
            if (!eyeGazeStartRef.current) {
                eyeGazeStartRef.current = now;
                console.log(`[PROCTORING] Gaze look-away started: ratio=${avgGaze.toFixed(3)}`);
                debugLog("GAZE", `Gaze look-away started`);
            } else {
                const elapsed = now - eyeGazeStartRef.current;
                const minGazeDuration = T.lookAwayDurationMs || 3500;
                if (elapsed >= minGazeDuration) {
                    const canEmit = !eyeGazeViolationEmittedRef.current || (now - lastEyeGazeEmitTimeRef.current >= 3000);
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
            // Clean immediate reset when eyes return to screen
            eyeGazeStartRef.current = null;
            eyeGazeViolationEmittedRef.current = false;
            gazeAwayStateRef.current = false;
            eyeGazeCenterFramesRef.current = 0;
        }

        if (frameCountRef.current % 20 === 0) {
            debugLog("HEAD", `ratio=${currentHeadTurnRatio.toFixed(3)}, turned=${isHeadTurnedNow}, dir=${headTurnDirection || 'center'}`);
            debugLog("GAZE", `ratio=${avgGaze.toFixed(3)}, away=${isGazeAway}, blinking=${isBlinking}`);
        }
        } catch (err) {
            console.error("[PROCTORING] Error in processFaceMeshResults:", err);
            recordError("facemesh-process", err);
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

    // ── Real-time Object Detection Loop (Hardware-Accelerated WebGL) ───────────
    useEffect(() => {
        if (!isActive || !objectModelReady || !videoElement) return;

        let active = true;
        let isProcessing = false;
        let timeoutId = null;

        const runDetection = async () => {
            if (!active) return;

            const video = videoRef.current;
            if (!isProcessing && isActiveRef.current && video && video.readyState >= 2) {
                isProcessing = true;
                try {
                    const predictions = await detectFrame(landmarksRef.current);
                    if (predictions && Array.isArray(predictions) && active) {
                        setDetections(predictions);

                        // ── Detect Multiple People with IoU Deduplication ───────────
                        // COCO-SSD often outputs multiple overlapping person boxes for the same candidate.
                        // We deduplicate them so the same person is NEVER counted twice.
                        const rawPeople = predictions.filter(p => {
                            const cls = (p.class || '').toLowerCase().trim();
                            return (
                                cls === 'person' ||
                                cls === 'man' ||
                                cls === 'woman' ||
                                cls === 'boy' ||
                                cls === 'girl'
                            ) && p.score >= 0.35;
                        });

                        const distinctPeople = [];
                        for (const p of rawPeople) {
                            let isDup = false;
                            for (const existing of distinctPeople) {
                                const iou = computeIoU(p.bbox, existing.bbox);
                                const pcx = p.bbox.x + p.bbox.width / 2;
                                const pcy = p.bbox.y + p.bbox.height / 2;
                                const insideExisting = pcx >= existing.bbox.x && pcx <= (existing.bbox.x + existing.bbox.width) &&
                                                       pcy >= existing.bbox.y && pcy <= (existing.bbox.y + existing.bbox.height);
                                if (iou > 0.20 || insideExisting) {
                                    isDup = true;
                                    break;
                                }
                            }
                            if (!isDup) distinctPeople.push(p);
                        }

                        if (distinctPeople.length > 1) {
                            multipleFacesStreakRef.current += 1;
                            if (multipleFacesStreakRef.current >= 4) {
                                const now = Date.now();
                                const canEmit = !multipleFacesViolationEmittedRef.current || (now - lastMultipleFacesEmitTimeRef.current >= 4000);
                                if (canEmit && isActiveRef.current) {
                                    emitViolation(
                                        "MULTIPLE_PEOPLE",
                                        `${distinctPeople.length} people detected in camera frame. (Ranking: 2)`,
                                        { faceCount: distinctPeople.length }
                                    );
                                    multipleFacesViolationEmittedRef.current = true;
                                    lastMultipleFacesEmitTimeRef.current = now;
                                }
                            }
                        } else if (distinctPeople.length === 0) {
                            yoloZeroPeopleStreakRef.current = (yoloZeroPeopleStreakRef.current || 0) + 1;
                            if (yoloZeroPeopleStreakRef.current >= 3) {
                                const canEmit = !noPersonViolationEmittedRef.current || (Date.now() - lastNoPersonEmitTimeRef.current >= 3000);
                                if (canEmit && isActiveRef.current) {
                                    emitViolation(
                                        "NO_PEOPLE",
                                        "No face or person detected in camera frame (candidate moved away). (Ranking: 1)",
                                        { faceCount: 0, source: "yolo" }
                                    );
                                    noPersonViolationEmittedRef.current = true;
                                    lastNoPersonEmitTimeRef.current = Date.now();
                                }
                            }
                        } else {
                            yoloZeroPeopleStreakRef.current = 0;
                        }

                        // Track detected suspicious types (PHONE_DETECTED and OBJECT_DETECTED)
                        const activeTypes = new Map();
                        predictions.forEach(p => {
                            const objConfig = getSuspiciousObjectConfig(p.class);
                            if (objConfig) {
                                const isPhone = objConfig.type === "PHONE_DETECTED";
                                const threshold = isPhone
                                    ? (T.phoneConfidenceThreshold || 0.20)
                                    : (T.objectConfidenceThreshold || 0.22);
                                if (p.score >= threshold) {
                                    const existing = activeTypes.get(objConfig.type);
                                    if (!existing || p.score > existing.score) {
                                        activeTypes.set(objConfig.type, { config: objConfig, score: p.score, class: p.class });
                                    }
                                }
                            }
                        });

                        const WINDOW_SIZE = 2;
                        ["PHONE_DETECTED", "OBJECT_DETECTED"].forEach(vType => {
                            const history = objectHistoryRef.current[vType] || [];
                            const detectedObj = activeTypes.get(vType);
                            const isDetectedThisFrame = !!detectedObj;
                            const score = detectedObj ? detectedObj.score : 0;

                            history.push({ detected: isDetectedThisFrame, score, obj: detectedObj });
                            if (history.length > WINDOW_SIZE) {
                                history.shift();
                            }
                            objectHistoryRef.current[vType] = history;

                            const detectedFramesCount = history.filter(h => h.detected).length;
                            const averageConfidence = detectedFramesCount > 0 
                                ? history.filter(h => h.detected).reduce((sum, h) => sum + h.score, 0) / detectedFramesCount 
                                : 0;

                            const isPhone = vType === "PHONE_DETECTED";
                            const requiredFrames = isPhone ? 1 : 2;
                            const threshold = isPhone ? (T.phoneConfidenceThreshold || 0.20) : (T.objectConfidenceThreshold || 0.22);
                            const isConfirmed = detectedFramesCount >= requiredFrames && averageConfidence >= threshold;

                            if (isConfirmed && detectedObj) {
                                emitViolation(
                                    vType,
                                    `${detectedObj.config.label} detected in camera frame (Temporal confirmation: ${detectedFramesCount}/${WINDOW_SIZE} frames, avg conf: ${(averageConfidence * 100).toFixed(0)}%). (Ranking: ${detectedObj.config.ranking})`,
                                    {
                                        confidence: averageConfidence,
                                        label: detectedObj.config.label,
                                        class: detectedObj.class,
                                        model: objectModelType || 'COCO-SSD',
                                        severity: isPhone ? 'critical' : 'medium',
                                    }
                                );
                            }
                        });
                    }
                } catch (err) {
                    recordError("yolo-frame-detect", err);
                } finally {
                    isProcessing = false;
                }
            }

            if (active) {
                // Run at 100ms interval (10 FPS) for smooth real-time tracking
                timeoutId = setTimeout(runDetection, 100);
            }
        };

        // Trigger immediately on model readiness — no initial delay!
        runDetection();

        return () => {
            active = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isActive, objectModelReady, videoElement, T, emitViolation, detectFrame]);

    // Reset calibration state when session ends
    useEffect(() => {
        if (!isActive) {
            calibrationStartRef.current = null;
            calibrationSamplesRef.current = { headRatios: [], noseOffsets: [], gazeRatios: [], pitchRatios: [] };
            calibrationDoneRef.current = false;
            calibrationBaselineRef.current = { headRatio: 1.0, noseOffset: 0.0, gazeRatio: 0.5, pitchRatio: 1.15 };
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
        yoloReady,
        cocoReady,
        faceCount,
        headTurnRatio,
        gazeRatio,
        landmarks,
        detections,
    };
}
