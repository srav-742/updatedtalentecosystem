import { useEffect, useRef, useState, useCallback } from "react";

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
 * Production-ready Object Detection hook with Web Worker offloading.
 * Primary: COCO-SSD running in a Web Worker to avoid main-thread blocking (CPU < 1%).
 * Fallback: Main-thread WebGL-based COCO-SSD if Web Workers/Blob URLs are blocked.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const CONFIDENCE_THRESHOLD = 0.45;

// Dynamic inline Web Worker source string
const createProctoringWorker = () => {
    const code = `
        let model = null;
        let isInitializing = false;

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
                    // Load TFJS & COCO-SSD from highly-available CDN
                    importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js");
                    importScripts("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js");

                    if (self.tf) {
                        await self.tf.ready();
                        // Workers lack WebGL/GPU access in most browsers, force CPU or WASM backend
                        await self.tf.setBackend('cpu');
                    }
                    
                    const origin = data ? data.origin : self.location.origin;
                    model = await cocoSsd.load({ modelUrl: origin + "/models/coco-ssd/model.json" });
                    self.postMessage({ type: 'init-ready', success: true });
                } catch (err) {
                    console.error("[Proctoring Worker] Init failed:", err);
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
                    // Detect using off-thread ImageBitmap
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
    return new Worker(URL.createObjectURL(blob));
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

    // Initializer
    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;
        let workerInstance = null;

        const initDetector = async () => {
            // Attempt 1: Initialize Web Worker offloading
            try {
                workerInstance = createProctoringWorker();
                workerRef.current = workerInstance;

                workerInstance.onmessage = (e) => {
                    if (cancelled) return;
                    const { type, success, id, predictions, error } = e.data;

                    if (type === 'init-ready') {
                        if (success) {
                            console.log("[YOLO Detector] Web Worker loaded successfully");
                            workerReadyRef.current = true;
                            setEngineType('coco-ssd-worker');
                            setModelReady(true);
                        } else {
                            console.warn("[YOLO Detector] Worker init failed, trying main-thread:", error);
                            initMainThreadFallback();
                        }
                    }

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
                            resolver(filtered);
                        }
                    }
                };

                workerInstance.postMessage({ type: 'init', data: { origin: window.location.origin } });
            } catch (err) {
                console.warn("[YOLO Detector] Failed to spawn worker:", err);
                initMainThreadFallback();
            }
        };

        const initMainThreadFallback = async () => {
            try {
                console.log("[YOLO Detector] Loading TensorFlow.js and COCO-SSD from CDN for main-thread fallback...");
                await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js");
                await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js");

                const tf = window.tf;
                const cocoSsd = window.cocoSsd;

                if (!tf || !cocoSsd) {
                    throw new Error("TensorFlow or COCO-SSD not found on window object");
                }

                // Initialize TF on main thread safely
                try {
                    await tf.setBackend('webgl');
                    await tf.ready();
                    console.log("[YOLO Detector] WebGL backend initialized successfully");
                } catch (e) {
                    console.warn("[YOLO Detector] WebGL unavailable, falling back to CPU:", e.message);
                    await tf.setBackend('cpu');
                    await tf.ready();
                }

                const model = await cocoSsd.load({ modelUrl: window.location.origin + "/models/coco-ssd/model.json" });
                if (!cancelled) {
                    cocoModelRef.current = model;
                    setEngineType('coco-ssd-fallback');
                    setModelReady(true);
                    console.log("[YOLO Detector] COCO-SSD loaded locally on main-thread");
                }
            } catch (cocoErr) {
                console.error("[YOLO Detector] Main-thread COCO-SSD load failed:", cocoErr);
            }
        };

        initDetector();

        return () => {
            cancelled = true;
            if (workerInstance) {
                workerInstance.terminate();
                workerRef.current = null;
                workerReadyRef.current = false;
            }
            // Resolve any remaining pending promises to avoid memory leaks
            Object.values(pendingDetectionsRef.current).forEach(resolve => resolve([]));
            pendingDetectionsRef.current = {};
        };
    }, [isActive]);

    // Frame processing function
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
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // If Web Worker is ready, use it
        if (workerRef.current && workerReadyRef.current) {
            return new Promise((resolve) => {
                const frameId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                pendingDetectionsRef.current[frameId] = resolve;

                createImageBitmap(canvas).then((imageBitmap) => {
                    workerRef.current.postMessage(
                        { type: 'detect', data: { imageBitmap, id: frameId } },
                        [imageBitmap] // Transfer list (zero copy)
                    );
                }).catch((err) => {
                    console.warn("[YOLO Detector] createImageBitmap failed, falling back to local detect:", err);
                    delete pendingDetectionsRef.current[frameId];
                    runLocalDetect(canvas).then(resolve);
                });
            });
        } else {
            return runLocalDetect(canvas);
        }
    }, [modelReady, videoElement]);

    const runLocalDetect = async (canvas) => {
        if (!cocoModelRef.current) return [];
        try {
            const preds = await cocoModelRef.current.detect(canvas);
            const filtered = preds
                .filter(p => p.score >= CONFIDENCE_THRESHOLD)
                .map(p => ({
                    class: p.class,
                    score: p.score,
                    bbox: { x: p.bbox[0], y: p.bbox[1], width: p.bbox[2], height: p.bbox[3] }
                }));
            setDetections(filtered);
            return filtered;
        } catch (err) {
            console.warn("[YOLO Detector] Local detection error:", err);
            return [];
        }
    };

    return {
        modelReady,
        engineType,
        detections,
        detectFrame,
    };
}
