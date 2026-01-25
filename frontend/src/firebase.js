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
    console.log(`[AUTH] Starting signup for ${email}`);
    const res = await withTimeout(createUserWithEmailAndPassword(auth, email, password));
    console.log(`[AUTH] Signup complete for ${email}`);
    return res;
};

export const loginWithEmail = async (email, password) => {
    console.log(`[AUTH] Starting login for ${email}`);
    const res = await withTimeout(signInWithEmailAndPassword(auth, email, password));
    console.log(`[AUTH] Login complete for ${email}`);
    return res;
};

export const signInWithGoogle = async () => {
    console.log(`[AUTH] Starting Google Popup...`);
    try {
        // Direct call to preserve user interaction context for browsers
        const result = await signInWithPopup(auth, googleProvider);
        console.log(`[AUTH] Google Auth Success.`);
        return result.user;
    } catch (error) {
        console.error("Google Auth Error:", error);
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
            throw error; // Let the UI handle the switch to redirect
        }
        throw error;
    }
};

export const signInWithGoogleRedirect = async () => {
    console.log(`[AUTH] Starting Google Redirect...`);
    await signInWithRedirect(auth, googleProvider);
};

export const getGoogleRedirectResult = async () => {
    return await getRedirectResult(auth);
};

export const signInWithGithub = async () => {
    console.log(`[AUTH] Starting GitHub Popup...`);
    try {
        const result = await signInWithPopup(auth, githubProvider);
        console.log(`[AUTH] GitHub Auth Success.`);
        return result.user;
    } catch (error) {
        console.error("Github Auth Error:", error);
        throw error;
    }
};

// Database Helpers - Redirected to MongoDB Backend
export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

export const saveUserProfile = async (userId, data) => {
    console.log(`[Backend-Sync] Saving profile for ${userId}...`);
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
    console.log(`[Backend-Sync] Fetching profile for ${userId}...`);
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
