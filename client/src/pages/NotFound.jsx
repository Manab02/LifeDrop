import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="text-9xl font-bold text-red-600 mb-4">404</div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Page Not Found</h1>
                <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
                <button
                    onClick={() => navigate('/')}
                    className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 font-semibold transition"
                >
                    Go Home
                </button>
            </div>
        </div>
    );
};

export default NotFound;