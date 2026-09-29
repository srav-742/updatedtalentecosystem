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

const requestFullscreen = () => {
    if (document.fullscreenElement) return;

    const element = document.documentElement;
    const request =
        element.requestFullscreen ||
        element.webkitRequestFullscreen ||
        element.mozRequestFullScreen ||
        element.msRequestFullscreen;

    if (!request) return;
    Promise.resolve(request.call(element)).catch(() => null);
};

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
    const [webcamPosition, setWebcamPosition] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [toasts, setToasts] = useState([]);

    const webcamContainerRef = useRef(null);

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

    const handleShare = useCallback(async () => {
        clearError();
        requestFullscreen(); // Trigger immediately inside user interaction gesture
        const started = await startScreenShare();
        if (!started) {
            try {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            } catch (_) {}
            return;
        }
        setScreenShareInterrupted(false);
    }, [clearError, startScreenShare]);

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
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
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
        if (e.type === 'mousedown' && e.button !== 0) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const el = webcamContainerRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        dragOffsetRef.current = {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
        setWebcamPosition({
            x: rect.left,
            y: rect.top,
        });
        setIsDragging(true);
    }, []);

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const el = webcamContainerRef.current;
            const width = el ? el.offsetWidth : 220;
            const height = el ? el.offsetHeight : 165;

            const margin = 8;
            const minX = margin;
            const maxX = Math.max(margin, window.innerWidth - width - margin);
            const minY = margin;
            const maxY = Math.max(margin, window.innerHeight - height - margin);

            const rawX = clientX - dragOffsetRef.current.x;
            const rawY = clientY - dragOffsetRef.current.y;

            setWebcamPosition({
                x: Math.min(Math.max(rawX, minX), maxX),
                y: Math.min(Math.max(rawY, minY), maxY),
            });

            if (e.cancelable) e.preventDefault();
        };

        const handleEnd = () => setIsDragging(false);

        window.addEventListener("mousemove", handleMove, { passive: true });
        window.addEventListener("mouseup", handleEnd);
        window.addEventListener("touchmove", handleMove, { passive: false });
        window.addEventListener("touchend", handleEnd);
        window.addEventListener("touchcancel", handleEnd);

        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleEnd);
            window.removeEventListener("touchmove", handleMove);
            window.removeEventListener("touchend", handleEnd);
            window.removeEventListener("touchcancel", handleEnd);
        };
    }, [isDragging]);

    useEffect(() => {
        const handleResize = () => {
            setWebcamPosition((prev) => {
                if (!prev || prev.x === null || prev.y === null) return prev;
                const el = webcamContainerRef.current;
                const width = el ? el.offsetWidth : 220;
                const height = el ? el.offsetHeight : 165;
                const margin = 8;
                const maxX = Math.max(margin, window.innerWidth - width - margin);
                const maxY = Math.max(margin, window.innerHeight - height - margin);
                return {
                    x: Math.min(Math.max(prev.x, margin), maxX),
                    y: Math.min(Math.max(prev.y, margin), maxY),
                };
            });
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const needsScreenShare = requireScreenShare && isActive && !isSharing;

    return (
        <div style={{ position: "relative", minHeight: "100vh" }}>
            {needsScreenShare && (
                <StrictScreenSharePrompt
                    error={screenShareError}
                    onShare={handleShare}
                    warningLimit={warningLimit}
                    resetLimit={resetLimit}
                    isResumePrompt={screenShareInterrupted}
                />
            )}



            {/* Draggable Webcam Preview */}
            {requireCamera && isActive && activeStream && showWebcamPreview && (
                <div
                    ref={webcamContainerRef}
                    className="fixed z-[9999] select-none"
                    style={{
                        position: "fixed",
                        width: "220px",
                        cursor: isDragging ? "grabbing" : "grab",
                        touchAction: "none",
                        ...(webcamPosition && webcamPosition.x !== null && webcamPosition.y !== null
                            ? {
                                  left: `${webcamPosition.x}px`,
                                  top: `${webcamPosition.y}px`,
                                  right: "auto",
                                  bottom: "auto",
                              }
                            : {
                                  right: "24px",
                                  bottom: "24px",
                              }),
                    }}
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                >
                    <div className="overflow-hidden rounded-2xl border-2 border-white/20 bg-black shadow-2xl relative group">
                        <video
                            ref={videoRefCallback}
                            autoPlay
                            muted
                            playsInline
                            className="h-full w-full object-cover pointer-events-none"
                            style={{ transform: "scaleX(-1)", aspectRatio: "4/3" }}
                        />
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white/90">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Proctor
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] text-white/70">
                                ⠿ Drag
                            </span>
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
