import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Eye, ShieldAlert, ShieldCheck, Smartphone, Users } from "lucide-react";
import { useScreenShare } from "../../hooks/useScreenShare";
import { useStrictProctoringEnhanced } from "../../hooks/useStrictProctoringEnhanced";
import { useAIProctoring } from "../../hooks/useAIProctoring";
import StrictScreenSharePrompt from "./StrictScreenSharePrompt";

/**
 * SecureExamWrapperEnhanced
 * ──────────────────────────────────────────────────────────────────────────────
 * Drop-in replacement for SecureExamWrapper that adds:
 *   • Floating draggable webcam preview
 *   • AI-powered face mesh, gaze, head pose, and object detection
 *   • Enhanced device/monitor telemetry
 *   • Real-time violation indicator badges
 *
 * Does NOT modify SecureExamWrapper.jsx — it's a completely new file.
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

export default function SecureExamWrapperEnhanced({
    examId,
    userId,
    children,
    isActive = true,
    requireScreenShare = true,
    requireCamera = false,
    cameraStream = null,
    showWebcamPreview = true,
    isAnswering = false,
    warningLimit = 3,
    resetLimit = 4,
    onSecurityReset,
    aiThresholds = {},
}) {
    const [screenShareInterrupted, setScreenShareInterrupted] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [localCameraStream, setLocalCameraStream] = useState(null);
    const [webcamPosition, setWebcamPosition] = useState({ x: 16, y: 16 });
    const [isDragging, setIsDragging] = useState(false);

    const resetInFlightRef = useRef(false);
    const videoRef = useRef(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // ── Screen share ────────────────────────────────────────────────────────
    const handleScreenShareStopped = useCallback(() => {
        setScreenShareInterrupted(true);
    }, []);

    const {
        isSharing,
        error: screenShareError,
        startScreenShare,
        clearError,
    } = useScreenShare({ onStopped: handleScreenShareStopped });

    // ── Security reset ──────────────────────────────────────────────────────
    const handleSecurityReset = useCallback(async (violation) => {
        if (resetInFlightRef.current) return;
        resetInFlightRef.current = true;
        setResetting(true);

        try {
            await onSecurityReset?.(violation);
        } catch (error) {
            console.error("Failed to reset application flow after security violation:", error);
        }
    }, [onSecurityReset]);

    const proctoringIsActive = isActive && (!requireScreenShare || isSharing) && !resetting;

    // ── Enhanced strict proctoring (device/telemetry + base violations) ─────
    const {
        violationCount,
        showOverlay,
        overlayMessage,
        overlayMode,
        isLocked,
        dismissOverlay,
        triggerViolation,
        logEnhancedViolation,
    } = useStrictProctoringEnhanced({
        examId,
        userId,
        isActive: proctoringIsActive,
        warningLimit,
        resetLimit,
        onResetRequired: handleSecurityReset,
    });

    // ── Camera stream management ────────────────────────────────────────────
    const activeStream = cameraStream || localCameraStream;

    useEffect(() => {
        if (!requireCamera || !proctoringIsActive || cameraStream) return;

        let cancelled = false;

        const requestCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: "user" },
                    audio: false,
                });
                if (!cancelled) {
                    setLocalCameraStream(stream);
                }
            } catch (err) {
                console.warn("[SecureExamWrapperEnhanced] Camera access denied:", err);
            }
        };

        requestCamera();

        return () => {
            cancelled = true;
        };
    }, [requireCamera, proctoringIsActive, cameraStream]);

    // Pipe stream to hidden video element
    useEffect(() => {
        if (videoRef.current && activeStream) {
            const videoTrack = activeStream.getVideoTracks?.()[0];
            if (videoTrack) {
                videoRef.current.srcObject = new MediaStream([videoTrack]);
            }
        }
    }, [activeStream]);

    // Cleanup local camera on unmount
    useEffect(() => {
        return () => {
            if (localCameraStream) {
                localCameraStream.getTracks().forEach((t) => t.stop());
            }
        };
    }, [localCameraStream]);

    // ── AI violation handler ────────────────────────────────────────────────
    const handleAIViolation = useCallback(
        (type, detail, meta = {}) => {
            triggerViolation(type, detail);
            logEnhancedViolation(type, detail, {
                isAnswering: meta.isAnswering || false,
                confidence: meta.confidence || null,
                metadata: meta,
            });
        },
        [triggerViolation, logEnhancedViolation]
    );

    // ── AI proctoring engine ────────────────────────────────────────────────
    const {
        faceMeshReady,
        objectModelReady,
        objectModelType,
        faceCount,
        headTurnRatio,
        gazeRatio,
        landmarks,
        detections,
    } = useAIProctoring({
        videoElement: videoRef.current,
        isActive: proctoringIsActive && requireCamera && !!activeStream,
        isAnswering,
        onViolation: handleAIViolation,
        thresholds: aiThresholds,
    });

    // ── Fullscreen management ───────────────────────────────────────────────
    useEffect(() => {
        if (!isActive) {
            setScreenShareInterrupted(false);
            setResetting(false);
            resetInFlightRef.current = false;
        }
    }, [isActive]);

    useEffect(() => {
        if (!isActive || (requireScreenShare && !isSharing)) return;

        const timer = setTimeout(() => requestFullscreen(), 200);
        return () => clearTimeout(timer);
    }, [isActive, isSharing, requireScreenShare]);

    // ── Screen share handler ────────────────────────────────────────────────
    const handleShare = useCallback(async () => {
        clearError();
        const started = await startScreenShare();
        if (!started) return;
        setScreenShareInterrupted(false);
        setTimeout(() => requestFullscreen(), 200);
    }, [clearError, startScreenShare]);

    // ── Webcam drag handling ────────────────────────────────────────────────
    const handleDragStart = useCallback((e) => {
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragOffsetRef.current = {
            x: clientX - webcamPosition.x,
            y: clientY - webcamPosition.y,
        };
        setIsDragging(true);
    }, [webcamPosition]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            setWebcamPosition({
                x: clientX - dragOffsetRef.current.x,
                y: clientY - dragOffsetRef.current.y,
            });
        };

        const handleEnd = () => setIsDragging(false);

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleEnd);
        window.addEventListener("touchmove", handleMove, { passive: false });
        window.addEventListener("touchend", handleEnd);

        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleEnd);
            window.removeEventListener("touchmove", handleMove);
            window.removeEventListener("touchend", handleEnd);
        };
    }, [isDragging]);

    // ── Derived state ───────────────────────────────────────────────────────
    const needsScreenShare = requireScreenShare && isActive && !isSharing;
    const showViolationOverlay = !needsScreenShare && showOverlay;
    const contentBlocked = needsScreenShare || showViolationOverlay || resetting;
    const isResetMode = overlayMode === "reset" || resetting;

    // ── AI status indicator ─────────────────────────────────────────────────
    const getAIStatusColor = () => {
        if (!faceMeshReady && !objectModelReady) return "bg-gray-400";
        if (faceCount === 0) return "bg-red-500 animate-pulse";
        if (faceCount > 1) return "bg-orange-500 animate-pulse";
        return "bg-emerald-500";
    };

    const getAIStatusText = () => {
        if (!faceMeshReady && !objectModelReady) return "AI Loading…";
        if (faceCount === 0) return "No face detected";
        if (faceCount > 1) return `${faceCount} faces`;
        return "AI Active";
    };

    return (
        <div style={{ position: "relative", minHeight: "100vh", userSelect: "none" }}>
            {/* ── Screen share prompt ──────────────────────────────────────── */}
            {needsScreenShare && (
                <StrictScreenSharePrompt
                    error={screenShareError}
                    onShare={handleShare}
                    warningLimit={warningLimit}
                    resetLimit={resetLimit}
                    isResumePrompt={screenShareInterrupted}
                />
            )}

            {/* ── Violation overlay ────────────────────────────────────────── */}
            {showViolationOverlay && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[rgba(245,240,231,0.82)] p-6 backdrop-blur-md">
                    <div className={`w-full max-w-xl rounded-[2rem] border bg-white p-8 text-center shadow-[0_40px_120px_rgba(15,23,42,0.18)] ${isResetMode ? "border-red-200" : "border-amber-200"}`}>
                        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] ${isResetMode ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"}`}>
                            {isResetMode ? <ShieldAlert size={30} /> : <AlertTriangle size={30} />}
                        </div>
                        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Security notice</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
                            {isResetMode ? "Security reset in progress" : "Violation detected"}
                        </h2>

                        <div className="mt-6 flex justify-center gap-3">
                            {Array.from({ length: resetLimit }).map((_, index) => {
                                const step = index + 1;
                                const isFilled = violationCount >= step;
                                return (
                                    <div
                                        key={step}
                                        className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${isFilled ? "border-red-500 bg-red-500 text-white" : "border-black/10 bg-[#f8f4ed] text-gray-500"}`}
                                    >
                                        {isFilled ? "!" : step}
                                    </div>
                                );
                            })}
                        </div>

                        <p className="mt-6 whitespace-pre-line text-sm leading-7 text-gray-600">
                            {overlayMessage}
                        </p>

                        {!isResetMode && (
                            <button
                                onClick={dismissOverlay}
                                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                            >
                                Return to Exam
                            </button>
                        )}

                        {isResetMode && (
                            <div className="mt-6 flex items-center justify-center gap-3 text-sm font-medium text-red-600">
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                                Moving you back to Resume Analysis...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Security status badge (top right) ────────────────────────── */}
            {isActive && (
                <div className="fixed right-4 top-4 z-[9000] flex items-center gap-3 rounded-full border border-black/10 bg-white/95 px-4 py-2 text-xs font-medium text-gray-700 shadow-lg backdrop-blur">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${violationCount === 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                        {violationCount === 0 ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                    </span>
                    <span>Protected session</span>

                    {/* AI status indicator */}
                    {requireCamera && (
                        <>
                            <span className="mx-1 h-4 w-px bg-black/10" />
                            <span className={`h-2.5 w-2.5 rounded-full ${getAIStatusColor()}`} />
                            <span className="text-[10px] uppercase tracking-wider text-gray-400">
                                {getAIStatusText()}
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* ── Floating webcam preview (draggable) ──────────────────────── */}
            {requireCamera && isActive && activeStream && showWebcamPreview && (
                <div
                    className="fixed z-[8999] cursor-grab select-none active:cursor-grabbing"
                    style={{
                        right: `${webcamPosition.x}px`,
                        bottom: `${webcamPosition.y}px`,
                        width: "200px",
                    }}
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                >
                    <div className="overflow-hidden rounded-2xl border-2 border-black/10 bg-black shadow-2xl">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="h-full w-full object-cover"
                            style={{ transform: "scaleX(-1)", aspectRatio: "4/3" }}
                        />

                        {/* AI telemetry badges */}
                        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                            {faceMeshReady && (
                                <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                                    <Eye size={8} />
                                    {faceCount === 1 ? "1 face" : `${faceCount} faces`}
                                </span>
                            )}
                            {objectModelReady && (
                                <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                                    <Camera size={8} />
                                    {objectModelType?.toUpperCase()}
                                </span>
                            )}
                            {detections.some((d) => d.class === "cell phone") && (
                                <span className="flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[9px] font-bold text-white animate-pulse">
                                    <Smartphone size={8} />
                                    PHONE
                                </span>
                            )}
                            {faceCount > 1 && (
                                <span className="flex items-center gap-1 rounded-full bg-orange-600/90 px-2 py-0.5 text-[9px] font-bold text-white animate-pulse">
                                    <Users size={8} />
                                    {faceCount}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Hidden video element for AI processing (when no preview) ── */}
            {requireCamera && isActive && activeStream && !showWebcamPreview && (
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ position: "absolute", top: -9999, left: -9999, width: 1, height: 1 }}
                />
            )}

            {/* ── Main content ─────────────────────────────────────────────── */}
            <div
                style={{
                    pointerEvents: isLocked || contentBlocked ? "none" : "auto",
                    filter: contentBlocked ? "blur(10px)" : "none",
                    transition: "filter 0.3s ease",
                }}
            >
                {children}
            </div>
        </div>
    );
}
