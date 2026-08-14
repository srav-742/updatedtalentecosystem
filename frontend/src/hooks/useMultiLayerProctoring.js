import { useEffect, useRef, useState, useCallback } from "react";

import { useYOLODetector } from "./proctoring/useYOLODetector";
import { useObjectTracker } from "./proctoring/useObjectTracker";
import { useFaceAnalyzer } from "./proctoring/useFaceAnalyzer";
import { useHandAnalyzer } from "./proctoring/useHandAnalyzer";
import { useAudioMonitor } from "./proctoring/useAudioMonitor";
import { usePoseAnalyzer } from "./proctoring/usePoseAnalyzer";
import { useSpeechCommands } from "./proctoring/useSpeechCommands";
import { createBehaviorState, analyzeFrame, isConfirmedPhoneTrack } from "./proctoring/behaviorEngine";
import { WarningEngine, ESCALATION_LEVELS } from "./proctoring/warningEngine";

/**
 * useMultiLayerProctoring
 * ──────────────────────────────────────────────────────────────────────────────
 * Master Orchestrator Hook for the Production-Grade Multi-Layer Proctoring Pipeline.
 * Coordinates frame sampling:
 * - Face tracking: 10 FPS (100ms)
 * - Pose detection: 5 FPS (200ms)
 * - Phone / Object tracking: 3 FPS (333ms)
 * - Speech commands: continuous background listener
 *
 * Integrates YOLO, ByteTrack, MediaPipe FaceMesh/Hands/Pose, TF Speech Commands,
 * Behavior Engine, and Warning Cooldown Escalations.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const TICK_INTERVAL_MS = 100; // 10 FPS Master Loop tick rate

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
    const [poseState, setPoseState] = useState({ poseCount: 0, posture: 'normal' });

    const behaviorStateRef = useRef(createBehaviorState());
    const warningEngineRef = useRef(new WarningEngine());
    const isProcessingRef = useRef(false);

    // Dynamic rate limitation timestamps
    const lastFaceRunRef = useRef(0);
    const lastPoseRunRef = useRef(0);
    const lastYoloRunRef = useRef(0);

    // Sub-detectors
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

    const { ready: poseReady, poseState: rawPoseState, processFrame: processPoseFrame } = usePoseAnalyzer({
        isActive,
        videoElement,
    });

    // Handle voice command alerts directly
    const handleVoiceViolation = useCallback((violation) => {
        const action = {
            action: 'warning',
            eventType: violation.eventType,
            severity: 'high',
            reason: violation.reason,
            proctoringScore: behaviorStateRef.current.score,
            data: { confidence: violation.confidence }
        };
        const confirmedAction = warningEngineRef.current.processAction(action, videoElement);
        if (confirmedAction) {
            setRecentActions((prev) => [action, ...prev].slice(0, 50));
        }
    }, [videoElement]);

    const { ready: speechReady } = useSpeechCommands({
        isActive,
        mediaStream,
        onVoiceViolation: handleVoiceViolation,
    });

    // Refs to hold latest sub-detector states
    const faceStateRef = useRef(faceState);
    const handPositionsRef = useRef(handPositions);
    const audioSignalsRef = useRef(audioSignals);
    const rawPoseStateRef = useRef(rawPoseState);

    // Synchronize state references
    useEffect(() => { faceStateRef.current = faceState; }, [faceState]);
    useEffect(() => { handPositionsRef.current = handPositions; }, [handPositions]);
    useEffect(() => { audioSignalsRef.current = audioSignals; }, [audioSignals]);
    useEffect(() => { rawPoseStateRef.current = rawPoseState; setPoseState(rawPoseState); }, [rawPoseState]);

    // Reset pipeline state when deactivated
    useEffect(() => {
        if (!isActive) {
            behaviorStateRef.current = createBehaviorState();
            warningEngineRef.current.reset();
            resetTracker();
            setProctoringScore(100);
            setWarningLevel(ESCALATION_LEVELS.INFO);
            setRecentActions([]);
            setTrackedObjects([]);
            setPoseState({ poseCount: 0, posture: 'normal' });
            lastFaceRunRef.current = 0;
            lastPoseRunRef.current = 0;
            lastYoloRunRef.current = 0;
        }
    }, [isActive, resetTracker]);

    // Warning Engine subscription
    useEffect(() => {
        const engine = warningEngineRef.current;
        const unsubscribe = engine.addListener((warningRecord) => {
            // Check if warning should trigger popup or toast UI
            if (warningRecord.level) {
                setWarningLevel(warningRecord.level);
            }

            if (warningRecord.level === ESCALATION_LEVELS.AUTO_SUBMIT) {
                onAutoSubmit(warningRecord);
            }

            // Expose confirmed alerts
            if (warningRecord.shouldShowPopup || warningRecord.level === ESCALATION_LEVELS.AUTO_SUBMIT) {
                onViolation(warningRecord.eventType, warningRecord.reason, {
                    severity: warningRecord.severity,
                    level: warningRecord.level,
                    proctoringScore: warningRecord.proctoringScore,
                    data: warningRecord.data,
                    snapshot: warningRecord.snapshot,
                    evidenceFrames: warningRecord.evidenceFrames,
                    startTime: warningRecord.startTime,
                    endTime: warningRecord.endTime,
                    duration: warningRecord.duration,
                    maxConfidence: warningRecord.maxConfidence,
                });
            }
        });

        return () => unsubscribe();
    }, [onViolation, onAutoSubmit]);

    // ── Master Orchestration Frame Sample Tick (10 FPS) ────────────────────
    useEffect(() => {
        if (!isActive || !videoElement) return;

        const intervalId = setInterval(async () => {
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;

            try {
                const now = Date.now();
                const runFace = now - lastFaceRunRef.current >= 100; // 10 FPS
                const runPose = now - lastPoseRunRef.current >= 200; // 5 FPS
                const runYolo = now - lastYoloRunRef.current >= 333; // 3 FPS

                const detectPromises = [];

                if (runYolo) {
                    detectPromises.push(detectFrame().then(dets => {
                        lastYoloRunRef.current = now;
                        return { type: 'yolo', data: dets };
                    }));
                }

                if (runFace) {
                    detectPromises.push(processFaceFrame().then(() => {
                        lastFaceRunRef.current = now;
                        return { type: 'face' };
                    }));
                    detectPromises.push(processHandFrame().then(() => {
                        return { type: 'hand' };
                    }));
                }

                if (runPose) {
                    detectPromises.push(processPoseFrame().then(() => {
                        lastPoseRunRef.current = now;
                        return { type: 'pose' };
                    }));
                }

                // Run scheduled detections concurrently
                const results = await Promise.all(detectPromises);
                const yoloResult = results.find(r => r.type === 'yolo');

                // Update tracker if YOLO has new detections
                let currentTrackedObjects = [];
                if (yoloResult) {
                    currentTrackedObjects = updateTracks(yoloResult.data, now);
                    setTrackedObjects(currentTrackedObjects);
                } else {
                    // Fetch existing active tracks (no new frame, but keep tracker updated)
                    currentTrackedObjects = updateTracks([], now);
                }

                // Gather latest detector signals
                const latestFace = faceStateRef.current;
                const latestHands = handPositionsRef.current;
                const latestAudio = audioSignalsRef.current;
                const latestPose = rawPoseStateRef.current;

                const frameSignals = {
                    faceCount: latestFace.faceCount,
                    faceBbox: latestFace.faceBbox,
                    yawAngle: latestFace.yawAngle,
                    eyesClosed: latestFace.eyesClosed,
                    trackedObjects: currentTrackedObjects,
                    hasPhone: currentTrackedObjects.some(isConfirmedPhoneTrack),
                    handPositions: latestHands,
                    audioSignals: latestAudio,
                    poseState: latestPose,
                };

                // Analyze frame signals
                const actions = analyzeFrame(behaviorStateRef.current, frameSignals);

                // Update Proctoring score (mutable state.score reflects updated score)
                setProctoringScore(behaviorStateRef.current.score);

                // Forward confirmed actions to warning engine
                if (actions && actions.length > 0) {
                    setRecentActions((prev) => [...actions, ...prev].slice(0, 50));
                    for (const action of actions) {
                        warningEngineRef.current.processAction(action, videoElement);
                    }
                }

            } catch (err) {
                console.warn("[Multi-Layer Proctoring] Master loop error:", err);
            } finally {
                isProcessingRef.current = false;
            }
        }, TICK_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [
        isActive,
        videoElement,
        detectFrame,
        processFaceFrame,
        processHandFrame,
        processPoseFrame,
        updateTracks,
        speechReady
    ]);

    return {
        isReady: yoloReady || faceReady || poseReady,
        yoloReady,
        yoloEngine,
        faceReady,
        handReady,
        poseReady,
        speechReady,
        proctoringScore,
        warningLevel,
        faceState,
        poseState,
        trackedObjects,
        recentActions,
        audioSignals,
        warningHistory: warningEngineRef.current.getHistory(),
    };
}
