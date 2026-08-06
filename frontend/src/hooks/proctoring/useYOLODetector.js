import { useEffect, useRef, useState, useCallback } from "react";
import { logDiag, recordError, recordInferenceTime } from "../../utils/proctoringDiagnostics";
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as ort from 'onnxruntime-web';

// ─── ONNX Runtime WASM backend configuration ──────────────────────────────
// Use CDN-hosted WASM files to avoid Vercel deployment size limits
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

// ─── Model Configuration ──────────────────────────────────────────────────
const CONFIDENCE_THRESHOLD = 0.35;

// Local path (for dev / self-hosted)
const YOLO_MODEL_PATH = '/models/yolov8n-oiv7.onnx';

// CDN fallback (GitHub release / jsDelivr / any public URL)
// CDN fallback URLs for the ONNX model (if local file is not served)
// To add a CDN source: upload yolov8n-oiv7.onnx to any CORS-enabled CDN and add the URL here
const YOLO_CDN_URLS = [];

// If using the CDN model (standard COCO 80-class YOLOv8n), we need COCO classes
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

// 601 Classes for Open Images V7 (used when local OIV7 model loads)
const OIV7_CLASSES = ["Accordion","Adhesive tape","Aircraft","Airplane","Alarm clock","Alpaca","Ambulance","Animal","Ant","Antelope","Apple","Armadillo","Artichoke","Auto part","Axe","Backpack","Bagel","Baked goods","Balance beam","Ball","Balloon","Banana","Band-aid","Banjo","Barge","Barrel","Baseball bat","Baseball glove","Bat (Animal)","Bathroom accessory","Bathroom cabinet","Bathtub","Beaker","Bear","Bed","Bee","Beehive","Beer","Beetle","Bell pepper","Belt","Bench","Bicycle","Bicycle helmet","Bicycle wheel","Bidet","Billboard","Billiard table","Binoculars","Bird","Blender","Blue jay","Boat","Bomb","Book","Bookcase","Boot","Bottle","Bottle opener","Bow and arrow","Bowl","Bowling equipment","Box","Boy","Brassiere","Bread","Briefcase","Broccoli","Bronze sculpture","Brown bear","Building","Bull","Burrito","Bus","Bust","Butterfly","Cabbage","Cabinetry","Cake","Cake stand","Calculator","Camel","Camera","Can opener","Canary","Candle","Candy","Cannon","Canoe","Cantaloupe","Car","Carnivore","Carrot","Cart","Cassette deck","Castle","Cat","Cat furniture","Caterpillar","Cattle","Ceiling fan","Cello","Centipede","Chainsaw","Chair","Cheese","Cheetah","Chest of drawers","Chicken","Chime","Chisel","Chopsticks","Christmas tree","Clock","Closet","Clothing","Coat","Cocktail","Cocktail shaker","Coconut","Coffee","Coffee cup","Coffee table","Coffeemaker","Coin","Common fig","Common sunflower","Computer keyboard","Computer monitor","Computer mouse","Container","Convenience store","Cookie","Cooking spray","Corded phone","Cosmetics","Couch","Countertop","Cowboy hat","Crab","Cream","Cricket ball","Crocodile","Croissant","Crown","Crutch","Cucumber","Cupboard","Curtain","Cutting board","Dagger","Dairy Product","Deer","Desk","Dessert","Diaper","Dice","Digital clock","Dinosaur","Dishwasher","Dog","Dog bed","Doll","Dolphin","Door","Door handle","Donut","Dragonfly","Drawer","Dress","Drill (Tool)","Drink","Drinking straw","Drum","Duck","Dumbbell","Eagle","Earrings","Egg (Food)","Elephant","Envelope","Eraser","Face powder","Facial tissue holder","Falcon","Fashion accessory","Fast food","Fax","Fedora","Filing cabinet","Fire hydrant","Fireplace","Fish","Flag","Flashlight","Flower","Flowerpot","Flute","Flying disc","Food","Food processor","Football","Football helmet","Footwear","Fork","Fountain","Fox","French fries","French horn","Frog","Fruit","Frying pan","Furniture","Garden Asparagus","Gas stove","Giraffe","Girl","Glasses","Glove","Goat","Goggles","Goldfish","Golf ball","Golf cart","Gondola","Goose","Grape","Grapefruit","Grinder","Guacamole","Guitar","Hair dryer","Hair spray","Hamburger","Hammer","Hamster","Hand dryer","Handbag","Handgun","Harbor seal","Harmonica","Harp","Harpsichord","Hat","Headphones","Heater","Hedgehog","Helicopter","Helmet","High heels","Hiking equipment","Hippopotamus","Home appliance","Honeycomb","Horizontal bar","Horse","Hot dog","House","Houseplant","Human arm","Human beard","Human body","Human ear","Human eye","Human face","Human foot","Human hair","Human hand","Human head","Human leg","Human mouth","Human nose","Humidifier","Ice cream","Indoor rower","Infant bed","Insect","Invertebrate","Ipod","Isopod","Jacket","Jacuzzi","Jaguar (Animal)","Jeans","Jellyfish","Jet ski","Jug","Juice","Kangaroo","Kettle","Kitchen & dining room table","Kitchen appliance","Kitchen knife","Kitchen utensil","Kitchenware","Kite","Knife","Koala","Ladder","Ladle","Ladybug","Lamp","Land vehicle","Lantern","Laptop","Lavender (Plant)","Lemon","Leopard","Light bulb","Light switch","Lighthouse","Lily","Limousine","Lion","Lipstick","Lizard","Lobster","Loveseat","Luggage and bags","Lynx","Magpie","Mammal","Man","Mango","Maple","Maracas","Marine invertebrates","Marine mammal","Measuring cup","Mechanical fan","Medical equipment","Microphone","Microwave oven","Milk","Miniskirt","Mirror","Missile","Mixer","Mixing bowl","Mobile phone","Monkey","Moths and butterflies","Motorcycle","Mouse","Muffin","Mug","Mule","Mushroom","Musical instrument","Musical keyboard","Nail (Construction)","Necklace","Nightstand","Oboe","Office building","Office supplies","Orange","Organ (Musical Instrument)","Ostrich","Otter","Oven","Owl","Oyster","Paddle","Palm tree","Pancake","Panda","Paper cutter","Paper towel","Parachute","Parking meter","Parrot","Pasta","Pastry","Peach","Pear","Pen","Pencil case","Pencil sharpener","Penguin","Perfume","Person","Personal care","Personal flotation device","Piano","Picnic basket","Picture frame","Pig","Pillow","Pineapple","Pitcher (Container)","Pizza","Pizza cutter","Plant","Plastic bag","Plate","Platter","Plumbing fixture","Polar bear","Pomegranate","Popcorn","Porch","Porcupine","Poster","Potato","Power plugs and sockets","Pressure cooker","Pretzel","Printer","Pumpkin","Punching bag","Rabbit","Raccoon","Racket","Radish","Ratchet (Device)","Raven","Rays and skates","Red panda","Refrigerator","Remote control","Reptile","Rhinoceros","Rifle","Ring binder","Rocket","Roller skates","Rose","Rugby ball","Ruler","Salad","Salt and pepper shakers","Sandal","Sandwich","Saucer","Saxophone","Scale","Scarf","Scissors","Scoreboard","Scorpion","Screwdriver","Sculpture","Sea lion","Sea turtle","Seafood","Seahorse","Seat belt","Segway","Serving tray","Sewing machine","Shark","Sheep","Shelf","Shellfish","Shirt","Shorts","Shotgun","Shower","Shrimp","Sink","Skateboard","Ski","Skirt","Skull","Skunk","Skyscraper","Slow cooker","Snack","Snail","Snake","Snowboard","Snowman","Snowmobile","Snowplow","Soap dispenser","Sock","Sofa bed","Sombrero","Sparrow","Spatula","Spice rack","Spider","Spoon","Sports equipment","Sports uniform","Squash (Plant)","Squid","Squirrel","Stairs","Stapler","Starfish","Stationary bicycle","Stethoscope","Stool","Stop sign","Strawberry","Street light","Stretcher","Studio couch","Submarine","Submarine sandwich","Suit","Suitcase","Sun hat","Sunglasses","Surfboard","Sushi","Swan","Swim cap","Swimming pool","Swimwear","Sword","Syringe","Table","Table tennis racket","Tablet computer","Tableware","Taco","Tank","Tap","Tart","Taxi","Tea","Teapot","Teddy bear","Telephone","Television","Tennis ball","Tennis racket","Tent","Tiara","Tick","Tie","Tiger","Tin can","Tire","Toaster","Toilet","Toilet paper","Tomato","Tool","Toothbrush","Torch","Tortoise","Towel","Tower","Toy","Traffic light","Traffic sign","Train","Training bench","Treadmill","Tree","Tree house","Tripod","Trombone","Trousers","Truck","Trumpet","Turkey","Turtle","Umbrella","Unicycle","Van","Vase","Vegetable","Vehicle","Vehicle registration plate","Violin","Volleyball (Ball)","Waffle","Waffle iron","Wall clock","Wardrobe","Washing machine","Waste container","Watch","Watercraft","Watermelon","Weapon","Whale","Wheel","Wheelchair","Whisk","Whiteboard","Willow","Window","Window blind","Wine","Wine glass","Wine rack","Winter melon","Wok","Woman","Wood-burning stove","Woodpecker","Worm","Wrench","Zebra","Zucchini"];

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

        // Always load from the default CDN (Google's tfhub) — most reliable
        const model = await cocoSsd.load();
        logDiag("YOLO Detector", "COCO-SSD loaded from default CDN (main thread fallback)");

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

// ═══════════════════════════════════════════════════════════════════════════
// ███  Main Hook  ███
// ═══════════════════════════════════════════════════════════════════════════
export function useYOLODetector({ isActive = false, videoElement = null }) {
    const [modelReady, setModelReady] = useState(false);
    const [engineType, setEngineType] = useState(null); 
    const [detections, setDetections] = useState([]);

    const workerRef = useRef(null);
    const cocoModelRef = useRef(null);
    const onnxSessionRef = useRef(null);
    const onnxClassListRef = useRef(null); // Which class list to use
    const onnxNumClassesRef = useRef(0);
    const canvasRef = useRef(null);
    const pendingDetectionsRef = useRef({});

    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        // ── STEP 1: Try loading ONNX model ─────────────────────────────────
        const initONNX = async () => {
            try {
                // Try local model first (works in dev + self-hosted)
                const base = import.meta.env.BASE_URL || "/";
                const localUrl = window.location.origin + (base.endsWith('/') ? base : base + '/') + YOLO_MODEL_PATH.replace(/^\//, '');

                logDiag("YOLO Detector", `Attempting local ONNX model: ${localUrl}`);

                let modelBuffer = null;
                let usingOIV7 = true; // local model is OIV7

                try {
                    modelBuffer = await fetchAndValidateModel(localUrl);
                    logDiag("YOLO Detector", `Local ONNX model fetched (${(modelBuffer.byteLength / 1024 / 1024).toFixed(1)}MB)`);
                } catch (localErr) {
                    logDiag("YOLO Detector", `Local ONNX failed: ${localErr.message}`);

                    // Try CDN fallback URLs
                    for (const cdnUrl of YOLO_CDN_URLS) {
                        try {
                            logDiag("YOLO Detector", `Trying CDN: ${cdnUrl}`);
                            modelBuffer = await fetchAndValidateModel(cdnUrl);
                            usingOIV7 = false; // CDN model is standard COCO 80-class
                            logDiag("YOLO Detector", `CDN ONNX model fetched (${(modelBuffer.byteLength / 1024 / 1024).toFixed(1)}MB)`);
                            break;
                        } catch (cdnErr) {
                            logDiag("YOLO Detector", `CDN failed: ${cdnErr.message}`);
                        }
                    }
                }

                if (!modelBuffer) {
                    throw new Error("All ONNX model sources failed");
                }

                if (cancelled) return;

                // Create ONNX session from the fetched ArrayBuffer
                const session = await ort.InferenceSession.create(modelBuffer, {
                    executionProviders: ['wasm'],
                });

                if (cancelled) return;

                onnxSessionRef.current = session;

                // Set class list based on which model loaded
                if (usingOIV7) {
                    onnxClassListRef.current = OIV7_CLASSES;
                    onnxNumClassesRef.current = 601;
                } else {
                    onnxClassListRef.current = COCO_80_CLASSES;
                    onnxNumClassesRef.current = 80;
                }

                setEngineType('yolo-onnx');
                setModelReady(true);
                logDiag("YOLO Detector", `✅ YOLO ONNX model loaded successfully (${usingOIV7 ? 'OIV7-601' : 'COCO-80'} classes, ${(modelBuffer.byteLength / 1024 / 1024).toFixed(1)}MB)`);

            } catch (err) {
                console.warn("[YOLO Detector] ONNX init failed completely, falling back to COCO-SSD:", err.message);
                logDiag("YOLO Detector", `ONNX init failed: ${err.message}. Falling back to COCO-SSD...`);
                if (cancelled) return;
                initCOCOFallback();
            }
        };

        // ── STEP 2: COCO-SSD Fallback Chain ────────────────────────────────
        const initCOCOFallback = async () => {
            logDiag("YOLO Detector", "Starting COCO-SSD fallback initialization...");

            // Set up worker message listener for detection results
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

            // Try 1: Worker-based COCO-SSD (offloads to background thread)
            try {
                logDiag("YOLO Detector", "Trying COCO-SSD worker...");
                const worker = await initWorkerSession(null);
                if (cancelled) return;

                workerRef.current = worker;
                setEngineType('coco-ssd-worker');
                setModelReady(true);
                logDiag("YOLO Detector", "✅ COCO-SSD fallback loaded (Worker thread)");
                return;
            } catch (workerErr) {
                logDiag("YOLO Detector", `Worker COCO-SSD failed: ${workerErr.message}`);
            }

            // Try 2: Main thread COCO-SSD using bundled npm package
            try {
                logDiag("YOLO Detector", "Trying COCO-SSD main thread (npm bundled)...");
                const model = await initMainThreadModel();
                if (cancelled) return;

                cocoModelRef.current = model;
                setEngineType('coco-ssd-main');
                setModelReady(true);
                logDiag("YOLO Detector", "✅ COCO-SSD fallback loaded (Main thread)");
                return;
            } catch (mainErr) {
                logDiag("YOLO Detector", `Main thread COCO-SSD failed: ${mainErr.message}`);
                recordError("detector-all-fallbacks-failed", mainErr);
                console.error("[YOLO Detector] ❌ ALL detection engines failed. Object detection will not work.", mainErr);
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

    // ── ONNX Inference (YOLO post-processing) ──────────────────────────────
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
            const outputTensor = results[Object.keys(results)[0]];
            
            const data = outputTensor.data;
            const numClasses = onnxNumClassesRef.current;
            const classList = onnxClassListRef.current;
            const boxes = [];
            
            // Output shape is [1, (4 + numClasses), 8400]
            // 4 = bbox (cx, cy, w, h) + numClasses class scores
            for (let i = 0; i < 8400; i++) {
                let maxScore = 0;
                let classId = -1;
                for (let c = 0; c < numClasses; c++) {
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
                        class: classList[classId] || `class_${classId}`,
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
            console.error("[YOLO Detector] ONNX inference error:", err);
            return [];
        }
    }, []);

    // ── Main-thread COCO-SSD detection ──────────────────────────────────────
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

    // ── detectFrame: Route to the active engine ─────────────────────────────
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
