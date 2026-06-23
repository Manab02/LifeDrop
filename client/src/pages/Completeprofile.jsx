import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { donorAPI } from '../services/api';

const CompleteProfile = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [states, setStates] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        phone: '', bloodtype: '', age: '', state: '', district: '', city: ''
    });

    useEffect(() => {
        const userParam = searchParams.get('user');
        if (userParam) {
            try {
                const user = JSON.parse(decodeURIComponent(userParam));
                localStorage.setItem('user', JSON.stringify(user));
            } catch (e) { console.error('Failed to parse user param'); }
        }

        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        if (!stored.id) { navigate('/login'); return; }
        if (stored.role !== 'donor') { navigate('/login'); return; }

        fetch('/states.json').then(r => r.json()).then(setStates).catch(console.error);
    }, []);

    useEffect(() => {
        if (!formData.state) { setDistricts([]); return; }
        fetch('/districts.json')
            .then(r => r.json())
            .then(data => setDistricts(data.filter(d => d.state_name === formData.state)))
            .catch(console.error);
    }, [formData.state]);

    useEffect(() => {
        if (!formData.district || !formData.state) { setCities([]); return; }
        fetch('/cities.json')
            .then(r => r.json())
            .then(data => {
                const stateObj = data.india.states.find(s => s.name === formData.state);
                const distObj = stateObj?.districts.find(d => d.name === formData.district);
                setCities(distObj ? distObj.cities : []);
            })
            .catch(console.error);
    }, [formData.district, formData.state]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { phone, bloodtype, age, state, district, city } = formData;
        if (!phone || !bloodtype || !age || !state || !district || !city) {
            alert('Please fill all fields');
            return;
        }
        setLoading(true);
        try {
            const data = await donorAPI.updateProfile({ ...formData, isAvailable: true });
            if (data.success) {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const updated = { ...user, phone, bloodtype, age, address: { state, district, city }, isAvailable: true };
                localStorage.setItem('user', JSON.stringify(updated));
                navigate('/donor-dashboard');
            } else {
                alert(data.message || 'Failed to update profile');
            }
        } catch (err) {
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
            <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🩸</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Complete Your Profile</h1>
                    <p className="text-gray-500 text-sm mt-1">Just a few more details to activate your donor account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-red-600 font-semibold mb-1">Phone Number *</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                            pattern="[0-9]{10,15}" placeholder="+91 1234567890" required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-red-600 font-semibold mb-1">Blood Group *</label>
                            <select name="bloodtype" value={formData.bloodtype} onChange={handleChange} required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white">
                                <option value="">Select</option>
                                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                                    <option key={bg} value={bg}>{bg}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-red-600 font-semibold mb-1">Age *</label>
                            <input type="number" name="age" value={formData.age} onChange={handleChange}
                                min="18" max="65" placeholder="18-65" required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-red-600 font-semibold mb-1">State *</label>
                        <select name="state" value={formData.state} onChange={handleChange} required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white">
                            <option value="">Select State</option>
                            {states.map((s, i) => <option key={i} value={s.state}>{s.state}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-red-600 font-semibold mb-1">District *</label>
                        <select name="district" value={formData.district} onChange={handleChange} required
                            disabled={!formData.state}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white disabled:bg-gray-100">
                            <option value="">Select District</option>
                            {districts.map((d, i) => <option key={i} value={d.DIST_name}>{d.DIST_name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-red-600 font-semibold mb-1">City *</label>
                        <select name="city" value={formData.city} onChange={handleChange} required
                            disabled={!formData.district}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white disabled:bg-gray-100">
                            <option value="">Select City</option>
                            {cities.map((c, i) => <option key={i} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 mt-2">
                        {loading ? 'Saving...' : 'Complete Profile & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CompleteProfile;