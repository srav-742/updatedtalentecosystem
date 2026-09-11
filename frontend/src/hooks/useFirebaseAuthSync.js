import { useEffect } from 'react';
import apiClient from '../utils/apiClient';

// Cache of UIDs verified or synced during this runtime session
const syncedUids = new Set();

/**
 * useFirebaseAuthSync
 * 
 * Global self-healing hook that monitors Firebase Authentication state.
 * If a user is signed in to Firebase (e.g., via Google OAuth) but their record
 * is missing from MongoDB (due to network drops, Render cold-start timeouts,
 * or browser pop-up closures), this hook automatically self-heals by upserting
 * their profile to MongoDB and initializing their API gateway session.
 */
export const useFirebaseAuthSync = () => {
    useEffect(() => {
        let unsubscribe = () => {};
        let isCancelled = false;

        const startAuthSync = async () => {
            if (isCancelled) return;
            try {
                const [{ onAuthStateChanged }, { auth, getUserProfile, saveUserProfile }] = await Promise.all([
                    import('firebase/auth'),
                    import('../firebase')
                ]);
                if (isCancelled) return;

                unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (!firebaseUser || isCancelled) return;

                const uid = firebaseUser.uid;
                if (syncedUids.has(uid)) return; // Already checked/synced in this session

                try {
                    const normalizedEmail = (firebaseUser.email || '').toLowerCase().trim();
                    if (!normalizedEmail) return;

                    // Step 1: Check if user document already exists in MongoDB
                    const existingProfile = await getUserProfile(uid).catch(() => null);

                    if (existingProfile && (existingProfile._id || existingProfile.uid)) {
                        // Profile already exists in MongoDB — ensure local session has it
                        syncedUids.add(uid);
                        const currentLocalUser = JSON.parse(localStorage.getItem('user') || '{}');
                        if (!currentLocalUser.uid || currentLocalUser.uid !== uid) {
                            localStorage.setItem('user', JSON.stringify({
                                ...existingProfile,
                                role: existingProfile.role || currentLocalUser.role || 'candidate'
                            }));
                        }
                        return;
                    }

                    // Step 2: User exists in Firebase Auth but NOT in MongoDB (Self-Healing Required!)
                    console.log(`[AUTH-AUTO-SYNC] Detected orphaned Firebase user ${normalizedEmail} (${uid}). Auto-syncing to MongoDB...`);

                    // Determine user role
                    let role = 'candidate';
                    try {
                        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                        role = sessionStorage.getItem('pendingRole') || localUser.role || 'candidate';
                    } catch {
                        role = 'candidate';
                    }

                    const payload = {
                        uid: uid,
                        email: normalizedEmail,
                        name: firebaseUser.displayName || normalizedEmail.split('@')[0],
                        profilePic: firebaseUser.photoURL || '',
                        role: role
                    };

                    // Step 3: Run dual-write to ensure both User & Candidate/Recruiter documents exist
                    await Promise.allSettled([
                        apiClient.post('/users/sync', payload),
                        saveUserProfile(uid, {
                            ...payload,
                            createdAt: new Date().toISOString()
                        }),
                        apiClient.initializeGatewaySession(normalizedEmail, uid)
                    ]);

                    syncedUids.add(uid);
                    localStorage.setItem('user', JSON.stringify({ ...payload, isSelfHealed: true }));
                    console.log(`[AUTH-AUTO-SYNC] ✅ Successfully self-healed and synced ${normalizedEmail} to MongoDB.`);

                } catch (err) {
                    console.warn('[AUTH-AUTO-SYNC] Auto-sync encountered an issue (will retry on next activity):', err.message);
                }
            });
            } catch (err) {
                console.warn('[AUTH-AUTO-SYNC] Failed to initialize auth listener:', err.message);
            }
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            const idleId = window.requestIdleCallback(startAuthSync, { timeout: 2000 });
            return () => {
                isCancelled = true;
                window.cancelIdleCallback(idleId);
                unsubscribe();
            };
        } else {
            const timer = setTimeout(startAuthSync, 1000);
            return () => {
                isCancelled = true;
                clearTimeout(timer);
                unsubscribe();
            };
        }
    }, []);
};

export default useFirebaseAuthSync;
