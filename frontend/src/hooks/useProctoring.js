import { useEffect, useRef, useState, useCallback } from "react";
import { logViolation } from "../utils/proctoringLogger";

const MAX_VIOLATIONS = 3; // auto-submit after this many

export function useProctoring({ examId, userId, onAutoSubmit, isActive }) {
  const [violations, setViolations] = useState([]);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const violationCountRef = useRef(0);

  const recordViolation = useCallback(
    (type, detail) => {
      if (!isActive) return;

      violationCountRef.current += 1;
      const count = violationCountRef.current;

      const violation = {
        type,
        detail,
        count,
        timestamp: new Date().toISOString(),
      };

      setViolations((prev) => [...prev, violation]);
      logViolation({ examId, userId, ...violation }); // send to backend

      const message =
        count >= MAX_VIOLATIONS
          ? `🚨 Final warning #${count}: "${detail}". Your exam is being auto-submitted now.`
          : `⚠️ Warning ${count}/${MAX_VIOLATIONS}: "${detail}". ${MAX_VIOLATIONS - count} warning(s) left before auto-submit.`;

      setWarningMessage(message);
      setShowWarning(true);

      if (count >= MAX_VIOLATIONS) {
        setTimeout(() => onAutoSubmit?.("proctoring_violation"), 3000);
      }
    },
    [isActive, examId, userId, onAutoSubmit]
  );

  // --- Tab Visibility Detection ---
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation(
          "TAB_SWITCH",
          "You switched to another tab or minimized the window"
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isActive, recordViolation]);

  // --- Window Blur Detection (Alt+Tab, other app) ---
  useEffect(() => {
    if (!isActive) return;

    const handleBlur = () => {
      recordViolation(
        "WINDOW_BLUR",
        "You switched to another application or window"
      );
    };

    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [isActive, recordViolation]);

  // --- Keyboard Shortcut Blocking ---
  useEffect(() => {
    if (!isActive) return;

    // All keyboard combos to block (exact spec from requirements)
    const BLOCKED_KEYS = [
      { ctrl: true, key: "t" },           // New tab
      { ctrl: true, key: "n" },           // New window
      { ctrl: true, key: "w" },           // Close tab
      { ctrl: true, key: "Tab" },         // Cycle tabs
      { alt: true, key: "Tab" },          // Switch app (Windows)
      { meta: true, key: "Tab" },         // Switch app (Mac)
      { ctrl: true, shift: true, key: "Tab" },
      { key: "F12" },                      // DevTools
      { ctrl: true, shift: true, key: "i" },
      { ctrl: true, shift: true, key: "j" },
      { ctrl: true, shift: true, key: "c" },
      { ctrl: true, key: "u" },           // View source
      { ctrl: true, key: "p" },           // Print
      { key: "PrintScreen" },
      { ctrl: true, key: "f" },           // Browser search
    ];

    const handleKeyDown = (e) => {
      const matched = BLOCKED_KEYS.some((combo) => {
        if (combo.key !== e.key) return false;
        if (combo.ctrl !== undefined && combo.ctrl !== e.ctrlKey) return false;
        if (combo.alt !== undefined && combo.alt !== e.altKey) return false;
        if (combo.shift !== undefined && combo.shift !== e.shiftKey)
          return false;
        if (combo.meta !== undefined && combo.meta !== e.metaKey) return false;
        return true;
      });

      if (matched) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation(
          "KEYBOARD_SHORTCUT",
          `Blocked key: ${[
            e.ctrlKey && "Ctrl",
            e.altKey && "Alt",
            e.shiftKey && "Shift",
            e.metaKey && "Cmd",
            e.key,
          ]
            .filter(Boolean)
            .join("+")}`
        );
        return false;
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isActive, recordViolation]);

  // --- Right Click Block ---
  useEffect(() => {
    if (!isActive) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      recordViolation("RIGHT_CLICK", "Right-click menu was blocked");
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () =>
      document.removeEventListener("contextmenu", handleContextMenu);
  }, [isActive, recordViolation]);

  const dismissWarning = () => setShowWarning(false);

  return {
    violations,
    violationCount: violationCountRef.current,
    showWarning,
    warningMessage,
    dismissWarning,
  };
}
