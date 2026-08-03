import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { logDiag, recordError, recordInferenceTime, getOrCreateDiagnostics } from "../utils/proctoringDiagnostics";

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
    headTurnRatioHigh: 2.0,       // Nose-to-cheek ratio > this → looking far right
    headTurnRatioLow: 0.5,        // Nose-to-cheek ratio < this → looking far left
    gazeSwipeCount: 3,            // Consecutive left-right sweeps to trigger
    gazeSwipeWindowMs: 4000,      // Sliding window for sweep detection
    noPersonTimeoutMs: 5000,      // How long 0 faces before flagging
    phoneConfidenceThreshold: 0.35, // Adjusted to 0.35 to allow moving average confirmation
    objectConfidenceThreshold: 0.45,
    phoneRequiredFrames: 2,
    objectRequiredFrames: 2,
    sideGazeRatioLow: 0.35,       // Gaze horizontal ratio < this → looking to the left
    sideGazeRatioHigh: 0.65,      // Gaze horizontal ratio > this → looking to the right
    detectionIntervalMs: 500,     // How often to run FaceMesh frame analysis
    objectDetectionIntervalMs: 1000, // Run check every 1 second
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
    "cell phone": { type: "PHONE_DETECTED", label: "Cell phone", ranking: 6 },
    "laptop": { type: "OBJECT_DETECTED", label: "Secondary laptop/computer", ranking: 6 },
    "book": { type: "OBJECT_DETECTED", label: "Book/reading material", ranking: 5 },
    "tv": { type: "OBJECT_DETECTED", label: "Television/monitor", ranking: 6 },
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

const initTfAndModel = async (localOrigin) => {
    if (cachedCocoModel) return cachedCocoModel;

    if (tfInitPromise) {
        return tfInitPromise;
    }

    tfInitPromise = (async () => {
        const startTime = Date.now();
        logDiag("AI Proctoring", "Loading TFJS & COCO-SSD scripts with CDN failover...");

        await loadScriptWithFailover(TFJS_CDN_URLS);
        await loadScriptWithFailover(COCO_SSD_CDN_URLS);

        const tf = window.tf;
        const cocoSsd = window.cocoSsd;

        if (!tf || !cocoSsd) {
            throw new Error("TensorFlow or COCO-SSD script could not be resolved from window object");
        }

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

        const safeOrigin = (localOrigin && localOrigin !== "null") ? localOrigin : window.location.origin;
        logDiag("AI Proctoring", `Loading COCO-SSD model from ${safeOrigin}/models/coco-ssd/model.json`);
        
        try {
            let model;
            try {
                model = await cocoSsd.load({ modelUrl: safeOrigin + "/models/coco-ssd/model.json" });
            } catch (localLoadErr) {
                logDiag("AI Proctoring", `Local model load failed (${localLoadErr.message}), falling back to default CDN model...`);
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
    const cocoModelRef = useRef(null);
    const onnxSessionRef = useRef(null);
    const detectionCanvasRef = useRef(null);
    const rafIdRef = useRef(null);
    const isActiveRef = useRef(isActive);
    const isAnsweringRef = useRef(isAnswering);
    const videoRef = useRef(videoElement);
    const onViolationRef = useRef(onViolation);
    const processFaceMeshResultsRef = useRef(null);

    const lastViolationTimeRef = useRef({});
    const VIOLATION_COOLDOWN_MS = 5000;
    const PHONE_VIOLATION_COOLDOWN_MS = 8000;
    const OBJECT_VIOLATION_COOLDOWN_MS = 15000;

    const noPersonTimerRef = useRef(null);
    const gazeHistoryRef = useRef([]);
    const sideGazeStartRef = useRef(null);
    const sideGazeViolationEmittedRef = useRef(false);

    const multipleFacesStreakRef = useRef(0);
    const objectHistoryRef = useRef({});
    const headTurnStreakRef = useRef(0);

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

    // ── Object Detection Initialization (COCO-SSD) ──────────────────────────
    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        const initObjectDetection = async () => {
            try {
                const model = await initTfAndModel(window.location.origin);
                if (cancelled) return;

                cocoModelRef.current = model;
                setObjectModelReady(true);
                setObjectModelType("coco-ssd");
            } catch (err) {
                recordError("coco-init", err);
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
            if (!noPersonTimerRef.current) {
                noPersonTimerRef.current = setTimeout(() => {
                    if (isActiveRef.current) {
                        emitViolation(
                            "NO_PEOPLE",
                            "No face detected in camera frame for over 5 seconds. (Ranking: 4)",
                            { faceCount: 0 }
                        );
                    }
                    noPersonTimerRef.current = null;
                }, T.noPersonTimeoutMs);
            }
            setLandmarks(null);
            return;
        }

        if (noPersonTimerRef.current) {
            clearTimeout(noPersonTimerRef.current);
            noPersonTimerRef.current = null;
        }

        if (count > 1) {
            multipleFacesStreakRef.current += 1;
            if (multipleFacesStreakRef.current >= 3) {
                emitViolation(
                    "MULTIPLE_PEOPLE",
                    `${count} faces detected in camera frame. (Ranking: 7)`,
                    { faceCount: count }
                );
            }
        } else {
            multipleFacesStreakRef.current = 0;
        }

        const face = validFaces[0];
        setLandmarks(face);

        let isLookingSide = false;

        const nose = face[1];
        const leftCheek = face[234];
        const rightCheek = face[454];

        let isHeadTurnedNow = false;
        let headTurnDirection = null;
        let currentHeadTurnRatio = 1.0;

        if (nose && leftCheek && rightCheek) {
            const distLeft = euclidean(nose, leftCheek);
            const distRight = euclidean(nose, rightCheek);
            currentHeadTurnRatio = distRight > 0.001 ? distLeft / distRight : 1;
            setHeadTurnRatio(currentHeadTurnRatio);

            if (currentHeadTurnRatio > T.headTurnRatioHigh || currentHeadTurnRatio < T.headTurnRatioLow) {
                isHeadTurnedNow = true;
                headTurnDirection = currentHeadTurnRatio > T.headTurnRatioHigh ? "right" : "left";
            }
        }

        if (isHeadTurnedNow) {
            isLookingSide = true;
            headTurnStreakRef.current += 1;
            if (headTurnStreakRef.current >= 3) {
                const violationType = isAnsweringRef.current
                    ? "HEAD_TURNED_WHILE_ANSWERING"
                    : "HEAD_TURNED";
                emitViolation(
                    violationType,
                    `Head turned excessively to the ${headTurnDirection}. (Ranking: 3)`,
                    { headTurnRatio: currentHeadTurnRatio, direction: headTurnDirection }
                );
            }
        } else {
            headTurnStreakRef.current = 0;
        }

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

                const avgGaze = (leftRatio + rightRatio) / 2;
                setGazeRatio(avgGaze);

                if (avgGaze < T.sideGazeRatioLow || avgGaze > T.sideGazeRatioHigh) {
                    isLookingSide = true;
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
                            gazeHistoryRef.current = [];
                        }
                    }
                }
            }
        }

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

    // ── Object detection loop (COCO-SSD via canvas frame capture) ───────────
    useEffect(() => {
        if (!isActive || !objectModelReady || !videoElement) return;

        if (!detectionCanvasRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            detectionCanvasRef.current = canvas;
        }
        const canvas = detectionCanvasRef.current;
        const ctx = canvas.getContext('2d');

        const intervalId = setInterval(async () => {
            if (!isActiveRef.current) return;

            const video = videoRef.current;
            if (!video || video.readyState < 2) return;

            try {
                if (cocoModelRef.current) {
                    try {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    } catch {
                        return;
                    }

                    const startInference = Date.now();
                    const predictions = await cocoModelRef.current.detect(canvas);
                    const duration = Date.now() - startInference;

                    recordInferenceTime(duration, predictions || []);
                    setDetections(predictions || []);

                    const activeObjects = new Set();
                    (predictions || []).forEach(p => {
                        const objConfig = SUSPICIOUS_OBJECTS[p.class];
                        if (objConfig) {
                            const threshold = p.class === "cell phone"
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
                        
                        const threshold = objType === "cell phone" ? T.phoneConfidenceThreshold : T.objectConfidenceThreshold;
                        const match = (predictions || []).find(p => p.class === objType && p.score >= threshold);
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

                        const requiredFrames = objType === "cell phone" ? T.phoneRequiredFrames : T.objectRequiredFrames;
                        const isConfirmed = detectedFramesCount >= requiredFrames && averageConfidence >= threshold;

                        if (isConfirmed) {
                            const objConfig = SUSPICIOUS_OBJECTS[objType];
                            emitViolation(
                                objConfig.type,
                                `${objConfig.label} detected in camera frame (Temporal confirmation: ${detectedFramesCount}/${WINDOW_SIZE} frames, avg conf: ${(averageConfidence * 100).toFixed(0)}%). (Ranking: ${objConfig.ranking})`,
                                { confidence: averageConfidence, label: objConfig.label }
                            );
                        }
                    });
                }
            } catch (err) {
                recordError("coco-frame-detect", err);
                const tf = window.tf;
                if (tf && tf.getBackend() === "webgl") {
                    logDiag("AI-Proctoring", "WebGL inference failed, switching to CPU backend...");
                    try {
                        await tf.setBackend("cpu");
                        await tf.ready();
                        const diag = getOrCreateDiagnostics();
                        if (diag) diag.tfBackend = "cpu";
                    } catch {
                        // Fallback ignore
                    }
                }
            }
        }, T.objectDetectionIntervalMs);

        return () => clearInterval(intervalId);
    }, [isActive, objectModelReady, videoElement, T, emitViolation]);

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
