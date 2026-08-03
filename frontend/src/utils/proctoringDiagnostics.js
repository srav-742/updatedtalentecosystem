/**
 * proctoringDiagnostics.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Production diagnostic telemetry module for the Hire1Percent AI Proctoring System.
 * Maintains window.__proctoring_diagnostics state for live debugging, backend monitoring,
 * and performance metrics (FPS, inference times, detected classes, errors).
 * ──────────────────────────────────────────────────────────────────────────────
 */

export function getOrCreateDiagnostics() {
    if (typeof window === "undefined") return null;

    if (!window.__proctoring_diagnostics) {
        window.__proctoring_diagnostics = {
            version: "2.0.0",
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
    diag.inferenceTimesMs.push(timeMs);
    if (diag.inferenceTimesMs.length > 50) diag.inferenceTimesMs.shift();

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
