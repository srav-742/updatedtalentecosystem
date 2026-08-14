import { API_URL } from "../firebase";

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

export async function logViolation(data) {
  if (data && AI_TYPES.has(data.type)) {
    // Enhanced/AI violations are handled separately via the enhanced proctoring logger
    return;
  }

  try {
    // Replace with your actual API base URL
    await fetch(`${API_URL}/proctoring/violation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // send auth cookies
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.warn("[Proctoring] Log failed:", e);
  }
}
