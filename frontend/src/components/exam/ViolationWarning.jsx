export default function ViolationWarning({ message, onDismiss }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998
    }}>
      <div style={{
        background: "#fff", border: "3px solid #e53e3e",
        borderRadius: 18, padding: "2rem", maxWidth: 420,
        width: "90%", textAlign: "center", boxShadow: "0 6px 30px rgba(0,0,0,0.3)"
      }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🚨</div>
        <h2 style={{ color: "#c0392b", margin: "0 0 10px", fontSize: 20 }}>
          Violation Detected
        </h2>
        <p style={{ color: "#444", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          {message}
        </p>
        <button
          onClick={onDismiss}
          style={{
            background: "#e53e3e", color: "#fff", border: "none",
            borderRadius: 10, padding: "12px 24px",
            fontSize: 14, fontWeight: 600, cursor: "pointer"
          }}
        >
          I Understand — Return to Exam
        </button>
      </div>
    </div>
  );
}
