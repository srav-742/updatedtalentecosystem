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

const isSuspiciousUI = (className) => {
    if (!className) return false;
    const c = className.toLowerCase();
    const TARGET_OBJECTS = ['book', 'bottle', 'pen', 'pencil', 'cup', 'paper', 'headphones', 'envelope', 'tablet computer', 'tablet', 'mug', 'pencil case'];
    return TARGET_OBJECTS.some(w => c.includes(w));
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
    const showDebugPanel = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get("debug") === "true";
    const [screenShareInterrupted, setScreenShareInterrupted] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [localCameraStream, setLocalCameraStream] = useState(null);
    const [webcamPosition, setWebcamPosition] = useState({ x: 16, y: 16 });
    const [isDragging, setIsDragging] = useState(false);
    const [toasts, setToasts] = useState([]);

    const resetInFlightRef = useRef(false);
    const videoRef = useRef(null);
    const [videoEl, setVideoEl] = useState(null);

    const videoRefCallback = useCallback((el) => {
        videoRef.current = el;
        setVideoEl(el);
    }, []);

    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const triggerViolationRef = useRef(null);
    const logEnhancedViolationRef = useRef(null);

    // ── Screen share ────────────────────────────────────────────────────────
    const handleScreenShareStopped = useCallback(() => {
        setScreenShareInterrupted(true);
        triggerViolationRef.current?.("SCREEN_SHARE_STOPPED", "Screen sharing was stopped. (Ranking: 1)");
        logEnhancedViolationRef.current?.("SCREEN_SHARE_STOPPED", "Screen sharing was stopped. (Ranking: 1)", {
            isAnswering: isAnswering,
            metadata: { stopped: true }
        });
    }, [isAnswering]);

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
        violations,
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
        gracePeriod: 4000,
    });

    triggerViolationRef.current = triggerViolation;
    logEnhancedViolationRef.current = logEnhancedViolation;

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

    // Pipe stream to video element
    useEffect(() => {
        if (videoRef.current && activeStream) {
            const videoTrack = activeStream.getVideoTracks?.()[0];
            if (videoTrack) {
                const stream = new MediaStream([videoTrack]);
                if (videoRef.current.srcObject !== stream) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                }
            }
        }
    }, [activeStream, videoEl]);

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
            // Hiding toasts/flags from the candidate UI (stored in DB only)
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
        videoElement: videoEl,
        isActive: proctoringIsActive && requireCamera && !!activeStream,
        isAnswering,
        onViolation: handleAIViolation,
        thresholds: aiThresholds,
    });

    // ── Show toasts for tab switch / window blur / fullscreen exit ──────────
    const prevViolationsLengthRef = useRef(0);
    useEffect(() => {
        if (violations && violations.length > prevViolationsLengthRef.current) {
            prevViolationsLengthRef.current = violations.length;
        } else if (violations && violations.length === 0) {
            prevViolationsLengthRef.current = 0;
        }
    }, [violations]);

    // ── Fullscreen management ───────────────────────────────────────────────
    useEffect(() => {
        if (!isActive) {
            Promise.resolve().then(() => {
                setScreenShareInterrupted(false);
                setResetting(false);
            });
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
    const contentBlocked = needsScreenShare || resetting;
    const isResetMode = overlayMode === "reset" || resetting;

    // ── AI status indicator ─────────────────────────────────────────────────
    const getAIStatusColor = () => {
        if (!faceMeshReady && !objectModelReady) return "bg-gray-400";
        return "bg-emerald-500";
    };

    const getAIStatusText = () => {
        if (!faceMeshReady && !objectModelReady) return "AI Loading…";
        return "AI Active";
    };

    return (
        <div style={{ position: "relative", minHeight: "100vh" }}>
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

            {/* ── Violation overlay hidden from candidate ─────────────────── */}
            {/* showViolationOverlay && (
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
            )*/}



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
                    <div className="overflow-hidden rounded-2xl border-2 border-black/10 transition-all duration-300 shadow-2xl bg-black">
                        <video
                            ref={videoRefCallback}
                            autoPlay
                            muted
                            playsInline
                            className="h-full w-full object-cover"
                            style={{ transform: "scaleX(-1)", aspectRatio: "4/3" }}
                        />


                    </div>
                </div>
            )}

            {/* ── Hidden video element for AI processing (when no preview) ── */}
            {requireCamera && isActive && activeStream && !showWebcamPreview && (
                <video
                    ref={videoRefCallback}
                    autoPlay
                    muted
                    playsInline
                    style={{
                        position: "fixed",
                        bottom: "0px",
                        right: "0px",
                        width: "640px",
                        height: "480px",
                        opacity: 0.001,
                        pointerEvents: "none",
                        zIndex: -100,
                    }}
                />
            )}

            {/* ── Real-time Non-blocking Toasts (bottom left) ───────────────── */}
            {import.meta.env.MODE !== "production" && (
                <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3 max-w-sm pointer-events-none">
                {toasts.map((toast) => {
                    const getToastIcon = () => {
                        switch (toast.type) {
                            case "PHONE_DETECTED":
                            case "OBJECT_DETECTED":
                                return <Smartphone className="text-red-500 shrink-0" size={18} />;
                            case "MULTIPLE_PEOPLE":
                            case "NO_PEOPLE":
                                return <Users className="text-orange-500 shrink-0" size={18} />;
                            case "EYE_LOOKING_AWAY":
                            case "EYE_LOOKING_AWAY_WHILE_ANSWERING":
                                return <Eye className="text-amber-500 shrink-0" size={18} />;
                            case "HEAD_TURNED":
                            case "HEAD_TURNED_WHILE_ANSWERING":
                                return <Camera className="text-amber-500 shrink-0" size={18} />;
                            default:
                                return <AlertTriangle className="text-amber-500 shrink-0" size={18} />;
                        }
                    };
                    return (
                        <div
                            key={toast.id}
                            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-amber-200/40 bg-white/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md transition-all duration-300 animate-in slide-in-from-left-5 fade-in"
                            style={{
                                fontFamily: "'Outfit', 'Inter', sans-serif",
                            }}
                        >
                            {getToastIcon()}
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    {toast.type.replace(/_/g, " ")}
                                </p>
                                <p className="mt-0.5 text-xs font-semibold leading-relaxed text-gray-700">
                                    {toast.detail}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
            )}

            {/* ── Main content ─────────────────────────────────────────────── */}
            <div
                style={{
                    pointerEvents: contentBlocked ? "none" : "auto",
                    filter: contentBlocked ? "blur(10px)" : "none",
                    transition: "filter 0.3s ease",
                }}
            >
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
                            <span>FaceMesh Ready:</span>
                            <span className={faceMeshReady ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{faceMeshReady ? "YES" : "NO"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>COCO-SSD Ready:</span>
                            <span className={objectModelReady ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{objectModelReady ? "YES" : "NO"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Model Engine:</span>
                            <span className="text-white font-bold">{objectModelType || "none"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Face Count:</span>
                            <span className="text-white font-bold">{faceCount}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Head Turn Ratio:</span>
                            <span className="text-white font-bold">{headTurnRatio.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Gaze Ratio:</span>
                            <span className="text-white font-bold">{gazeRatio.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-0.5">
                            <span>Last Check:</span>
                            <span className="text-white font-bold">{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className="pt-1">
                            <span className="text-white font-bold block mb-1">Detections:</span>
                            <div className="max-h-20 overflow-y-auto bg-black/40 p-1.5 rounded border border-white/10 text-[10px]">
                                {detections.length === 0 ? (
                                    <span className="text-gray-500">No objects detected</span>
                                ) : (
                                    detections.map((d, i) => (
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
