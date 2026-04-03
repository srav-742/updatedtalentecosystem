export default function StrictScreenSharePrompt({
  error,
  onShare,
  warningLimit = 3,
  resetLimit = 4,
  isResumePrompt = false,
}) {
  const title = isResumePrompt
    ? "Screen Share Required"
    : "Before You Begin";

  const description = isResumePrompt
    ? "Your screen share stopped. Share your entire screen again before the exam can continue."
    : "This round is strictly proctored. Read the rules before you continue.";

  const buttonLabel = isResumePrompt
    ? "Share Entire Screen Again"
    : "Share Entire Screen and Start";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          padding: "2.5rem",
          maxWidth: 520,
          width: "90%",
          textAlign: "center",
          boxShadow: "0 8px 40px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            margin: "0 auto 16px",
            borderRadius: 18,
            background: "#eef6ff",
            color: "#1d4ed8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          SS
        </div>

        <h2 style={{ margin: "0 0 8px", fontSize: 22, color: "#111827" }}>
          {title}
        </h2>
        <p
          style={{
            color: "#4b5563",
            marginBottom: 18,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>

        <div
          style={{
            background: "#fff8f0",
            border: "1px solid #fed7aa",
            borderRadius: 12,
            padding: "1rem",
            textAlign: "left",
            fontSize: 13,
            color: "#374151",
            marginBottom: 20,
            lineHeight: 1.9,
          }}
        >
          <div>1. Share your entire screen, not a window or browser tab.</div>
          <div>2. Fullscreen mode is enforced while the exam is active.</div>
          <div>3. Tab switching or app switching is treated as a violation.</div>
          <div>4. The first {warningLimit} violations show warnings.</div>
          <div>5. The {resetLimit}th violation sends you back to Resume Analysis.</div>
        </div>

        {error && (
          <div
            style={{
              background: "#fff1f1",
              border: "1px solid #f5c6c6",
              color: "#b91c1c",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={onShare}
          style={{
            background: "#16a34a",
            color: "#ffffff",
            border: "none",
            borderRadius: 12,
            padding: "14px 0",
            width: "100%",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
