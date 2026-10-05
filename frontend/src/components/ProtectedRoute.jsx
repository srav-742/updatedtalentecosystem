import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { auth } from '../firebase';

const ProtectedRoute = ({ children, role, allowedRoles }) => {
    const [user] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (e) {
            console.error("Failed to parse user from localStorage", e);
            return null;
        }
    });
    const location = useLocation();
    const [unverifiedBlocked, setUnverifiedBlocked] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState('');

    const isPilotAccount = user?.role === 'recruiter' && user?.accountType === 'pilot';

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((fbUser) => {
            if (fbUser) {
                const isPasswordAuth = fbUser.providerData?.some(p => p.providerId === 'password');
                // Admin-created pilot accounts are exempt from email verification
                if (isPasswordAuth && !fbUser.emailVerified && !isPilotAccount) {
                    console.warn("[ProtectedRoute] Unverified email/password user blocked:", fbUser.email);
                    try { localStorage.removeItem('user'); } catch (e) {}
                    setUnverifiedEmail(fbUser.email || '');
                    setUnverifiedBlocked(true);
                }
            }
        });
        return () => unsubscribe();
    }, [isPilotAccount]);

    // Instant synchronous check if auth.currentUser is already loaded in memory
    const currentFbUser = auth.currentUser;
    if (currentFbUser) {
        const isPasswordAuth = currentFbUser.providerData?.some(p => p.providerId === 'password');
        if (isPasswordAuth && !currentFbUser.emailVerified && !isPilotAccount) {
            try { localStorage.removeItem('user'); } catch (e) {}
            return <Navigate to="/login" state={{ from: location, emailUnverified: true, email: currentFbUser.email }} replace />;
        }
    }

    if (unverifiedBlocked && !isPilotAccount) {
        return <Navigate to="/login" state={{ from: location, emailUnverified: true, email: unverifiedEmail || user?.email }} replace />;
    }

    if (import.meta.env.DEV) console.log("[ProtectedRoute] Current Auth State:", { hasUser: !!user, roleRequired: role, allowedRoles, userRole: user?.role });

    if (!user || !user.uid) {
        if (import.meta.env.DEV) console.log("[ProtectedRoute] No valid user, redirecting to login");
        if (window.location.pathname.includes('AdminContentPage')) {
            return <Navigate to="/login" replace />;
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // ─── Pilot Expiration Guard ──────────────────────────────────
    if (isPilotAccount && user.pilotExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(user.pilotExpiresAt);
        if (now > expiresAt) {
            console.warn("[ProtectedRoute] Pilot account expired for user:", user.email);
            try { 
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                sessionStorage.setItem('login_notice_msg', 'Your session has expired.');
            } catch (e) {}
            return (
                <Navigate
                    to="/login?expired=true"
                    state={{
                        from: location,
                        pilotExpired: true,
                        sessionExpired: true,
                        message: "Your session has expired."
                    }}
                    replace
                />
            );
        }
    }

    // ─── Role-Based Access Check ─────────────────────────────────
    // Support both legacy `role` prop (single string) and new `allowedRoles` prop (array)
    const effectiveAllowedRoles = allowedRoles
        ? (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles])
        : (role ? [role] : null);

    if (effectiveAllowedRoles && !effectiveAllowedRoles.includes(user.role)) {
        if (import.meta.env.DEV) console.log(`[ProtectedRoute] Role mismatch: Expected one of [${effectiveAllowedRoles.join(', ')}], got "${user.role}". Redirecting...`);
        const redirectPath = user.role === 'recruiter' ? '/recruiter/my-jobs' : '/candidate';
        
        // Hard fallback if Navigate seems to be ignored
        if (window.location.pathname.includes('AdminContentPage') && user.role !== 'admin') {
            return <Navigate to={redirectPath} replace />;
        }
        
        return <Navigate to={redirectPath} replace />;
    }


    if (import.meta.env.DEV) console.log("[ProtectedRoute] Access Granted");
    return children;
};


export default ProtectedRoute;

