import { useCallback, useEffect, useRef, useState } from "react";

export function useScreenShare(options = {}) {
  const { onStopped } = options;

  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState(null);

  const streamRef = useRef(null);
  const callbacksRef = useRef({ onStopped });
  const silentStopRef = useRef(false);

  useEffect(() => {
    callbacksRef.current.onStopped = onStopped;
  }, [onStopped]);

  const clearCurrentStream = useCallback(() => {
    streamRef.current = null;
    setIsSharing(false);
  }, []);

  const handleTrackEnded = useCallback(() => {
    const shouldNotify = !silentStopRef.current;
    silentStopRef.current = false;

    clearCurrentStream();
    setError("Screen sharing stopped. Share your entire screen again to continue.");

    if (shouldNotify) {
      callbacksRef.current.onStopped?.();
    }
  }, [clearCurrentStream]);

  const stopScreenShare = useCallback((options = {}) => {
    const { silent = false } = options;
    const stream = streamRef.current;

    if (!stream) {
      clearCurrentStream();
      return;
    }

    silentStopRef.current = silent;
    stream.getTracks().forEach((track) => track.stop());
    clearCurrentStream();
    silentStopRef.current = false;
  }, [clearCurrentStream]);

  const startScreenShare = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor", cursor: "always" },
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings?.() || {};

      // Some browsers omit displaySurface. When present, enforce entire-screen sharing.
      if (
        typeof settings.displaySurface === "string" &&
        settings.displaySurface !== "monitor"
      ) {
        stream.getTracks().forEach((currentTrack) => currentTrack.stop());
        setError(
          'Please share your ENTIRE screen. In the dialog, click "Entire Screen" tab — not a window or Chrome tab.'
        );
        return false;
      }

      if (streamRef.current) {
        stopScreenShare({ silent: true });
      }

      streamRef.current = stream;
      silentStopRef.current = false;

      // If candidate manually clicks "Stop sharing"
      track?.addEventListener("ended", handleTrackEnded, { once: true });

      setIsSharing(true);
      setError(null);
      return true;
    } catch (err) {
      setError(
        err?.name === "NotAllowedError"
          ? "You must share your entire screen to continue."
          : `Screen sharing failed: ${err?.message || "Unknown error"}`
      );
      return false;
    }
  }, [handleTrackEnded, stopScreenShare]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      stopScreenShare({ silent: true });
    };
  }, [stopScreenShare]);

  return {
    isSharing,
    error,
    startScreenShare,
    stopScreenShare,
    clearError,
  };
}
