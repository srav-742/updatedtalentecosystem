import { useCallback, useEffect, useRef, useState } from "react";


import { useAIProctoring } from "../../hooks/useAIProctoring";

/**
 * ProctoringTest — Developer Proctoring Dashboard
 * ──────────────────────────────────────────────────────────────────────────────
 * A high-fidelity visual dashboard that lets developers test each AI
 * proctoring feature step-by-step:
 *
 *   • Live webcam feed with FaceMesh landmark overlay
 *   • Real-time head rotation and gaze ratio gauges
 *   • Object detection bounding boxes (phone, headphones)
 *   • Device/monitor telemetry panel
 *   • Interactive toggles for "Answering" state and mock violations
 *   • Scrollable event log with timestamps
 * ──────────────────────────────────────────────────────────────────────────────
 */

export default function ProctoringTest() {
    // ── Camera state ────────────────────────────────────────────────────────
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [cameraError, setCameraError] = useState(null);

    // ── Test controls ───────────────────────────────────────────────────────
    const [isAnswering, setIsAnswering] = useState(false);
    const [proctorActive, setProctorActive] = useState(true);

    // ── Event log ───────────────────────────────────────────────────────────
    const [events, setEvents] = useState([]);

    // ── Telemetry ───────────────────────────────────────────────────────────
    const [devices, setDevices] = useState([]);
    const screenExtended = !!window.screen?.isExtended;
    const [hasFocus, setHasFocus] = useState(true);

    const videoRef = useRef(null);
    const [videoEl, setVideoEl] = useState(null);
    const videoRefCallback = useCallback((el) => {
        videoRef.current = el;
        setVideoEl(el);
    }, []);
    const canvasRef = useRef(null);
    const logContainerRef = useRef(null);

    // ── Log helper ──────────────────────────────────────────────────────────
    const logEvent = useCallback((type, detail, severity = "info") => {
        const entry = {
            id: Date.now() + Math.random(),
            type,
            detail,
            severity,
            timestamp: new Date().toISOString(),
        };
        setEvents((prev) => [entry, ...prev].slice(0, 200));
    }, []);

    // ── Camera control ──────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: "user" },
                audio: false,
            });
            setCameraStream(stream);
            setCameraActive(true);
            logEvent("CAMERA", "Webcam started successfully", "success");
        } catch (err) {
            setCameraError(err.message);
            logEvent("CAMERA", `Camera access denied: ${err.message}`, "error");
        }
    }, [logEvent]);

    const stopCamera = useCallback(() => {
        if (cameraStream) {
            cameraStream.getTracks().forEach((t) => t.stop());
        }
        setCameraStream(null);
        setCameraActive(false);
        logEvent("CAMERA", "Webcam stopped", "info");
    }, [cameraStream, logEvent]);

    // Pipe stream to video element
    useEffect(() => {
        if (videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream, videoEl]);

    // ── AI violation callback ───────────────────────────────────────────────
    const handleViolation = useCallback(
        (type, detail) => {
            const severity =
                type.includes("WHILE_ANSWERING") || type === "PHONE_DETECTED" || type === "MULTIPLE_PEOPLE"
                    ? "critical"
                    : type === "NO_PEOPLE" || type === "HEAD_TURNED"
                    ? "warning"
                    : "info";
            logEvent(type, detail, severity);
        },
        [logEvent]
    );

    // ── AI proctoring hook ──────────────────────────────────────────────────
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
        isActive: proctorActive && cameraActive,
        isAnswering,
        onViolation: handleViolation,
    });

    // ── Draw landmarks on canvas ────────────────────────────────────────────
    useEffect(() => {
        if (!landmarks || !canvasRef.current || !videoEl) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const video = videoEl;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw landmark dots
        ctx.fillStyle = "rgba(0, 255, 128, 0.6)";
        for (const point of landmarks) {
            ctx.beginPath();
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Highlight key landmarks
        const keyPoints = [
            { idx: 1, color: "#ff4444", label: "Nose" },      // Nose tip
            { idx: 234, color: "#4488ff", label: "L Cheek" },  // Left cheek
            { idx: 454, color: "#4488ff", label: "R Cheek" },  // Right cheek
        ];

        for (const kp of keyPoints) {
            const pt = landmarks[kp.idx];
            if (!pt) continue;
            ctx.fillStyle = kp.color;
            ctx.beginPath();
            ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 10px Inter, system-ui, sans-serif";
            ctx.fillText(kp.label, pt.x * canvas.width + 6, pt.y * canvas.height - 4);
        }

        // Draw iris landmarks if available (468, 473)
        if (landmarks.length > 473) {
            const irisPoints = [468, 473];
            ctx.fillStyle = "#ff00ff";
            for (const idx of irisPoints) {
                const pt = landmarks[idx];
                if (!pt) continue;
                ctx.beginPath();
                ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }, [landmarks, videoEl]);

    // ── Draw object detection boxes ─────────────────────────────────────────
    useEffect(() => {
        if (!detections.length || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        for (const det of detections) {
            const [x, y, w, h] = det.bbox;
            const isPhone = det.class === "cell phone";

            ctx.strokeStyle = isPhone ? "#ff0000" : "#00ff88";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            ctx.fillStyle = isPhone ? "rgba(255,0,0,0.8)" : "rgba(0,255,136,0.8)";
            ctx.font = "bold 11px Inter, system-ui, sans-serif";
            ctx.fillText(
                `${det.class} ${(det.score * 100).toFixed(0)}%`,
                x + 4,
                y > 16 ? y - 4 : y + h + 14
            );
        }
    }, [detections]);

    // ── Device enumeration ──────────────────────────────────────────────────
    useEffect(() => {
        const updateDevices = async () => {
            try {
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                setDevices(allDevices);
            } catch {
                // not supported
            }
        };

        updateDevices();
        navigator.mediaDevices?.addEventListener?.("devicechange", updateDevices);

        return () => {
            navigator.mediaDevices?.removeEventListener?.("devicechange", updateDevices);
        };
    }, []);



    // ── Focus tracking ──────────────────────────────────────────────────────
    useEffect(() => {
        const handleFocus = () => {
            setHasFocus(true);
            logEvent("FOCUS", "Window regained focus", "info");
        };
        const handleBlur = () => {
            setHasFocus(false);
            logEvent("FOCUS", "Window lost focus (blur)", "warning");
        };

        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);
        return () => {
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
        };
    }, [logEvent]);

    // ── Cleanup on unmount ──────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach((t) => t.stop());
            }
        };
    }, [cameraStream]);

    // ── Severity colors ─────────────────────────────────────────────────────
    const severityStyles = {
        info: "border-blue-200 bg-blue-50 text-blue-800",
        success: "border-emerald-200 bg-emerald-50 text-emerald-800",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        critical: "border-red-200 bg-red-50 text-red-800",
        error: "border-red-300 bg-red-100 text-red-900",
    };

    const videoInputs = devices.filter((d) => d.kind === "videoinput");
    const audioInputs = devices.filter((d) => d.kind === "audioinput");

    return (
        <div className="min-h-screen bg-[#f7f4ee] pb-16">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="mx-auto max-w-7xl px-6 pt-8">
                <div className="rounded-[2rem] border border-black/10 bg-white px-8 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-black text-white">
                            <ShieldCheck size={26} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                AI Proctoring Test Dashboard
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Test face mesh, gaze tracking, head pose, and object detection in real time.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto mt-6 max-w-7xl px-6">
                <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                    {/* ── Left column: Webcam & Controls ──────────────────── */}
                    <div className="space-y-6">
                        {/* Webcam feed with canvas overlay */}
                        <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
                                    Live Camera Feed
                                </h2>
                                <div className="flex items-center gap-3">
                                    {cameraActive ? (
                                        <button
                                            onClick={stopCamera}
                                            className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                                        >
                                            <CameraOff size={14} /> Stop Camera
                                        </button>
                                    ) : (
                                        <button
                                            onClick={startCamera}
                                            className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
                                        >
                                            <Camera size={14} /> Start Camera
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="relative aspect-video overflow-hidden rounded-2xl bg-gray-900">
                                {cameraActive ? (
                                    <>
                                        <video
                                            ref={videoRefCallback}
                                            autoPlay
                                            muted
                                            playsInline
                                            className="h-full w-full object-cover"
                                            style={{ transform: "scaleX(-1)" }}
                                        />
                                        <canvas
                                            ref={canvasRef}
                                            className="absolute inset-0 h-full w-full"
                                            style={{ transform: "scaleX(-1)" }}
                                        />
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-500">
                                        <Camera size={48} className="opacity-20" />
                                        <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">
                                            Camera Inactive
                                        </span>
                                        {cameraError && (
                                            <span className="text-xs text-red-400">{cameraError}</span>
                                        )}
                                    </div>
                                )}

                                {/* Model status badges */}
                                <div className="absolute left-3 top-3 flex flex-col gap-2">
                                    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold ${faceMeshReady ? "bg-emerald-500/90 text-white" : "bg-gray-700/80 text-gray-300"}`}>
                                        {faceMeshReady ? <CheckCircle2 size={10} /> : <Loader2 size={10} className="animate-spin" />}
                                        FaceMesh
                                    </span>
                                    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold ${objectModelReady ? "bg-emerald-500/90 text-white" : "bg-gray-700/80 text-gray-300"}`}>
                                        {objectModelReady ? <CheckCircle2 size={10} /> : <Loader2 size={10} className="animate-spin" />}
                                        {objectModelType ? objectModelType.toUpperCase() : "Object Det."}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Gauges */}
                        <div className="grid gap-4 md:grid-cols-3">
                            {/* Face count */}
                            <div className="rounded-2xl border border-black/10 bg-white p-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Faces</p>
                                <p className={`mt-2 text-4xl font-bold tracking-tight ${faceCount === 1 ? "text-emerald-600" : faceCount === 0 ? "text-red-600" : "text-orange-600"}`}>
                                    {faceCount}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    {faceCount === 1 ? "Normal" : faceCount === 0 ? "No face detected" : "Multiple faces"}
                                </p>
                            </div>

                            {/* Head turn ratio */}
                            <div className="rounded-2xl border border-black/10 bg-white p-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Head Turn</p>
                                <p className={`mt-2 text-4xl font-bold tracking-tight ${headTurnRatio > 2.0 || headTurnRatio < 0.5 ? "text-red-600" : "text-gray-900"}`}>
                                    {headTurnRatio.toFixed(2)}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    L/R cheek ratio (0.5–2.0 = normal)
                                </p>
                            </div>

                            {/* Gaze ratio */}
                            <div className="rounded-2xl border border-black/10 bg-white p-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Gaze H</p>
                                <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
                                    {gazeRatio.toFixed(2)}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    Iris horizontal position (0=L, 1=R)
                                </p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
                                Test Controls
                            </h2>
                            <div className="grid gap-4 md:grid-cols-3">
                                {/* Proctor toggle */}
                                <button
                                    onClick={() => setProctorActive(!proctorActive)}
                                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${proctorActive ? "border-emerald-200 bg-emerald-50" : "border-black/10 bg-gray-50"}`}
                                >
                                    {proctorActive ? <ToggleRight size={20} className="text-emerald-600" /> : <ToggleLeft size={20} className="text-gray-400" />}
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">AI Proctor</p>
                                        <p className="text-[10px] text-gray-500">{proctorActive ? "Active" : "Paused"}</p>
                                    </div>
                                </button>

                                {/* Answering toggle */}
                                <button
                                    onClick={() => {
                                        setIsAnswering(!isAnswering);
                                        logEvent("TOGGLE", `isAnswering = ${!isAnswering}`, "info");
                                    }}
                                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${isAnswering ? "border-red-200 bg-red-50" : "border-black/10 bg-gray-50"}`}
                                >
                                    {isAnswering ? <Eye size={20} className="text-red-600" /> : <EyeOff size={20} className="text-gray-400" />}
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">Answering</p>
                                        <p className="text-[10px] text-gray-500">{isAnswering ? "Recording" : "Idle"}</p>
                                    </div>
                                </button>

                                {/* Clear log */}
                                <button
                                    onClick={() => setEvents([])}
                                    className="flex items-center gap-3 rounded-2xl border border-black/10 bg-gray-50 p-4 text-left transition hover:bg-gray-100"
                                >
                                    <RotateCcw size={20} className="text-gray-400" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">Clear Log</p>
                                        <p className="text-[10px] text-gray-500">{events.length} entries</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Right column: Telemetry & Event Log ─────────────── */}
                    <div className="space-y-6">
                        {/* Device telemetry */}
                        <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
                                Environment Telemetry
                            </h2>

                            <div className="space-y-3">
                                {/* Focus state */}
                                <div className={`flex items-center gap-3 rounded-xl border p-3 ${hasFocus ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                                    <Wifi size={14} className={hasFocus ? "text-emerald-600" : "text-red-600"} />
                                    <span className="text-xs font-medium text-gray-700">
                                        Window Focus: <span className={`font-bold ${hasFocus ? "text-emerald-600" : "text-red-600"}`}>{hasFocus ? "Active" : "Lost"}</span>
                                    </span>
                                </div>

                                {/* Screen extended */}
                                <div className={`flex items-center gap-3 rounded-xl border p-3 ${screenExtended ? "border-amber-200 bg-amber-50" : "border-black/10 bg-gray-50"}`}>
                                    <Monitor size={14} className={screenExtended ? "text-amber-600" : "text-gray-400"} />
                                    <span className="text-xs font-medium text-gray-700">
                                        Multi-Monitor: <span className={`font-bold ${screenExtended ? "text-amber-600" : "text-gray-500"}`}>{screenExtended ? "Detected" : "None"}</span>
                                    </span>
                                </div>

                                {/* Cameras */}
                                <div className={`flex items-center gap-3 rounded-xl border p-3 ${videoInputs.length > 1 ? "border-amber-200 bg-amber-50" : "border-black/10 bg-gray-50"}`}>
                                    <Camera size={14} className={videoInputs.length > 1 ? "text-amber-600" : "text-gray-400"} />
                                    <span className="text-xs font-medium text-gray-700">
                                        Cameras: <span className="font-bold text-gray-900">{videoInputs.length}</span>
                                    </span>
                                </div>

                                {/* Mics */}
                                <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-gray-50 p-3">
                                    <MonitorSmartphone size={14} className="text-gray-400" />
                                    <span className="text-xs font-medium text-gray-700">
                                        Microphones: <span className="font-bold text-gray-900">{audioInputs.length}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Device list */}
                            {videoInputs.length > 0 && (
                                <div className="mt-4">
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                                        Video Inputs
                                    </p>
                                    {videoInputs.map((d, i) => (
                                        <div key={d.deviceId || i} className="mb-1 truncate text-[10px] text-gray-500">
                                            {d.label || `Camera ${i + 1}`}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Event log */}
                        <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
                                    Event Log
                                </h2>
                                <span className="rounded-full bg-black/5 px-3 py-1 text-[10px] font-bold text-gray-500">
                                    {events.length}
                                </span>
                            </div>

                            <div
                                ref={logContainerRef}
                                className="max-h-[480px] space-y-2 overflow-y-auto pr-2"
                                style={{ scrollBehavior: "smooth" }}
                            >
                                {events.length === 0 ? (
                                    <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                                        <Activity size={24} className="opacity-30" />
                                        <span className="text-xs">No events yet. Start the camera to begin.</span>
                                    </div>
                                ) : (
                                    events.map((evt) => (
                                        <motion.div
                                            key={evt.id}
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`rounded-xl border p-3 ${severityStyles[evt.severity] || severityStyles.info}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider">
                                                        {evt.type}
                                                    </span>
                                                    <p className="mt-0.5 text-[11px] leading-relaxed opacity-80">
                                                        {evt.detail}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-[9px] font-medium opacity-60">
                                                    {new Date(evt.timestamp).toLocaleTimeString("en-US", {
                                                        hour12: false,
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        second: "2-digit",
                                                        fractionalSecondDigits: 3,
                                                    })}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
