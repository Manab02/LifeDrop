import React, { useState, useEffect } from 'react';
import { X, Droplet } from 'lucide-react';
import { inventoryAPI } from '../services/api';

const RequestBloodModal = ({ show, onClose, onSuccess, userEmail }) => {
    const [formData, setFormData] = useState({
        bloodGroup: '',
        quantity: '',
        organisationEmail: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show) {
            setFormData({
                bloodGroup: '',
                quantity: '',
                organisationEmail: ''
            });
        }
    }, [show]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.bloodGroup || !formData.quantity || !formData.organisationEmail) {
            alert('Please fill all required fields');
            return;
        }

        setLoading(true);

        try {
            const data = await inventoryAPI.createInventory({
                email: userEmail,
                inventoryType: 'out',
                bloodGroup: formData.bloodGroup,
                quantity: parseInt(formData.quantity),
                organisation: formData.organisationEmail,
                hospital: userEmail
            });

            if (data.success) {
                alert('Blood request submitted successfully!');
                onSuccess && onSuccess();
                onClose();
            } else {
                alert(data.message || 'Failed to submit request');
            }
        } catch (error) {
            console.error('Request blood error:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
                <div className="bg-red-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Droplet className="w-5 h-5" />
                        Request Blood
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                            Blood Group *
                        </label>
                        <select
                            name="bloodGroup"
                            value={formData.bloodGroup}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                        >
                            <option value="">Select Blood Group</option>
                            {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                                <option key={bg} value={bg}>{bg}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                            Quantity (units) *
                        </label>
                        <input
                            type="number"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleChange}
                            required
                            min="1"
                            placeholder="Enter units needed"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                            Organisation Email *
                        </label>
                        <input
                            type="email"
                            name="organisationEmail"
                            value={formData.organisationEmail}
                            onChange={handleChange}
                            required
                            placeholder="organisation@example.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Enter the email of the organisation you're requesting from
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RequestBloodModal;