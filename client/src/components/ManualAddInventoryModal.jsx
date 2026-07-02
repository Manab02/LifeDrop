import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
import { transferAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000';
const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const ManualAddInventoryModal = ({ show, onClose, onSuccess, userRole, userEmail, bloodStock = {}, organisations = [] }) => {
    const [inventoryType, setInventoryType] = useState('in');
    const [sourceNote, setSourceNote] = useState('');
    // Multi-item for both IN and OUT
    const [items, setItems] = useState([{ bloodGroup: '', quantity: '', expiryDate: '' }]);
    const [hospitalId, setHospitalId] = useState('');
    const [patientName, setPatientName] = useState('');
    const [orgId, setOrgId] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [hospitals, setHospitals] = useState([]);
    const [orgs, setOrgs] = useState([]);

    useEffect(() => {
        if (show) {
            setInventoryType(userRole === 'hospital' ? 'out' : 'in');
            setItems([{ bloodGroup: '', quantity: '', expiryDate: '' }]);
            setSourceNote(''); setHospitalId(''); setPatientName(''); setOrgId(''); setNotes('');
            fetchHospitals();
            fetchOrgs();
        }
    }, [show]);

    const fetchHospitals = async () => {
        try {
            const res = await fetch(`${API_URL}/api/public/get-hospitals`);
            const data = await res.json();
            if (data.success) setHospitals(data.data || []);
        } catch (_) { }
    };

    const fetchOrgs = async () => {
        try {
            const res = await fetch(`${API_URL}/api/public/get-organisations`);
            const data = await res.json();
            if (data.success) setOrgs(data.data || []);
        } catch (_) { }
    };

    const updateItem = (idx, field, value) => {
        setItems(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });
    };

    const addItem = () => setItems(prev => [...prev, { bloodGroup: '', quantity: '', expiryDate: '' }]);
    const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

    const getAvail = (bg) => Math.max(0, bloodStock[bg] || 0);

    const validateItems = () => {
        for (const item of items) {
            if (!item.bloodGroup || !item.quantity || !item.expiryDate) return 'Fill all blood group fields';
            if (parseInt(item.quantity) < 1) return 'Quantity must be at least 1';
            if (new Date(item.expiryDate) <= new Date()) return 'Expiry date must be in future';
            if (inventoryType === 'out') {
                const avail = getAvail(item.bloodGroup);
                if (avail === 0) return `No ${item.bloodGroup} stock available`;
                if (parseInt(item.quantity) > avail) return `${item.bloodGroup}: only ${avail} units available`;
            }
        }
        return null;
=======
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
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
<<<<<<< HEAD
        const err = validateItems();
        if (err) { alert(err); return; }

        setLoading(true);
        try {
            if (inventoryType === 'out') {
                // OUT = send as transfer request (pending approval)
                if (!hospitalId && !orgId) { alert('Select a hospital or organisation to send to'); setLoading(false); return; }
                const targetId = hospitalId || orgId;
                const data = await transferAPI.create({ hospitalId: targetId, items, notes: notes || sourceNote });
                if (data.success) {
                    alert('Transfer request sent! Awaiting approval before stock is updated.');
                    onSuccess(); onClose();
                } else alert(data.message || 'Failed');
            } else {
                // IN = direct record (no approval needed for incoming)
                for (const item of items) {
                    const res = await fetch(`${API_URL}/api/inventory/create-inventory`, {
                        method: 'POST', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            inventoryType: 'in',
                            bloodGroup: item.bloodGroup,
                            quantity: parseInt(item.quantity),
                            expiryDate: item.expiryDate,
                            organisation: userEmail,
                            email: userEmail,
                            notes: sourceNote || ''
                        })
                    });
                    const data = await res.json();
                    if (!data.success) { alert(data.message || 'Failed to add record'); setLoading(false); return; }
                }
                alert('Blood record(s) added successfully!');
                onSuccess(); onClose();
            }
        } catch (_) {
            alert('An error occurred');
=======

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
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

<<<<<<< HEAD
    const anyOverStock = inventoryType === 'out' && items.some(i => i.bloodGroup && i.quantity && parseInt(i.quantity) > getAvail(i.bloodGroup));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="bg-red-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between sticky top-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <i className="fa fa-plus-circle"></i> Add Blood Record
                    </h2>
                    <button onClick={onClose} className="hover:opacity-70"><i className="fa fa-times text-xl"></i></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Type selector */}
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Record Type *</label>
                        <select value={inventoryType} onChange={e => setInventoryType(e.target.value)} required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none">
                            <option value="in">📥 Blood Coming In (Donation)</option>
                            <option value="out">📤 Blood Going Out (Transfer to Hospital)</option>
                        </select>
                    </div>

                    {/* Blood items — multi */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-gray-700 font-semibold">Blood Group(s) *</label>
                            <button type="button" onClick={addItem}
                                className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold">
                                <i className="fa fa-plus mr-1"></i> Add Blood Group
                            </button>
                        </div>
                        <div className="space-y-3">
                            {items.map((item, idx) => {
                                const avail = getAvail(item.bloodGroup);
                                const over = item.bloodGroup && item.quantity && parseInt(item.quantity) > avail && inventoryType === 'out';
                                const noStock = inventoryType === 'out' && item.bloodGroup && avail === 0;
                                return (
                                    <div key={idx} className={`rounded-lg p-3 border ${noStock ? 'bg-red-50 border-red-300' : over ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="grid grid-cols-3 gap-2">
                                            <select value={item.bloodGroup} onChange={e => updateItem(idx, 'bloodGroup', e.target.value)}
                                                className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none">
                                                <option value="">Blood Group</option>
                                                {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                                            </select>
                                            <input type="number" placeholder="Units" value={item.quantity} min="1"
                                                max={inventoryType === 'out' && item.bloodGroup ? avail : undefined}
                                                onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                className={`border rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 ${over ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                                            <input type="date" value={item.expiryDate}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={e => updateItem(idx, 'expiryDate', e.target.value)}
                                                className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500" />
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            {inventoryType === 'out' && item.bloodGroup && (
                                                <p className={`text-xs font-semibold ${noStock ? 'text-red-600' : over ? 'text-orange-600' : 'text-green-600'}`}>
                                                    {noStock ? `❌ No ${item.bloodGroup} stock` : over ? `⚠️ Max available: ${avail}` : `✅ Available: ${avail} units`}
                                                </p>
                                            )}
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(idx)}
                                                    className="text-xs text-red-500 hover:text-red-700 ml-auto">
                                                    <i className="fa fa-trash mr-1"></i>Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* IN: source note */}
                    {inventoryType === 'in' && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h3 className="font-semibold text-green-800 mb-2">📥 Source / Notes</h3>
                            <textarea value={sourceNote} onChange={e => setSourceNote(e.target.value)}
                                rows={2} placeholder="e.g. Collected from camp at City Hall, walk-in donor..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none text-sm" />
                        </div>
                    )}

                    {/* OUT: hospital/org + patient */}
                    {inventoryType === 'out' && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-3">
                            <h3 className="font-semibold text-red-800">📤 Send To</h3>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Hospital <span className="text-gray-400 font-normal">(required)</span></label>
                                <select value={hospitalId} onChange={e => setHospitalId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm">
                                    <option value="">-- Select Registered Hospital --</option>
                                    {hospitals.map(h => <option key={h._id} value={h._id}>{h.hospitalName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Patient Name <span className="text-gray-400 font-normal">(optional)</span></label>
                                <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)}
                                    placeholder="Patient name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="Any notes..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                                <i className="fa fa-info-circle mr-1"></i> This creates a <strong>transfer request</strong>. Hospital must approve — stock updates only after approval.
=======
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
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
                            </div>
                        </div>
                    )}

<<<<<<< HEAD
                    <div className="flex gap-3">
                        <button type="submit" disabled={loading || anyOverStock}
                            className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                            {loading ? <span><i className="fa fa-spinner fa-spin mr-1"></i>Saving...</span>
                                : inventoryType === 'out' ? 'Send Transfer Request' : 'Add Record'}
                        </button>
                        <button type="button" onClick={onClose} disabled={loading}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 text-sm">Cancel</button>
=======
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
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManualAddInventoryModal;