const admin = require('firebase-admin');

// We use environment variables for security.
// The service account details should be added to your .env file.
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
};

if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    try {
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("[FIREBASE] Admin SDK Initialized");
        }
    } catch (error) {
        console.error("[FIREBASE] Initialization error:", error.message);
    }
} else {
    console.warn("[FIREBASE] Admin SDK not initialized: Missing credentials in .env");
}

module.exports = admin;

