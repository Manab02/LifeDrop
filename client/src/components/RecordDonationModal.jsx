import React, { useState, useEffect } from 'react';
import { X, Heart } from 'lucide-react';
import { inventoryAPI } from '../services/api';

const RecordDonationModal = ({ show, onClose, onSuccess, organisationEmail }) => {
    const [formData, setFormData] = useState({
        bloodGroup: '',
        quantity: '',
        donorEmail: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show) {
            setFormData({
                bloodGroup: '',
                quantity: '',
                donorEmail: ''
            });
        }
    }, [show]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.bloodGroup || !formData.quantity || !formData.donorEmail) {
            alert('Please fill all required fields');
            return;
        }

        setLoading(true);

        try {
            const data = await inventoryAPI.createInventory({
                email: formData.donorEmail,
                inventoryType: 'in',
                bloodGroup: formData.bloodGroup,
                quantity: parseInt(formData.quantity),
                organisation: organisationEmail,
                donor: formData.donorEmail
            });

            if (data.success) {
                alert('Donation recorded successfully!');
                onSuccess && onSuccess();
                onClose();
            } else {
                alert(data.message || 'Failed to record donation');
            }
        } catch (error) {
            console.error('Record donation error:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
                <div className="bg-green-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Heart className="w-5 h-5" />
                        Record Blood Donation
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
                            Donor Email *
                        </label>
                        <input
                            type="email"
                            name="donorEmail"
                            value={formData.donorEmail}
                            onChange={handleChange}
                            required
                            placeholder="donor@example.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Enter the donor's registered email
                        </p>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                            Blood Group *
                        </label>
                        <select
                            name="bloodGroup"
                            value={formData.bloodGroup}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
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
                            placeholder="Enter units donated"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                        />
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                        <p className="font-semibold mb-1">📥 Recording Blood IN</p>
                        <p>This donation will be added to your organisation's blood bank inventory.</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Recording...' : 'Record Donation'}
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

export default RecordDonationModal;