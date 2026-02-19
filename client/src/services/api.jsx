const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000';

// Helper function for API calls WITH CREDENTIALS
const apiCall = async (endpoint, options = {}) => {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            credentials: 'include', // Send cookies with request
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        });

        const data = await response.json();
        console.log(`API Call: ${endpoint}`, data);
        return data;
    } catch (error) {
        console.error('API call error:', endpoint, error);
        return { success: false, message: error.message };
    }
};

// Auth APIs
export const authAPI = {
    register: async (userData) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            return await response.json();
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, message: error.message };
        }
    },

    registerWithDocument: async (formData) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            return await response.json();
        } catch (error) {
            console.error('Register with document error:', error);
            return { success: false, message: error.message };
        }
    },

    login: (credentials) => apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    }),

    logout: () => apiCall('/api/auth/logout', {
        method: 'POST',
    }),

    sendVerifyOtp: () => apiCall('/api/auth/send-verify-otp', {
        method: 'POST',
    }),

    verifyEmail: (otpData) => apiCall('/api/auth/verify-account', {
        method: 'POST',
        body: JSON.stringify(otpData),
    }),

    isAuthenticated: () => apiCall('/api/auth/is-auth', {
        method: 'POST',
    }),

    sendResetOtp: (email) => apiCall('/api/auth/send-reset-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
    }),

    resetPassword: (resetData) => apiCall('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(resetData),
    }),
};

// Inventory APIs
export const inventoryAPI = {
    createInventory: (inventoryData) => apiCall('/api/inventory/create-inventory', {
        method: 'POST',
        body: JSON.stringify(inventoryData),
    }),

    getInventory: () => apiCall('/api/inventory/get-inventory', {
        method: 'GET',
    }),

    getBloodStock: () => apiCall('/api/inventory/blood-stock', {
        method: 'GET',
    }),

    getInventoryStats: () => apiCall('/api/inventory/stats', {
        method: 'GET',
    }),

    updateInventory: (id, updateData) => apiCall(`/api/inventory/update-inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
    }),
};

// Donor APIs
export const donorAPI = {
    searchDonors: (searchData) => apiCall('/api/donors/search', {
        method: 'POST',
        body: JSON.stringify(searchData),
    }),

    toggleAvailability: () => apiCall('/api/donors/toggle-availability', {
        method: 'POST',
    }),

    getProfile: () => apiCall('/api/donors/profile', {
        method: 'GET',
    }),

    updateProfile: (profileData) => apiCall('/api/donors/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
    }),
};

// Public Search API
export const publicAPI = {
    search: (searchData) => apiCall('/api/public/search', {
        method: 'POST',
        body: JSON.stringify(searchData),
    }),

    searchDonors: (searchData) => apiCall('/api/public/search-donors', {
        method: 'POST',
        body: JSON.stringify(searchData),
    }),

    searchHospitals: (searchData) => apiCall('/api/public/search-hospitals', {
        method: 'POST',
        body: JSON.stringify(searchData),
    }),

    searchOrganisations: (searchData) => apiCall('/api/public/search-organisations', {
        method: 'POST',
        body: JSON.stringify(searchData),
    }),
};

// Complete Admin APIs
export const adminAPI = {
    // Get all data
    getDonorList: () => {
        console.log('Fetching donor list...');
        return apiCall('/api/admin/donor-list', {
            method: 'GET',
        });
    },

    getHospitalList: () => {
        console.log('Fetching hospital list...');
        return apiCall('/api/admin/hospital-list', {
            method: 'GET',
        });
    },

    getOrgList: () => {
        console.log(' Fetching org list...');
        return apiCall('/api/admin/org-list', {
            method: 'GET',
        });
    },

    // Get all inventory
    getAllInventory: () => {
        console.log('Fetching all inventory...');
        return apiCall('/api/admin/all-inventory', {
            method: 'GET',
        });
    },

    // Get dashboard stats
    getStats: () => {
        console.log(' Fetching stats...');
        return apiCall('/api/admin/stats', {
            method: 'GET',
        });
    },

    // Document viewer
    viewDocument: (userId) => {
        return `${API_URL}/api/admin/view-document/${userId}`;
    },

    // Approval actions
    approveHospital: (id) => apiCall(`/api/admin/approve-hospital/${id}`, {
        method: 'POST',
    }),

    approveOrganisation: (id) => apiCall(`/api/admin/approve-organisation/${id}`, {
        method: 'POST',
    }),

    // Rejection actions
    rejectHospital: (id, reason) => apiCall(`/api/admin/reject-hospital/${id}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    }),

    rejectOrganisation: (id, reason) => apiCall(`/api/admin/reject-organisation/${id}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    }),

    // Delete actions
    deleteDonor: (id) => apiCall(`/api/admin/delete-donor/${id}`, {
        method: 'POST',
    }),

    deleteHospital: (id) => apiCall(`/api/admin/delete-hospital/${id}`, {
        method: 'POST',
    }),

    deleteOrganisation: (id) => apiCall(`/api/admin/delete-organisation/${id}`, {
        method: 'POST',
    }),

    // Delete inventory
    deleteInventory: (id) => apiCall(`/api/admin/delete-inventory/${id}`, {
        method: 'POST',
    }),
};

export default { authAPI, inventoryAPI, donorAPI, publicAPI, adminAPI };