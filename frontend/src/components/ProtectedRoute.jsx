import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

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

    if (import.meta.env.DEV) console.log("[ProtectedRoute] Current Auth State:", { hasUser: !!user, roleRequired: role, allowedRoles, userRole: user?.role });

    if (!user || !user.uid) {
        if (import.meta.env.DEV) console.log("[ProtectedRoute] No valid user, redirecting to login");
        if (window.location.pathname.includes('AdminContentPage')) {
            return <Navigate to="/login" replace />;
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
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

