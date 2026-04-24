const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let initialized = false;

// Method 1: Environment Variables
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
            console.log("[FIREBASE] Admin SDK Initialized (via Environment Variables)");
            initialized = true;
        }
    } catch (error) {
        console.error("[FIREBASE] Initialization error (Env):", error.message);
    }
} 

// Method 2: Service Account JSON File (as suggested in .env.example)
if (!initialized && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const keyPath = path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(keyPath)) {
        try {
            if (admin.apps.length === 0) {
                admin.initializeApp({
                    credential: admin.credential.cert(keyPath)
                });
                console.log(`[FIREBASE] Admin SDK Initialized (via ${process.env.FIREBASE_SERVICE_ACCOUNT_PATH})`);
                initialized = true;
            }
        } catch (error) {
            console.error("[FIREBASE] Initialization error (JSON):", error.message);
        }
    }
}

// We remain silent if not initialized to keep the console clean as requested.
// The system will automatically use the fallback (x-user-id) in the middleware.

module.exports = admin;

