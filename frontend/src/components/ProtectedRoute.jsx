import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, role, allowedRoles }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = () => {
            const storedUser = localStorage.getItem('user');
            if (import.meta.env.DEV) console.log("[ProtectedRoute] Stored user:", storedUser);
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    if (import.meta.env.DEV) console.log("[ProtectedRoute] Parsed user role:", parsedUser?.role);
                    setUser(parsedUser);
                } catch (e) {
                    console.error("Failed to parse user from localStorage", e);
                }
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);


    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#0c0f16]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (import.meta.env.DEV) console.log("[ProtectedRoute] Current Auth State:", { hasUser: !!user, roleRequired: role, allowedRoles, userRole: user?.role });

    if (!user || (!user.uid && !user._id && !user.id)) {
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
        const redirectPath = user.role === 'recruiter' ? '/recruiter/my-jobs' : '/seeker';
        
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

