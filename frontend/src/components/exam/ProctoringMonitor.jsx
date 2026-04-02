import { useEffect } from "react";
import { useProctoring } from "../../hooks/useProctoring";

/**
 * ProctoringMonitor - A standalone component that wraps exam content with proctoring
 * This can be used as an alternative to ExamWrapper when you need more control
 */
export default function ProctoringMonitor({
  examId,
  userId,
  isActive,
  onViolation,
  onAutoSubmit,
  children
}) {
  const {
    violations,
    violationCount,
    showWarning,
    warningMessage,
    dismissWarning
  } = useProctoring({
    examId,
    userId,
    isActive,
    onAutoSubmit
  });

  // Notify parent of violations
  useEffect(() => {
    if (violations.length > 0 && onViolation) {
      onViolation(violations[violations.length - 1]);
    }
  }, [violations, onViolation]);

  return (
    <div className="relative">
      {/* Violation counter overlay */}
      {isActive && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white text-xs px-3 py-1 rounded-full z-40 shadow-lg">
          🛡️ Proctored &nbsp;|&nbsp;
          <span className={violationCount > 0 ? "text-red-400" : "text-green-400"}>
            Flags: {violationCount}/3
          </span>
        </div>
      )}

      {/* Warning modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white border-4 border-red-500 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="text-5xl mb-3">🚨</div>
            <h2 className="text-xl font-bold text-red-600 mb-3">
              Violation Detected
            </h2>
            <p className="text-gray-700 mb-6 text-sm">{warningMessage}</p>
            <button
              onClick={dismissWarning}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-xl"
            >
              I Understand — Continue
            </button>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
