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

                if (hasLabels) {
                    // Camera permission confirmed. Multiple camera devices (e.g. laptop webcam + IR camera/virtual camera)
                    // are standard hardware inputs and must not be flagged as a violation.
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
    }, [isActive]);

    // ── Live devicechange listener ──────────────────────────────────────────
    useEffect(() => {
        if (!isActive) {
            return;
        }

        const handleDeviceChange = async () => {
            // Live device changes: do not flag violations for camera reconnects or multiple camera inputs.
            // Secondary monitor changes are handled by Window Management API below.
        };

        navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
        return () => {
            navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
        };
    }, [isActive]);

    // ── Secondary monitor detection (Window Management API) ─────────────────
    useEffect(() => {
        if (!isActive) {
            return;
        }

        let debounceTimer = null;
        let extendedReported = false;

        const checkScreenExtended = () => {
            if (typeof window.screen?.isExtended !== "undefined" && window.screen.isExtended) {
                // Only report once per session to avoid flooding with duplicate violations
                if (extendedReported) return;
                extendedReported = true;
                const detail = "Secondary monitor detected via Window Management API.";
                triggerViolation("MULTIPLE_DEVICES", detail);
                logEnhancedViolation("MULTIPLE_DEVICES", detail, {
                    metadata: { screensExtended: true },
                });
            } else {
                // Screen is no longer extended — allow re-reporting if it happens again
                extendedReported = false;
            }
        };

        // Debounced version for focus/resize to avoid rapid-fire calls during macOS Space transitions
        const debouncedCheckScreenExtended = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(checkScreenExtended, 2000);
        };

        // Run initial check
        checkScreenExtended();

        // Also listen for changes (some browsers fire 'change' on screen)
        const handleScreenChange = () => {
            if (window.screen?.isExtended) {
                if (extendedReported) return;
                extendedReported = true;
                const detail = "Secondary monitor connected during session.";
                triggerViolation("MULTIPLE_DEVICES", detail);
                logEnhancedViolation("MULTIPLE_DEVICES", detail, {
                    metadata: { screensExtended: true },
                });
            } else {
                extendedReported = false;
            }
        };

        try {
            window.screen?.addEventListener?.("change", handleScreenChange);
        } catch (_) {
            // Not all browsers support this
        }

        // Listen for focus & resize with debounce to avoid rapid-fire on macOS fullscreen transitions
        window.addEventListener("focus", debouncedCheckScreenExtended);
        window.addEventListener("resize", debouncedCheckScreenExtended);

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            try {
                window.screen?.removeEventListener?.("change", handleScreenChange);
            } catch (_) {
                // silent
            }
            window.removeEventListener("focus", debouncedCheckScreenExtended);
            window.removeEventListener("resize", debouncedCheckScreenExtended);
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
