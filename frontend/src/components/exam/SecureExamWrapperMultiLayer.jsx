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

    // Camera acquisition
    const activeStream = cameraStream || localCameraStream;

    useEffect(() => {
        if (!requireCamera || !proctoringIsActive || cameraStream) return;
        let cancelled = false;

        const requestCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: "user" },
                    audio: true,
                });
                if (!cancelled) setLocalCameraStream(stream);
            } catch (err) {
                console.warn("[SecureExamWrapperMultiLayer] Camera access denied:", err);
            }
        };

        requestCamera();
        return () => { cancelled = true; };
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

            // Display candidate toast
            const toastId = Date.now() + Math.random();
            setToasts((prev) => [...prev, { id: toastId, type, detail: reason }]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== toastId));
            }, 4000);
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

                    {/* Proctoring Score Badge */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                        <Activity size={12} className={proctoringScore < 70 ? "text-amber-500" : "text-emerald-500"} />
                        <span className="text-xs font-bold font-mono">Score: {proctoringScore}/100</span>
                    </div>

                    {requireCamera && (
                        <>
                            <span className="h-4 w-px bg-black/10" />
                            <span className={`h-2.5 w-2.5 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                            <span className="text-[10px] uppercase tracking-wider text-gray-500">
                                {isReady ? `Pipeline (${yoloEngine || 'SSD'})` : 'Initializing AI...'}
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
                            <span className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur">
                                <Eye size={10} />
                                {faceState.faceCount} face(s)
                            </span>
                            {trackedObjects.some(t => t.class === 'cell phone') && (
                                <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white animate-pulse">
                                    <Smartphone size={10} />
                                    PHONE DETECTED
                                </span>
                            )}
                            {audioSignals.multipleVoices && (
                                <span className="flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[9px] font-bold text-white">
                                    <Mic size={10} />
                                    VOICES
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Non-Blocking Candidate Alerts */}
            <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3 max-w-sm pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-amber-200/50 bg-white/90 p-4 shadow-xl backdrop-blur-md animate-in slide-in-from-left-5"
                    >
                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400">{toast.type.replace(/_/g, " ")}</p>
                            <p className="text-xs font-semibold text-gray-800 mt-0.5">{toast.detail}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div style={{ pointerEvents: needsScreenShare ? "none" : "auto", filter: needsScreenShare ? "blur(8px)" : "none" }}>
                {children}
            </div>
        </div>
    );
}
