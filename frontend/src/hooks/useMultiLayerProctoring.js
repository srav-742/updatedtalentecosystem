import { useEffect, useRef, useState, useCallback } from "react";
import { useYOLODetector } from "./proctoring/useYOLODetector";
import { useObjectTracker } from "./proctoring/useObjectTracker";
import { useFaceAnalyzer } from "./proctoring/useFaceAnalyzer";
import { useHandAnalyzer } from "./proctoring/useHandAnalyzer";
import { useAudioMonitor } from "./proctoring/useAudioMonitor";
import { createBehaviorState, analyzeFrame } from "./proctoring/behaviorEngine";
import { WarningEngine, ESCALATION_LEVELS } from "./proctoring/warningEngine";

/**
 * useMultiLayerProctoring
 * ──────────────────────────────────────────────────────────────────────────────
 * Master Orchestrator Hook for the Production-Grade Multi-Layer Proctoring Pipeline.
 * Coordinates frame sampling (5 FPS / 200ms), sub-detectors (YOLO ONNX, FaceMesh,
 * Hands, Web Audio), Object Tracking (ByteTrack), Behavior Analysis Engine, and
 * Warning Escalation Engine.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const FRAME_SAMPLING_INTERVAL_MS = 100; // 10 FPS real-time sampling

export function useMultiLayerProctoring({
    videoElement = null,
    mediaStream = null,
    isActive = false,
    examId = null,
    userId = null,
    onViolation = () => {},
    onAutoSubmit = () => {},
}) {
    const [proctoringScore, setProctoringScore] = useState(100);
    const [warningLevel, setWarningLevel] = useState(ESCALATION_LEVELS.INFO);
    const [recentActions, setRecentActions] = useState([]);
    const [trackedObjects, setTrackedObjects] = useState([]);

    const behaviorStateRef = useRef(createBehaviorState());
    const warningEngineRef = useRef(new WarningEngine());
    const isProcessingFrameRef = useRef(false);

    // Sub-modules
    const { modelReady: yoloReady, engineType: yoloEngine, detections, detectFrame } = useYOLODetector({
        isActive,
        videoElement,
    });

    const { updateTracks, resetTracker } = useObjectTracker(0.3, 10);

    const { ready: faceReady, faceState, processFrame: processFaceFrame } = useFaceAnalyzer({
        isActive,
        videoElement,
    });

    const { ready: handReady, handPositions, processFrame: processHandFrame } = useHandAnalyzer({
        isActive,
        videoElement,
    });

    const { audioSignals } = useAudioMonitor({
        isActive,
        mediaStream,
    });

    // Reset state when session goes inactive
    useEffect(() => {
        if (!isActive) {
            behaviorStateRef.current = createBehaviorState();
            warningEngineRef.current.reset();
            resetTracker();
            setProctoringScore(100);
            setWarningLevel(ESCALATION_LEVELS.INFO);
            setRecentActions([]);
            setTrackedObjects([]);
        }
    }, [isActive, resetTracker]);

    // Setup warning engine listener
    useEffect(() => {
        const engine = warningEngineRef.current;
        const unsubscribe = engine.addListener((warningRecord) => {
            setWarningLevel(warningRecord.level);

            if (warningRecord.level === ESCALATION_LEVELS.AUTO_SUBMIT) {
                onAutoSubmit(warningRecord);
            }

            onViolation(warningRecord.eventType, warningRecord.reason, {
                severity: warningRecord.severity,
                level: warningRecord.level,
                proctoringScore: warningRecord.proctoringScore,
                data: warningRecord.data,
                snapshot: warningRecord.snapshot,
            });
        });

        return () => unsubscribe();
    }, [onViolation, onAutoSubmit]);

    // ── Frame Sampling Loop (5 FPS / 200ms) ───────────────────────────────────
    useEffect(() => {
        if (!isActive || !videoElement) return;

        const intervalId = setInterval(async () => {
            if (isProcessingFrameRef.current) return;
            isProcessingFrameRef.current = true;

            try {
                const timestamp = Date.now();

                // 1. Run detectors concurrently
                const [rawDetections] = await Promise.all([
                    detectFrame(),
                    processFaceFrame(),
                    processHandFrame(),
                ]);

                // 2. Object Tracking (ByteTrack)
                const currentTrackedObjects = updateTracks(rawDetections, timestamp);
                setTrackedObjects(currentTrackedObjects);

                // 3. Aggregate all detector signals into single frame object
                const frameSignals = {
                    faceCount: faceState.faceCount,
                    faceBbox: faceState.faceBbox,
                    yawAngle: faceState.yawAngle,
                    eyesClosed: faceState.eyesClosed,
                    trackedObjects: currentTrackedObjects,
                    hasPhone: currentTrackedObjects.some(t => t.class === 'cell phone'),
                    handPositions,
                    audioSignals,
                };

                // 4. Behavior Analysis Engine evaluation
                const actions = analyzeFrame(behaviorStateRef.current, frameSignals);

                // 5. Update Proctoring Score
                setProctoringScore(behaviorStateRef.current.score);

                // 6. Process actions through Warning Engine
                if (actions && actions.length > 0) {
                    setRecentActions((prev) => [...actions, ...prev].slice(0, 50));

                    for (const action of actions) {
                        warningEngineRef.current.processAction(action, videoElement);
                    }
                }
            } catch (err) {
                console.warn("[Multi-Layer Proctoring] Frame sample loop error:", err);
            } finally {
                isProcessingFrameRef.current = false;
            }
        }, FRAME_SAMPLING_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [
        isActive,
        videoElement,
        detectFrame,
        processFaceFrame,
        processHandFrame,
        updateTracks,
        faceState,
        handPositions,
        audioSignals,
    ]);

    return {
        isReady: yoloReady || faceReady,
        yoloReady,
        yoloEngine,
        faceReady,
        handReady,
        proctoringScore,
        warningLevel,
        faceState,
        trackedObjects,
        recentActions,
        audioSignals,
        warningHistory: warningEngineRef.current.getHistory(),
    };
}
