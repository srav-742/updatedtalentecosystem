import { useState } from "react";
import ScreenSharePrompt from "./ScreenSharePrompt";
import ViolationWarning from "./ViolationWarning";
import { useProctoring } from "../../hooks/useProctoring";

export default function ExamWrapper({ examId, userId, children, onSubmit }) {
  const [examStarted, setExamStarted] = useState(false);

  const { showWarning, warningMessage, dismissWarning, violationCount } =
    useProctoring({
      examId,
      userId,
      isActive: examStarted,
      onAutoSubmit: (reason) => onSubmit?.({ reason, autoSubmitted: true }),
    });

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Gate 1: Must share screen first */}
      {!examStarted && (
        <ScreenSharePrompt onSuccess={() => setExamStarted(true)} />
      )}

      {/* Gate 2: Violation warning overlay */}
      {showWarning && (
        <ViolationWarning message={warningMessage} onDismiss={dismissWarning} />
      )}

      {/* Violation badge - top right corner */}
      {examStarted && (
        <div style={{
          position: "fixed", top: 14, right: 14, zIndex: 9000,
          background: "#1a1a1a", color: "#fff", borderRadius: 20,
          padding: "5px 14px", fontSize: 12, display: "flex", gap: 8
        }}>
          <span>🛡️ Proctored</span>
          <span style={{ color: violationCount > 0 ? "#ff6b6b" : "#69db7c" }}>
            Flags: {violationCount}/3
          </span>
        </div>
      )}

      {/* Actual exam — blurred/disabled until screen shared */}
      <div style={{
        pointerEvents: examStarted ? "auto" : "none",
        filter: examStarted ? "none" : "blur(8px)",
        transition: "filter 0.3s"
      }}>
        {children}
      </div>
    </div>
  );
}
