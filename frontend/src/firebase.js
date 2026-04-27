import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set, get, child, update } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyDd3YaduiL4mjuv6kNErlqkILfiAGuUh4o",
    authDomain: "practiceproject-f0b0e.firebaseapp.com",
    databaseURL: "https://practiceproject-f0b0e-default-rtdb.firebaseio.com",
    projectId: "practiceproject-f0b0e",
    storageBucket: "practiceproject-f0b0e.firebasestorage.app",
    messagingSenderId: "409300066922",
    appId: "1:409300066922:web:0acd4a72784a1d91ede013",
    measurementId: "G-P72KSFQ9XX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

// Utility for timeouts - 12s is plenty for most operations; if it takes longer, we fallback to cache
const withTimeout = (promise, ms = 30000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase operation timed out")), ms))
    ]);
};

// Auth Helpers
export const signupWithEmail = async (email, password) => {
    const res = await withTimeout(createUserWithEmailAndPassword(auth, email, password));
    return res;
};

export const loginWithEmail = async (email, password) => {
    const res = await withTimeout(signInWithEmailAndPassword(auth, email, password));
    return res;
};

export const signInWithGoogle = async () => {
    try {
        // Direct call to preserve user interaction context for browsers
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
            throw error; // Let the UI handle the switch to redirect
        }
        throw error;
    }
};

export const signInWithGoogleRedirect = async () => {
    await signInWithRedirect(auth, googleProvider);
};

export const getGoogleRedirectResult = async () => {
    return await getRedirectResult(auth);
};

export const signInWithGithub = async () => {
    try {
        const result = await signInWithPopup(auth, githubProvider);
        return result.user;
    } catch (error) {
        throw error;
    }
};

// Database Helpers - Redirected to MongoDB Backend
export const API_URL = import.meta.env.VITE_API_URL || 'https://api.hire1percent.com/api';

export const saveUserProfile = async (userId, data) => {
    try {
        const response = await fetch(`${API_URL}/profile/${userId}`, {
            method: 'PUT', // Using PUT for upsert (Create or Update)
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, uid: userId })
        });

        if (!response.ok) throw new Error("Failed to save to MongoDB");
        return await response.json();
    } catch (error) {
        console.error("Error saving profile to MongoDB:", error);
        throw error;
    }
};

export const getUserProfile = async (userId) => {
    try {
        const response = await fetch(`${API_URL}/profile/${userId}`);
        if (!response.ok) {
            // If 404, return null so logic can handle 'not found'
            if (response.status === 404) return null;
            throw new Error("Backend fetch failed");
        }
        const data = await response.json();
        return data || null;
    } catch (error) {
        console.error("Error getting profile from MongoDB:", error);
        // Fallback: Return null to prevent UI crash
        return null;
    }
};

export const updateUserProfile = async (userId, data) => {
    try {
        const response = await fetch(`${API_URL}/profile/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Update failed");
        return true;
    } catch (error) {
        console.error("Error updating profile in Backend:", error);
        throw error;
    }
};
export const getAuthHeaders = async () => {
    // 1. Try Firebase Auth (Priority)
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        return {
            'Authorization': `Bearer ${token}`,
            'x-user-id': user.uid
        };
    }

    // 2. Fallback to Local Storage (for local-only accounts like Admin)
    const storedUserStr = localStorage.getItem('user');
    if (storedUserStr) {
        try {
            const storedUser = JSON.parse(storedUserStr);
            if (storedUser && storedUser.uid) {
                console.log("[AUTH-HEADERS] Using local storage user identification:", storedUser.uid);
                return {
                    'x-user-id': storedUser.uid
                };
            }
        } catch (e) {
            console.error("[AUTH-HEADERS] Failed to parse stored user:", e);
        }
    }

    return {};
};

