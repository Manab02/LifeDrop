import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ element, role }) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const handlePageShow = (event) => {
            if (event.persisted) {
                const freshUser = JSON.parse(localStorage.getItem('user') || '{}');
                if (!freshUser.id || (role && freshUser.role !== role)) {
                    window.location.replace('/login');
                }
            }
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, [role]);

    if (!user.id) {
        return <Navigate to="/login" replace />;
    }

    if (role && user.role !== role) {
        return <Navigate to="/login" replace />;
    }

    return element;
};

export default ProtectedRoute;