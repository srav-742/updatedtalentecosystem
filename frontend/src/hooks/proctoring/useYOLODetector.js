import { useEffect, useRef, useState, useCallback } from "react";
import { logDiag, recordError, recordInferenceTime } from "../../utils/proctoringDiagnostics";
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

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

/**
 * useYOLODetector
 * ──────────────────────────────────────────────────────────────────────────────
 * Production-ready Object Detection hook with Web Worker offloading & multi-CDN failover.
 * Primary: COCO-SSD running in a Web Worker to avoid main-thread blocking (CPU < 1%).
 * Fallback: Main-thread WebGL/CPU-based COCO-SSD if Web Workers/Blob URLs are blocked.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const CONFIDENCE_THRESHOLD = 0.35; // Lowered to pass raw detections to tracker & temporal engine

// Multi-CDN sources for worker script imports
const TFJS_CDN_URLS = [
    "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/tensorflow/4.20.0/tf.min.js",
    "https://unpkg.com/@tensorflow/tfjs@4.20.0/dist/tf.min.js",
];

const COCO_SSD_CDN_URLS = [
    "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js",
    "https://unpkg.com/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js",
];

// Dynamic inline Web Worker source string
const createProctoringWorker = () => {
    const code = `
        let model = null;
        let isInitializing = false;

        async function tryImportScripts(urls) {
            for (const url of urls) {
                try {
                    importScripts(url);
                    return true;
                } catch (e) {
                    console.warn("[Worker] Script import failed for " + url + ":", e.message);
                }
            }
            return false;
        }

        self.onmessage = async function(e) {
            const { type, data } = e.data;

            if (type === 'init') {
                if (model) {
                    self.postMessage({ type: 'init-ready', success: true });
                    return;
                }
                if (isInitializing) return;
                isInitializing = true;

                try {
                    const tfLoaded = await tryImportScripts([
                        "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js",
                        "https://cdnjs.cloudflare.com/ajax/libs/tensorflow/4.20.0/tf.min.js",
                        "https://unpkg.com/@tensorflow/tfjs@4.20.0/dist/tf.min.js"
                    ]);
                    const cocoLoaded = await tryImportScripts([
                        "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js",
                        "https://unpkg.com/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js"
                    ]);

                    if (!tfLoaded || !cocoLoaded || !self.tf || !self.cocoSsd) {
                        throw new Error("Worker failed to import TFJS or COCO-SSD from CDNs");
                    }

                    await self.tf.ready();
                    try {
                        await self.tf.setBackend('cpu');
                    } catch (bErr) {
                        console.warn("[Worker] Unable to set CPU backend explicitly:", bErr);
                    }

                    const modelUrl = data && data.modelUrl;
                    let loaded = false;

                    if (modelUrl) {
                        try {
                            console.log("[Worker] Loading model from URL:", modelUrl);
                            model = await self.cocoSsd.load({ modelUrl: modelUrl });
                            loaded = true;
                        } catch (localErr) {
                            console.warn("[Worker] Local model fetch failed, falling back to CDN:", localErr.message);
                        }
                    }

                    if (!loaded) {
                        console.log("[Worker] Loading default CDN COCO-SSD model...");
                        model = await self.cocoSsd.load();
                    }

                    self.postMessage({ type: 'init-ready', success: true });
                } catch (err) {
                    console.error("[Worker] Init failed:", err);
                    self.postMessage({ type: 'init-ready', success: false, error: err.message });
                } finally {
                    isInitializing = false;
                }
            }

            if (type === 'detect') {
                if (!model) {
                    self.postMessage({ type: 'detect-res', id: data.id, predictions: [], error: 'Model not initialized' });
                    return;
                }

                try {
                    const { imageBitmap, id } = data;
                    const predictions = await model.detect(imageBitmap);
                    imageBitmap.close(); // Clean up image memory instantly

                    self.postMessage({ type: 'detect-res', id, predictions });
                } catch (err) {
                    self.postMessage({ type: 'detect-res', id: data.id, predictions: [], error: err.message });
                }
            }
        };
    `;

    const blob = new Blob([code], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    // Revoke object URL after worker instantiation to avoid memory leaks
    setTimeout(() => URL.revokeObjectURL(workerUrl), 5000);
    return worker;
};

// Global Session Cache for Worker & Main-Thread Fallback Model
let _globalWorker = null;
let _globalWorkerStatus = 'uninitialized';
let globalWorkerInitPromise = null;
let activeWorkerListener = null;

let globalMainModel = null;
let globalMainModelInitPromise = null;

const initWorkerSession = (modelUrl) => {
    if (globalWorkerInitPromise) {
        return globalWorkerInitPromise;
    }

    globalWorkerInitPromise = new Promise((resolve, reject) => {
        try {
            logDiag("YOLO Worker", "Spawning global Web Worker...");
            const worker = createProctoringWorker();
            _globalWorker = worker;
            _globalWorkerStatus = 'initializing';

            worker.onmessage = (e) => {
                const { type, success, error } = e.data;
                if (type === 'init-ready') {
                    if (success) {
                        logDiag("YOLO Worker", "Web Worker initialized successfully.");
                        _globalWorkerStatus = 'ready';
                        if (window.__proctoring_diagnostics) {
                            window.__proctoring_diagnostics.workerStatus = 'ready';
                        }
                        resolve(worker);
                    } else {
                        _globalWorkerStatus = 'failed';
                        if (window.__proctoring_diagnostics) {
                            window.__proctoring_diagnostics.workerStatus = 'failed';
                            window.__proctoring_diagnostics.workerError = error;
                        }
                        reject(new Error(error || "Worker initialization failed"));
                    }
                }
                if (activeWorkerListener) {
                    activeWorkerListener(e);
                }
            };

            worker.postMessage({ type: 'init', data: { modelUrl } });
        } catch (err) {
            _globalWorkerStatus = 'failed';
            recordError("worker-spawn", err);
            reject(err);
        }
    });

    return globalWorkerInitPromise;
};

const loadWithFailover = async (cdnUrls) => {
    let lastErr = null;
    for (const url of cdnUrls) {
        try {
            await loadScript(url);
            return true;
        } catch (e) {
            lastErr = e;
            console.warn(`[YOLO Detector] Failed script load from ${url}:`, e.message);
        }
    }
    throw lastErr || new Error("All CDN script sources failed");
};

const initMainThreadModel = async (modelUrl) => {
    if (globalMainModel) return globalMainModel;

    if (globalMainModelInitPromise) {
        return globalMainModelInitPromise;
    }

    globalMainModelInitPromise = (async () => {
        const startTime = Date.now();
        logDiag("YOLO Fallback", "Initializing TFJS & COCO-SSD on main thread...");

        logDiag("YOLO Fallback", "Setting up WebGL backend...");
        try {
            await tf.setBackend("webgl");
            await tf.ready();
            if (window.__proctoring_diagnostics) {
                window.__proctoring_diagnostics.tfBackend = "webgl";
                window.__proctoring_diagnostics.tfReady = true;
            }
            logDiag("YOLO Fallback", "WebGL backend ready.");
        } catch (webglErr) {
            logDiag("YOLO Fallback", `WebGL failed, falling back to CPU: ${webglErr.message}`);
            await tf.setBackend("cpu");
            await tf.ready();
            if (window.__proctoring_diagnostics) {
                window.__proctoring_diagnostics.tfBackend = "cpu";
                window.__proctoring_diagnostics.tfReady = true;
            }
        }

        let model;
        if (modelUrl) {
            try {
                logDiag("YOLO Fallback", `Loading local model from ${modelUrl}`);
                model = await cocoSsd.load({ modelUrl });
            } catch (localLoadErr) {
                logDiag("YOLO Fallback", `Local load failed (${localLoadErr.message}), trying default CDN model...`);
                model = await cocoSsd.load();
            }
        } else {
            model = await cocoSsd.load();
        }

        globalMainModel = model;
        if (window.__proctoring_diagnostics) {
            window.__proctoring_diagnostics.modelLoaded = true;
        }
        logDiag("YOLO Fallback", `COCO-SSD loaded in ${Date.now() - startTime}ms.`);
        return model;
    })().catch((err) => {
        globalMainModelInitPromise = null;
        recordError("main-thread-init", err);
        throw err;
    });

    return globalMainModelInitPromise;
};

export function useYOLODetector({ isActive = false, videoElement = null }) {
    const [modelReady, setModelReady] = useState(false);
    const [engineType, setEngineType] = useState(null); // 'coco-ssd-worker' | 'coco-ssd-fallback'
    const [detections, setDetections] = useState([]);

    const workerRef = useRef(null);
    const workerReadyRef = useRef(false);
    const cocoModelRef = useRef(null);
    const canvasRef = useRef(null);
    const pendingDetectionsRef = useRef({});

    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        const initDetector = async () => {
            const base = import.meta.env.BASE_URL || "/";
            const modelUrl = window.location.origin + (base.endsWith('/') ? base : base + '/') + "models/coco-ssd/model.json";

            activeWorkerListener = (e) => {
                if (cancelled) return;
                const { type, id, predictions } = e.data;

                if (type === 'detect-res') {
                    const resolver = pendingDetectionsRef.current[id];
                    if (resolver) {
                        delete pendingDetectionsRef.current[id];

                        const filtered = (predictions || [])
                            .filter(p => p.score >= CONFIDENCE_THRESHOLD)
                            .map(p => ({
                                class: p.class,
                                score: p.score,
                                bbox: { x: p.bbox[0], y: p.bbox[1], width: p.bbox[2], height: p.bbox[3] }
                            }));
                        setDetections(filtered);
                        recordInferenceTime(0, filtered);
                        resolver(filtered);
                    }
                }
            };

            // Attempt 1: Web Worker
            try {
                const worker = await initWorkerSession(modelUrl);
                if (cancelled) return;

                workerRef.current = worker;
                workerReadyRef.current = true;
                setEngineType('coco-ssd-worker');
                setModelReady(true);
            } catch (err) {
                logDiag("YOLO Detector", `Worker init failed (${err.message}), using main-thread fallback`);
                if (cancelled) return;
                initMainThreadFallback(modelUrl);
            }
        };

        const initMainThreadFallback = async (modelUrl) => {
            try {
                const model = await initMainThreadModel(modelUrl);
                if (cancelled) return;

                cocoModelRef.current = model;
                setEngineType('coco-ssd-fallback');
                setModelReady(true);
            } catch (cocoErr) {
                recordError("detector-fallback-init", cocoErr);
            }
        };

        initDetector();

        return () => {
            cancelled = true;
            activeWorkerListener = null;
            Object.values(pendingDetectionsRef.current).forEach(resolve => resolve([]));
            pendingDetectionsRef.current = {};
        };
    }, [isActive]);

    const runLocalDetect = useCallback(async (canvas) => {
        if (!cocoModelRef.current) return [];
        const start = Date.now();
        try {
            const preds = await cocoModelRef.current.detect(canvas);
            const duration = Date.now() - start;
            const filtered = preds
                .filter(p => p.score >= CONFIDENCE_THRESHOLD)
                .map(p => ({
                    class: p.class,
                    score: p.score,
                    bbox: { x: p.bbox[0], y: p.bbox[1], width: p.bbox[2], height: p.bbox[3] }
                }));
            setDetections(filtered);
            recordInferenceTime(duration, filtered);
            return filtered;
        } catch (err) {
            recordError("local-detect", err);
            return [];
        }
    }, []);

    const detectFrame = useCallback(async () => {
        if (!modelReady || !videoElement || videoElement.readyState < 2) return [];

        const vWidth = videoElement.videoWidth || 640;
        const vHeight = videoElement.videoHeight || 480;

        if (!canvasRef.current) {
            canvasRef.current = document.createElement("canvas");
        }
        const canvas = canvasRef.current;
        if (canvas.width !== vWidth || canvas.height !== vHeight) {
            canvas.width = vWidth;
            canvas.height = vHeight;
        }

        const ctx = canvas.getContext("2d");
        try {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        } catch (e) {
            return [];
        }

        if (workerRef.current && workerReadyRef.current) {
            return new Promise((resolve) => {
                const frameId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                pendingDetectionsRef.current[frameId] = resolve;

                createImageBitmap(canvas).then((imageBitmap) => {
                    workerRef.current.postMessage(
                        { type: 'detect', data: { imageBitmap, id: frameId } },
                        [imageBitmap]
                    );
                }).catch((err) => {
                    delete pendingDetectionsRef.current[frameId];
                    runLocalDetect(canvas).then(resolve);
                });
            });
        } else {
            return runLocalDetect(canvas);
        }
    }, [modelReady, videoElement, runLocalDetect]);

    return {
        modelReady,
        engineType,
        detections,
        detectFrame,
    };
}
