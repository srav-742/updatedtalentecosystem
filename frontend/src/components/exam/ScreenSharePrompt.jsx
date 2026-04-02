import { useScreenShare } from "../../hooks/useScreenShare";

export default function ScreenSharePrompt({ onSuccess }) {
  const { error, startScreenShare } = useScreenShare();

  const handleShare = async () => {
    const ok = await startScreenShare();
    if (ok) onSuccess();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "2.5rem",
        maxWidth: 480, width: "90%", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.3)"
      }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🖥️</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, color: "#111" }}>
          Screen Share Required
        </h2>
        <p style={{ color: "#555", marginBottom: 16, fontSize: 14 }}>
          To protect exam integrity, you must share your <strong>entire screen</strong> before starting.
        </p>

        <div style={{
          background: "#f7f7f7", borderRadius: 10, padding: "1rem",
          textAlign: "left", fontSize: 13, color: "#444", marginBottom: 20, lineHeight: 1.8
        }}>
          <div>✅ Click <strong>"Entire Screen"</strong> in the dialog (not Tab or Window)</div>
          <div>✅ Keep this tab active throughout the exam</div>
          <div>❌ Switching tabs or apps will be flagged</div>
          <div>❌ Keyboard shortcuts (Alt+Tab, Ctrl+T etc.) are blocked</div>
          <div>❌ Right-click is disabled</div>
        </div>

        {error && (
          <div style={{
            background: "#fff1f1", border: "1px solid #f5c6c6",
            color: "#c0392b", borderRadius: 8, padding: "10px 14px",
            fontSize: 13, marginBottom: 16
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleShare}
          style={{
            background: "#2563eb", color: "#fff", border: "none",
            borderRadius: 12, padding: "14px 0", width: "100%",
            fontSize: 15, fontWeight: 600, cursor: "pointer"
          }}
        >
          🔴 Share Entire Screen &amp; Begin Exam
        </button>
      </div>
    </div>
  );
}
