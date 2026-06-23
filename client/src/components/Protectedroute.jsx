import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ element, role }) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user.id) {
        return <Navigate to="/login" replace />;
    }

    if (role && user.role !== role) {
        return <Navigate to="/login" replace />;
    }

    return element;
};

export default ProtectedRoute;