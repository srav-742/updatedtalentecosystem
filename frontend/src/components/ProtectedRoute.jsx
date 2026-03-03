import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * ProtectedRoute - Wraps routes that require authentication.
 * If Firebase session is gone (user closed tab, session expired, or logged out),
 * it redirects to /login instead of showing a 404.
 */
const ProtectedRoute = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setAuthenticated(true);
            } else {
                // Firebase session is gone — clear stale localStorage too
                localStorage.removeItem('user');
                setAuthenticated(false);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        // Small loading state while Firebase resolves auth — prevents flash
        return (
            <div className="flex items-center justify-center h-screen bg-[#0c0f16]">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!authenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
