import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[rgba(245,240,231,0.82)] p-6 backdrop-blur-md">
          <div className={`w-full max-w-xl rounded-[2rem] border bg-white p-8 text-center shadow-[0_40px_120px_rgba(15,23,42,0.18)] ${isResetMode ? 'border-red-200' : 'border-amber-200'}`}>
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] ${isResetMode ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
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
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${isFilled ? 'border-red-500 bg-red-500 text-white' : 'border-black/10 bg-[#f8f4ed] text-gray-500'}`}
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

      {isActive && (
        <div className="fixed right-4 top-4 z-[9000] flex items-center gap-3 rounded-full border border-black/10 bg-white/95 px-4 py-2 text-xs font-medium text-gray-700 shadow-lg backdrop-blur">
          <span className={`flex h-7 w-7 items-center justify-center rounded-full ${violationCount === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {violationCount === 0 ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
          </span>
          <span>Protected session</span>
          <span className={`font-semibold ${violationCount === 0 ? 'text-emerald-600' : violationCount < resetLimit ? 'text-amber-600' : 'text-red-600'}`}>
            {violationCount}/{resetLimit} flags
          </span>
        </div>
      )}

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
