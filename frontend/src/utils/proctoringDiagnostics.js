/**
 * proctoringDiagnostics.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Production diagnostic telemetry module for the Hire1Percent AI Proctoring System.
 * Maintains window.__proctoring_diagnostics state for live debugging, backend monitoring,
 * and performance metrics (FPS, inference times, detected classes, errors).
 *
 * Exposes window.__verifyProctoringPipeline() for automated browser console audits in production.
 * ──────────────────────────────────────────────────────────────────────────────
 */

export function getOrCreateDiagnostics() {
    if (typeof window === "undefined") return null;

    if (!window.__proctoring_diagnostics) {
        window.__proctoring_diagnostics = {
            version: "2.1.0",
            environment: import.meta.env?.MODE || "production",
            tfBackend: "uninitialized",
            tfReady: false,
            modelLoaded: false,
            modelType: "coco-ssd",
            workerStatus: "uninitialized", // 'uninitialized' | 'initializing' | 'ready' | 'failed' | 'fallback'
            workerError: null,
            fps: 0,
            lastInferenceTimeMs: 0,
            inferenceTimesMs: [],
            inferenceCount: 0,
            detectedObjectsCount: 0,
            activeTrackedClasses: [],
            errorHistory: [],
            detectionsHistory: [],
            logs: [],
            modelAssetAudits: [],
        };
    }

    return window.__proctoring_diagnostics;
}

export function logDiag(category, message, extra = null) {
    const diag = getOrCreateDiagnostics();
    const timestamp = new Date().toISOString();
    const formatted = `[Proctoring Diag][${category}] ${message}`;

    console.log(formatted, extra || "");

    if (diag) {
        diag.logs.push({ timestamp, category, message, extra });
        if (diag.logs.length > 100) diag.logs.shift();
    }
}

export function recordError(phase, error) {
    const diag = getOrCreateDiagnostics();
    const errMessage = typeof error === "string" ? error : error?.message || "Unknown error";
    logDiag("ERROR", `Phase [${phase}] failed: ${errMessage}`);

    if (diag) {
        diag.errorHistory.push({ phase, error: errMessage, timestamp: new Date().toISOString() });
        if (diag.errorHistory.length > 30) diag.errorHistory.shift();
    }
}

export function recordInferenceTime(timeMs, predictions = []) {
    const diag = getOrCreateDiagnostics();
    if (!diag) return;

    diag.lastInferenceTimeMs = timeMs;
    diag.inferenceCount += 1;
    if (timeMs > 0) {
        diag.inferenceTimesMs.push(timeMs);
        if (diag.inferenceTimesMs.length > 50) diag.inferenceTimesMs.shift();
    }

    diag.detectedObjectsCount = predictions.length;
    diag.activeTrackedClasses = [...new Set(predictions.map((p) => p.class || p.label))];

    if (predictions.length > 0) {
        diag.detectionsHistory.push({
            timestamp: new Date().toISOString(),
            items: predictions.map((p) => ({ class: p.class, score: p.score })),
        });
        if (diag.detectionsHistory.length > 30) diag.detectionsHistory.shift();
    }
}

/**
 * window.__verifyProctoringPipeline()
 * Executable diagnostic verification function for production debugging.
 * Performs real-time checks on model assets, TFJS backend, video feed, and predictions.
 */
export async function verifyProctoringPipeline() {
    console.group("%c[AI PROCTORING PRODUCTION AUDIT REPORT]", "color: #00ff88; font-weight: bold; font-size: 14px;");
    const safeOrigin = window.location.origin;
    console.log(`Checking production origin: ${safeOrigin}`);

    const report = {
        modelAssets: [],
        tfjsBackend: {},
        videoElement: {},
        pipelineState: {},
    };

    // 1. Audit Model Assets
    console.group("1. Model Asset Verification");
    const modelJsonUrl = `${safeOrigin}/models/coco-ssd/model.json`;
    try {
        const res = await fetch(modelJsonUrl);
        const corsHeader = res.headers.get("access-control-allow-origin") || "none";
        const contentType = res.headers.get("content-type") || "unknown";
        console.log(`Model JSON URL: ${modelJsonUrl}`);
        console.log(`HTTP Status: ${res.status} | Content-Type: ${contentType} | CORS Header: ${corsHeader}`);

        report.modelAssets.push({
            asset: "model.json",
            url: modelJsonUrl,
            status: res.status,
            contentType,
            corsHeader,
        });

        if (res.ok) {
            const data = await res.json();
            const shards = data?.weightsManifest?.[0]?.paths || [];
            console.log(`Found ${shards.length} weight shards in manifest:`, shards);

            for (const shard of shards) {
                const shardUrl = `${safeOrigin}/models/coco-ssd/${shard}`;
                try {
                    const sRes = await fetch(shardUrl);
                    const sCors = sRes.headers.get("access-control-allow-origin") || "none";
                    const sType = sRes.headers.get("content-type") || "unknown";
                    console.log(`Shard: ${shard} | Status: ${sRes.status} | Content-Type: ${sType} | CORS: ${sCors}`);
                    report.modelAssets.push({
                        asset: shard,
                        url: shardUrl,
                        status: sRes.status,
                        contentType: sType,
                        corsHeader: sCors,
                    });
                } catch (shardErr) {
                    console.error(`Failed to fetch shard ${shard}:`, shardErr);
                    report.modelAssets.push({ asset: shard, url: shardUrl, status: "FETCH_FAILED", error: shardErr.message });
                }
            }
        }
    } catch (err) {
        console.error("Failed to fetch model.json:", err);
        report.modelAssets.push({ asset: "model.json", url: modelJsonUrl, status: "FETCH_FAILED", error: err.message });
    }
    console.groupEnd();

    // 2. TensorFlow Backend Verification
    console.group("2. TensorFlow.js Backend Verification");
    const tf = window.tf;
    if (tf) {
        const backend = tf.getBackend();
        console.log(`TensorFlow version: ${tf.version?.tfjs || "unknown"}`);
        console.log(`Active TFJS Backend: %c${backend}`, "color: #00aaff; font-weight: bold;");
        report.tfjsBackend = {
            loaded: true,
            version: tf.version?.tfjs,
            backend,
            flags: tf.env()?.flags,
        };
    } else {
        console.warn("TensorFlow object window.tf is not defined on window object.");
        report.tfjsBackend = { loaded: false, backend: "none" };
    }
    console.groupEnd();

    // 3. Video Element Verification
    console.group("3. Video Element & Camera Stream Verification");
    const video = document.querySelector("video");
    if (video) {
        const readyStateNames = ["HAVE_NOTHING", "HAVE_METADATA", "HAVE_CURRENT_DATA", "HAVE_FUTURE_DATA", "HAVE_ENOUGH_DATA"];
        const stateName = readyStateNames[video.readyState] || video.readyState;
        console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
        console.log(`Video readyState: ${video.readyState} (${stateName})`);
        console.log(`Video paused: ${video.paused} | ended: ${video.ended}`);
        const stream = video.srcObject;
        const tracks = stream ? stream.getVideoTracks() : [];
        console.log(`Active Video Tracks: ${tracks.length}`);
        if (tracks[0]) {
            console.log(`Track label: ${tracks[0].label} | enabled: ${tracks[0].enabled} | state: ${tracks[0].readyState}`);
        }
        report.videoElement = {
            found: true,
            dimensions: `${video.videoWidth}x${video.videoHeight}`,
            readyState: `${video.readyState} (${stateName})`,
            trackActive: tracks[0]?.readyState === "live",
        };
    } else {
        console.warn("No <video> element found in the active DOM.");
        report.videoElement = { found: false };
    }
    console.groupEnd();

    // 4. Diagnostic State
    console.group("4. Diagnostic Telemetry State");
    const diag = getOrCreateDiagnostics();
    console.log("Telemetry Diagnostics State:", diag);
    report.pipelineState = {
        modelLoaded: diag.modelLoaded,
        workerStatus: diag.workerStatus,
        inferenceCount: diag.inferenceCount,
        lastInferenceTimeMs: diag.lastInferenceTimeMs,
        detectedObjectsCount: diag.detectedObjectsCount,
        activeClasses: diag.activeTrackedClasses,
        errorHistoryCount: diag.errorHistory.length,
    };
    console.groupEnd();

    console.table([
        { Metric: "Model asset model.json", Status: report.modelAssets[0]?.status === 200 ? "OK (200)" : "FAILED" },
        { Metric: "TFJS Active Backend", Status: report.tfjsBackend.backend || "None" },
        { Metric: "Video Element Stream", Status: report.videoElement.trackActive ? "ACTIVE" : "INACTIVE" },
        { Metric: "Detector Inferences Count", Status: report.pipelineState.inferenceCount || 0 },
        { Metric: "Detected Object Classes", Status: (report.pipelineState.activeClasses || []).join(", ") || "None" },
    ]);

    console.groupEnd();
    return report;
}

if (typeof window !== "undefined") {
    window.__verifyProctoringPipeline = verifyProctoringPipeline;
    getOrCreateDiagnostics();
}
