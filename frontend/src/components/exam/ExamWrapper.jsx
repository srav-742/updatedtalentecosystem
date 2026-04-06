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

      {/* ── Gate 2: Hard lock overlay when exam is locked ── */}
      {examStarted && showWarning && (
        <div style={{
          position: "fixed",
          inset: 0,
          // Semi-transparent so they can't see the exam content
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
            border: `3px solid ${isMaxViolations ? "#e53e3e" : "#d97706"}`,
            borderRadius: 20,
            padding: "2.5rem",
            maxWidth: 480,
            width: "90%",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>
              {isMaxViolations ? "🚫" : "⛔"}
            </div>

            <h2 style={{
              color: isMaxViolations ? "#fc8181" : "#fbbf24",
              margin: "0 0 16px",
              fontSize: 22,
              fontWeight: 700,
            }}>
              {isMaxViolations ? "Exam Auto-Submitting" : "Violation Detected"}
            </h2>

            {/* Violation counter pills */}
            <div style={{
              display: "flex", justifyContent: "center", gap: 8, marginBottom: 20
            }}>
              {[1, 2, 3].map((n) => (
                <div key={n} style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: violationCount >= n ? "#e53e3e" : "#333",
                  border: `2px solid ${violationCount >= n ? "#e53e3e" : "#555"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  transition: "background 0.3s",
                }}>
                  {violationCount >= n ? "✕" : n}
                </div>
              ))}
            </div>

            <p style={{
              color: "#e2e8f0",
              fontSize: 15,
              lineHeight: 1.7,
              marginBottom: 24,
              whiteSpace: "pre-line",
            }}>
              {warningMessage}
            </p>

            {/* Only show Return button if not auto-submitting */}
            {!isMaxViolations && !autoSubmitting && (
              <button
                onClick={dismissWarning}
                style={{
                  background: "#d97706",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 32px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "100%",
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) => e.target.style.background = "#b45309"}
                onMouseOut={(e) => e.target.style.background = "#d97706"}
              >
                I Understand — Return to Exam
              </button>
            )}

            {(isMaxViolations || autoSubmitting) && (
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
            )}
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Violation badge (top-right) ── */}
      {examStarted && (
        <div style={{
          position: "fixed", top: 12, right: 12, zIndex: 9000,
          background: "#0f0f0f",
          border: `1px solid ${violationCount > 0 ? "#e53e3e" : "#2d2d2d"}`,
          color: "#fff", borderRadius: 20,
          padding: "6px 14px", fontSize: 12,
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}>
          <span style={{ color: "#4ade80", fontSize: 10 }}>●</span>
          <span style={{ color: "#888" }}>Proctored</span>
          <span style={{
            color: violationCount === 0 ? "#4ade80" : violationCount === 1 ? "#fbbf24" : "#ef4444",
            fontWeight: 700,
          }}>
            {violationCount}/3 flags
          </span>
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