import { useState, useEffect, useCallback } from "react";
import ScreenSharePrompt from "./ScreenSharePrompt";
import { useProctoring } from "../../hooks/useProctoring";

export default function ExamWrapper({ examId, userId, onSubmit, children }) {
  const [examStarted, setExamStarted] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  const handleAutoSubmit = useCallback((reason) => {
    setAutoSubmitting(true);
    setTimeout(() => onSubmit?.({ reason, autoSubmitted: true }), 3000);
  }, [onSubmit]);

  const {
    showWarning,
    warningMessage,
    examLocked,
    dismissWarning,
    violationCount,
  } = useProctoring({
    examId,
    userId,
    isActive: examStarted,
    onAutoSubmit: handleAutoSubmit,
  });

  // Enter fullscreen the moment exam starts
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    el.requestFullscreen?.()
      || el.webkitRequestFullscreen?.()
      || el.mozRequestFullScreen?.()
      || el.msRequestFullscreen?.();
  }, []);

  const handleScreenShareSuccess = () => {
    setExamStarted(true);
    // Short delay to let screen share UI settle, then go fullscreen
    setTimeout(() => enterFullscreen(), 500);
  };

  const isMaxViolations = violationCount >= 3;

  return (
    <div style={{ position: "relative", minHeight: "100vh", userSelect: "none" }}>

      {/* ── Gate 1: Screen share required ── */}
      {!examStarted && (
        <ScreenSharePrompt onSuccess={handleScreenShareSuccess} />
      )}

      {/* ── Auto-submitting overlay if terminated ── */}
      {examStarted && autoSubmitting && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.92)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}>
          <div style={{
            background: "#1a1a1a",
            border: "3px solid #e53e3e",
            borderRadius: 20,
            padding: "2.5rem",
            maxWidth: 480,
            width: "90%",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          }}>
            <div style={{
              color: "#fc8181",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}>
              <span style={{
                display: "inline-block",
                width: 16, height: 16,
                border: "2px solid #fc8181",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              Submitting your exam responses...
            </div>
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Proctoring indicator (top-right) ── */}
      {examStarted && (
        <div style={{
          position: "fixed", top: 12, right: 12, zIndex: 9000,
          background: "#0f0f0f",
          border: "1px solid #2d2d2d",
          color: "#fff", borderRadius: 20,
          padding: "6px 14px", fontSize: 12,
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}>
          <span style={{ color: "#4ade80", fontSize: 10 }}>●</span>
          <span style={{ color: "#888" }}>Proctored</span>
        </div>
      )}

      {/* ── Actual exam content ── */}
      {/* When locked: pointer-events:none prevents ANY interaction */}
      <div style={{
        pointerEvents: (examStarted && examLocked) ? "none" : "auto",
        filter: (!examStarted) ? "blur(10px)" : "none",
        transition: "filter 0.4s",
      }}>
        {children}
      </div>
    </div>
  );
}