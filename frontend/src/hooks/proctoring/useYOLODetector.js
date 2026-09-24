import { useEffect, useRef, useState, useCallback } from "react";
import { logDiag, recordError, recordInferenceTime } from "../../utils/proctoringDiagnostics";
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as ort from 'onnxruntime-web';

// ─── ONNX Runtime WASM backend configuration (COMMENTED OUT - USING COCO-SSD) ──
// ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';
// const YOLO_MODEL_PATH = '/models/yolov8n-oiv7.onnx';
// const YOLO_CDN_URLS = [
//     'https://raw.githubusercontent.com/srav-742/updatedtalentecosystem/main/frontend/public/models/yolov8n-oiv7.onnx'
// ];

// Standard COCO 80-class list (used for COCO-SSD object labels)
const COCO_80_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
    "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
    "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
];

// OIV7 601 classes (commented out while using COCO-SSD)
// const OIV7_CLASSES = [...];

// ─── COCO-SSD Worker for fallback ──────────────────────────────────────────
function createProctoringWorker() {
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
}

// ─── Singleton worker management ────────────────────────────────────────────
let _globalWorker = null;
let globalWorkerInitPromise = null;
let activeWorkerListener = null;

const initWorkerSession = (modelUrl) => {
    if (globalWorkerInitPromise) return globalWorkerInitPromise;

    globalWorkerInitPromise = new Promise((resolve, reject) => {
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            reject(new Error("Worker initialization timed out after 4000ms"));
        }, 4000);

        try {
            const worker = createProctoringWorker();
            _globalWorker = worker;

            worker.onmessage = (e) => {
                if (timedOut) return;
                const { type, success, error } = e.data;
                if (type === 'init-ready') {
                    clearTimeout(timer);
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
            clearTimeout(timer);
            reject(err);
        }
    }).catch(err => {
        globalWorkerInitPromise = null;
        throw err;
    });

    return globalWorkerInitPromise;
};

// ─── Main-thread COCO-SSD fallback ─────────────────────────────────────────
let globalMainModel = null;
let globalMainModelInitPromise = null;

const initMainThreadModel = async () => {
    if (globalMainModel) return globalMainModel;
    if (globalMainModelInitPromise) return globalMainModelInitPromise;

    globalMainModelInitPromise = (async () => {
        logDiag("YOLO Detector", "Initializing COCO-SSD on main thread (final fallback)...");

        try {
            await tf.setBackend("webgl");
            await tf.ready();
            logDiag("YOLO Detector", "TF.js WebGL backend ready for COCO-SSD fallback");
        } catch (webglErr) {
            logDiag("YOLO Detector", `WebGL failed (${webglErr.message}), trying CPU...`);
            await tf.setBackend("cpu");
            await tf.ready();
            logDiag("YOLO Detector", "TF.js CPU backend ready for COCO-SSD fallback");
        }

        let model = null;
        try {
            const base = import.meta.env.BASE_URL || "/";
            const localModelUrl = window.location.origin + (base.endsWith('/') ? base : base + '/') + 'models/coco-ssd/model.json';
            model = await cocoSsd.load({ modelUrl: localModelUrl });
            logDiag("YOLO Detector", "COCO-SSD loaded from local bundle (/models/coco-ssd/model.json)");
        } catch (localErr) {
            logDiag("YOLO Detector", `Local COCO-SSD load failed (${localErr.message}), loading from CDN...`);
            model = await cocoSsd.load();
            logDiag("YOLO Detector", "COCO-SSD loaded from default CDN");
        }

        // Warm up with a tiny canvas to pre-compile WebGL shaders
        try {
            const warmup = document.createElement("canvas");
            warmup.width = 1;
            warmup.height = 1;
            await model.detect(warmup);
        } catch (_) {
            // Warmup failure is non-critical
        }

        globalMainModel = model;
        return model;
    })().catch((err) => {
        globalMainModelInitPromise = null;
        throw err;
    });

    return globalMainModelInitPromise;
};

// ─── NMS utilities ──────────────────────────────────────────────────────────
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

// Helper: check if two labels represent the same class or equivalent alias
function isSameOrAliasClass(c1, c2) {
    if (!c1 || !c2) return false;
    const s1 = c1.toLowerCase().trim();
    const s2 = c2.toLowerCase().trim();
    if (s1 === s2) return true;

    // Phone aliases (e.g. "cell phone" in COCO vs "Mobile phone" in OIV7)
    const isPhone1 = s1.includes('phone') || s1 === 'telephone' || s1 === 'ipod' || s1.includes('tablet');
    const isPhone2 = s2.includes('phone') || s2 === 'telephone' || s2 === 'ipod' || s2.includes('tablet');
    if (isPhone1 && isPhone2) return true;

    // Person aliases
    const isPerson1 = s1 === 'person' || s1 === 'man' || s1 === 'woman' || s1 === 'boy' || s1 === 'girl';
    const isPerson2 = s2 === 'person' || s2 === 'man' || s2 === 'woman' || s2 === 'boy' || s2 === 'girl';
    if (isPerson1 && isPerson2) return true;

    // Face / head aliases
    const isFace1 = s1 === 'human face' || s1 === 'human head';
    const isFace2 = s2 === 'human face' || s2 === 'human head';
    if (isFace1 && isFace2) return true;

    // Screen / monitor / tv aliases
    const isScreen1 = s1 === 'tv' || s1 === 'television' || s1.includes('monitor') || s1 === 'screen';
    const isScreen2 = s2 === 'tv' || s2 === 'television' || s2.includes('monitor') || s2 === 'screen';
    if (isScreen1 && isScreen2) return true;

    // Chair / couch aliases
    const isSeat1 = s1 === 'chair' || s1 === 'couch' || s1 === 'sofa bed' || s1 === 'studio couch';
    const isSeat2 = s2 === 'chair' || s2 === 'couch' || s2 === 'sofa bed' || s2 === 'studio couch';
    if (isSeat1 && isSeat2) return true;

    // Desk / table aliases
    const isTable1 = s1.includes('table') || s1 === 'desk';
    const isTable2 = s2.includes('table') || s2 === 'desk';
    if (isTable1 && isTable2) return true;

    // Keyboard aliases
    const isKb1 = s1.includes('keyboard');
    const isKb2 = s2.includes('keyboard');
    if (isKb1 && isKb2) return true;

    // Mouse aliases
    const isMouse1 = s1.includes('mouse');
    const isMouse2 = s2.includes('mouse');
    if (isMouse1 && isMouse2) return true;

    return false;
}

function nonMaxSuppression(boxes, iouThreshold) {
    boxes.sort((a, b) => b.score - a.score);
    const selected = [];
    for (const box of boxes) {
        let shouldSelect = true;
        for (const selBox of selected) {
            // ONLY suppress if both boxes represent the SAME class or alias!
            // This prevents a candidate's 'person' box from suppressing their chair, phone, or laptop.
            if (isSameOrAliasClass(box.class, selBox.class) && computeIoU(box.bbox, selBox.bbox) > iouThreshold) {
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

// ─── Validate ONNX model response ──────────────────────────────────────────
// Vercel SPA catch-all can return HTML instead of the actual binary file.
// We detect this by checking the Content-Type header.
async function fetchAndValidateModel(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const contentType = response.headers.get('Content-Type') || '';

    // If we got HTML back, Vercel's SPA rewrite intercepted the request
    if (contentType.includes('text/html') || contentType.includes('text/plain')) {
        throw new Error(`Got HTML/text instead of binary from ${url} (Content-Type: ${contentType}). Likely SPA catch-all rewrite.`);
    }

    const buffer = await response.arrayBuffer();

    // ONNX models start with magic bytes. Minimum viable size check.
    if (buffer.byteLength < 100000) {
        throw new Error(`Response too small to be an ONNX model (${buffer.byteLength} bytes)`);
    }

    return buffer;
}

// ─── Proctoring Relevant Classes Filter ────────────────────────────────────
// Pre-filter target classes to keep inference ultra-fast while covering all
// cheating objects (phones, laptops, screens, audio) and environment items (chairs, tables).
const PROCTORING_RELEVANT_CLASSES = new Set([
    // People & faces
    "person", "boy", "girl", "man", "woman", "human face", "human head", "human body",
    // Phones & mobile devices
    "cell phone", "mobile phone", "telephone", "corded phone", "ipod", "tablet computer", "tablet",
    // Books & notes
    "book", "ring binder",
    // Audio devices
    "headphones", "earphones", "headset",
    // Screens & electronics
    "tv", "television", "computer monitor", "laptop", "computer keyboard", "keyboard", "computer mouse", "mouse", "remote control", "remote",
    // Room furniture & background items
    "chair", "couch", "sofa bed", "studio couch", "desk", "table", "dining table", "coffee table",
    // Containers & accessories
    "bottle", "cup", "coffee cup", "mug", "backpack", "handbag", "suitcase", "briefcase", "luggage and bags", "camera"
]);

function getRelevantClassIndices(classList) {
    if (!classList || !classList.length) return [];
    const indices = [];
    for (let i = 0; i < classList.length; i++) {
        const name = (classList[i] || '').toLowerCase().trim();
        if (PROCTORING_RELEVANT_CLASSES.has(name)) {
            indices.push(i);
        }
    }
    return indices;
}

// ═══════════════════════════════════════════════════════════════════════════
// ███  Main Hook  ███
// ═══════════════════════════════════════════════════════════════════════════
export function useYOLODetector({ isActive = false, videoElement = null }) {
    const [cocoReady, setCocoReady] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [engineType, setEngineType] = useState('coco-ssd'); 
    const [detections, setDetections] = useState([]);

    const cocoModelRef = useRef(null);
    const canvasRef = useRef(null);

    // Kept as boolean for full backward-compatibility with UI badges
    const yoloReady = false;

    useEffect(() => {
        setModelReady(cocoReady);
    }, [cocoReady]);

    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        // ── STEP 1: Load COCO-SSD (WebGL accelerated) ────────────────────────
        const initCOCO = async () => {
            logDiag("YOLO Detector", "Initializing COCO-SSD model (WebGL accelerated)...");
            try {
                const model = await initMainThreadModel();
                if (cancelled) return;

                cocoModelRef.current = model;
                setCocoReady(true);
                setModelReady(true);
                setEngineType('coco-ssd');
                logDiag("YOLO Detector", "✅ COCO-SSD loaded successfully (WebGL hardware-accelerated)");
            } catch (mainErr) {
                logDiag("YOLO Detector", `Main thread COCO-SSD failed: ${mainErr.message}`);
                console.warn("[YOLO Detector] COCO-SSD concurrent init failed:", mainErr.message);
            }
        };

        initCOCO();

        return () => {
            cancelled = true;
        };
    }, [isActive]);

    // ── Main-thread COCO-SSD detection with smart phone detection & face-mesh filtering ────
    const runLocalDetect = useCallback(async (canvas, faceLandmarks = null) => {
        if (!cocoModelRef.current) return [];
        const start = Date.now();
        
        try {
            // Pass maxNumBoxes=35, minScore=0.15 to capture any phone or suspicious object immediately
            const preds = await cocoModelRef.current.detect(canvas, 35, 0.15);
            const duration = Date.now() - start;

            const cWidth = canvas.width || 640;
            const cHeight = canvas.height || 480;

            // Extract person bounding boxes to evaluate candidate's reach/usage area
            let personBoxes = [];
            for (const p of preds) {
                const c = (p.class || '').toLowerCase().trim();
                if (c === 'person' || c === 'man' || c === 'woman') {
                    const [px, py, pw, ph] = p.bbox;
                    personBoxes.push({ x: px, y: py, width: pw, height: ph, score: p.score });
                }
            }
            const primaryPerson = personBoxes.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0] || null;

            // 1. Reclassify & filter raw predictions
            // Strictly output: Person, Cell phone, and objects used/held by candidate.
            // Completely suppress all ambient background fixtures, furniture, bottles, cups, bags, screens.
            let mappedPreds = [];
            for (const p of preds) {
                let className = (p.class || '').toLowerCase().trim();
                const [bx, by, bw, bh] = p.bbox;

                // 1. Person: always detect person (for single/multiple people counting)
                if (className === 'person' || className === 'man' || className === 'woman') {
                    mappedPreds.push({
                        class: 'person',
                        score: p.score,
                        bbox: { x: bx, y: by, width: bw, height: bh }
                    });
                    continue;
                }

                // 2. Cell phone (and phone aliases): always detect cell phone
                if (
                    className === 'cell phone' ||
                    className === 'mobile phone' ||
                    className === 'telephone' ||
                    className === 'remote' ||
                    className === 'ipod'
                ) {
                    mappedPreds.push({
                        class: 'cell phone',
                        score: p.score,
                        bbox: { x: bx, y: by, width: bw, height: bh }
                    });
                    continue;
                }

                // 3. Ignore all ambient background fixtures, furniture, room accessories, and desk items
                // (chairs, couches, beds, tables, tvs, monitors, cups, bottles, bags, mice, keyboards, etc.)
                const isBackgroundItem =
                    className === 'chair' || className === 'couch' || className === 'sofa' || className === 'bed' ||
                    className === 'dining table' || className === 'table' || className === 'desk' ||
                    className === 'tv' || className === 'television' || className === 'monitor' || className.includes('monitor') ||
                    className === 'bottle' || className === 'cup' || className === 'wine glass' || className === 'bowl' ||
                    className === 'mug' || className.includes('cup') ||
                    className === 'backpack' || className === 'handbag' || className === 'suitcase' || className === 'briefcase' ||
                    className === 'keyboard' || className === 'mouse' || className === 'clock' || className === 'vase' ||
                    className === 'potted plant' || className === 'scissors';

                if (isBackgroundItem) {
                    continue; // Skip background objects completely
                }

                // 4. Any other candidate-used objects (book/notes, tablet, held items)
                // ONLY detect if the object is being held or used by the user!
                const isUsableObject = className === 'book' || className.includes('tablet') || className === 'laptop';
                if (isUsableObject) {
                    let isHeldOrUsed = false;
                    if (primaryPerson) {
                        const xOverlap = Math.max(0, Math.min(bx + bw, primaryPerson.x + primaryPerson.width) - Math.max(bx, primaryPerson.x));
                        const yOverlap = Math.max(0, Math.min(by + bh, primaryPerson.y + primaryPerson.height) - Math.max(by, primaryPerson.y));
                        const overlapArea = xOverlap * yOverlap;
                        const objArea = bw * bh;
                        if (objArea > 0 && (overlapArea / objArea) > 0.20) {
                            isHeldOrUsed = true;
                        }
                    } else if (faceLandmarks && faceLandmarks.length >= 468) {
                        const nose = faceLandmarks[1];
                        if (nose) {
                            const noseY = (nose.y ?? 0.5) * cHeight;
                            if (by > noseY - 20) {
                                isHeldOrUsed = true;
                            }
                        }
                    }

                    if (isHeldOrUsed) {
                        mappedPreds.push({
                            class: 'Object used',
                            score: p.score,
                            bbox: { x: bx, y: by, width: bw, height: bh }
                        });
                    }
                }
            }

            // 2. Suppress false-positive "cell phone" ONLY if a box literally masks the full face
            // A real phone held in hand, in front of the chest/collar, near the ear, or below the nose
            // must NEVER be filtered out.
            if (faceLandmarks && Array.isArray(faceLandmarks) && faceLandmarks.length >= 468) {
                let fMinX = 1, fMaxX = 0, fMinY = 1, fMaxY = 0;
                for (let i = 0; i < faceLandmarks.length; i++) {
                    const pt = faceLandmarks[i];
                    if (!pt) continue;
                    if (pt.x < fMinX) fMinX = pt.x;
                    if (pt.x > fMaxX) fMaxX = pt.x;
                    if (pt.y < fMinY) fMinY = pt.y;
                    if (pt.y > fMaxY) fMaxY = pt.y;
                }

                const faceBoxX = fMinX * cWidth;
                const faceBoxY = fMinY * cHeight;
                const faceBoxW = (fMaxX - fMinX) * cWidth;
                const faceBoxH = (fMaxY - fMinY) * cHeight;
                const nose = faceLandmarks[1];
                const noseX = (nose?.x ?? 0.5) * cWidth;
                const noseY = (nose?.y ?? 0.5) * cHeight;

                mappedPreds = mappedPreds.filter(det => {
                    const lower = (det.class || '').toLowerCase().trim();
                    if (lower !== 'cell phone') return true;

                    const { x, y, width: bw, height: bh } = det.bbox;
                    const cx = x + bw / 2;

                    // If the top of the box is below the nose tip, it's held in front of chest/chin/lap: NEVER filter!
                    if (y > noseY - 10) return true;

                    // If the box center is outside the nose midline: NEVER filter!
                    if (Math.abs(cx - noseX) > faceBoxW * 0.22) return true;

                    // Only filter if the box literally covers forehead, eyes, and nose simultaneously (full-face beard mask)
                    const coversForeheadAndEyes = y < (faceBoxY + faceBoxH * 0.35);
                    const coversMouthAndChin = (y + bh) > (faceBoxY + faceBoxH * 0.85);
                    const spansCheeks = bw > (faceBoxW * 0.65);

                    if (coversForeheadAndEyes && coversMouthAndChin && spansCheeks) {
                        return false;
                    }
                    return true;
                });
            }

            // 3. Multi-label conflict resolution (Priority: cell phone > tv/remote)
            // If both 'cell phone' and 'tv' overlap significantly on the same physical object,
            // keep 'cell phone' and suppress the lower-priority duplicate.
            const finalDets = [];
            mappedPreds.sort((a, b) => {
                const aIsPhone = (a.class || '').toLowerCase().includes('phone');
                const bIsPhone = (b.class || '').toLowerCase().includes('phone');
                if (aIsPhone && !bIsPhone) return -1;
                if (!aIsPhone && bIsPhone) return 1;
                return b.score - a.score;
            });

            for (const det of mappedPreds) {
                let keep = true;
                for (const existing of finalDets) {
                    const iou = computeIoU(det.bbox, existing.bbox);
                    if (iou > 0.35) {
                        keep = false;
                        break;
                    }
                }
                if (keep) {
                    finalDets.push(det);
                }
            }

            recordInferenceTime(duration, finalDets);
            return finalDets;
        } catch (err) {
            recordError("local-detect", err);
            return [];
        }
    }, []);

    // ── detectFrame: Execute COCO-SSD on the current video frame ────────────
    const detectFrame = useCallback(async (faceLandmarks = null) => {
        if (!cocoReady || !videoElement || videoElement.readyState < 2) return [];

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

        const cocoDets = await runLocalDetect(canvas, faceLandmarks);
        setDetections(cocoDets);
        return cocoDets;
    }, [cocoReady, videoElement, runLocalDetect]);

    return {
        modelReady,
        yoloReady,
        cocoReady,
        engineType,
        detections,
        detectFrame,
    };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ███  YOLO ONNX IMPLEMENTATION (COMMENTED OUT AS REQUESTED)  ███
 * Note: Preserved below for future restoration if needed.
 * ═══════════════════════════════════════════════════════════════════════════

const initONNX = async (cancelled, onnxSessionRef, onnxClassListRef, onnxNumClassesRef, onnxTargetIndicesRef, setYoloReady) => {
    try {
        const base = import.meta.env.BASE_URL || "/";
        const localUrl = window.location.origin + (base.endsWith('/') ? base : base + '/') + YOLO_MODEL_PATH.replace(/^\//, '');
        let modelBuffer = null;
        let usingOIV7 = true;

        try {
            modelBuffer = await fetchAndValidateModel(localUrl);
        } catch (localErr) {
            for (const cdnUrl of YOLO_CDN_URLS) {
                try {
                    modelBuffer = await fetchAndValidateModel(cdnUrl);
                    usingOIV7 = false;
                    break;
                } catch (cdnErr) {}
            }
        }

        if (!modelBuffer || cancelled) return;

        const session = await ort.InferenceSession.create(modelBuffer, {
            executionProviders: ['wasm'],
        });

        if (cancelled) return;
        onnxSessionRef.current = session;
        onnxClassListRef.current = usingOIV7 ? OIV7_CLASSES : COCO_80_CLASSES;
        onnxNumClassesRef.current = usingOIV7 ? 601 : 80;
        onnxTargetIndicesRef.current = getRelevantClassIndices(onnxClassListRef.current);
        setYoloReady(true);
    } catch (err) {
        console.warn("[YOLO Detector] ONNX init failed:", err.message);
    }
};

const runONNXInference = async (onnxSessionRef, onnxNumClassesRef, onnxClassListRef, onnxTargetIndicesRef, canvas, originalWidth, originalHeight) => {
    if (!onnxSessionRef.current) return [];
    const start = Date.now();

    const resizeCanvas = document.createElement("canvas");
    resizeCanvas.width = 640;
    resizeCanvas.height = 640;
    const resizeCtx = resizeCanvas.getContext("2d");
    resizeCtx.drawImage(canvas, 0, 0, 640, 640);

    const imgData = resizeCtx.getImageData(0, 0, 640, 640).data;
    const float32Data = new Float32Array(3 * 640 * 640);
    for (let i = 0; i < 640 * 640; i++) {
        float32Data[i] = imgData[i * 4] / 255.0;
        float32Data[640 * 640 + i] = imgData[i * 4 + 1] / 255.0;
        float32Data[2 * 640 * 640 + i] = imgData[i * 4 + 2] / 255.0;
    }

    const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, 640, 640]);
    try {
        const results = await onnxSessionRef.current.run({ images: inputTensor });
        const outputTensor = results[Object.keys(results)[0]];
        const data = outputTensor.data;
        const numClasses = onnxNumClassesRef.current;
        const classList = onnxClassListRef.current;
        const targetIndices = onnxTargetIndicesRef.current;
        const useTargetFilter = targetIndices && targetIndices.length > 0;
        const indicesCount = useTargetFilter ? targetIndices.length : numClasses;
        const boxes = [];

        for (let i = 0; i < 8400; i++) {
            let maxScore = 0;
            let classId = -1;
            if (useTargetFilter) {
                for (let k = 0; k < indicesCount; k++) {
                    const c = targetIndices[k];
                    const score = data[(4 + c) * 8400 + i];
                    if (score > maxScore) {
                        maxScore = score;
                        classId = c;
                    }
                }
            } else {
                for (let c = 0; c < numClasses; c++) {
                    const score = data[(4 + c) * 8400 + i];
                    if (score > maxScore) {
                        maxScore = score;
                        classId = c;
                    }
                }
            }

            if (maxScore >= 0.25) {
                const cx = data[0 * 8400 + i];
                const cy = data[1 * 8400 + i];
                const w = data[2 * 8400 + i];
                const h = data[3 * 8400 + i];
                const scaleX = originalWidth / 640;
                const scaleY = originalHeight / 640;
                boxes.push({
                    class: classList[classId] || `class_${classId}`,
                    score: maxScore,
                    bbox: { x: (cx - w / 2) * scaleX, y: (cy - h / 2) * scaleY, width: w * scaleX, height: h * scaleY }
                });
            }
        }
        return nonMaxSuppression(boxes, 0.45);
    } catch (err) {
        return [];
    }
};
═══════════════════════════════════════════════════════════════════════════ */
