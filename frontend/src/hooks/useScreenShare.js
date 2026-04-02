import { useState, useRef } from "react";

export function useScreenShare() {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor", cursor: "always" },
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();

      // Reject if they shared a tab/window instead of full screen
      if (settings.displaySurface !== "monitor") {
        stream.getTracks().forEach((t) => t.stop());
        setError(
          'Please share your ENTIRE screen. In the dialog, click "Entire Screen" tab — not a window or Chrome tab.'
        );
        return false;
      }

      streamRef.current = stream;

      // If candidate manually clicks "Stop sharing"
      track.addEventListener("ended", () => {
        setIsSharing(false);
        setError("Screen sharing stopped. Your exam has been paused and flagged.");
      });

      setIsSharing(true);
      setError(null);
      return true;
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "You must share your screen to proceed. Please allow screen sharing and select 'Entire Screen'."
          : "Screen sharing failed: " + err.message
      );
      return false;
    }
  };

  const stopScreenShare = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsSharing(false);
  };

  return { isSharing, error, startScreenShare, stopScreenShare };
}
