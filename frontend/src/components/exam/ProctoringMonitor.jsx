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
          🛡️ Proctored
        </div>
      )}

      {/* Warning modal hidden from candidate */}


      {children}
    </div>
  );
}
