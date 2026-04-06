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

export function useProctoring({ examId, userId, isActive, onAutoSubmit }) {
  const [violations, setViolations] = useState([]);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [examLocked, setExamLocked] = useState(false); // NEW: hard lock state
  const countRef = useRef(0);
  const lockedRef = useRef(false);
  const lastBlurTs = useRef(0); // debounce duplicate blur+visibility events

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

  // Re-enter fullscreen when user exits it
  useEffect(() => {
    if (!isActive) return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isActive && !lockedRef.current) {
        // Give browser 300ms, then force back
        setTimeout(() => {
          if (!document.fullscreenElement) requestFullscreen();
        }, 300);
        recordViolation("FULLSCREEN_EXIT", "Exited fullscreen mode");
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [isActive, requestFullscreen]);

  // ── Lock exam UI (hard overlay) ───────────────────────────────────────
  const lockExam = useCallback((msg) => {
    lockedRef.current = true;
    setExamLocked(true);
    setWarningMessage(msg);
    setShowWarning(true);
  }, []);

  const unlockExam = useCallback(() => {
    lockedRef.current = false;
    setExamLocked(false);
    setShowWarning(false);
    // Return to fullscreen when they come back
    requestFullscreen();
    // Refocus the window aggressively
    window.focus();
    document.documentElement.focus?.();
  }, [requestFullscreen]);

  // ── Core violation recorder ───────────────────────────────────────────
  const recordViolation = useCallback(
    (type, detail) => {
      if (!isActive) return;

      // Debounce — blur + visibilitychange fire within ms of each other
      const now = Date.now();
      if (now - lastBlurTs.current < 500 &&
        (type === "TAB_SWITCH" || type === "WINDOW_BLUR")) {
        return; // duplicate event, skip
      }
      lastBlurTs.current = now;

      countRef.current += 1;
      const count = countRef.current;

      const v = { type, detail, count, timestamp: new Date().toISOString() };
      setViolations((prev) => [...prev, v]);
      logViolation({ examId, userId, ...v });

      if (count >= MAX_VIOLATIONS) {
        lockExam(
          `🚨 Exam auto-submitting: You have been caught switching tabs/windows ${count} times. Your responses have been recorded.`
        );
        setTimeout(() => onAutoSubmit?.("proctoring_violation"), 4000);
      } else {
        const remaining = MAX_VIOLATIONS - count;
        lockExam(
          `⛔ WARNING ${count}/${MAX_VIOLATIONS}: ${detail}.\n\n` +
          `You have ${remaining} warning(s) remaining before your exam is auto-submitted.\n\n` +
          `Click "Return to Exam" to continue.`
        );
      }
    },
    [isActive, examId, userId, lockExam, onAutoSubmit]
  );

  // ── 1. Tab visibility (catches Ctrl+Tab, clicking other tab) ─────────
  useEffect(() => {
    if (!isActive) return;
    const handler = () => {
      if (document.hidden) {
        recordViolation("TAB_SWITCH", "You switched to another tab");
      } else {
        // Tab is visible again — keep exam locked until they manually dismiss
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [isActive, recordViolation]);

  // ── 2. Window blur (catches Alt+Tab, second window, clicking taskbar) ─
  useEffect(() => {
    if (!isActive) return;
    const handler = () => {
      recordViolation("WINDOW_BLUR", "You switched to another application or window");
    };
    window.addEventListener("blur", handler);
    return () => window.removeEventListener("blur", handler);
  }, [isActive, recordViolation]);

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
    violationCount: countRef.current,
    showWarning,
    warningMessage,
    examLocked,
    dismissWarning: unlockExam, // only unlocks if < MAX_VIOLATIONS
  };
}