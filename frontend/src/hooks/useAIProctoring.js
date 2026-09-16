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
 * ──────────────────────────────────────────────────────────────────────────────
 */

const DEFAULT_THRESHOLDS = {
    headTurnRatioHigh: 1.42,       // Nose-to-cheek ratio > this → looking right
    headTurnRatioLow: 0.70,        // Nose-to-cheek ratio < this → looking left
    gazeSwipeCount: 3,            // Consecutive left-right sweeps to trigger
    gazeSwipeWindowMs: 4000,      // Sliding window for sweep detection
    noPersonTimeoutMs: 3000,      // 3 seconds no face before flagging (as requested)
    phoneConfidenceThreshold: 0.40, // Optimal for COCO
    objectConfidenceThreshold: 0.45, // Optimal for COCO
    phoneRequiredFrames: 2,        // 2 frames (at 1000ms interval) = ~2s detection
    objectRequiredFrames: 2,       // 2 frames (at 1000ms interval) = ~2s detection
    sideGazeRatioLow: 0.38,       // Gaze horizontal ratio < this → looking to the left
    sideGazeRatioHigh: 0.62,      // Gaze horizontal ratio > this → looking to the right
    detectionIntervalMs: 500,     // How often to run FaceMesh frame analysis
    objectDetectionIntervalMs: 1000, // Run object check every 1000ms (1 FPS) to prevent video stuttering
    onnxLoadTimeoutMs: 8000,
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

const SUSPICIOUS_OBJECTS = {
    // ── COCO-80 Classes (CDN YOLO model + COCO-SSD fallback) ──
    "cell phone": { type: "PHONE_DETECTED", label: "Cell phone", ranking: 2 },
    "book": { type: "OBJECT_DETECTED", label: "Paper/document", ranking: 2 },
    "laptop": { type: "OBJECT_DETECTED", label: "Secondary laptop", ranking: 2 },
    "remote": { type: "OBJECT_DETECTED", label: "Remote control", ranking: 2 },
    "keyboard": { type: "OBJECT_DETECTED", label: "External keyboard", ranking: 2 },
    "mouse": { type: "OBJECT_DETECTED", label: "External mouse", ranking: 2 },
    "tv": { type: "OBJECT_DETECTED", label: "Secondary monitor", ranking: 2 },
    "backpack": { type: "OBJECT_DETECTED", label: "Bag detected", ranking: 2 },
    "handbag": { type: "OBJECT_DETECTED", label: "Bag detected", ranking: 2 },
    "suitcase": { type: "OBJECT_DETECTED", label: "Bag/suitcase", ranking: 2 },
    "bottle": { type: "OBJECT_DETECTED", label: "Bottle", ranking: 2 },
    "cup": { type: "OBJECT_DETECTED", label: "Cup/container", ranking: 2 },
    "scissors": { type: "OBJECT_DETECTED", label: "Scissors", ranking: 2 },

    // ── Open Images V7 Classes (local YOLO OIV7 model) ──
    "Mobile phone": { type: "PHONE_DETECTED", label: "Cell phone", ranking: 2 },
    "Telephone": { type: "PHONE_DETECTED", label: "Cell phone", ranking: 2 },
    "Ipod": { type: "PHONE_DETECTED", label: "Mobile device", ranking: 2 },
    "Book": { type: "OBJECT_DETECTED", label: "Paper/document", ranking: 2 },
    "Laptop": { type: "OBJECT_DETECTED", label: "Secondary laptop", ranking: 2 },
    "Tablet computer": { type: "OBJECT_DETECTED", label: "Tablet device", ranking: 2 },
    "Computer monitor": { type: "OBJECT_DETECTED", label: "Secondary monitor", ranking: 2 },
    "Computer keyboard": { type: "OBJECT_DETECTED", label: "External keyboard", ranking: 2 },
    "Computer mouse": { type: "OBJECT_DETECTED", label: "External mouse", ranking: 2 },
    "Remote control": { type: "OBJECT_DETECTED", label: "Remote control", ranking: 2 },
    "Television": { type: "OBJECT_DETECTED", label: "Secondary monitor", ranking: 2 },
    "Bottle": { type: "OBJECT_DETECTED", label: "Bottle", ranking: 2 },
    "Mug": { type: "OBJECT_DETECTED", label: "Cup/container", ranking: 2 },
    "Pen": { type: "OBJECT_DETECTED", label: "Pen/writing instrument", ranking: 2 },
    "Pencil case": { type: "OBJECT_DETECTED", label: "Pencil", ranking: 2 },
    "Headphones": { type: "OBJECT_DETECTED", label: "Earphones/Headphones/Buds", ranking: 2 },
    "Envelope": { type: "OBJECT_DETECTED", label: "Paper/Envelope", ranking: 2 },
    "Backpack": { type: "OBJECT_DETECTED", label: "Bag detected", ranking: 2 },
    "Handbag": { type: "OBJECT_DETECTED", label: "Bag detected", ranking: 2 },
    "Suitcase": { type: "OBJECT_DETECTED", label: "Bag/suitcase", ranking: 2 },
    "Briefcase": { type: "OBJECT_DETECTED", label: "Briefcase", ranking: 2 },
    "Luggage and bags": { type: "OBJECT_DETECTED", label: "Bag detected", ranking: 2 },
    "Ring binder": { type: "OBJECT_DETECTED", label: "Binder/notebook", ranking: 2 },
    "Corded phone": { type: "PHONE_DETECTED", label: "Phone detected", ranking: 2 },
};

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

    const lookingAwayStartRef = useRef(null);
    const lookingAwayViolationEmittedRef = useRef(false);
    const lastLookingAwayEmitTimeRef = useRef(0);

    const gazeHistoryRef = useRef([]);
    const multipleFacesStreakRef = useRef(0);
    const objectHistoryRef = useRef({});

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
                logDiag("AI-Proctoring", "Loading MediaPipe FaceMesh script...");
                await loadScriptWithFailover(MEDIAPIPE_CDN_URLS.map(u => `${u}/face_mesh.js`));

                if (cancelled) return;

                const FaceMesh = window.FaceMesh;
                if (!FaceMesh) {
                    logDiag("AI-Proctoring", "FaceMesh class not found on window after script load");
                    return;
                }

                logDiag("AI-Proctoring", "Initializing FaceMesh engine...");
                const mesh = new FaceMesh({
                    locateFile: (file) => `${MEDIAPIPE_CDN_URLS[0]}/${file}`,
                });

                mesh.setOptions({
                    maxNumFaces: 3,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.60,
                    minTrackingConfidence: 0.60,
                });

                mesh.onResults((results) => {
                    if (!isActiveRef.current) return;
                    processFaceMeshResultsRef.current?.(results);
                });

                await mesh.initialize();

                if (cancelled) return;

                faceMeshRef.current = mesh;
                setFaceMeshReady(true);
                logDiag("AI-Proctoring", "MediaPipe FaceMesh initialized successfully");
            } catch (err) {
                recordError("facemesh-init", err);
            }
        };

        initFaceMesh();

        return () => {
            cancelled = true;
        };
    }, [isActive]);

    // COCO-SSD initialization removed (handled by useYOLODetector)

    // ── Process FaceMesh results ────────────────────────────────────────────
    const processFaceMeshResults = useCallback((results) => {
        const faces = results.multiFaceLandmarks || [];
        
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
            return width > 0.08 && height > 0.08;
        });

        const count = validFaces.length;
        setFaceCount(count);

        if (count === 0) {
            multipleFacesStreakRef.current = 0;
            lookingAwayStartRef.current = null;
            lookingAwayViolationEmittedRef.current = false;

            const now = Date.now();
            if (!noPersonStartRef.current) {
                noPersonStartRef.current = now;
            } else {
                const elapsed = now - noPersonStartRef.current;
                if (elapsed >= 3000) {
                    const canEmit = !noPersonViolationEmittedRef.current || (now - lastNoPersonEmitTimeRef.current >= 3500);
                    if (canEmit && isActiveRef.current) {
                        emitViolation(
                            "NO_PEOPLE",
                            `No face detected in camera frame for over ${(elapsed / 1000).toFixed(0)} seconds (candidate moved away). (Ranking: 1)`,
                            { faceCount: 0, duration: elapsed / 1000 }
                        );
                        noPersonViolationEmittedRef.current = true;
                        lastNoPersonEmitTimeRef.current = now;
                    }
                }
            }
            setLandmarks(null);
            return;
        }

        // Face is present, reset no-person tracking
        noPersonStartRef.current = null;
        noPersonViolationEmittedRef.current = false;

        if (count > 1) {
            multipleFacesStreakRef.current += 1;
            // Require sustained detection (~3.5 seconds at ~250ms interval) to prevent camera reflections,
            // background posters, or transient detection flickers from falsely flagging multiple people
            if (multipleFacesStreakRef.current >= 15) {
                emitViolation(
                    "MULTIPLE_PEOPLE",
                    `${count} faces detected in camera frame for over 3 seconds. (Ranking: 2)`,
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
            currentHeadTurnRatio = distRight > 0.001 ? distLeft / distRight : 1;
            setHeadTurnRatio(currentHeadTurnRatio);

            let noseEyeOffset = 0;
            if (leftEyeOuter && rightEyeOuter) {
                const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
                const eyeWidth = euclidean(leftEyeOuter, rightEyeOuter);
                noseEyeOffset = eyeWidth > 0.001 ? (nose.x - eyeMidX) / eyeWidth : 0;
            }

            if (currentHeadTurnRatio > T.headTurnRatioHigh || noseEyeOffset > 0.14) {
                isHeadTurnedNow = true;
                headTurnDirection = "right";
            } else if (currentHeadTurnRatio < T.headTurnRatioLow || noseEyeOffset < -0.14) {
                isHeadTurnedNow = true;
                headTurnDirection = "left";
            }
        }

        // Check vertical head pitch / looking down
        if (face[10] && face[152] && nose) {
            const distForehead = euclidean(face[10], nose);
            const distChin = euclidean(nose, face[152]);
            const pitchRatio = distChin > 0.001 ? distForehead / distChin : 1.0;
            if (pitchRatio > 1.75) {
                isHeadTurnedNow = true;
                headTurnDirection = "down";
            }
        }

        let isGazeAway = false;
        let avgGaze = 0.5;

        if (face.length > 473) {
            const leftIris = face[468];
            const leftInner = face[33];
            const leftOuter = face[133];
            const rightIris = face[473];
            const rightInner = face[362];
            const rightOuter = face[263];

            if (leftIris && leftInner && leftOuter && rightIris && rightInner && rightOuter) {
                const leftEyeWidth = euclidean(leftInner, leftOuter);
                const leftIrisOffset = euclidean(leftIris, leftOuter);
                const leftRatio = leftEyeWidth > 0.001 ? leftIrisOffset / leftEyeWidth : 0.5;

                const rightEyeWidth = euclidean(rightInner, rightOuter);
                const rightIrisOffset = euclidean(rightIris, rightOuter);
                const rightRatio = rightEyeWidth > 0.001 ? rightIrisOffset / rightEyeWidth : 0.5;

                avgGaze = (leftRatio + rightRatio) / 2;
                setGazeRatio(avgGaze);

                if (avgGaze < T.sideGazeRatioLow || avgGaze > T.sideGazeRatioHigh) {
                    isGazeAway = true;
                }

                const now = Date.now();
                const history = gazeHistoryRef.current;
                history.push({ ratio: avgGaze, ts: now });

                while (history.length > 0 && now - history[0].ts > T.gazeSwipeWindowMs) {
                    history.shift();
                }

                if (history.length >= 3) {
                    let directionChanges = 0;
                    for (let i = 2; i < history.length; i++) {
                        const prev = history[i - 1].ratio - history[i - 2].ratio;
                        const curr = history[i].ratio - history[i - 1].ratio;
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

        // ── 3-Second Temporal Rule for Lookaway & Head Turn ──────────────────────
        // If candidate turns head away (left or right) or looks away continuously for > 3 seconds,
        // it is recorded as an eye looking away flag with 1 penalty point.
        // Brief glances under 3 seconds do NOT trigger a violation.
        const isCandidateLookingAway = isHeadTurnedNow || isGazeAway;

        if (isCandidateLookingAway) {
            const now = Date.now();
            if (!lookingAwayStartRef.current) {
                lookingAwayStartRef.current = now;
            } else {
                const elapsed = now - lookingAwayStartRef.current;
                if (elapsed >= 3000) {
                    const canEmit = !lookingAwayViolationEmittedRef.current || (now - lastLookingAwayEmitTimeRef.current >= 3500);
                    if (canEmit && isActiveRef.current) {
                        const violationType = isAnsweringRef.current
                            ? "EYE_LOOKING_AWAY_WHILE_ANSWERING"
                            : "EYE_LOOKING_AWAY";
                        const detail = headTurnDirection
                            ? `Candidate turned head ${headTurnDirection} and looked away for over ${(elapsed / 1000).toFixed(0)} seconds. (Ranking: 1)`
                            : `Candidate looked away from screen for over ${(elapsed / 1000).toFixed(0)} seconds. (Ranking: 1)`;

                        emitViolation(
                            violationType,
                            detail,
                            {
                                duration: elapsed / 1000,
                                direction: headTurnDirection,
                                headTurnRatio: currentHeadTurnRatio,
                                gazeRatio: avgGaze,
                            }
                        );
                        lookingAwayViolationEmittedRef.current = true;
                        lastLookingAwayEmitTimeRef.current = now;
                    }
                }
            }
        } else {
            // Returned to looking straight ahead before 3s or after flag: reset timer
            lookingAwayStartRef.current = null;
            lookingAwayViolationEmittedRef.current = false;
        }
    }, [T, emitViolation]);

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
                    } catch {
                        // Frame drop tolerance
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

    // ── Object detection loop (YOLO via useYOLODetector) ───────────
    useEffect(() => {
        if (!isActive || !objectModelReady || !videoElement) return;

        const intervalId = setInterval(async () => {
            if (!isActiveRef.current) return;

            try {
                const predictions = await detectFrame();
                if (!predictions) return;

                setDetections(predictions);

                const activeObjects = new Set();
                predictions.forEach(p => {
                    const objConfig = SUSPICIOUS_OBJECTS[p.class];
                    if (objConfig) {
                        const isPhone = objConfig.type === "PHONE_DETECTED";
                        const threshold = isPhone
                            ? T.phoneConfidenceThreshold
                            : T.objectConfidenceThreshold;
                        if (p.score >= threshold) {
                            activeObjects.add(p.class);
                        }
                    }
                });

                const WINDOW_SIZE = 5;
                Object.keys(SUSPICIOUS_OBJECTS).forEach(objType => {
                    const history = objectHistoryRef.current[objType] || [];
                    const isDetectedThisFrame = activeObjects.has(objType);
                    
                    const objConfig = SUSPICIOUS_OBJECTS[objType];
                    const isPhone = objConfig && objConfig.type === "PHONE_DETECTED";
                    const threshold = isPhone ? T.phoneConfidenceThreshold : T.objectConfidenceThreshold;
                    const match = predictions.find(p => p.class === objType && p.score >= threshold);
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

                    const requiredFrames = isPhone ? T.phoneRequiredFrames : T.objectRequiredFrames;
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
