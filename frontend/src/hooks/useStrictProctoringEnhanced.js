import { useCallback, useEffect, useRef } from "react";
import { useStrictProctoring } from "./useStrictProctoring";
import { API_URL } from "../firebase";

/**
 * useStrictProctoringEnhanced
 * ──────────────────────────────────────────────────────────────────────────────
 * Wraps the existing useStrictProctoring hook and layers on advanced
 * device/environment telemetry:
 *   • Initial device enumeration (multiple cameras on startup)
 *   • Live devicechange listener (camera plugged in mid-session)
 *   • Secondary monitor detection via window.screen.isExtended
 *
 * Returns the same API shape as useStrictProctoring so it's a drop-in
 * replacement for callers.
 * ──────────────────────────────────────────────────────────────────────────────
 */
export function useStrictProctoringEnhanced({
    examId,
    userId,
    isActive,
    warningLimit = 3,
    resetLimit = 4,
    onResetRequired,
    gracePeriod = 3000,
    apiEndpoint = `${API_URL}/proctoring-enhanced/violation`,
}) {
    const base = useStrictProctoring({
        examId,
        userId,
        isActive,
        warningLimit,
        resetLimit,
        onResetRequired,
        gracePeriod,
    });

    const { triggerViolation } = base;
    const deviceCheckDoneRef = useRef(false);

    // ── Helper: log to the enhanced backend endpoint (fire-and-forget) ───────
    const logEnhancedViolation = useCallback(
        (type, detail, extra = {}) => {
            try {
                fetch(apiEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        examId,
                        userId,
                        type,
                        detail,
                        count: 1,
                        timestamp: new Date().toISOString(),
                        ...extra,
                    }),
                }).catch(() => {});
            } catch (_) {
                // silent
            }
        },
        [apiEndpoint, examId, userId]
    );

    // ── Initial device enumeration ──────────────────────────────────────────
    // ── Initial device enumeration ──────────────────────────────────────────
    useEffect(() => {
        if (!isActive || deviceCheckDoneRef.current) {
            return;
        }

        let retryTimeout = null;

        const checkDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const cameras = devices.filter((d) => d.kind === "videoinput");
                
                // If permission is not granted, labels will be empty. We should wait and retry once permission is granted.
                const hasLabels = cameras.some(c => c.label);

                if (cameras.length > 1 && hasLabels) {
                    const detail = `Multiple cameras detected at startup: ${cameras.length} video inputs found.`;
                    triggerViolation("MULTIPLE_DEVICES", detail);
                    logEnhancedViolation("MULTIPLE_DEVICES", detail, {
                        metadata: {
                            cameraCount: cameras.length,
                            labels: cameras.map((c) => c.label || "unknown"),
                        },
                    });
                    deviceCheckDoneRef.current = true;
                } else if (hasLabels) {
                    // Labels exist, and only 1 camera. The check is complete.
                    deviceCheckDoneRef.current = true;
                } else {
                    // Retry checking in 2 seconds (waiting for permission)
                    retryTimeout = setTimeout(checkDevices, 2000);
                }
            } catch (_) {
                // enumerateDevices may not be available or fails
                deviceCheckDoneRef.current = true;
            }
        };

        checkDevices();

        return () => {
            if (retryTimeout) clearTimeout(retryTimeout);
        };
    }, [isActive, triggerViolation, logEnhancedViolation]);

    // ── Live devicechange listener ──────────────────────────────────────────
    useEffect(() => {
        if (!isActive) {
            return;
        }

        const handleDeviceChange = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const cameras = devices.filter((d) => d.kind === "videoinput");

                if (cameras.length > 1) {
                    const detail = `New device connected mid-session: ${cameras.length} video inputs now active.`;
                    triggerViolation("MULTIPLE_DEVICES", detail);
                    logEnhancedViolation("MULTIPLE_DEVICES", detail, {
                        metadata: {
                            cameraCount: cameras.length,
                            labels: cameras.map((c) => c.label || "unknown"),
                        },
                    });
                }
            } catch (_) {
                // silent
            }
        };

        navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
        return () => {
            navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
        };
    }, [isActive, triggerViolation, logEnhancedViolation]);

    // ── Secondary monitor detection (Window Management API) ─────────────────
    useEffect(() => {
        if (!isActive) {
            return;
        }

        const checkScreenExtended = () => {
            if (typeof window.screen?.isExtended !== "undefined" && window.screen.isExtended) {
                const detail = "Secondary monitor detected via Window Management API.";
                triggerViolation("MULTIPLE_DEVICES", detail);
                logEnhancedViolation("MULTIPLE_DEVICES", detail, {
                    metadata: { screensExtended: true },
                });
            }
        };

        // Run initial check
        checkScreenExtended();

        // Also listen for changes (some browsers fire 'change' on screen)
        const handleScreenChange = () => {
            if (window.screen?.isExtended) {
                const detail = "Secondary monitor connected during session.";
                triggerViolation("MULTIPLE_DEVICES", detail);
                logEnhancedViolation("MULTIPLE_DEVICES", detail, {
                    metadata: { screensExtended: true },
                });
            }
        };

        try {
            window.screen?.addEventListener?.("change", handleScreenChange);
        } catch (_) {
            // Not all browsers support this
        }

        // Listen for focus & resize to capture monitor changes or dragging the window to another display
        window.addEventListener("focus", checkScreenExtended);
        window.addEventListener("resize", checkScreenExtended);

        return () => {
            try {
                window.screen?.removeEventListener?.("change", handleScreenChange);
            } catch (_) {
                // silent
            }
            window.removeEventListener("focus", checkScreenExtended);
            window.removeEventListener("resize", checkScreenExtended);
        };
    }, [isActive, triggerViolation, logEnhancedViolation]);

    // Reset device-check flag when session goes inactive
    useEffect(() => {
        if (!isActive) {
            deviceCheckDoneRef.current = false;
        }
    }, [isActive]);

    return {
        ...base,
        logEnhancedViolation,
    };
}
