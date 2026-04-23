import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, role }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = () => {
            const storedUser = localStorage.getItem('user');
            console.log("[ProtectedRoute] Stored user:", storedUser);
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    console.log("[ProtectedRoute] Parsed user role:", parsedUser?.role);
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

    console.log("[ProtectedRoute] Current Auth State:", { hasUser: !!user, roleRequired: role, userRole: user?.role });

    if (!user || !user.uid) {
        console.log("[ProtectedRoute] No valid user, redirecting to login");
        if (window.location.pathname.includes('AdminContentPage')) {
            window.location.href = '/login';
            return null;
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }


    if (role && user.role !== role) {
        console.log(`[ProtectedRoute] Role mismatch: Expected ${role}, got ${user.role}. Redirecting...`);
        const redirectPath = user.role === 'recruiter' ? '/recruiter' : '/seeker';
        
        // Hard fallback if Navigate seems to be ignored
        if (window.location.pathname.includes('AdminContentPage') && user.role !== 'admin') {
            window.location.href = redirectPath;
            return null;
        }
        
        return <Navigate to={redirectPath} replace />;
    }


    console.log("[ProtectedRoute] Access Granted");
    return children;
};


export default ProtectedRoute;
