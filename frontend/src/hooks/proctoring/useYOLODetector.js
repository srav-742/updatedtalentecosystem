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

const CONFIDENCE_THRESHOLD = 0.35; // Optimal for OIV7
const YOLO_MODEL_PATH = '/models/yolov8n-oiv7.onnx'; // Open Images V7 model (Nano - 14MB)

// 601 Classes for Open Images V7
const OIV7_CLASSES = ["Accordion","Adhesive tape","Aircraft","Airplane","Alarm clock","Alpaca","Ambulance","Animal","Ant","Antelope","Apple","Armadillo","Artichoke","Auto part","Axe","Backpack","Bagel","Baked goods","Balance beam","Ball","Balloon","Banana","Band-aid","Banjo","Barge","Barrel","Baseball bat","Baseball glove","Bat (Animal)","Bathroom accessory","Bathroom cabinet","Bathtub","Beaker","Bear","Bed","Bee","Beehive","Beer","Beetle","Bell pepper","Belt","Bench","Bicycle","Bicycle helmet","Bicycle wheel","Bidet","Billboard","Billiard table","Binoculars","Bird","Blender","Blue jay","Boat","Bomb","Book","Bookcase","Boot","Bottle","Bottle opener","Bow and arrow","Bowl","Bowling equipment","Box","Boy","Brassiere","Bread","Briefcase","Broccoli","Bronze sculpture","Brown bear","Building","Bull","Burrito","Bus","Bust","Butterfly","Cabbage","Cabinetry","Cake","Cake stand","Calculator","Camel","Camera","Can opener","Canary","Candle","Candy","Cannon","Canoe","Cantaloupe","Car","Carnivore","Carrot","Cart","Cassette deck","Castle","Cat","Cat furniture","Caterpillar","Cattle","Ceiling fan","Cello","Centipede","Chainsaw","Chair","Cheese","Cheetah","Chest of drawers","Chicken","Chime","Chisel","Chopsticks","Christmas tree","Clock","Closet","Clothing","Coat","Cocktail","Cocktail shaker","Coconut","Coffee","Coffee cup","Coffee table","Coffeemaker","Coin","Common fig","Common sunflower","Computer keyboard","Computer monitor","Computer mouse","Container","Convenience store","Cookie","Cooking spray","Corded phone","Cosmetics","Couch","Countertop","Cowboy hat","Crab","Cream","Cricket ball","Crocodile","Croissant","Crown","Crutch","Cucumber","Cupboard","Curtain","Cutting board","Dagger","Dairy Product","Deer","Desk","Dessert","Diaper","Dice","Digital clock","Dinosaur","Dishwasher","Dog","Dog bed","Doll","Dolphin","Door","Door handle","Donut","Dragonfly","Drawer","Dress","Drill (Tool)","Drink","Drinking straw","Drum","Duck","Dumbbell","Eagle","Earrings","Egg (Food)","Elephant","Envelope","Eraser","Face powder","Facial tissue holder","Falcon","Fashion accessory","Fast food","Fax","Fedora","Filing cabinet","Fire hydrant","Fireplace","Fish","Flag","Flashlight","Flower","Flowerpot","Flute","Flying disc","Food","Food processor","Football","Football helmet","Footwear","Fork","Fountain","Fox","French fries","French horn","Frog","Fruit","Frying pan","Furniture","Garden Asparagus","Gas stove","Giraffe","Girl","Glasses","Glove","Goat","Goggles","Goldfish","Golf ball","Golf cart","Gondola","Goose","Grape","Grapefruit","Grinder","Guacamole","Guitar","Hair dryer","Hair spray","Hamburger","Hammer","Hamster","Hand dryer","Handbag","Handgun","Harbor seal","Harmonica","Harp","Harpsichord","Hat","Headphones","Heater","Hedgehog","Helicopter","Helmet","High heels","Hiking equipment","Hippopotamus","Home appliance","Honeycomb","Horizontal bar","Horse","Hot dog","House","Houseplant","Human arm","Human beard","Human body","Human ear","Human eye","Human face","Human foot","Human hair","Human hand","Human head","Human leg","Human mouth","Human nose","Humidifier","Ice cream","Indoor rower","Infant bed","Insect","Invertebrate","Ipod","Isopod","Jacket","Jacuzzi","Jaguar (Animal)","Jeans","Jellyfish","Jet ski","Jug","Juice","Kangaroo","Kettle","Kitchen & dining room table","Kitchen appliance","Kitchen knife","Kitchen utensil","Kitchenware","Kite","Knife","Koala","Ladder","Ladle","Ladybug","Lamp","Land vehicle","Lantern","Laptop","Lavender (Plant)","Lemon","Leopard","Light bulb","Light switch","Lighthouse","Lily","Limousine","Lion","Lipstick","Lizard","Lobster","Loveseat","Luggage and bags","Lynx","Magpie","Mammal","Man","Mango","Maple","Maracas","Marine invertebrates","Marine mammal","Measuring cup","Mechanical fan","Medical equipment","Microphone","Microwave oven","Milk","Miniskirt","Mirror","Missile","Mixer","Mixing bowl","Mobile phone","Monkey","Moths and butterflies","Motorcycle","Mouse","Muffin","Mug","Mule","Mushroom","Musical instrument","Musical keyboard","Nail (Construction)","Necklace","Nightstand","Oboe","Office building","Office supplies","Orange","Organ (Musical Instrument)","Ostrich","Otter","Oven","Owl","Oyster","Paddle","Palm tree","Pancake","Panda","Paper cutter","Paper towel","Parachute","Parking meter","Parrot","Pasta","Pastry","Peach","Pear","Pen","Pencil case","Pencil sharpener","Penguin","Perfume","Person","Personal care","Personal flotation device","Piano","Picnic basket","Picture frame","Pig","Pillow","Pineapple","Pitcher (Container)","Pizza","Pizza cutter","Plant","Plastic bag","Plate","Platter","Plumbing fixture","Polar bear","Pomegranate","Popcorn","Porch","Porcupine","Poster","Potato","Power plugs and sockets","Pressure cooker","Pretzel","Printer","Pumpkin","Punching bag","Rabbit","Raccoon","Racket","Radish","Ratchet (Device)","Raven","Rays and skates","Red panda","Refrigerator","Remote control","Reptile","Rhinoceros","Rifle","Ring binder","Rocket","Roller skates","Rose","Rugby ball","Ruler","Salad","Salt and pepper shakers","Sandal","Sandwich","Saucer","Saxophone","Scale","Scarf","Scissors","Scoreboard","Scorpion","Screwdriver","Sculpture","Sea lion","Sea turtle","Seafood","Seahorse","Seat belt","Segway","Serving tray","Sewing machine","Shark","Sheep","Shelf","Shellfish","Shirt","Shorts","Shotgun","Shower","Shrimp","Sink","Skateboard","Ski","Skirt","Skull","Skunk","Skyscraper","Slow cooker","Snack","Snail","Snake","Snowboard","Snowman","Snowmobile","Snowplow","Soap dispenser","Sock","Sofa bed","Sombrero","Sparrow","Spatula","Spice rack","Spider","Spoon","Sports equipment","Sports uniform","Squash (Plant)","Squid","Squirrel","Stairs","Stapler","Starfish","Stationary bicycle","Stethoscope","Stool","Stop sign","Strawberry","Street light","Stretcher","Studio couch","Submarine","Submarine sandwich","Suit","Suitcase","Sun hat","Sunglasses","Surfboard","Sushi","Swan","Swim cap","Swimming pool","Swimwear","Sword","Syringe","Table","Table tennis racket","Tablet computer","Tableware","Taco","Tank","Tap","Tart","Taxi","Tea","Teapot","Teddy bear","Telephone","Television","Tennis ball","Tennis racket","Tent","Tiara","Tick","Tie","Tiger","Tin can","Tire","Toaster","Toilet","Toilet paper","Tomato","Tool","Toothbrush","Torch","Tortoise","Towel","Tower","Toy","Traffic light","Traffic sign","Train","Training bench","Treadmill","Tree","Tree house","Tripod","Trombone","Trousers","Truck","Trumpet","Turkey","Turtle","Umbrella","Unicycle","Van","Vase","Vegetable","Vehicle","Vehicle registration plate","Violin","Volleyball (Ball)","Waffle","Waffle iron","Wall clock","Wardrobe","Washing machine","Waste container","Watch","Watercraft","Watermelon","Weapon","Whale","Wheel","Wheelchair","Whisk","Whiteboard","Willow","Window","Window blind","Wine","Wine glass","Wine rack","Winter melon","Wok","Woman","Wood-burning stove","Woodpecker","Worm","Wrench","Zebra","Zucchini"];

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
            
            // Output shape is [1, 605, 8400] for OIV7 model (4 box dims + 601 classes)
            for (let i = 0; i < 8400; i++) {
                let maxScore = 0;
                let classId = -1;
                for (let c = 0; c < 601; c++) {
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
                        class: OIV7_CLASSES[classId],
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
