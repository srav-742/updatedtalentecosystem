import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, role, allowedRoles }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const location = useLocation();

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error('Failed to parse user from localStorage:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#0c0f16]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!user || (!user.uid && !user._id && !user.id)) {
        if (window.location.pathname.includes('AdminContentPage')) {
            return <Navigate to="/login" replace />;
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user.role === 'recruiter' && user.accountType === 'pilot' && user.pilotExpiresAt) {
        const expiresAt = new Date(user.pilotExpiresAt);
        if (Number.isFinite(expiresAt.getTime()) && Date.now() > expiresAt.getTime()) {
            console.warn('[ProtectedRoute] Pilot account expired.');
            try {
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                sessionStorage.setItem('login_notice_msg', 'Your session has expired.');
            } catch (error) {
                console.error('[ProtectedRoute] Failed to clear expired session:', error);
            }
            return (
                <Navigate
                    to="/login?expired=true"
                    state={{
                        from: location,
                        pilotExpired: true,
                        sessionExpired: true,
                        message: 'Your session has expired.'
                    }}
                    replace
                />
            );
        }
    }

    const effectiveAllowedRoles = allowedRoles
        ? (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles])
        : (role ? [role] : null);

    if (effectiveAllowedRoles && !effectiveAllowedRoles.includes(user.role)) {
        const redirectPath = user.role === 'recruiter' ? '/recruiter/my-jobs' : '/seeker';

        if (window.location.pathname.includes('AdminContentPage') && user.role !== 'admin') {
            return <Navigate to={redirectPath} replace />;
        }

        return <Navigate to={redirectPath} replace />;
    }

    return children;
};

export default ProtectedRoute;
