import { useCallback, useEffect, useRef, useState } from "react";
import { logViolation } from "../utils/proctoringLogger";

const FOCUS_VIOLATION_TYPES = new Set([
  "TAB_SWITCH",
  "WINDOW_BLUR",
  "FULLSCREEN_EXIT",
]);

const AI_TYPES = new Set([
  "MULTIPLE_DEVICES",
  "EYE_LOOKING_AWAY",
  "EYE_LOOKING_AWAY_WHILE_ANSWERING",
  "HEAD_TURNED",
  "HEAD_TURNED_WHILE_ANSWERING",
  "NO_PEOPLE",
  "MULTIPLE_PEOPLE",
  "PHONE_DETECTED",
  "HEADPHONES_DETECTED",
  "OBJECT_DETECTED"
]);

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

const SUPPRESSED_OVERLAY_TYPES = new Set([
  ...AI_TYPES,
  "TAB_SWITCH",
  "WINDOW_BLUR",
  "FULLSCREEN_EXIT",
]);

const shortcutMatches = (combo, event) => {
  if (String(combo.key).toLowerCase() !== String(event.key).toLowerCase()) {
    return false;
  }

  if (combo.ctrl !== undefined && combo.ctrl !== event.ctrlKey) {
    return false;
  }

  if (combo.alt !== undefined && combo.alt !== event.altKey) {
    return false;
  }

  if (combo.shift !== undefined && combo.shift !== event.shiftKey) {
    return false;
  }

  if (combo.meta !== undefined && combo.meta !== event.metaKey) {
    return false;
  }

  return true;
};

export function useStrictProctoring({
  examId,
  userId,
  isActive,
  warningLimit = 3,
  resetLimit = 4,
  onResetRequired,
  gracePeriod = 3000,
}) {
  const [violations, setViolations] = useState([]);
  const [violationCount, setViolationCount] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState("");
  const [overlayMode, setOverlayMode] = useState("warning");
  const [isLocked, setIsLocked] = useState(false);

  const countRef = useRef(0);
  const lockedRef = useRef(false);
  const resetTriggeredRef = useRef(false);
  const lastFocusViolationTs = useRef(0);
  const activatedAtRef = useRef(0);
  const callbacksRef = useRef({ onResetRequired });

  useEffect(() => {
    if (isActive) {
      activatedAtRef.current = Date.now();
    } else {
      activatedAtRef.current = 0;
    }
  }, [isActive]);

  useEffect(() => {
    callbacksRef.current.onResetRequired = onResetRequired;
  }, [onResetRequired]);

  const requestFullscreen = useCallback(() => {
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
  }, []);

  const lockSession = useCallback((message, mode = "warning") => {
    lockedRef.current = true;
    setIsLocked(true);
    setOverlayMode(mode);
    setOverlayMessage(message);
    setShowOverlay(true);
  }, []);

  const dismissOverlay = useCallback(() => {
    lockedRef.current = false;
    setIsLocked(false);
    setShowOverlay(false);
    setOverlayMode("warning");
    requestFullscreen();
    window.focus();
    document.documentElement.focus?.();
  }, [requestFullscreen]);

  const triggerViolation = useCallback((type, detail) => {
    if (!isActive || resetTriggeredRef.current) {
      return;
    }

    const now = Date.now();
    if (FOCUS_VIOLATION_TYPES.has(type) && now - lastFocusViolationTs.current < 800) {
      return;
    }

    if (FOCUS_VIOLATION_TYPES.has(type)) {
      lastFocusViolationTs.current = now;
    }

    const count = countRef.current + 1;
    countRef.current = count;
    setViolationCount(count);

    const violation = {
      type,
      detail,
      count,
      timestamp: new Date().toISOString(),
    };

    setViolations((previousViolations) => [...previousViolations, violation]);
    logViolation({ examId, userId, ...violation });

    // Suppress warning modal/popup for AI-enhanced and tab-switch/blur/fullscreen-exit violations
    if (!SUPPRESSED_OVERLAY_TYPES.has(type)) {
      lockSession(
        `Warning: ${detail}\n\nTotal warnings/flags logged: ${count}\n\nClick "Return to Exam" to continue.`,
        "warning"
      );
    } else {
      console.log(`[useStrictProctoring] Suppressed popup warning overlay for violation: ${type}`);
    }
  }, [examId, isActive, lockSession, userId]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    requestFullscreen();
  }, [isActive, requestFullscreen]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleFullscreenChange = () => {
      if (document.fullscreenElement || resetTriggeredRef.current) {
        return;
      }

      // Ignore fullscreen exits during initial startup grace period
      if (activatedAtRef.current && Date.now() - activatedAtRef.current < gracePeriod) {
        return;
      }

      setTimeout(() => {
        if (!document.fullscreenElement && !resetTriggeredRef.current) {
          requestFullscreen();
          triggerViolation("FULLSCREEN_EXIT", "You exited fullscreen mode. (Ranking: 3)");
        }
      }, 400);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [isActive, requestFullscreen, triggerViolation, gracePeriod]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("TAB_SWITCH", "You switched to another tab. (Ranking: 2)");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isActive, triggerViolation]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleBlur = () => {
      // Ignore blur events during initial startup grace period to allow permission popups & focus shifts
      if (activatedAtRef.current && Date.now() - activatedAtRef.current < gracePeriod) {
        return;
      }

      // Small delay to verify if candidate actually left the page/window or if focus remains on document
      setTimeout(() => {
        if (!document.hidden && document.hasFocus()) {
          return; // Candidate is still focused on page elements
        }
        if (document.hidden) {
          // Handled by visibilitychange as TAB_SWITCH
          return;
        }
        triggerViolation("WINDOW_BLUR", "You switched to another application or window. (Ranking: 2)");
      }, 350);
    };

    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [isActive, triggerViolation, gracePeriod]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleKeyDown = (event) => {
      const blocked = BLOCKED_COMBOS.some((combo) => shortcutMatches(combo, event));

      if (!blocked) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const label = [
        event.ctrlKey && "Ctrl",
        event.altKey && "Alt",
        event.shiftKey && "Shift",
        event.metaKey && "Cmd",
        event.key,
      ].filter(Boolean).join("+");

      triggerViolation("KEYBOARD_SHORTCUT", `Blocked shortcut: ${label}. (Ranking: 1)`);
      return false;
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [isActive, triggerViolation]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleContextMenu = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("contextmenu", handleContextMenu, { capture: true });
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true });
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const preventSelection = (event) => event.preventDefault();
    const preventDrag = (event) => event.preventDefault();

    document.addEventListener("selectstart", preventSelection);
    document.addEventListener("dragstart", preventDrag);

    return () => {
      document.removeEventListener("selectstart", preventSelection);
      document.removeEventListener("dragstart", preventDrag);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleFocus = () => {
      if (lockedRef.current) {
        setShowOverlay(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      return;
    }

    countRef.current = 0;
    lockedRef.current = false;
    resetTriggeredRef.current = false;
    lastFocusViolationTs.current = 0;

    Promise.resolve().then(() => {
      setViolations([]);
      setViolationCount(0);
      setShowOverlay(false);
      setOverlayMessage("");
      setOverlayMode("warning");
      setIsLocked(false);
    });
  }, [isActive]);

  return {
    violations,
    violationCount,
    showOverlay,
    overlayMessage,
    overlayMode,
    isLocked,
    dismissOverlay,
    triggerViolation,
  };
}
