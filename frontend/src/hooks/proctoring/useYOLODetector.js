import { useEffect, useRef, useState, useCallback } from "react";
import { logDiag, recordError, recordInferenceTime } from "../../utils/proctoringDiagnostics";
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

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

const CONFIDENCE_THRESHOLD = 0.40; // Optimal for COCO
const YOLO_MODEL_PATH = '/models/yolov8s.onnx'; // Upgraded COCO 80-class model (Small)

// 80 Classes for COCO
const COCO_CLASSES = ['person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'];

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
                            model = await self.cocoSsd.load({ modelUrl: modelUrl });
                            loaded = true;
                        } catch (localErr) {
                            console.warn("[Worker] Local model fetch failed, falling back to CDN:", localErr.message);
                        }
                    }

                    if (!loaded) {
                        model = await self.cocoSsd.load();
                    }

                    self.postMessage({ type: 'init-ready', success: true });
                } catch (err) {
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
                    imageBitmap.close(); 

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
    setTimeout(() => URL.revokeObjectURL(workerUrl), 5000);
    return worker;
};

let _globalWorker = null;
let globalWorkerInitPromise = null;
let activeWorkerListener = null;

const initWorkerSession = (modelUrl) => {
    if (globalWorkerInitPromise) return globalWorkerInitPromise;

    globalWorkerInitPromise = new Promise((resolve, reject) => {
        try {
            const worker = createProctoringWorker();
            _globalWorker = worker;

            worker.onmessage = (e) => {
                const { type, success, error } = e.data;
                if (type === 'init-ready') {
                    if (success) {
                        resolve(worker);
                    } else {
                        reject(new Error(error || "Worker initialization failed"));
                    }
                }
                if (activeWorkerListener) {
                    activeWorkerListener(e);
                }
            };

            worker.postMessage({ type: 'init', data: { modelUrl } });
        } catch (err) {
            reject(err);
        }
    });

    return globalWorkerInitPromise;
};

let globalMainModel = null;
let globalMainModelInitPromise = null;

const initMainThreadModel = async (modelUrl) => {
    if (globalMainModel) return globalMainModel;
    if (globalMainModelInitPromise) return globalMainModelInitPromise;

    globalMainModelInitPromise = (async () => {
        try {
            await tf.setBackend("webgl");
            await tf.ready();
        } catch (webglErr) {
            await tf.setBackend("cpu");
            await tf.ready();
        }

        let model;
        if (modelUrl) {
            try {
                model = await cocoSsd.load({ modelUrl });
            } catch (localLoadErr) {
                model = await cocoSsd.load();
            }
        } else {
            model = await cocoSsd.load();
        }

        globalMainModel = model;
        return model;
    })().catch((err) => {
        globalMainModelInitPromise = null;
        throw err;
    });

    return globalMainModelInitPromise;
};

function computeIoU(box1, box2) {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    const w = Math.max(0, x2 - x1);
    const h = Math.max(0, y2 - y1);
    const inter = w * h;
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    return inter / (area1 + area2 - inter);
}

function nonMaxSuppression(boxes, iouThreshold) {
    boxes.sort((a, b) => b.score - a.score);
    const selected = [];
    for (const box of boxes) {
        let shouldSelect = true;
        for (const selBox of selected) {
            if (computeIoU(box.bbox, selBox.bbox) > iouThreshold) {
                shouldSelect = false;
                break;
            }
        }
        if (shouldSelect) {
            selected.push(box);
        }
    }
    return selected;
}

export function useYOLODetector({ isActive = false, videoElement = null }) {
    const [modelReady, setModelReady] = useState(false);
    const [engineType, setEngineType] = useState(null); 
    const [detections, setDetections] = useState([]);

    const workerRef = useRef(null);
    const cocoModelRef = useRef(null);
    const onnxSessionRef = useRef(null);
    const canvasRef = useRef(null);
    const pendingDetectionsRef = useRef({});

    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        const initONNX = async () => {
            try {
                const base = import.meta.env.BASE_URL || "/";
                const modelUrl = window.location.origin + (base.endsWith('/') ? base : base + '/') + YOLO_MODEL_PATH.replace(/^\//, '');
                
                const response = await fetch(modelUrl, { method: 'HEAD' });
                if (!response.ok) {
                    throw new Error("ONNX model file not found");
                }

                const session = await ort.InferenceSession.create(modelUrl, {
                    executionProviders: ['webgl', 'wasm'],
                });
                
                if (cancelled) return;
                
                onnxSessionRef.current = session;
                setEngineType('yolo-onnx');
                setModelReady(true);
                console.log("[YOLO Detector] YOLO OIV7 ONNX model loaded successfully");
            } catch (err) {
                console.warn("[YOLO Detector] ONNX init failed, falling back to COCO-SSD:", err);
                if (cancelled) return;
                initCOCOFallback();
            }
        };

        const initCOCOFallback = async () => {
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
                            .filter(p => p.score >= 0.35)
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

            try {
                const worker = await initWorkerSession(modelUrl);
                if (cancelled) return;

                workerRef.current = worker;
                setEngineType('coco-ssd-worker');
                setModelReady(true);
                console.log("[YOLO Detector] COCO-SSD fallback model loaded successfully (Worker)");
            } catch (err) {
                try {
                    const model = await initMainThreadModel(modelUrl);
                    if (cancelled) return;

                    cocoModelRef.current = model;
                    setEngineType('coco-ssd-fallback');
                    setModelReady(true);
                    console.log("[YOLO Detector] COCO-SSD fallback model loaded successfully (Main Thread)");
                } catch (cocoErr) {
                    recordError("detector-fallback-init", cocoErr);
                }
            }
        };

        initONNX();

        return () => {
            cancelled = true;
            activeWorkerListener = null;
            Object.values(pendingDetectionsRef.current).forEach(resolve => resolve([]));
            pendingDetectionsRef.current = {};
        };
    }, [isActive]);

    const runONNXInference = useCallback(async (canvas, originalWidth, originalHeight) => {
        if (!onnxSessionRef.current) return [];
        
        const start = Date.now();
        
        // Resize to 640x640
        const resizeCanvas = document.createElement("canvas");
        resizeCanvas.width = 640;
        resizeCanvas.height = 640;
        const resizeCtx = resizeCanvas.getContext("2d");
        resizeCtx.drawImage(canvas, 0, 0, 640, 640);
        
        const imgData = resizeCtx.getImageData(0, 0, 640, 640).data;
        const float32Data = new Float32Array(3 * 640 * 640);
        for (let i = 0; i < 640 * 640; i++) {
            float32Data[i] = imgData[i * 4] / 255.0; // R
            float32Data[640 * 640 + i] = imgData[i * 4 + 1] / 255.0; // G
            float32Data[2 * 640 * 640 + i] = imgData[i * 4 + 2] / 255.0; // B
        }
        
        const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, 640, 640]);
        
        try {
            const results = await onnxSessionRef.current.run({ images: inputTensor });
            const outputTensor = results[Object.keys(results)[0]]; // get first output
            
            const data = outputTensor.data;
            const boxes = [];
            
            // Output shape is [1, 84, 8400] for COCO model (4 box dims + 80 classes)
            for (let i = 0; i < 8400; i++) {
                let maxScore = 0;
                let classId = -1;
                for (let c = 0; c < 80; c++) {
                    const score = data[(4 + c) * 8400 + i];
                    if (score > maxScore) {
                        maxScore = score;
                        classId = c;
                    }
                }
                
                if (maxScore >= CONFIDENCE_THRESHOLD) {
                    const cx = data[0 * 8400 + i];
                    const cy = data[1 * 8400 + i];
                    const w = data[2 * 8400 + i];
                    const h = data[3 * 8400 + i];
                    
                    const scaleX = originalWidth / 640;
                    const scaleY = originalHeight / 640;
                    
                    const x = (cx - w / 2) * scaleX;
                    const y = (cy - h / 2) * scaleY;
                    const width = w * scaleX;
                    const height = h * scaleY;
                    
                    boxes.push({
                        class: COCO_CLASSES[classId],
                        score: maxScore,
                        bbox: { x, y, width, height }
                    });
                }
            }
            
            const nmsBoxes = nonMaxSuppression(boxes, 0.5);
            setDetections(nmsBoxes);
            recordInferenceTime(Date.now() - start, nmsBoxes);
            return nmsBoxes;
        } catch (err) {
            console.error("ONNX inference failed", err);
            return [];
        }
    }, []);

    const runLocalDetect = useCallback(async (canvas) => {
        if (!cocoModelRef.current) return [];
        const start = Date.now();
        try {
            const preds = await cocoModelRef.current.detect(canvas);
            const duration = Date.now() - start;
            const filtered = preds
                .filter(p => p.score >= 0.35)
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

        if (engineType === 'yolo-onnx') {
            return runONNXInference(canvas, vWidth, vHeight);
        } else if (engineType === 'coco-ssd-worker' && workerRef.current) {
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
    }, [modelReady, engineType, videoElement, runONNXInference, runLocalDetect]);

    return {
        modelReady,
        engineType,
        detections,
        detectFrame,
    };
}
