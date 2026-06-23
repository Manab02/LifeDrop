import React, { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';

const ManualAddInventoryModal = ({ show, onClose, onSuccess, userRole, userEmail }) => {
    const [formData, setFormData] = useState({
        inventoryType: '',
        bloodGroup: '',
        quantity: '',
        expiryDate: '', 
        donorEmail: '',
        hospitalEmail: '',
        organisationEmail: '',
        patientName: '',
        hospitalNameText: '',
        organisationNameText: ''
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show) {
            let defaultType = '';
            if (userRole === 'donor') defaultType = 'in';
            else if (userRole === 'hospital') defaultType = 'out';
            else if (userRole === 'organisation') defaultType = 'in';

            setFormData({
                inventoryType: defaultType,
                bloodGroup: '',
                quantity: '',
                expiryDate: '', 
                donorEmail: userRole === 'donor' ? userEmail : '',
                hospitalEmail: userRole === 'hospital' ? userEmail : '',
                organisationEmail: userRole === 'organisation' ? userEmail : '',
                patientName: '',
                hospitalNameText: '',
                organisationNameText: ''
            });
        }
    }, [show, userRole, userEmail]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.bloodGroup || !formData.quantity || !formData.inventoryType || !formData.expiryDate) {
            alert('Please fill all required fields including expiry date');
            return;
        }

        const expiryDateObj = new Date(formData.expiryDate);
        if (expiryDateObj <= new Date()) {
            alert('Expiry date must be in the future');
            return;
        }

        if (formData.inventoryType === 'in' && !formData.donorEmail && !formData.organisationEmail) {
            alert('Please provide donor email or organisation email for IN type');
            return;
        }

        if (formData.inventoryType === 'out' && !formData.hospitalEmail && !formData.organisationEmail) {
            alert('Please provide hospital email or organisation email for OUT type');
            return;
        }

        setLoading(true);

        try {
            const requestData = {
                email: formData.inventoryType === 'in' ? formData.donorEmail : formData.hospitalEmail,
                inventoryType: formData.inventoryType,
                bloodGroup: formData.bloodGroup,
                quantity: parseInt(formData.quantity),
                expiryDate: formData.expiryDate, 
                organisation: formData.organisationEmail,
                hospital: formData.inventoryType === 'out' ? formData.hospitalEmail : undefined,
                donor: formData.inventoryType === 'in' ? formData.donorEmail : undefined,
                patientName: formData.patientName || '',
                hospitalNameText: formData.hospitalNameText || '',
                organisationNameText: formData.organisationNameText || ''
            };

            const data = await inventoryAPI.createInventory(requestData);

            if (data.success) {
                alert('Blood record added successfully!');
                onSuccess();
                onClose();
            } else {
                alert(data.message || 'Failed to add record');
            }
        } catch (error) {
            console.error('Error adding inventory:', error);
            alert('An error occurred while adding the record');
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-red-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between sticky top-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <i className="fa fa-plus-circle"></i>
                        Add Blood Record
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200"
                    >
                        <i className="fa fa-times text-xl"></i>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Inventory Type */}
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                            Inventory Type *
                        </label>
                        <select
                            name="inventoryType"
                            value={formData.inventoryType}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                        >
                            <option value="">Select Type</option>
                            <option value="in">IN (Blood Coming In)</option>
                            <option value="out">OUT (Blood Going Out)</option>
                        </select>
                    </div>

                    {/* Blood Group, Quantity & Expiry Date */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                placeholder="Enter units"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                            />
                        </div>

                        {/* EXPIRY DATE FIELD */}
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Conditional Fields based on Inventory Type */}
                    {formData.inventoryType === 'in' && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h3 className="font-semibold text-green-800 mb-3">Blood Coming In (Donation)</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Donor Email
                                    </label>
                                    <input
                                        type="email"
                                        name="donorEmail"
                                        value={formData.donorEmail}
                                        onChange={handleChange}
                                        placeholder="donor@example.com"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Organisation Email
                                    </label>
                                    <input
                                        type="email"
                                        name="organisationEmail"
                                        value={formData.organisationEmail}
                                        onChange={handleChange}
                                        placeholder="org@example.com"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-gray-700 font-semibold mb-2">
                                    Organisation Name (Text)
                                </label>
                                <input
                                    type="text"
                                    name="organisationNameText"
                                    value={formData.organisationNameText}
                                    onChange={handleChange}
                                    placeholder="Organisation name"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {formData.inventoryType === 'out' && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <h3 className="font-semibold text-red-800 mb-3">Blood Going Out (Distribution)</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Hospital Email
                                    </label>
                                    <input
                                        type="email"
                                        name="hospitalEmail"
                                        value={formData.hospitalEmail}
                                        onChange={handleChange}
                                        placeholder="hospital@example.com"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Organisation Email
                                    </label>
                                    <input
                                        type="email"
                                        name="organisationEmail"
                                        value={formData.organisationEmail}
                                        onChange={handleChange}
                                        placeholder="org@example.com"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Patient Name
                                    </label>
                                    <input
                                        type="text"
                                        name="patientName"
                                        value={formData.patientName}
                                        onChange={handleChange}
                                        placeholder="Patient name"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Hospital Name (Text)
                                    </label>
                                    <input
                                        type="text"
                                        name="hospitalNameText"
                                        value={formData.hospitalNameText}
                                        onChange={handleChange}
                                        placeholder="Hospital name"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        <p className="font-semibold mb-2">📝 Instructions:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>All fields marked with * are required</li>
                            <li>Expiry date must be a future date</li>
                            <li>For IN: Provide donor email OR organisation email</li>
                            <li>For OUT: Provide hospital email OR organisation email</li>
                            <li>Text fields are optional for additional information</li>
                        </ul>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <i className="fa fa-spinner fa-spin"></i>
                                    Adding...
                                </span>
                            ) : (
                                'Add Record'
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

export default ManualAddInventoryModal;