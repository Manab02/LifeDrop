import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, inventoryAPI, donorAPI } from '../services/api';

const DonorDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [donations, setDonations] = useState([]);
    const [stats, setStats] = useState({
        totalDonations: 0,
        totalUnits: 0,
        lastDonation: null,
        nextEligible: null
    });
    const [loading, setLoading] = useState(true);
    const [isAvailable, setIsAvailable] = useState(true);
    const [toggleLoading, setToggleLoading] = useState(false);

    // Profile Edit States
    const [editMode, setEditMode] = useState(false);
    const [profileData, setProfileData] = useState({
        name: '',
        phone: '',
        age: '',
        state: '',
        district: '',
        city: ''
    });
    const [states, setStates] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [cities, setCities] = useState([]);
    const [profileLoading, setProfileLoading] = useState(false);

    // Add Donation Modal States
    const [showAddDonationModal, setShowAddDonationModal] = useState(false);
    const [donationFormData, setDonationFormData] = useState({
        quantity: '',
        donorName: '',
        hospitalEmail: '',
        organisationEmail: ''
    });
    const [donationLoading, setDonationLoading] = useState(false);

    // Hospitals and Organizations Lists
    const [hospitals, setHospitals] = useState([]);
    const [organisations, setOrganisations] = useState([]);
    const [hospitalsLoading, setHospitalsLoading] = useState(false);
    const [orgsLoading, setOrgsLoading] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (user) {
            fetchDonations();
            loadLocationData();
            fetchHospitalsAndOrganisations();
        }
    }, [user]);

    // Load location data for profile editing
    useEffect(() => {
        if (editMode && profileData.state) {
            loadDistricts(profileData.state);
        }
    }, [editMode, profileData.state]);

    useEffect(() => {
        if (editMode && profileData.district && profileData.state) {
            loadCities(profileData.state, profileData.district);
        }
    }, [editMode, profileData.district, profileData.state]);

    const checkAuth = async () => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');

        if (!userData.id || userData.role !== 'donor') {
            alert('Access denied. Donors only.');
            navigate('/login');
            return;
        }

        setUser(userData);
        setIsAvailable(userData.isAvailable !== false);
        setProfileData({
            name: userData.name || '',
            phone: userData.phone || '',
            age: userData.age || '',
            state: userData.address?.state || '',
            district: userData.address?.district || '',
            city: userData.address?.city || ''
        });
        setLoading(false);
    };

    const loadLocationData = async () => {
        try {
            const response = await fetch('/states.json');
            const data = await response.json();
            setStates(data);
        } catch (error) {
            console.error('Error loading states:', error);
        }
    };

    const loadDistricts = async (stateName) => {
        try {
            const response = await fetch('/districts.json');
            const data = await response.json();
            const filtered = data.filter(d => d.state_name === stateName);
            setDistricts(filtered);
        } catch (error) {
            console.error('Error loading districts:', error);
        }
    };

    const loadCities = async (stateName, districtName) => {
        try {
            const response = await fetch('/cities.json');
            const data = await response.json();
            const stateObj = data.india.states.find(s => s.name === stateName);
            const districtObj = stateObj?.districts.find(d => d.name === districtName);
            setCities(districtObj ? districtObj.cities : []);
        } catch (error) {
            console.error('Error loading cities:', error);
        }
    };

    const fetchHospitalsAndOrganisations = async () => {
        try {
            setHospitalsLoading(true);
            setOrgsLoading(true);

            // Fetch hospitals
            const hospitalsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/public/get-hospitals`);
            const hospitalsData = await hospitalsResponse.json();
            if (hospitalsData.success) {
                setHospitals(hospitalsData.data || []);
            }

            // Fetch organisations
            const orgsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/public/get-organisations`);
            const orgsData = await orgsResponse.json();
            if (orgsData.success) {
                setOrganisations(orgsData.data || []);
            }
        } catch (error) {
            console.error('Error fetching hospitals/organisations:', error);
        } finally {
            setHospitalsLoading(false);
            setOrgsLoading(false);
        }
    };

    const fetchDonations = async () => {
        try {
            const data = await inventoryAPI.getInventory();
            if (data.success && data.inventory) {
                const userDonations = data.inventory.filter(
                    item => item.inventoryType === 'in' && item.donor?._id === user?.id
                );
                setDonations(userDonations);
                calculateStats(userDonations);
            }
        } catch (error) {
            console.error('Error fetching donations:', error);
        }
    };

    const calculateStats = (donationData) => {
        const totalDonations = donationData.filter(d => d.inventoryType === 'in').length;
        const totalUnits = donationData
            .filter(d => d.inventoryType === 'in')
            .reduce((sum, d) => sum + d.quantity, 0);

        const sortedDonations = donationData
            .filter(d => d.inventoryType === 'in')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const lastDonation = sortedDonations.length > 0
            ? new Date(sortedDonations[0].createdAt)
            : null;

        const nextEligible = lastDonation
            ? new Date(lastDonation.getTime() + 90 * 24 * 60 * 60 * 1000)
            : null;

        setStats({
            totalDonations,
            totalUnits,
            lastDonation,
            nextEligible
        });
    };

    const handleToggleAvailability = async () => {
        if (!window.confirm(`Are you sure you want to mark yourself as ${isAvailable ? 'UNAVAILABLE' : 'AVAILABLE'} for donation?`)) {
            return;
        }

        setToggleLoading(true);

        try {
            const data = await donorAPI.toggleAvailability();

            if (data.success) {
                const newAvailability = !isAvailable;
                setIsAvailable(newAvailability);

                const updatedUser = { ...user, isAvailable: newAvailability };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);

                alert(data.message || `You are now ${newAvailability ? 'AVAILABLE' : 'UNAVAILABLE'} for donation`);
            } else {
                alert(data.message || 'Failed to update availability');
            }
        } catch (error) {
            console.error('Toggle availability error:', error);
            alert('An error occurred');
        } finally {
            setToggleLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();

        if (!profileData.name || !profileData.phone || !profileData.age || !profileData.state || !profileData.district || !profileData.city) {
            alert('Please fill all required fields');
            return;
        }

        setProfileLoading(true);

        try {
            const data = await donorAPI.updateProfile(profileData);

            if (data.success) {
                alert('Profile updated successfully!');

                // Update local storage with new data
                const updatedUser = {
                    ...user,
                    name: profileData.name,
                    phone: profileData.phone,
                    age: profileData.age,
                    address: {
                        state: profileData.state,
                        district: profileData.district,
                        city: profileData.city
                    }
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                setEditMode(false);

                // Refresh to show updated data
                window.location.reload();
            } else {
                alert(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            alert('An error occurred');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleAddDonation = async (e) => {
        e.preventDefault();

        // Validate quantity
        if (!donationFormData.quantity || donationFormData.quantity < 1) {
            alert('Please enter a valid blood quantity (minimum 1 unit)');
            return;
        }

        // Validate that at least hospital OR organisation is provided
        if (!donationFormData.hospitalEmail && !donationFormData.organisationEmail) {
            alert('Please select either a Hospital OR an Organisation');
            return;
        }

        setDonationLoading(true);

        try {
            // Calculate expiry date (42 days from today)
            const today = new Date();
            const expiryDate = new Date(today);
            expiryDate.setDate(expiryDate.getDate() + 42);

            const requestData = {
                email: user.email,
                inventoryType: 'in',
                bloodGroup: user.bloodtype,
                quantity: parseInt(donationFormData.quantity),
                expiryDate: expiryDate.toISOString().split('T')[0], // YYYY-MM-DD format
                donor: user.email,
                hospital: donationFormData.hospitalEmail || undefined,
                organisation: donationFormData.organisationEmail || undefined,
                patientName: donationFormData.donorName || '',
                hospitalNameText: '',
                organisationNameText: '',
                notes: `Donation recorded by donor on ${new Date().toLocaleString()}`
            };

            const data = await inventoryAPI.createInventory(requestData);

            if (data.success) {
                alert('Donation recorded successfully!\n\n Your account is now unavailable for 90 days.\n\n📅 Next eligible date will be displayed on your dashboard.');

                setShowAddDonationModal(false);
                setDonationFormData({
                    quantity: '',
                    donorName: '',
                    hospitalEmail: '',
                    organisationEmail: ''
                });

                // Update availability immediately
                setIsAvailable(false);
                const updatedUser = { ...user, isAvailable: false };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);

                // Refresh donations list
                fetchDonations();
            } else {
                alert(data.message || 'Failed to add donation');
            }
        } catch (error) {
            console.error('Add donation error:', error);
            alert('An error occurred');
        } finally {
            setDonationLoading(false);
        }
    };

    const handleSendVerificationOTP = async () => {
        try {
            const data = await authAPI.sendVerifyOtp();
            if (data.success) {
                alert('Verification OTP sent to your email!');
                navigate('/email-verify');
            } else {
                alert(data.message || 'Failed to send OTP');
            }
        } catch (error) {
            console.error('Send OTP error:', error);
            alert('An error occurred');
        }
    };

    const handleLogout = async () => {
        await authAPI.logout();
        localStorage.removeItem('user');
        navigate('/');
    };

    const isEligibleToDonate = () => {
        if (!stats.nextEligible) return true;
        return new Date() >= stats.nextEligible;
    };

    const daysUntilEligible = () => {
        if (!stats.nextEligible || isEligibleToDonate()) return 0;
        const diff = stats.nextEligible - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-red-700 text-white flex flex-col flex-shrink-0">
                <div className="p-5 text-center border-b border-red-500">
                    <h2 className="text-xl font-bold">🩸 Donor Dashboard</h2>
                </div>

                <nav className="flex-1 p-4 space-y-3">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center p-2 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-gauge w-6"></i> Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`w-full flex items-center p-2 rounded-lg transition ${activeTab === 'profile' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-user w-6"></i> My Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('donations')}
                        className={`w-full flex items-center p-2 rounded-lg transition ${activeTab === 'donations' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-heartbeat w-6"></i> My Donations
                    </button>
                </nav>

                <div className="p-4 border-t border-red-600">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center p-2 bg-red-600 hover:bg-red-500 rounded-lg"
                    >
                        <i className="fa fa-sign-out-alt mr-2"></i> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 overflow-y-auto">
                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                    <>
                        <h1 className="text-2xl font-semibold mb-6 text-gray-800">
                            Welcome, <span className="text-red-600">{user?.name}</span>
                        </h1>

                        {/* Eligibility Status Banner */}
                        {isEligibleToDonate() ? (
                            <div className="mb-6 bg-green-50 border-2 border-green-500 rounded-lg p-6 flex items-center gap-4">
                                <div className="text-green-600 text-5xl">
                                    <i className="fa fa-check-circle"></i>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-green-700">You're Eligible to Donate!</h2>
                                    <p className="text-green-600 mt-1">Thank you for being a lifesaver. Click "Add Donation" to record your next donation.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6 bg-orange-50 border-2 border-orange-500 rounded-lg p-6 flex items-center gap-4">
                                <div className="text-orange-600 text-5xl">
                                    <i className="fa fa-clock"></i>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-orange-700">Please Wait Before Donating</h2>
                                    <p className="text-orange-600 mt-1">
                                        You can donate again in <strong>{daysUntilEligible()} days</strong> (after {stats.nextEligible?.toLocaleDateString()})
                                    </p>
                                    <p className="text-sm text-orange-500 mt-2">
                                        ⏳ Donors must wait 90 days between donations for safety.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Availability Toggle */}
                        <div className="mb-6 bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-600">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h2 className="text-lg font-bold text-gray-800 mb-2">Donation Availability</h2>
                                    <p className="text-sm text-gray-600 mb-3">
                                        {isAvailable
                                            ? '✅ You are currently AVAILABLE for blood donation. Your profile is visible to those searching for donors.'
                                            : '🔴 You are currently UNAVAILABLE. Your profile is hidden from search results.'}
                                    </p>
                                    {!isAvailable && stats.nextEligible && (
                                        <p className="text-sm text-orange-600 font-semibold">
                                            ⏳ Next eligible date: {stats.nextEligible.toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={handleToggleAvailability}
                                    disabled={toggleLoading}
                                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 ${isAvailable
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                        }`}
                                >
                                    {toggleLoading ? 'Updating...' : isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                                </button>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-red-600">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm mb-1">Total Donations</p>
                                        <p className="text-3xl font-bold text-red-600">{stats.totalDonations}</p>
                                    </div>
                                    <i className="fa fa-hand-holding-heart text-4xl text-red-600 opacity-20"></i>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-600">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm mb-1">Total Units Donated</p>
                                        <p className="text-3xl font-bold text-blue-600">{stats.totalUnits}</p>
                                    </div>
                                    <i className="fa fa-droplet text-4xl text-blue-600 opacity-20"></i>
                                </div>
                            </div>
                        </div>

                        {/* Donation Benefits */}
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-lg p-6">
                            <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                                <i className="fa fa-star"></i>
                                Benefits of Blood Donation
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <i className="fa fa-heart text-red-600 text-xl mt-1"></i>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Save Lives</h4>
                                        <p className="text-sm text-gray-600">One donation can save up to 3 lives</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <i className="fa fa-heartbeat text-red-600 text-xl mt-1"></i>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Health Check</h4>
                                        <p className="text-sm text-gray-600">Free mini health screening with every donation</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <i className="fa fa-weight text-red-600 text-xl mt-1"></i>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Burn Calories</h4>
                                        <p className="text-sm text-gray-600">One donation burns approximately 650 calories</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <i className="fa fa-recycle text-red-600 text-xl mt-1"></i>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Blood Renewal</h4>
                                        <p className="text-sm text-gray-600">Stimulates production of new blood cells</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* MY PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div className="max-w-3xl mx-auto">
                        <h1 className="text-2xl font-semibold mb-6 text-gray-800">My Profile</h1>

                        {!user?.isAccountVerified && (
                            <div className="mb-6 bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <i className="fa fa-exclamation-triangle text-yellow-600 text-2xl"></i>
                                    <div>
                                        <h3 className="font-bold text-yellow-800">Email Not Verified</h3>
                                        <p className="text-sm text-yellow-700">Please verify your email to access all features</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSendVerificationOTP}
                                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold"
                                >
                                    Verify Email
                                </button>
                            </div>
                        )}

                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Profile Information</h2>
                                {!editMode && (
                                    <button
                                        onClick={() => setEditMode(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <i className="fa fa-edit"></i>
                                        Edit Profile
                                    </button>
                                )}
                            </div>

                            {!editMode ? (
                                // View Mode
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-semibold text-gray-600">Name</label>
                                            <p className="text-gray-800 mt-1">{user?.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-600">Email</label>
                                            <p className="text-gray-800 mt-1">{user?.email}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-600">Phone</label>
                                            <p className="text-gray-800 mt-1">{user?.phone}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-600">Age</label>
                                            <p className="text-gray-800 mt-1">{user?.age}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-600">Blood Type</label>
                                            <p className="text-red-600 font-bold mt-1">{user?.bloodtype}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-600">State</label>
                                            <p className="text-gray-800 mt-1">{user?.address?.state}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-600">District</label>
                                            <p className="text-gray-800 mt-1">{user?.address?.district}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-600">City</label>
                                            <p className="text-gray-800 mt-1">{user?.address?.city}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Edit Mode
                                <form onSubmit={handleProfileUpdate} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                                            <input
                                                type="text"
                                                value={profileData.name}
                                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                                required
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email (Cannot Change)</label>
                                            <input
                                                type="email"
                                                value={user?.email}
                                                disabled
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone *</label>
                                            <input
                                                type="tel"
                                                value={profileData.phone}
                                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                                required
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Age *</label>
                                            <input
                                                type="number"
                                                value={profileData.age}
                                                onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                                                required
                                                min="18"
                                                max="65"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">State *</label>
                                            <select
                                                value={profileData.state}
                                                onChange={(e) => setProfileData({ ...profileData, state: e.target.value, district: '', city: '' })}
                                                required
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            >
                                                <option value="">Select State</option>
                                                {states.map((s, i) => (
                                                    <option key={i} value={s.state}>{s.state}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div><label className="block text-sm font-semibold text-gray-700 mb-2">District *</label>
                                            <select
                                                value={profileData.district}
                                                onChange={(e) => setProfileData({ ...profileData, district: e.target.value, city: '' })}
                                                required
                                                disabled={!profileData.state}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                                            >
                                                <option value="">Select District</option>
                                                {districts.map((d, i) => (
                                                    <option key={i} value={d.DIST_name}>{d.DIST_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">City *</label>
                                            <select
                                                value={profileData.city}
                                                onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                                                required
                                                disabled={!profileData.district}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                                            >
                                                <option value="">Select City</option>
                                                {cities.map((c, i) => (
                                                    <option key={i} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="submit"
                                            disabled={profileLoading}
                                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                                        >
                                            {profileLoading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditMode(false);
                                                setProfileData({
                                                    name: user?.name || '',
                                                    phone: user?.phone || '',
                                                    age: user?.age || '',
                                                    state: user?.address?.state || '',
                                                    district: user?.address?.district || '',
                                                    city: user?.address?.city || ''
                                                });
                                            }}
                                            disabled={profileLoading}
                                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {/* MY DONATIONS TAB */}
                {activeTab === 'donations' && (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-semibold text-gray-800">My Donation History</h1>
                            <button
                                onClick={() => setShowAddDonationModal(true)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                                <i className="fa fa-plus"></i>
                                Add Donation
                            </button>
                        </div>

                        <div className="overflow-x-auto bg-white rounded-lg shadow">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="p-3">Date & Time</th>
                                        <th className="p-3">Blood Group</th>
                                        <th className="p-3">Quantity</th>
                                        <th className="p-3">Expiry Date</th>
                                        <th className="p-3">Hospital</th>
                                        <th className="p-3">Organization</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {donations.map((donation) => {
                                        const isExpired = donation.status === 'expired' || new Date(donation.expiryDate) < new Date();
                                        const isExpiringSoon = !isExpired && new Date(donation.expiryDate) < new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

                                        return (
                                            <tr key={donation._id} className={`border-b hover:bg-gray-50 ${isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-orange-50' : ''}`}>
                                                <td className="p-3">
                                                    <div className="text-sm">
                                                        <div className="font-semibold">{new Date(donation.createdAt).toLocaleDateString()}</div>
                                                        <div className="text-gray-600 text-xs">{new Date(donation.createdAt).toLocaleTimeString()}</div>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-red-600 font-semibold">{donation.bloodGroup}</td>
                                                <td className="p-3">{donation.quantity} units</td>
                                                <td className="p-3">
                                                    <div className="flex flex-col">
                                                        <span className={isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-orange-600 font-semibold' : ''}>
                                                            {new Date(donation.expiryDate).toLocaleDateString()}
                                                        </span>
                                                        {isExpired && (
                                                            <span className="text-xs text-red-600 font-semibold">EXPIRED</span>
                                                        )}
                                                        {isExpiringSoon && !isExpired && (
                                                            <span className="text-xs text-orange-600 font-semibold">
                                                                Expiring in {Math.ceil((new Date(donation.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} days
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-sm">
                                                    {donation.hospital?.hospitalName || <span className="text-gray-400">N/A</span>}
                                                </td>
                                                <td className="p-3 text-sm">
                                                    {donation.organisation?.organisationName || <span className="text-gray-400">N/A</span>}
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${donation.status === 'expired' ? 'bg-red-100 text-red-700' :
                                                        donation.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-green-100 text-green-700'
                                                        }`}>
                                                        {donation.status === 'expired' ? 'Expired' : donation.status === 'pending' ? 'Pending' : 'Completed'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {donations.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="p-6 text-center text-gray-500">
                                                No donation history yet. Start donating to save lives!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </main>

            {/* Add Donation Modal - UPDATED */}
            {showAddDonationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-green-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between sticky top-0">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <i className="fa fa-plus-circle"></i>
                                Add Donation Record
                            </h2>
                            <button
                                onClick={() => setShowAddDonationModal(false)}
                                className="text-white hover:text-gray-200"
                            >
                                <i className="fa fa-times text-xl"></i>
                            </button>
                        </div>

                        <form onSubmit={handleAddDonation} className="p-6 space-y-6">
                            {/* Information Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                <p className="font-semibold mb-2">📋 Important Information:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Blood group is automatically selected from your profile: <strong>{user?.bloodtype}</strong></li>
                                    <li>Expiry date will be automatically calculated as <strong>42 days</strong> from today</li>
                                    <li>After recording donation, you will be <strong>unavailable for 90 days</strong></li>
                                    <li>You must select either a <strong>Hospital OR Organisation</strong> (at least one required)</li>
                                </ul>
                            </div>

                            {/* Blood Group (Auto-selected, Read-only) */}
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">
                                    Blood Group (Auto-selected)
                                </label>
                                <input
                                    type="text"
                                    value={user?.bloodtype}
                                    disabled
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 font-bold text-red-600 cursor-not-allowed"
                                />
                            </div>

                            {/* Blood Units - REQUIRED */}
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">
                                    Blood Units * <span className="text-sm font-normal text-gray-500">(Typically 1 unit = 450ml)</span>
                                </label>
                                <input
                                    type="number"
                                    value={donationFormData.quantity}
                                    onChange={(e) => setDonationFormData({ ...donationFormData, quantity: e.target.value })}
                                    required
                                    min="1"
                                    max="10"
                                    placeholder="Enter number of units (e.g., 1)"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    ℹ️ Standard donation is 1 unit (450ml). Maximum 10 units per entry.
                                </p>
                            </div>

                            {/* Expiry Date Display (Auto-calculated, Read-only) */}
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">
                                    Expiry Date (Auto-calculated)
                                </label>
                                <input
                                    type="text"
                                    value={(() => {
                                        const today = new Date();
                                        const expiryDate = new Date(today);
                                        expiryDate.setDate(expiryDate.getDate() + 42);
                                        return expiryDate.toLocaleDateString();
                                    })()}
                                    disabled
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    🕐 Blood expires 42 days from today's date
                                </p>
                            </div>

                            {/* Donor Name (Optional) */}
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">
                                    Donor Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={donationFormData.donorName}
                                    onChange={(e) => setDonationFormData({ ...donationFormData, donorName: e.target.value })}
                                    placeholder="Enter donor name (optional)"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                />
                            </div>

                            {/* Hospital Selection - Dynamically Populated */}
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">
                                    Hospital * <span className="text-sm font-normal text-gray-500">(Select if donating to hospital)</span>
                                </label>
                                <select
                                    value={donationFormData.hospitalEmail}
                                    onChange={(e) => {
                                        setDonationFormData({
                                            ...donationFormData,
                                            hospitalEmail: e.target.value,
                                            organisationEmail: '' // Clear organisation if hospital is selected
                                        });
                                    }}
                                    disabled={hospitalsLoading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none disabled:bg-gray-100"
                                >
                                    <option value="">-- Select Hospital --</option>
                                    {hospitals.map((hospital) => (
                                        <option key={hospital._id} value={hospital.email}>
                                            {hospital.hospitalName} ({hospital.systemId})
                                        </option>
                                    ))}
                                </select>
                                {hospitalsLoading && (
                                    <p className="text-xs text-blue-500 mt-1">Loading hospitals...</p>
                                )}
                                {!hospitalsLoading && hospitals.length === 0 && (
                                    <p className="text-xs text-orange-500 mt-1">No hospitals found in system</p>
                                )}
                            </div>

                            {/* OR Divider */}
                            <div className="flex items-center justify-center">
                                <div className="border-t border-gray-300 flex-1"></div>
                                <span className="px-4 text-gray-500 font-semibold">OR</span>
                                <div className="border-t border-gray-300 flex-1"></div>
                            </div>

                            {/* Organisation Selection - Dynamically Populated */}
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">
                                    Organisation * <span className="text-sm font-normal text-gray-500">(Select if donating to organisation)</span>
                                </label>
                                <select
                                    value={donationFormData.organisationEmail}
                                    onChange={(e) => {
                                        setDonationFormData({
                                            ...donationFormData,
                                            organisationEmail: e.target.value,
                                            hospitalEmail: '' // Clear hospital if organisation is selected
                                        });
                                    }}
                                    disabled={orgsLoading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none disabled:bg-gray-100"
                                >
                                    <option value="">-- Select Organisation --</option>
                                    {organisations.map((org) => (
                                        <option key={org._id} value={org.email}>
                                            {org.organisationName} ({org.systemId})
                                        </option>
                                    ))}
                                </select>
                                {orgsLoading && (
                                    <p className="text-xs text-blue-500 mt-1">Loading organisations...</p>
                                )}
                                {!orgsLoading && organisations.length === 0 && (
                                    <p className="text-xs text-orange-500 mt-1">No organisations found in system</p>
                                )}
                            </div>

                            {/* Warning if neither selected */}
                            {!donationFormData.hospitalEmail && !donationFormData.organisationEmail && (
                                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
                                    <p className="flex items-center gap-2">
                                        <i className="fa fa-exclamation-triangle"></i>
                                        <strong>Required:</strong> Please select either a Hospital OR an Organisation
                                    </p>
                                </div>
                            )}

                            {/* 90-Day Warning */}
                            <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 text-sm text-orange-800">
                                <p className="font-semibold mb-2 flex items-center gap-2">
                                    <i className="fa fa-clock"></i>
                                    ⚠️ 90-Day Cooldown Notice
                                </p>
                                <p>
                                    After recording this donation, your account will automatically be marked as <strong>UNAVAILABLE</strong> for 90 days.
                                    This is for your health and safety. Your next eligible donation date will be displayed on your dashboard.
                                </p>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={donationLoading}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {donationLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <i className="fa fa-spinner fa-spin"></i>
                                            Recording Donation...
                                        </span>
                                    ) : (
                                        'Record Donation'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddDonationModal(false);
                                        setDonationFormData({
                                            quantity: '',
                                            donorName: '',
                                            hospitalEmail: '',
                                            organisationEmail: ''
                                        });
                                    }}
                                    disabled={donationLoading}
                                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        </div>
    );
};

export default DonorDashboard;