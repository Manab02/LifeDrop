import React, { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';

const EditInventoryModal = ({ show, onClose, onSuccess, inventoryRecord }) => {
    const [formData, setFormData] = useState({
        bloodGroup: '',
        quantity: '',
        expiryDate: ''
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show && inventoryRecord) {
            setFormData({
                bloodGroup: inventoryRecord.bloodGroup || '',
                quantity: inventoryRecord.quantity || '',
                expiryDate: inventoryRecord.expiryDate ? new Date(inventoryRecord.expiryDate).toISOString().split('T')[0] : ''
            });
        }
    }, [show, inventoryRecord]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.bloodGroup || !formData.quantity || !formData.expiryDate) {
            alert('Please fill all required fields');
            return;
        }

        const expiryDateObj = new Date(formData.expiryDate);
        if (expiryDateObj <= new Date()) {
            alert('Expiry date must be in the future');
            return;
        }

        setLoading(true);

        try {
            const data = await inventoryAPI.updateInventory(inventoryRecord._id, {
                bloodGroup: formData.bloodGroup,
                quantity: parseInt(formData.quantity),
                expiryDate: formData.expiryDate
            });

            if (data.success) {
                alert('Record updated successfully!');
                onSuccess();
                onClose();
            } else {
                alert(data.message || 'Failed to update record');
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
            alert('An error occurred while updating the record');
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
                <div className="bg-blue-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <i className="fa fa-edit"></i>
                        Edit Blood Record
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200"
                    >
                        <i className="fa fa-times text-xl"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {inventoryRecord && (
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                            <p className="text-gray-600">
                                <strong>Type:</strong> <span className={`font-semibold ${inventoryRecord.inventoryType === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                    {inventoryRecord.inventoryType?.toUpperCase()}
                                </span>
                            </p>
                            <p className="text-gray-600 mt-1">
                                <strong>Transaction ID:</strong> <span className="font-mono text-xs">{inventoryRecord.transactionId}</span>
                            </p>
                            <p className="text-gray-600 mt-1">
                                <strong>Created:</strong> {new Date(inventoryRecord.createdAt).toLocaleString()}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                            Blood Group *
                        </label>
                        <select
                            name="bloodGroup"
                            value={formData.bloodGroup}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                            placeholder="Enter units"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                            Expiry Date *
                        </label>
                        <input
                            type="date"
                            name="expiryDate"
                            value={formData.expiryDate}
                            onChange={handleChange}
                            required
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                        <p className="flex items-start gap-2">
                            <i className="fa fa-info-circle mt-0.5"></i>
                            <span>Only blood group, quantity, and expiry date can be edited. Other details remain unchanged.</span>
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <i className="fa fa-spinner fa-spin"></i>
                                    Updating...
                                </span>
                            ) : (
                                'Update Record'
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditInventoryModal;