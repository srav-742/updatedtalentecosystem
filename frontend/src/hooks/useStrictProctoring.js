import { useCallback, useEffect, useRef, useState } from "react";
import { logViolation } from "../utils/proctoringLogger";

const FOCUS_VIOLATION_TYPES = new Set([
  "TAB_SWITCH",
  "WINDOW_BLUR",
  "FULLSCREEN_EXIT",
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
  const callbacksRef = useRef({ onResetRequired });

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
    if (resetTriggeredRef.current || countRef.current >= resetLimit) {
      return;
    }

    lockedRef.current = false;
    setIsLocked(false);
    setShowOverlay(false);
    setOverlayMode("warning");
    requestFullscreen();
    window.focus();
    document.documentElement.focus?.();
  }, [requestFullscreen, resetLimit]);

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

    if (count >= resetLimit) {
      resetTriggeredRef.current = true;
      lockSession(
        "Security limit exceeded. Returning you to Resume Analysis.",
        "reset"
      );
      callbacksRef.current.onResetRequired?.(violation);
      return;
    }

    const remainingWarnings = Math.max(warningLimit - count, 0);
    const remainingMessage = remainingWarnings > 0
      ? `You have ${remainingWarnings} warning(s) left before you are returned to Resume Analysis.`
      : "One more violation will return you to Resume Analysis.";

    lockSession(
      `Warning ${count}/${warningLimit}: ${detail}\n\n${remainingMessage}\n\nClick "Return to Exam" to continue.`,
      "warning"
    );
  }, [examId, isActive, lockSession, resetLimit, userId, warningLimit]);

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

      setTimeout(() => {
        if (!document.fullscreenElement && !resetTriggeredRef.current) {
          requestFullscreen();
        }
      }, 250);

      triggerViolation("FULLSCREEN_EXIT", "You exited fullscreen mode.");
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [isActive, requestFullscreen, triggerViolation]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("TAB_SWITCH", "You switched to another tab.");
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
      triggerViolation("WINDOW_BLUR", "You switched to another application or window.");
    };

    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [isActive, triggerViolation]);

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

      triggerViolation("KEYBOARD_SHORTCUT", `Blocked shortcut: ${label}`);
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

    setViolations([]);
    setViolationCount(0);
    setShowOverlay(false);
    setOverlayMessage("");
    setOverlayMode("warning");
    setIsLocked(false);
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
