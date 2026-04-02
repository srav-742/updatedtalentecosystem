export async function logViolation(data) {
  try {
    // Replace with your actual API base URL
    await fetch("/api/proctoring/violation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // send auth cookies
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.warn("[Proctoring] Log failed:", e);
  }
}
