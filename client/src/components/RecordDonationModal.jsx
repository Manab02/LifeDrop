import React, { useState, useEffect } from 'react';
import { X, Heart } from 'lucide-react';
import { inventoryAPI } from '../services/api';

<<<<<<< HEAD
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000';

const RecordDonationModal = ({ show, onClose, onSuccess, organisationEmail }) => {
    const [donorEmail, setDonorEmail] = useState('');
    const [donorInfo, setDonorInfo] = useState(null);  // { name, bloodtype }
    const [donorLookupStatus, setDonorLookupStatus] = useState('');  // 'loading' | 'found' | 'notfound' | ''
    const [quantity, setQuantity] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
=======
const RecordDonationModal = ({ show, onClose, onSuccess, organisationEmail }) => {
    const [formData, setFormData] = useState({
        bloodGroup: '',
        quantity: '',
        donorEmail: ''
    });
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show) {
<<<<<<< HEAD
            setDonorEmail('');
            setDonorInfo(null);
            setDonorLookupStatus('');
            setQuantity('');
            setExpiryDate('');
        }
    }, [show]);

    // Auto-lookup donor after user stops typing email
    useEffect(() => {
        if (!donorEmail || !donorEmail.includes('@')) {
            setDonorInfo(null);
            setDonorLookupStatus('');
            return;
        }
        const timer = setTimeout(async () => {
            setDonorLookupStatus('loading');
            try {
                const res = await fetch(`${API_URL}/api/public/get-donor-by-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: donorEmail })
                });
                const data = await res.json();
                if (data.success && data.donor) {
                    setDonorInfo(data.donor);
                    setDonorLookupStatus('found');
                } else {
                    setDonorInfo(null);
                    setDonorLookupStatus('notfound');
                }
            } catch (_) {
                setDonorInfo(null);
                setDonorLookupStatus('notfound');
            }
        }, 700);
        return () => clearTimeout(timer);
    }, [donorEmail]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!donorEmail || !quantity || !expiryDate) {
            alert('Please fill all required fields');
            return;
        }
        if (!donorInfo) {
            alert('Please enter a valid registered donor email');
            return;
        }
        setLoading(true);
        try {
            const data = await inventoryAPI.createInventory({
                email: donorEmail,
                inventoryType: 'in',
                bloodGroup: donorInfo.bloodtype,
                quantity: parseInt(quantity),
                expiryDate,
                organisation: organisationEmail,
                donor: donorEmail
            });
=======
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

>>>>>>> 142ce276d2e571211da685c661614482fd0df331
            if (data.success) {
                alert('Donation recorded successfully!');
                onSuccess && onSuccess();
                onClose();
            } else {
                alert(data.message || 'Failed to record donation');
            }
<<<<<<< HEAD
        } catch (_) {
=======
        } catch (error) {
            console.error('Record donation error:', error);
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
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
<<<<<<< HEAD
                        <Heart className="w-5 h-5" /> Add Donor Record
                    </h2>
                    <button onClick={onClose} className="text-white hover:text-gray-200">
=======
                        <Heart className="w-5 h-5" />
                        Record Blood Donation
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200"
                    >
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
<<<<<<< HEAD

                    {/* Donor Email */}
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Donor Email *</label>
                        <input
                            type="email"
                            value={donorEmail}
                            onChange={e => setDonorEmail(e.target.value)}
=======
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                            Donor Email *
                        </label>
                        <input
                            type="email"
                            name="donorEmail"
                            value={formData.donorEmail}
                            onChange={handleChange}
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
                            required
                            placeholder="donor@example.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                        />
<<<<<<< HEAD
                        {/* Lookup status */}
                        {donorLookupStatus === 'loading' && (
                            <p className="text-xs text-gray-500 mt-1"><i className="fa fa-spinner fa-spin mr-1"></i>Looking up donor...</p>
                        )}
                        {donorLookupStatus === 'notfound' && (
                            <p className="text-xs text-red-600 mt-1">❌ No registered donor found with this email</p>
                        )}
                    </div>

                    {/* Auto-filled donor info */}
                    {donorInfo && (
                        <div className="bg-green-50 border border-green-300 rounded-lg p-4 flex items-center gap-4">
                            <div className="text-3xl">🩸</div>
                            <div>
                                <p className="font-bold text-gray-800 text-lg">{donorInfo.name}</p>
                                <p className="text-sm text-gray-600">Blood Group:
                                    <span className="ml-1 font-bold text-red-600 text-base">{donorInfo.bloodtype}</span>
                                </p>
                                <p className="text-xs text-green-700 mt-0.5">✅ Donor found — details auto-filled</p>
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Units Donated *</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            required
                            min="1"
                            placeholder="Enter number of units"
=======
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
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                        />
                    </div>

<<<<<<< HEAD
                    {/* Expiry Date */}
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Expiry Date *</label>
                        <input
                            type="date"
                            value={expiryDate}
                            onChange={e => setExpiryDate(e.target.value)}
                            required
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                        />
                    </div>

                    {/* Info note — no org email shown */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                        <p><i className="fa fa-info-circle mr-1"></i> This record will automatically appear in your organisation's dashboard.</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={loading || !donorInfo}
                            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? <span><i className="fa fa-spinner fa-spin mr-1"></i>Recording...</span> : 'Record Donation'}
                        </button>
                        <button type="button" onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
=======
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
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RecordDonationModal;