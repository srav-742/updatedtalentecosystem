import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Eye, ShieldCheck, Smartphone, Users, Mic, Activity } from "lucide-react";
import { useScreenShare } from "../../hooks/useScreenShare";
import { useStrictProctoringEnhanced } from "../../hooks/useStrictProctoringEnhanced";
import { useMultiLayerProctoring } from "../../hooks/useMultiLayerProctoring";
import StrictScreenSharePrompt from "./StrictScreenSharePrompt";
import { API_URL } from "../../firebase";

/**
 * SecureExamWrapperMultiLayer
 * ──────────────────────────────────────────────────────────────────────────────
 * Multi-Layer Proctoring Exam Wrapper Component.
 * Integrates the full multi-signal pipeline (YOLO ONNX + ByteTrack + MediaPipe FaceMesh/Hands
 * + Web Audio + Behavior Engine + Proctoring Score counter).
 *
 * Completely new component — does NOT modify SecureExamWrapper or SecureExamWrapperEnhanced.
 * ──────────────────────────────────────────────────────────────────────────────
 */

export default function SecureExamWrapperMultiLayer({
    examId,
    userId,
    children,
    isActive = true,
    requireScreenShare = true,
    requireCamera = true,
    cameraStream = null,
    showWebcamPreview = true,
    warningLimit = 3,
    resetLimit = 4,
    onSecurityReset,
    onAutoSubmit,
}) {
    const showDebugPanel = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get("debug") === "true";
    const [screenShareInterrupted, setScreenShareInterrupted] = useState(false);
    const [localCameraStream, setLocalCameraStream] = useState(null);
    const [webcamPosition, setWebcamPosition] = useState({ x: 16, y: 16 });
    const [isDragging, setIsDragging] = useState(false);
    const [toasts, setToasts] = useState([]);

    const videoRef = useRef(null);
    const [videoEl, setVideoEl] = useState(null);

    const videoRefCallback = useCallback((el) => {
        videoRef.current = el;
        setVideoEl(el);
    }, []);

    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // Screen share setup
    const handleScreenShareStopped = useCallback(() => {
        setScreenShareInterrupted(true);
    }, []);

    const { isSharing, error: screenShareError, startScreenShare, clearError } = useScreenShare({
        onStopped: handleScreenShareStopped,
    });

    const proctoringIsActive = isActive && (!requireScreenShare || isSharing);

    // Enhanced strict proctoring for browser/device events
    const { triggerViolation, logEnhancedViolation } = useStrictProctoringEnhanced({
        examId,
        userId,
        isActive: proctoringIsActive,
        warningLimit,
        resetLimit,
        onResetRequired: onSecurityReset,
    });

    // Camera acquisition with automatic retrying and connection status checks
    const activeStream = cameraStream || localCameraStream;

    useEffect(() => {
        if (!requireCamera || !proctoringIsActive || cameraStream) return;
        let cancelled = false;
        let retryTimeout = null;

        const requestCamera = async (attemptsLeft = 5) => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn("[SecureExamWrapperMultiLayer] Browser does not support mediaDevices API");
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: "user" },
                    audio: true,
                });
                if (!cancelled) {
                    setLocalCameraStream(stream);
                    console.log("[SecureExamWrapperMultiLayer] Webcam stream acquired successfully.");
                }
            } catch (err) {
                console.warn(`[SecureExamWrapperMultiLayer] Camera access failed (attempts left: ${attemptsLeft - 1}):`, err);
                if (attemptsLeft > 1 && !cancelled) {
                    retryTimeout = setTimeout(() => requestCamera(attemptsLeft - 1), 3000);
                }
            }
        };

        requestCamera();

        // Listen for new device connections/reconnects
        const handleDeviceChange = () => {
            console.log("[SecureExamWrapperMultiLayer] Audio/Video device change detected. Re-evaluating camera...");
            requestCamera(3);
        };

        navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

        return () => {
            cancelled = true;
            if (retryTimeout) clearTimeout(retryTimeout);
            navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
        };
    }, [requireCamera, proctoringIsActive, cameraStream]);

    // MediaStream attachment
    useEffect(() => {
        if (videoRef.current && activeStream) {
            videoRef.current.srcObject = activeStream;
        }
    }, [activeStream, videoEl]);

    // Backend logging helper
    const handlePipelineViolation = useCallback(
        (type, reason, meta = {}) => {
            triggerViolation(type, reason);
            logEnhancedViolation(type, reason, meta);

            // Send to pipeline endpoint
            fetch(`${API_URL}/proctoring-pipeline/event`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    examId,
                    userId,
                    eventType: type,
                    confidence: meta.confidence || 0.85,
                    durationMs: meta.durationMs || 0,
                    severity: meta.severity || 'medium',
                    proctoringScore: meta.proctoringScore,
                    signals: meta,
                }),
            }).catch(() => {});

            // Toast logging hidden from candidate UI
        },
        [examId, userId, triggerViolation, logEnhancedViolation]
    );

    // Multi-Layer Proctoring Pipeline Hook
    const {
        isReady,
        yoloEngine,
        proctoringScore,
        warningLevel,
        faceState,
        trackedObjects,
        audioSignals,
    } = useMultiLayerProctoring({
        videoElement: videoEl,
        mediaStream: activeStream,
        isActive: proctoringIsActive && requireCamera && !!activeStream,
        examId,
        userId,
        onViolation: handlePipelineViolation,
        onAutoSubmit: onAutoSubmit || (() => {}),
    });

    // Webcam Drag handlers
    const handleDragStart = useCallback((e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragOffsetRef.current = { x: clientX - webcamPosition.x, y: clientY - webcamPosition.y };
        setIsDragging(true);
    }, [webcamPosition]);

    useEffect(() => {
        if (!isDragging) return;
        const handleMove = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            setWebcamPosition({ x: clientX - dragOffsetRef.current.x, y: clientY - dragOffsetRef.current.y });
        };
        const handleEnd = () => setIsDragging(false);
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleEnd);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleEnd);
        };
    }, [isDragging]);

    const needsScreenShare = requireScreenShare && isActive && !isSharing;

    return (
        <div style={{ position: "relative", minHeight: "100vh" }}>
            {needsScreenShare && (
                <StrictScreenSharePrompt
                    error={screenShareError}
                    onShare={startScreenShare}
                    warningLimit={warningLimit}
                    resetLimit={resetLimit}
                    isResumePrompt={screenShareInterrupted}
                />
            )}

            {/* Top Bar Real-Time Score & Security Status */}
            {isActive && (
                <div className="fixed right-4 top-4 z-[9000] flex items-center gap-3 rounded-full border border-black/10 bg-white/95 px-4 py-2 text-xs font-semibold text-gray-700 shadow-xl backdrop-blur">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <ShieldCheck size={16} />
                    </span>
                    <span>Protected session</span>

                    {requireCamera && (
                        <>
                            <span className="h-4 w-px bg-black/10" />
                            <span className={`h-2.5 w-2.5 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                            <span className="text-[10px] uppercase tracking-wider text-gray-500">
                                {isReady ? 'AI Active' : 'Initializing AI...'}
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Draggable Webcam Preview */}
            {requireCamera && isActive && activeStream && showWebcamPreview && (
                <div
                    className="fixed z-[8999] cursor-grab select-none active:cursor-grabbing"
                    style={{ right: `${webcamPosition.x}px`, bottom: `${webcamPosition.y}px`, width: "220px" }}
                    onMouseDown={handleDragStart}
                >
                    <div className="overflow-hidden rounded-2xl border-2 border-black/10 bg-black shadow-2xl">
                        <video
                            ref={videoRefCallback}
                            autoPlay
                            muted
                            playsInline
                            className="h-full w-full object-cover"
                            style={{ transform: "scaleX(-1)", aspectRatio: "4/3" }}
                        />

                        {/* Telemetry Overlay Badges */}
                        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                            {isReady && (
                                <span className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur">
                                    <Eye size={10} />
                                    Face Active
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Non-Blocking Candidate Alerts hidden from UI */}

            {/* Main Content */}
            <div style={{ pointerEvents: needsScreenShare ? "none" : "auto", filter: needsScreenShare ? "blur(8px)" : "none" }}>
                {children}
            </div>

            {/* ── Debug Telemetry Panel (gated by url query debug=true) ─────── */}
            {showDebugPanel && (
                <div className="fixed bottom-24 left-6 z-[9999] w-72 rounded-2xl border border-blue-500/30 bg-slate-950/95 p-4 text-xs font-mono text-blue-400 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md">
                    <h3 className="mb-2 text-sm font-bold text-white border-b border-blue-500/20 pb-1 flex items-center justify-between">
                        <span>PIPELINE TELEMETRY</span>
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                    </h3>
                    <div className="space-y-1.5">
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Camera Stream:</span>
                            <span className={activeStream ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{activeStream ? "ACTIVE" : "INACTIVE"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Pipeline Ready:</span>
                            <span className={isReady ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{isReady ? "YES" : "NO"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>YOLO Engine:</span>
                            <span className="text-white font-bold">{yoloEngine || "none"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Score:</span>
                            <span className="text-white font-bold">{proctoringScore}/100</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Warning Level:</span>
                            <span className="text-white font-bold">{warningLevel}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Face Count:</span>
                            <span className="text-white font-bold">{faceState?.faceCount ?? 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Head Yaw Angle:</span>
                            <span className="text-white font-bold">{faceState?.yawAngle?.toFixed(1) ?? "0.0"}°</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Eyes Closed:</span>
                            <span className="text-white font-bold">{faceState?.eyesClosed ? "YES" : "NO"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Voices Detected:</span>
                            <span className="text-white font-bold">{audioSignals?.multipleVoices ? "YES" : "NO"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Last Check:</span>
                            <span className="text-white font-bold">{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className="pt-1">
                            <span className="text-white font-bold block mb-1">Detections:</span>
                            <div className="max-h-20 overflow-y-auto bg-black/40 p-1.5 rounded border border-white/10 text-[10px]">
                                {trackedObjects.length === 0 ? (
                                    <span className="text-gray-500">No objects tracked</span>
                                ) : (
                                    trackedObjects.map((d, i) => (
                                        <div key={i} className="flex justify-between">
                                            <span className="text-amber-400">{d.class}</span>
                                            <span className="text-white">{(d.score * 100).toFixed(0)}%</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
