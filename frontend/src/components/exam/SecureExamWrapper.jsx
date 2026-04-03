import { useCallback, useEffect, useRef, useState } from "react";
import { useScreenShare } from "../../hooks/useScreenShare";
import { useStrictProctoring } from "../../hooks/useStrictProctoring";
import StrictScreenSharePrompt from "./StrictScreenSharePrompt";

const requestFullscreen = () => {
  if (document.fullscreenElement) {
    return;
  }

  const element = document.documentElement;
  const request =
    element.requestFullscreen
    || element.webkitRequestFullscreen
    || element.mozRequestFullScreen
    || element.msRequestFullscreen;

  if (!request) {
    return;
  }

  Promise.resolve(request.call(element)).catch(() => null);
};

export default function SecureExamWrapper({
  examId,
  userId,
  children,
  isActive = true,
  requireScreenShare = true,
  warningLimit = 3,
  resetLimit = 4,
  onSecurityReset,
}) {
  const [screenShareInterrupted, setScreenShareInterrupted] = useState(false);
  const [resetting, setResetting] = useState(false);

  const resetInFlightRef = useRef(false);

  const handleScreenShareStopped = useCallback(() => {
    setScreenShareInterrupted(true);
  }, []);

  const {
    isSharing,
    error: screenShareError,
    startScreenShare,
    clearError,
  } = useScreenShare({ onStopped: handleScreenShareStopped });

  const handleSecurityReset = useCallback(async (violation) => {
    if (resetInFlightRef.current) {
      return;
    }

    resetInFlightRef.current = true;
    setResetting(true);

    try {
      await onSecurityReset?.(violation);
    } catch (error) {
      console.error("Failed to reset application flow after security violation:", error);
    }
  }, [onSecurityReset]);

  const proctoringIsActive = isActive && (!requireScreenShare || isSharing) && !resetting;

  const {
    violationCount,
    showOverlay,
    overlayMessage,
    overlayMode,
    isLocked,
    dismissOverlay,
  } = useStrictProctoring({
    examId,
    userId,
    isActive: proctoringIsActive,
    warningLimit,
    resetLimit,
    onResetRequired: handleSecurityReset,
  });

  useEffect(() => {
    if (!isActive) {
      setScreenShareInterrupted(false);
      setResetting(false);
      resetInFlightRef.current = false;
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (requireScreenShare && !isSharing) {
      return;
    }

    const fullscreenTimer = setTimeout(() => {
      requestFullscreen();
    }, 200);

    return () => {
      clearTimeout(fullscreenTimer);
    };
  }, [isActive, isSharing, requireScreenShare]);

  const handleShare = useCallback(async () => {
    clearError();

    const started = await startScreenShare();
    if (!started) {
      return;
    }

    setScreenShareInterrupted(false);
    setTimeout(() => {
      requestFullscreen();
    }, 200);
  }, [clearError, startScreenShare]);

  const needsScreenShare = requireScreenShare && isActive && !isSharing;
  const showViolationOverlay = !needsScreenShare && showOverlay;
  const contentBlocked = needsScreenShare || showViolationOverlay || resetting;
  const isResetMode = overlayMode === "reset" || resetting;

  return (
    <div style={{ position: "relative", minHeight: "100vh", userSelect: "none" }}>
      {needsScreenShare && (
        <StrictScreenSharePrompt
          error={screenShareError}
          onShare={handleShare}
          warningLimit={warningLimit}
          resetLimit={resetLimit}
          isResumePrompt={screenShareInterrupted}
        />
      )}

      {showViolationOverlay && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.92)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              background: "#111827",
              border: `3px solid ${isResetMode ? "#dc2626" : "#d97706"}`,
              borderRadius: 20,
              padding: "2.5rem",
              maxWidth: 480,
              width: "90%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
            }}
          >
            <h2
              style={{
                color: isResetMode ? "#fca5a5" : "#fbbf24",
                margin: "0 0 16px",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {isResetMode ? "Security Reset In Progress" : "Violation Detected"}
            </h2>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {Array.from({ length: resetLimit }).map((_, index) => {
                const step = index + 1;
                const isFilled = violationCount >= step;

                return (
                  <div
                    key={step}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: isFilled ? "#dc2626" : "#374151",
                      border: `2px solid ${isFilled ? "#dc2626" : "#4b5563"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {isFilled ? "X" : step}
                  </div>
                );
              })}
            </div>

            <p
              style={{
                color: "#e5e7eb",
                fontSize: 15,
                lineHeight: 1.7,
                marginBottom: 24,
                whiteSpace: "pre-line",
              }}
            >
              {overlayMessage}
            </p>

            {!isResetMode && (
              <button
                onClick={dismissOverlay}
                style={{
                  background: "#d97706",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 32px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Return to Exam
              </button>
            )}

            {isResetMode && (
              <div
                style={{
                  color: "#fca5a5",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    border: "2px solid #fca5a5",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "secureExamSpin 0.8s linear infinite",
                  }}
                />
                Moving you back to Resume Analysis...
              </div>
            )}
          </div>
        </div>
      )}

      {isActive && (
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 9000,
            background: "#0f172a",
            border: `1px solid ${violationCount > 0 ? "#dc2626" : "#334155"}`,
            color: "#ffffff",
            borderRadius: 20,
            padding: "6px 14px",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.4)",
          }}
        >
          <span style={{ color: requireScreenShare ? "#4ade80" : "#93c5fd", fontSize: 10 }}>
            ●
          </span>
          <span style={{ color: "#cbd5e1" }}>Proctored</span>
          <span
            style={{
              color: violationCount === 0 ? "#4ade80" : violationCount < resetLimit ? "#fbbf24" : "#f87171",
              fontWeight: 700,
            }}
          >
            {violationCount}/{resetLimit} flags
          </span>
        </div>
      )}

      <style>{`@keyframes secureExamSpin { to { transform: rotate(360deg); } }`}</style>

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
