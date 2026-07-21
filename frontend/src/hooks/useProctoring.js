import { useEffect, useRef, useState, useCallback } from "react";
import { logViolation } from "../utils/proctoringLogger";

const MAX_VIOLATIONS = 3;

const BLOCKED_COMBOS = [
  { ctrl: true, key: "t" },
  { ctrl: true, key: "n" },
  { ctrl: true, key: "w" },
  { ctrl: true, key: "Tab" },
  { alt: true, key: "Tab" },
  { meta: true, key: "Tab" },
  { meta: true, key: "w" },
  { meta: true, key: "n" },
  { ctrl: true, shift: true, key: "Tab" },
  { key: "F12" },
  { key: "F5" },
  { key: "F11" },
  { ctrl: true, shift: true, key: "i" },
  { ctrl: true, shift: true, key: "j" },
  { ctrl: true, shift: true, key: "c" },
  { ctrl: true, key: "u" },
  { ctrl: true, key: "p" },
  { ctrl: true, key: "f" },
  { ctrl: true, key: "a" },
  { ctrl: true, key: "r" },
  { key: "PrintScreen" },
  { alt: true, key: "F4" },
  { meta: true, key: "d" },
  { meta: true, key: "h" },
  { meta: true, key: "m" },
];

export function useProctoring({ examId, userId, isActive, onAutoSubmit, gracePeriod = 3000 }) {
  const [violations, setViolations] = useState([]);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [examLocked, setExamLocked] = useState(false); // NEW: hard lock state
  const countRef = useRef(0);
  const lockedRef = useRef(false);
  const lastBlurTs = useRef(0); // debounce duplicate blur+visibility events
  const activatedAtRef = useRef(0);

  useEffect(() => {
    if (isActive) {
      activatedAtRef.current = Date.now();
    } else {
      activatedAtRef.current = 0;
    }
  }, [isActive]);

  // ── Force fullscreen ──────────────────────────────────────────────────
  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
        || el.webkitRequestFullscreen?.()
        || el.mozRequestFullScreen?.()
        || el.msRequestFullscreen?.();
    }
  }, []);

  // ── Lock session & show overlay ───────────────────────────────────────
  const lockSession = useCallback((msg) => {
    lockedRef.current = true;
    setExamLocked(true);
    setWarningMessage(msg);
    setShowWarning(true);
  }, []);

  // Candidate clicks "Return to Exam"
  const unlockSession = useCallback(() => {
    lockedRef.current = false;
    setExamLocked(false);
    setShowWarning(false);
    requestFullscreen(); // Re-enter fullscreen on return
    window.focus();
  }, [requestFullscreen]);

  // ── Record violation & handle thresholds ──────────────────────────────
  const recordViolation = useCallback(
    (type, detail) => {
      // Debounce window blur if called right after tab switch or within 800ms
      const now = Date.now();
      if ((type === "WINDOW_BLUR" || type === "TAB_SWITCH") && now - lastBlurTs.current < 800) {
        return;
      }
      if (type === "WINDOW_BLUR" || type === "TAB_SWITCH") {
        lastBlurTs.current = now;
      }

      const count = countRef.current + 1;
      countRef.current = count;

      const violation = {
        type,
        detail,
        count,
        timestamp: new Date().toISOString(),
      };

      setViolations((prev) => [...prev, violation]);
      logViolation({ examId, userId, ...violation });

      if (count === 1) {
        lockSession(
          `Warning (1/3): ${detail}.\n\nPlease stay on this page in fullscreen mode. Click "Return to Exam" to continue.`
        );
      } else if (count === 2) {
        lockSession(
          `FINAL WARNING (2/3): ${detail}.\n\nOne more violation will automatically submit your exam. Click "Return to Exam" to continue.`
        );
      } else if (count >= 3) {
        lockSession(
          `EXAM TERMINATED: You have exceeded the maximum allowed violations (3/3).\n\nYour exam is being automatically submitted.`
        );
        setTimeout(() => {
          onAutoSubmit?.(count);
        }, 3000);
      }
    },
    [examId, userId, lockSession, onAutoSubmit]
  );

  // ── 1. Tab visibility (catches switching tabs, minimizing window) ─────
  useEffect(() => {
    if (!isActive) return;
    const handler = () => {
      if (document.hidden) {
        recordViolation("TAB_SWITCH", "You switched to another tab");
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [isActive, recordViolation]);

  // ── 2. Window blur (catches Alt+Tab, second window, clicking taskbar) ─
  useEffect(() => {
    if (!isActive) return;
    const handler = () => {
      if (activatedAtRef.current && Date.now() - activatedAtRef.current < gracePeriod) {
        return;
      }
      setTimeout(() => {
        if (!document.hidden && document.hasFocus()) {
          return;
        }
        if (document.hidden) {
          return; // Handled by visibilitychange as TAB_SWITCH
        }
        recordViolation("WINDOW_BLUR", "You switched to another application or window");
      }, 350);
    };
    window.addEventListener("blur", handler);
    return () => window.removeEventListener("blur", handler);
  }, [isActive, recordViolation, gracePeriod]);

  // ── 3. Keyboard shortcut blocking ─────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const handler = (e) => {
      const blocked = BLOCKED_COMBOS.some((combo) => {
        if (combo.key !== e.key) return false;
        if (combo.ctrl !== undefined && combo.ctrl !== e.ctrlKey) return false;
        if (combo.alt !== undefined && combo.alt !== e.altKey) return false;
        if (combo.shift !== undefined && combo.shift !== e.shiftKey) return false;
        if (combo.meta !== undefined && combo.meta !== e.metaKey) return false;
        return true;
      });
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const label = [
          e.ctrlKey && "Ctrl", e.altKey && "Alt",
          e.shiftKey && "Shift", e.metaKey && "Cmd", e.key,
        ].filter(Boolean).join("+");
        recordViolation("KEYBOARD_SHORTCUT", `Blocked shortcut: ${label}`);
        return false;
      }
    };
    // capture:true intercepts BEFORE browser handles it
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [isActive, recordViolation]);

  // ── 4. Right-click block ───────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("contextmenu", handler, { capture: true });
    return () => document.removeEventListener("contextmenu", handler, { capture: true });
  }, [isActive]);

  // ── 5. Block text selection (prevents copy) ───────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const handler = (e) => e.preventDefault();
    document.addEventListener("selectstart", handler);
    return () => document.removeEventListener("selectstart", handler);
  }, [isActive]);

  // ── 6. Block drag (prevents dragging content out) ─────────────────────
  useEffect(() => {
    if (!isActive) return;
    const handler = (e) => e.preventDefault();
    document.addEventListener("dragstart", handler);
    return () => document.removeEventListener("dragstart", handler);
  }, [isActive]);

  // ── 7. Window focus: re-assert lock when they come back ───────────────
  useEffect(() => {
    if (!isActive) return;
    const handler = () => {
      // When window regains focus, if exam is locked keep overlay visible
      // This prevents the exam from silently resuming after switching away
      if (lockedRef.current) {
        setShowWarning(true); // ensure overlay is still showing
      }
    };
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [isActive]);

  return {
    violations,
    violationCount: violations.length,
    showWarning,
    warningMessage,
    examLocked,
    dismissWarning: unlockExam, // only unlocks if < MAX_VIOLATIONS
  };
}