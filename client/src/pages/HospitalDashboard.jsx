import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, inventoryAPI, transferAPI, hospitalAPI } from '../services/api';
import EditInventoryModal from '../components/EditInventoryModal';

const HospitalDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('hospital_active_tab') || 'dashboard');
    useEffect(() => { sessionStorage.setItem('hospital_active_tab', activeTab); }, [activeTab]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [bloodStock, setBloodStock] = useState({});
    const [inventory, setInventory] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState({
        totalRequests: 0,
        completedRequests: 0,
        pendingRequests: 0,
        unitsAvailable: 0,
        expiringItemsCount: 0,
        lowStockCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showManualAddModal, setShowManualAddModal] = useState(false);
    const [transfers, setTransfers] = useState([]);
    const [rejectTransferId, setRejectTransferId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [searchRecords, setSearchRecords] = useState('');
    const [profileForm, setProfileForm] = useState({ hospitalName: '', phone: '', state: '', district: '', city: '' });
    const [profileStates, setProfileStates] = useState([]);
    const [profileDistricts, setProfileDistricts] = useState([]);
    const [profileCities, setProfileCities] = useState([]);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState('');
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');
    const [searchRequests, setSearchRequests] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [showDecreaseModal, setShowDecreaseModal] = useState(false);
    const [decreaseFormData, setDecreaseFormData] = useState({
        bloodGroup: '',
        quantity: '',
        notes: ''
    });
    const [manualAddItems, setManualAddItems] = useState([{ bloodGroup: '', quantity: '', expiryDate: '' }]);
    const [manualAddNotes, setManualAddNotes] = useState('');
    const [manualAddSourceTransferId, setManualAddSourceTransferId] = useState(null);
    const [manualAddSaving, setManualAddSaving] = useState(false);
    const [selectedStockGroup, setSelectedStockGroup] = useState(null);
    const [showWalkinModal, setShowWalkinModal] = useState(false);
    const [walkinForm, setWalkinForm] = useState({ donorName: '', donorPhone: '', campName: '', bloodGroup: '', quantity: '', expiryDate: '' });
    const [walkinSaving, setWalkinSaving] = useState(false);
    const [recordsSubTab, setRecordsSubTab] = useState('in'); 
    const [transfersSubTab, setTransfersSubTab] = useState('pending'); 

    const [requestFormData, setRequestFormData] = useState({
        bloodGroup: '',
        quantity: '',
        expiryDate: '',
        organisation: '',
        notes: ''
    });
    const [orgsForRequest, setOrgsForRequest] = useState([]);
    const [requestItems, setRequestItems] = useState([{ bloodGroup: '', quantity: '' }]);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (user) {
            fetchInventory();
            fetchTransfers();
            fetchHospitalProfile();
            fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/public/get-organisations`)
                .then(r => r.json()).then(d => { if (d.success) setOrgsForRequest(d.data || []); }).catch(() => { });
        }
    }, [user]);

    const fetchTransfers = async () => {
        const data = await transferAPI.getHospitalTransfers();
        if (data.success) setTransfers(data.transfers || []);
    };

    const handleApproveTransfer = async (id) => {
        if (!window.confirm('Confirm receipt of this blood transfer? Your stock will increase immediately.')) return;
        const data = await transferAPI.hospitalApprove(id);
        if (data.success) { alert('✅ Receipt confirmed! Stock has been added to your inventory.'); fetchTransfers(); fetchInventory(); }
        else alert(data.message || 'Failed');
    };

    const handleRejectTransfer = async () => {
        if (!rejectReason.trim()) { alert('Please enter a rejection reason'); return; }
        const data = await transferAPI.hospitalReject(rejectTransferId, rejectReason);
        if (data.success) { alert('Rejected. The organisation has been notified and their stock has been restored.'); setRejectTransferId(null); setRejectReason(''); fetchTransfers(); }
        else alert(data.message || 'Failed');
    };


    const checkAuth = async () => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (!userData.id || userData.role !== 'hospital') {
            alert('Access denied. Hospitals only.');
            navigate('/login');
            return;
        }
        setUser(userData);
        setLoading(false);
    };

    const fetchInventory = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/inventory/get-inventory`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            if (data.success && data.inventory) {
                const hospitalRecords = data.inventory.filter(item =>
                    item.hospital?._id === user?.id ||
                    item.target_id?._id === user?.id ||
                    item.source_id?._id === user?.id
                );

                setInventory(hospitalRecords);

                const requests = hospitalRecords.filter(
                    item => item.inventoryType === 'out'
                );
                setAllRequests(requests);

                calculateBloodStock(hospitalRecords);
                calculateStats(hospitalRecords, requests);
                generateNotifications(requests, hospitalRecords);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    const calculateBloodStock = (inventoryData) => {
        const stock = {};
        const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

        bloodGroups.forEach(group => {
            stock[group] = {
                total: 0,
                expiring: 0,
                items: []
            };
        });

        const now = new Date();
        const fiveDaysFromNow = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));

        inventoryData.forEach(item => {
            const itemExpiry = new Date(item.expiryDate);
            const isExpired = item.status === 'expired' || itemExpiry < now;
            const isExpiringSoon = !isExpired && itemExpiry <= fiveDaysFromNow;

            if (!isExpired) {
                const quantity = item.inventoryType === 'in' ? item.quantity : -item.quantity;
                stock[item.bloodGroup].total += quantity;

                if (isExpiringSoon && item.inventoryType === 'in') {
                    stock[item.bloodGroup].expiring += item.quantity;
                }

                stock[item.bloodGroup].items.push({
                    id: item._id,
                    quantity: item.quantity,
                    type: item.inventoryType,
                    expiryDate: item.expiryDate,
                    isExpiringSoon: isExpiringSoon && item.inventoryType === 'in',
                    createdAt: item.createdAt,
                    status: item.status
                });
            }
        });

        Object.keys(stock).forEach(group => {
            if (stock[group].total < 0) {
                stock[group].total = 0;
            }
            if (stock[group].expiring > stock[group].total) {
                stock[group].expiring = stock[group].total;
            }
        });

        setBloodStock(stock);
    };

    const calculateStats = (inventoryData, requests) => {
        const totalRequests = requests.length;
        const completedRequests = requests.filter(r =>
            r.status === 'completed' || r.status === 'approved'
        ).length;
        const pendingRequests = requests.filter(r =>
            r.status === 'pending'
        ).length;

        let totalUnits = 0;
        inventoryData.forEach(item => {
            const isExpired = item.status === 'expired' || new Date(item.expiryDate) < new Date();
            if (!isExpired) {
                if (item.inventoryType === 'in') {
                    totalUnits += item.quantity;
                } else if (item.inventoryType === 'out') {
                    totalUnits -= item.quantity;
                }
            }
        });

        totalUnits = Math.max(0, totalUnits);
        const netByGroup = {};
        const expiringByGroup = {};
        inventoryData.forEach(item => {
            const now = new Date();
            const expiry = new Date(item.expiryDate);
            const isExpired = item.status === 'expired' || expiry < now;
            if (isExpired) return;
            netByGroup[item.bloodGroup] = (netByGroup[item.bloodGroup] || 0) + (item.inventoryType === 'in' ? item.quantity : -item.quantity);
            const fiveDays = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));
            if (item.inventoryType === 'in' && expiry <= fiveDays) {
                expiringByGroup[item.bloodGroup] = (expiringByGroup[item.bloodGroup] || 0) + item.quantity;
            }
        });

        let expiringCount = 0;
        Object.keys(expiringByGroup).forEach(group => {
            const net = Math.max(0, netByGroup[group] || 0);
            expiringCount += Math.min(expiringByGroup[group], net);
        });

        const lowStockGroups = Object.values(bloodStock).filter(stock =>
            stock.total > 0 && stock.total < 20
        ).length;

        const emptyStockGroups = Object.values(bloodStock).filter(stock =>
            stock.total === 0
        ).length;

        setStats({
            totalRequests,
            completedRequests,
            pendingRequests,
            unitsAvailable: totalUnits,
            expiringItemsCount: expiringCount,
            lowStockCount: lowStockGroups,
            emptyStockCount: emptyStockGroups
        });
    };

    const generateNotifications = (requests, inventoryData) => {
        const notifs = [];
        const now = new Date();

        requests.forEach(request => {
            if (request.status === 'completed' || request.status === 'approved') {
                const timeDiff = now - new Date(request.updatedAt || request.createdAt);
                const hoursDiff = timeDiff / (1000 * 60 * 60);

                if (hoursDiff < 24) {
                    notifs.push({
                        id: request._id,
                        type: 'success',
                        icon: 'check-circle',
                        message: `Blood request completed: ${request.bloodGroup} - ${request.quantity} units`,
                        time: formatTimeAgo(request.updatedAt || request.createdAt)
                    });
                }
            } else if (request.status === 'pending') {
                notifs.push({
                    id: request._id,
                    type: 'warning',
                    icon: 'clock',
                    message: `Pending blood request: ${request.bloodGroup} - ${request.quantity} units`,
                    time: formatTimeAgo(request.createdAt)
                });
            } else if (request.status === 'rejected') {
                notifs.push({
                    id: request._id,
                    type: 'error',
                    icon: 'times-circle',
                    message: `Blood request rejected: ${request.bloodGroup} - ${request.quantity} units`,
                    time: formatTimeAgo(request.updatedAt || request.createdAt)
                });
            }
        });

        const netStockByGroup = {};
        inventoryData.forEach(item => {
            if (item.status === 'expired' || new Date(item.expiryDate) < now) return;
            netStockByGroup[item.bloodGroup] = (netStockByGroup[item.bloodGroup] || 0) + (item.inventoryType === 'in' ? item.quantity : -item.quantity);
        });

        inventoryData.forEach(item => {
            const expiry = new Date(item.expiryDate);
            const daysDiff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

            if (daysDiff > 0 && daysDiff <= 5 && item.inventoryType === 'in' && item.status !== 'expired' && (netStockByGroup[item.bloodGroup] || 0) > 0) {
                notifs.push({
                    id: `expiry-${item._id}`,
                    type: 'warning',
                    icon: 'exclamation-triangle',
                    message: `Blood expiring in ${daysDiff} days: ${item.bloodGroup} - ${item.quantity} units`,
                    time: `Expires ${expiry.toLocaleDateString()}`
                });
            }
        });

        Object.entries(bloodStock).forEach(([group, data]) => {
            if (data.total === 0) {
                notifs.push({
                    id: `empty-${group}`,
                    type: 'error',
                    icon: 'exclamation-circle',
                    message: `${group} blood is empty! Urgent restocking needed`,
                    time: 'Now'
                });
            } else if (data.total > 0 && data.total < 10) {
                notifs.push({
                    id: `low-${group}`,
                    type: 'warning',
                    icon: 'exclamation-triangle',
                    message: `${group} blood is critically low: ${data.total} units remaining`,
                    time: 'Now'
                });
            } else if (data.total >= 10 && data.total < 20) {
                notifs.push({
                    id: `medium-${group}`,
                    type: 'warning',
                    icon: 'info-circle',
                    message: `${group} blood is low: ${data.total} units remaining`,
                    time: 'Now'
                });
            }
        });

        setNotifications(notifs.slice(0, 15));
    };

    const formatTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    };

    const getStockStatus = (quantity) => {
        if (quantity === 0) return { text: 'Empty', color: 'text-red-700', bg: 'bg-red-100' };
        if (quantity > 50) return { text: 'Good', color: 'text-green-600', bg: 'bg-green-100' };
        if (quantity > 20) return { text: 'Low', color: 'text-yellow-600', bg: 'bg-yellow-100' };
        if (quantity > 0) return { text: 'Critical', color: 'text-orange-600', bg: 'bg-orange-100' };
        return { text: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-100' };
    };

    const handleRequestBlood = async (e) => {
        e.preventDefault();
        if (!requestFormData.organisation) { alert('Please select an organisation'); return; }
        const validItems = requestItems.filter(i => i.bloodGroup && i.quantity && parseInt(i.quantity) > 0);
        if (!validItems.length) { alert('Add at least one blood group with quantity'); return; }

        try {
            const data = await transferAPI.createRequest({
                organisationId: requestFormData.organisation,
                items: validItems.map(i => ({ bloodGroup: i.bloodGroup, quantity: parseInt(i.quantity) })),
                notes: requestFormData.notes || ''
            });
            if (data.success) {
                alert('✅ Blood request sent to organisation!\n\nThey will review stock and send. You will be notified once they approve.');
                setShowRequestModal(false);
                setRequestFormData({ bloodGroup: '', quantity: '', expiryDate: '', organisation: '', notes: '' });
                setRequestItems([{ bloodGroup: '', quantity: '' }]);
                fetchTransfers();
            } else {
                alert(data.message || 'Failed to send request');
            }
        } catch (_) { alert('An error occurred'); }
    };

    const handleDecreaseInventory = async (e) => {
        e.preventDefault();

        if (!decreaseFormData.bloodGroup || !decreaseFormData.quantity) {
            alert('Please fill all required fields');
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/inventory/decrease-inventory`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(decreaseFormData)
            });

            const data = await response.json();

            if (data.success) {
                alert(`Successfully recorded usage: ${decreaseFormData.bloodGroup} - ${decreaseFormData.quantity} units`);
                setShowDecreaseModal(false);
                setDecreaseFormData({ bloodGroup: '', quantity: '', notes: '' });
                fetchInventory();
            } else {
                alert(data.message || 'Failed to record usage');
            }
        } catch (error) {
            console.error('Decrease inventory error:', error);
            alert('An error occurred');
        }
    };

    const handleEdit = (request) => {
        setSelectedInventory(request);
        setShowEditModal(true);
    };

    const openManualAddModal = (transfer = null) => {
        if (transfer) {
            setManualAddItems(transfer.items.map(i => ({
                bloodGroup: i.bloodGroup,
                quantity: String(i.quantity),
                expiryDate: new Date(Date.now() + 42 * 86400000).toISOString().split('T')[0]
            })));
            setManualAddNotes(`Received from ${transfer.organisation?.organisationName || 'organisation'}${transfer.notes ? ' — ' + transfer.notes : ''}`);
            setManualAddSourceTransferId(transfer._id);
        } else {
            setManualAddItems([{ bloodGroup: '', quantity: '', expiryDate: '' }]);
            setManualAddNotes('');
            setManualAddSourceTransferId(null);
        }
        setShowManualAddModal(true);
    };

    const updateManualAddItem = (idx, field, value) => {
        setManualAddItems(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });
    };
    const addManualAddItem = () => setManualAddItems(prev => [...prev, { bloodGroup: '', quantity: '', expiryDate: '' }]);
    const removeManualAddItem = (idx) => setManualAddItems(prev => prev.filter((_, i) => i !== idx));

    const handleManualAddRecord = async (e) => {
        e.preventDefault();
        for (const item of manualAddItems) {
            if (!item.bloodGroup || !item.quantity || !item.expiryDate) {
                alert('Please fill all required fields for every blood group row');
                return;
            }
        }
        setManualAddSaving(true);
        try {
            for (const item of manualAddItems) {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/inventory/create-inventory`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        inventoryType: 'in',
                        bloodGroup: item.bloodGroup,
                        quantity: parseInt(item.quantity),
                        expiryDate: item.expiryDate,
                        hospital: user?.email,
                        notes: manualAddNotes || ''
                    })
                });
                const data = await res.json();
                if (!data.success) {
                    alert(data.message || 'Failed to add record');
                    setManualAddSaving(false);
                    return;
                }
            }
            if (manualAddSourceTransferId) {
                await transferAPI.acknowledge(manualAddSourceTransferId);
            }
            alert('✅ Record added! Your blood stock has increased.');
            setShowManualAddModal(false);
            setManualAddItems([{ bloodGroup: '', quantity: '', expiryDate: '' }]);
            setManualAddNotes('');
            setManualAddSourceTransferId(null);
            fetchInventory();
            fetchTransfers();
        } catch (error) {
            console.error('Manual add record error:', error);
            alert('An error occurred');
        } finally {
            setManualAddSaving(false);
        }
    };
    const fetchHospitalProfile = async () => {
        const data = await hospitalAPI.getProfile();
        if (data.success && data.hospital) {
            const h = data.hospital;
            setProfileForm({
                hospitalName: h.hospitalName || '',
                phone: h.phone || '',
                state: h.address?.state || '',
                district: h.address?.district || '',
                city: h.address?.city || ''
            });
        }
    };

    useEffect(() => {
        fetch('/states.json').then(r => r.json()).then(setProfileStates).catch(() => { });
    }, []);

    useEffect(() => {
        if (profileForm.state) {
            fetch('/districts.json')
                .then(r => r.json())
                .then(data => setProfileDistricts(data.filter(d => d.state_name === profileForm.state)))
                .catch(() => { });
        } else {
            setProfileDistricts([]);
        }
    }, [profileForm.state]);

    useEffect(() => {
        if (profileForm.district) {
            fetch('/cities.json')
                .then(r => r.json())
                .then(data => {
                    const stateObj = data.india.states.find(s => s.name === profileForm.state);
                    const districtObj = stateObj?.districts.find(d => d.name === profileForm.district);
                    setProfileCities(districtObj ? districtObj.cities : []);
                })
                .catch(() => { });
        } else {
            setProfileCities([]);
        }
    }, [profileForm.district, profileForm.state]);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileForm(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'state') { next.district = ''; next.city = ''; }
            if (name === 'district') { next.city = ''; }
            return next;
        });
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setProfileSaving(true);
        setProfileMessage('');
        try {
            const data = await hospitalAPI.updateProfile(profileForm);
            if (data.success) {
                setProfileMessage('✅ Profile updated successfully');
                const stored = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({
                    ...stored,
                    hospitalName: profileForm.hospitalName,
                    phone: profileForm.phone,
                    address: { state: profileForm.state, district: profileForm.district, city: profileForm.city }
                }));
                fetchHospitalProfile();
            } else {
                setProfileMessage(data.message || 'Update failed');
            }
        } catch (error) {
            setProfileMessage('An error occurred');
        } finally {
            setProfileSaving(false);
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
            setPasswordMessage('New passwords do not match');
            return;
        }
        if (passwordForm.newPassword.length < 8) {
            setPasswordMessage('New password must be at least 8 characters');
            return;
        }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(passwordForm.newPassword)) {
            setPasswordMessage('Password must include an uppercase letter, a lowercase letter, a number, and a symbol');
            return;
        }
        setPasswordSaving(true);
        setPasswordMessage('');
        try {
            const data = await authAPI.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            if (data.success) {
                setPasswordMessage('✅ Password changed successfully');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
            } else {
                setPasswordMessage(data.message || 'Failed to change password');
            }
        } catch (error) {
            setPasswordMessage('An error occurred');
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleAcknowledge = async (id) => {
        const data = await transferAPI.acknowledge(id);
        if (data.success) fetchTransfers();
    };

    const isTransferPending = (t) => {
        const isPush = t.initiatedBy === 'organisation';
        if (t.status === 'requested') return true;
        if (t.status === 'org_approved' && !isPush) return true;
        if (t.status === 'org_approved' && isPush && !t.hospitalAcknowledged) return true;
        return false;
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSidebarOpen(false);
        fetchInventory();
        fetchTransfers();
    };

    const handleLogout = async () => {
        try {
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/auth/logout`, {
                method: 'GET',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        localStorage.removeItem('user');
        window.location.replace('/login');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

            <aside className={`fixed lg:relative z-40 h-full w-64 bg-red-700 text-white flex flex-col flex-shrink-0 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="p-5 text-center border-b border-red-500">
                    <h2 className="text-2xl font-bold">🏥 Hospital Panel</h2>
                    <p className="text-sm opacity-80">{user?.hospitalName}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => handleTabChange('dashboard')}
                        className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-gauge w-6"></i> Dashboard
                    </button>
                    <button
                        onClick={() => handleTabChange('requests')}
                        className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'requests' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-hand-holding-medical w-6"></i>
                        Blood Requests
                    </button>
                    <button
                        onClick={() => handleTabChange('stock')}
                        className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'stock' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-vial w-6"></i> Blood Stock
                    </button>
                    <button
                        onClick={() => handleTabChange('records')}
                        className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'records' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-list w-6"></i> All Records
                    </button>
                    <button
                        onClick={() => handleTabChange('transfers')}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition ${activeTab === 'transfers' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <span className="flex items-center gap-2"><i className="fa fa-exchange-alt w-6"></i> Pending Transfers</span>
                        {transfers.filter(isTransferPending).length > 0 && (
                            <span className="bg-white text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{transfers.filter(isTransferPending).length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => handleTabChange('notifications')}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition ${activeTab === 'notifications' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <span className="flex items-center gap-2"><i className="fa fa-bell w-6"></i> Notifications</span>
                        {notifications.length > 0 && (
                            <span className="bg-white text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{notifications.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => { handleTabChange('profile'); fetchHospitalProfile(); }}
                        className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'profile' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-user-gear w-6"></i> Profile
                    </button>
                </nav>

                <div className="p-4 border-t border-red-600">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center p-3 bg-red-600 hover:bg-red-500 rounded-lg transition"
                    >
                        <i className="fa fa-sign-out-alt mr-2"></i> Logout
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="lg:hidden bg-red-700 text-white flex items-center justify-between px-4 py-3 flex-shrink-0">
                    <button onClick={() => setSidebarOpen(true)} className="text-xl"><i className="fa fa-bars"></i></button>
                    <span className="font-bold text-sm">Hospital Dashboard</span>
                    <span className="w-6"></span>
                </header>

                <main className="flex-1 p-6 overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-semibold text-gray-800">
                            Welcome, <span className="text-red-600">{user?.name}</span>
                        </h1>
                    </div>

                    {activeTab === 'dashboard' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm opacity-90 mb-1">Total Requests</p>
                                            <p className="text-4xl font-bold">{stats.totalRequests}</p>
                                        </div>
                                        <i className="fa fa-hand-holding-medical text-4xl opacity-50"></i>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm opacity-90 mb-1">Completed</p>
                                            <p className="text-4xl font-bold">{stats.completedRequests}</p>
                                        </div>
                                        <i className="fa fa-check-circle text-4xl opacity-50"></i>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-xl shadow-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm opacity-90 mb-1">Pending</p>
                                            <p className="text-4xl font-bold">{stats.pendingRequests}</p>
                                        </div>
                                        <i className="fa fa-clock text-4xl opacity-50"></i>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm opacity-90 mb-1">Units Available</p>
                                            <p className="text-4xl font-bold">{stats.unitsAvailable}</p>
                                        </div>
                                        <i className="fa fa-vials text-4xl opacity-50"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h2 className="text-lg font-semibold mb-3 text-gray-700">Quick Actions</h2>
                                <div className="flex flex-wrap gap-4">
                                    <button
                                        onClick={() => setShowRequestModal(true)}
                                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-md hover:shadow-lg transition"
                                    >
                                        <i className="fa fa-hand-holding-medical"></i>
                                        Request Blood
                                    </button>
                                    <button
                                        onClick={() => openManualAddModal()}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-md hover:shadow-lg transition"
                                    >
                                        <i className="fa fa-plus"></i>
                                        Add Manual Record
                                    </button>
                                    <button
                                        onClick={() => setShowDecreaseModal(true)}
                                        className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 shadow-md hover:shadow-lg transition"
                                    >
                                        <i className="fa fa-minus-circle"></i>
                                        Record Usage
                                    </button>
                                    <button
                                        onClick={() => setShowWalkinModal(true)}
                                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-md hover:shadow-lg transition"
                                    >
                                        <i className="fa fa-user-plus"></i>
                                        Walk-in Donation
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h2 className="text-lg font-semibold mb-3 text-gray-700">Blood Stock Overview</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(group => {
                                        const qty = bloodStock[group]?.total || 0;
                                        const isEmpty = qty === 0;
                                        const isLow = !isEmpty && qty <= 5;
                                        return (
                                            <button
                                                key={group}
                                                onClick={() => { handleTabChange('stock'); setSelectedStockGroup(group); }}
                                                className={`rounded-lg p-4 border-2 text-center shadow hover:shadow-md transition cursor-pointer ${isEmpty ? 'bg-red-50 border-red-300' : isLow ? 'bg-orange-50 border-orange-300' : 'bg-green-50 border-green-300'
                                                    }`}
                                            >
                                                <div className="text-xl font-bold text-red-600">{group}</div>
                                                <div className="text-2xl font-bold text-gray-800 mt-1">{qty}</div>
                                                <div className="text-xs text-gray-500">units</div>
                                                {isEmpty && <span className="inline-block mt-1 text-xs font-bold text-red-600">Empty</span>}
                                                {isLow && <span className="inline-block mt-1 text-xs font-bold text-orange-600">Low</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {stats.expiringItemsCount > 0 && (
                                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg shadow">
                                        <div className="flex items-center">
                                            <i className="fa fa-exclamation-triangle text-orange-600 text-2xl mr-3"></i>
                                            <div>
                                                <h3 className="font-bold text-orange-800">Expiring Soon</h3>
                                                <p className="text-sm text-orange-700">
                                                    {stats.expiringItemsCount} blood units expiring within 5 days
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {(stats.lowStockCount > 0 || stats.emptyStockCount > 0) && (
                                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow">
                                        <div className="flex items-center">
                                            <i className="fa fa-exclamation-circle text-red-600 text-2xl mr-3"></i>
                                            <div>
                                                <h3 className="font-bold text-red-800">Stock Alert</h3>
                                                <p className="text-sm text-red-700">
                                                    {stats.emptyStockCount > 0 && `${stats.emptyStockCount} empty, `}
                                                    {stats.lowStockCount} low stock blood groups
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-lg font-semibold text-gray-700">Recent Records</h2>
                                    <button
                                        onClick={() => handleTabChange('records')}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                                    >
                                        View All →
                                    </button>
                                </div>
                                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="p-3 text-left text-sm">Type</th>
                                                <th className="p-3 text-left text-sm">Blood</th>
                                                <th className="p-3 text-left text-sm">Qty</th>
                                                <th className="p-3 text-left text-sm">Date</th>
                                                <th className="p-3 text-left text-sm">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inventory.slice(0, 5).map((item) => (
                                                <tr key={item._id} className="border-b hover:bg-gray-50">
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.inventoryType === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {item.inventoryType?.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-red-600 font-bold">{item.bloodGroup}</td>
                                                    <td className="p-3">{item.quantity}</td>
                                                    <td className="p-3 text-sm">{new Date(item.createdAt).toLocaleDateString()}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'expired' ? 'bg-red-100 text-red-700' : item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                            {item.status || 'Completed'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-lg font-semibold text-gray-700">Recent Notifications</h2>
                                    <button
                                        onClick={() => handleTabChange('notifications')}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                                    >
                                        View All →
                                    </button>
                                </div>
                                <div className="bg-white rounded-xl shadow-lg p-4">
                                    {notifications.slice(0, 5).map((notif) => (
                                        <div key={notif.id} className="flex items-start gap-3 p-3 border-b last:border-0 hover:bg-gray-50 rounded">
                                            <i className={`fa fa-${notif.icon} text-xl ${notif.type === 'success' ? 'text-green-600' : notif.type === 'warning' ? 'text-orange-600' : 'text-red-600'}`}></i>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-800">{notif.message}</p>
                                                <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {notifications.length === 0 && (
                                        <p className="text-center text-gray-500 py-4">No notifications</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'requests' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-800">Blood Requests</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowWalkinModal(true)}
                                        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2 shadow-md hover:shadow-lg transition"
                                    >
                                        <i className="fa fa-user-plus"></i>
                                        Walk-in Donation
                                    </button>
                                    <button
                                        onClick={() => setShowRequestModal(true)}
                                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-md hover:shadow-lg transition"
                                    >
                                        <i className="fa fa-hand-holding-medical"></i>
                                        Request Blood
                                    </button>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left text-sm">Transaction ID</th>
                                            <th className="p-3 text-left text-sm">Blood Group</th>
                                            <th className="p-3 text-left text-sm">Quantity</th>
                                            <th className="p-3 text-left text-sm">Organisation</th>
                                            <th className="p-3 text-left text-sm">Expiry Date</th>
                                            <th className="p-3 text-left text-sm">Request Date</th>
                                            <th className="p-3 text-left text-sm">Status</th>
                                            <th className="p-3 text-left text-sm">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const transferRows = transfers
                                                .filter(t => t.initiatedBy !== 'organisation')
                                                .map(t => ({
                                                    _id: t._id,
                                                    _kind: 'transfer',
                                                    transactionId: t.transferId,
                                                    bloodGroup: t.items.map(i => i.bloodGroup).join(', '),
                                                    quantity: t.items.reduce((s, i) => s + i.quantity, 0),
                                                    organisationName: t.organisation?.organisationName,
                                                    expiryDate: null,
                                                    createdAt: t.createdAt,
                                                    status: t.status === 'hospital_approved' || t.status === 'admin_approved' ? 'completed'
                                                        : t.status === 'org_rejected' ? 'rejected'
                                                            : t.status === 'org_approved' ? 'awaiting your confirmation'
                                                                : 'pending'
                                                }));
                                            const combined = transferRows
                                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                                            if (combined.length === 0) {
                                                return (
                                                    <tr>
                                                        <td colSpan="8" className="p-8 text-center text-gray-500">
                                                            <i className="fa fa-inbox text-4xl mb-3 text-gray-300"></i>
                                                            <p>No blood requests yet</p>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return combined.map((request) => {
                                                const expiryDate = request.expiryDate ? new Date(request.expiryDate) : null;
                                                const now = new Date();
                                                const daysToExpiry = expiryDate ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : null;
                                                const isExpired = expiryDate ? expiryDate < now : false;
                                                const isExpiringSoon = !isExpired && daysToExpiry !== null && daysToExpiry <= 5;

                                                return (
                                                    <tr key={request._id} className="border-b hover:bg-gray-50">
                                                        <td className="p-3 text-xs font-mono text-blue-600">
                                                            {request._kind === 'transfer' ? request.transactionId : request.transactionId?.slice(-8)}
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-bold">
                                                                {request.bloodGroup}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 font-semibold">{request.quantity} units</td>
                                                        <td className="p-3 text-sm">
                                                            {request._kind === 'transfer'
                                                                ? (request.organisationName || 'N/A')
                                                                : (request.organisation?.organisationName || request.organisationNameText || 'N/A')}
                                                        </td>
                                                        <td className="p-3">
                                                            {expiryDate ? (
                                                                <div className="text-sm">
                                                                    <span className={isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-orange-600 font-semibold' : 'text-gray-700'}>
                                                                        {expiryDate.toLocaleDateString()}
                                                                    </span>
                                                                    {isExpired && <div className="text-xs text-red-600 font-semibold">EXPIRED</div>}
                                                                    {isExpiringSoon && !isExpired && <div className="text-xs text-orange-600 font-semibold">{daysToExpiry} days left</div>}
                                                                </div>
                                                            ) : <span className="text-gray-400 text-sm">—</span>}
                                                        </td>
                                                        <td className="p-3 text-sm">{new Date(request.createdAt).toLocaleDateString()}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${request.status === 'completed' || request.status === 'approved' ? 'bg-green-100 text-green-700' : request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : request.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {request.status?.toUpperCase() || 'PENDING'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            {request._kind === 'usage' && (
                                                                <button
                                                                    onClick={() => handleEdit(request)}
                                                                    className="text-blue-600 hover:text-blue-800 mr-2"
                                                                    title="Edit"
                                                                >
                                                                    <i className="fa fa-edit"></i>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeTab === 'stock' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-800">Blood Stock (Real-time)</h2>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {Object.entries(bloodStock).map(([group, data]) => {
                                    const status = getStockStatus(data.total);
                                    return (
                                        <button
                                            key={group}
                                            onClick={() => setSelectedStockGroup(group)}
                                            className={`text-left bg-white rounded-xl shadow p-4 hover:shadow-md transition border-2 ${data.total === 0 ? 'border-red-400' : data.total < 10 ? 'border-orange-300' : 'border-transparent'}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xl font-bold text-red-600">{group}</span>
                                                {data.expiring > 0 && (
                                                    <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
                                                        {data.expiring} expiring
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-2xl font-bold text-gray-800">{data.total}</div>
                                            <div className="text-xs text-gray-500 mb-1">units</div>
                                            <span className={`text-xs font-semibold ${status.color}`}>{status.text}</span>
                                            <p className="text-xs text-gray-400 mt-2">Click for details ({data.items.length} record{data.items.length !== 1 ? 's' : ''})</p>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedStockGroup && (() => {
                                const data = bloodStock[selectedStockGroup] || { total: 0, expiring: 0, items: [] };
                                const status = getStockStatus(data.total);
                                return (
                                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStockGroup(null)}>
                                        <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                            <div className="bg-red-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                                                <h2 className="font-bold text-lg">{selectedStockGroup} — Stock Details</h2>
                                                <button onClick={() => setSelectedStockGroup(null)} className="hover:opacity-70">
                                                    <i className="fa fa-times text-xl"></i>
                                                </button>
                                            </div>
                                            <div className="p-6 border-b">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-3xl font-bold text-gray-800">{data.total} units</div>
                                                        <span className={`text-sm font-semibold ${status.color}`}>{status.text}</span>
                                                    </div>
                                                    {data.expiring > 0 && (
                                                        <div className="bg-orange-100 px-4 py-2 rounded-lg">
                                                            <p className="text-sm font-semibold text-orange-700">⚠️ {data.expiring} units expiring soon</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="overflow-y-auto p-6">
                                                {data.items.length === 0 ? (
                                                    <p className="text-center text-gray-400 py-8">No records for this group</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {data.items.map((item) => (
                                                            <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${item.isExpiringSoon ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${item.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {item.type === 'in' ? 'IN' : 'OUT'}
                                                                    </span>
                                                                    <span className="font-semibold">{item.quantity} units</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    {item.type === 'in' ? (
                                                                        <p className={`text-sm font-semibold ${item.isExpiringSoon ? 'text-orange-600' : 'text-gray-600'}`}>
                                                                            Expires: {new Date(item.expiryDate).toLocaleDateString()}
                                                                        </p>
                                                                    ) : (
                                                                        <p className="text-sm font-semibold text-gray-600">
                                                                            Used / Sent
                                                                        </p>
                                                                    )}
                                                                    <p className="text-xs text-gray-500">
                                                                        {item.type === 'in' ? 'Added' : 'Date'}: {new Date(item.createdAt).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {activeTab === 'records' && (
                        <div>
                        
                            <div className="flex gap-2 mb-5 border-b border-gray-200">
                                {[
                                    { type: 'in', label: 'Blood IN', icon: 'fa-arrow-down', color: 'green' },
                                    { type: 'out', label: 'Blood OUT', icon: 'fa-arrow-up', color: 'red' }
                                ].map(t => {
                                    const count = inventory.filter(i => i.inventoryType === t.type).length;
                                    const active = recordsSubTab === t.type;
                                    return (
                                        <button
                                            key={t.type}
                                            onClick={() => setRecordsSubTab(t.type)}
                                            className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px transition ${active
                                                ? (t.color === 'green' ? 'border-green-600 text-green-700' : 'border-red-600 text-red-700')
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            <i className={`fa ${t.icon}`}></i> {t.label} ({count})
                                        </button>
                                    );
                                })}
                            </div>

                            {(() => {
                                const rows = inventory.filter(i => i.inventoryType === recordsSubTab);
                                const isInTab = recordsSubTab === 'in';
                                return (
                                    <div className="bg-white rounded-xl shadow-lg overflow-hidden overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="p-3 text-left text-sm">Blood Group</th>
                                                    <th className="p-3 text-left text-sm">Quantity</th>
                                                    <th className="p-3 text-left text-sm">Details / Note</th>
                                                    <th className="p-3 text-left text-sm">Expiry Date</th>
                                                    <th className="p-3 text-left text-sm">Date</th>
                                                    <th className="p-3 text-left text-sm">Status</th>
                                                    <th className="p-3 text-left text-sm">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((item) => {
                                                    const isExpired = item.status === 'expired' || new Date(item.expiryDate) < new Date();
                                                    const isExpiringSoon = !isExpired && new Date(item.expiryDate) < new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
                                                    const counterparty = item.donor?.name || item.organisation?.organisationName || item.hospital?.hospitalName || item.source_name || item.target_name || 'N/A';
                                                    const isDailyUsage = item.target_name === 'Daily Usage';

                                                    return (
                                                        <tr key={item._id} className={`border-b hover:bg-gray-50 ${isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-orange-50' : ''}`}>
                                                            <td className="p-3 text-red-600 font-bold">{item.bloodGroup}</td>
                                                            <td className="p-3 font-semibold">{item.quantity}</td>
                                                            <td className="p-3 text-sm max-w-xs">
                                                                {isDailyUsage ? (
                                                                    <span className="font-semibold text-gray-700">Used for patient care</span>
                                                                ) : (
                                                                    <span>{isInTab ? 'IN' : 'OUT'} <span className="text-gray-500">{isInTab ? 'from' : 'to'}</span> <strong>{counterparty}</strong></span>
                                                                )}
                                                                {item.notes && (
                                                                    <div className="text-xs text-gray-500 mt-0.5 italic">"{item.notes}"</div>
                                                                )}
                                                            </td>
                                                            <td className="p-3">
                                                                <span className={isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-orange-600 font-semibold' : 'text-gray-700'}>
                                                                    {new Date(item.expiryDate).toLocaleDateString()}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-sm">{new Date(item.createdAt).toLocaleDateString()}</td>
                                                            <td className="p-3">
                                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'expired' ? 'bg-red-100 text-red-700' : item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                                    {item.status || 'Completed'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3">
                                                                <button
                                                                    onClick={() => handleEdit(item)}
                                                                    className="text-blue-600 hover:text-blue-800"
                                                                    title="Edit"
                                                                >
                                                                    <i className="fa fa-edit"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {rows.length === 0 && (
                                                    <tr>
                                                        <td colSpan="7" className="p-8 text-center text-gray-500">
                                                            No {recordsSubTab.toUpperCase()} records found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {activeTab === 'transfers' && (
                        <div>
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Blood Transfers & Requests</h2>

                            <div className="flex gap-2 mb-4 border-b border-gray-200">
                                {[
                                    { key: 'pending', label: 'Pending', count: transfers.filter(isTransferPending).length },
                                    { key: 'history', label: 'History', count: transfers.filter(t => !isTransferPending(t)).length }
                                ].map(t => (
                                    <button
                                        key={t.key}
                                        onClick={() => setTransfersSubTab(t.key)}
                                        className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${transfersSubTab === t.key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {t.label} ({t.count})
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4 text-xs">
                                {[
                                    { s: 'requested', c: 'bg-yellow-100 text-yellow-700', l: 'Sent to Org' },
                                    { s: 'org_approved', c: 'bg-blue-100 text-blue-700', l: 'Org Approved — Confirm Receipt' },
                                    { s: 'org_rejected', c: 'bg-red-100 text-red-700', l: 'Org Rejected' },
                                    { s: 'hospital_approved', c: 'bg-green-100 text-green-700', l: 'Confirmed — Completed ✅' },
                                    { s: 'hospital_rejected', c: 'bg-red-100 text-red-700', l: 'You Rejected' },
                                    { s: 'admin_approved', c: 'bg-green-100 text-green-700', l: 'Finalised ✅' },
                                ].map(({ s, c, l }) => <span key={s} className={`px-2 py-1 rounded-full font-semibold ${c}`}>{l}</span>)}
                            </div>

                            <div className="space-y-4">
                                {transfers.filter(t => transfersSubTab === 'pending' ? isTransferPending(t) : !isTransferPending(t)).map(t => {
                                    const isPush = t.initiatedBy === 'organisation';
                                    const awaitingYourConfirm = t.status === 'org_approved' && !isPush;
                                    const isSentNotification = t.status === 'org_approved' && isPush && !t.hospitalAcknowledged;
                                    return (
                                        <div key={t._id} className={`bg-white rounded-lg shadow p-5 border-l-4 ${t.status === 'admin_approved' || t.status === 'hospital_approved' ? 'border-green-500' :
                                            isSentNotification ? 'border-orange-500' :
                                                awaitingYourConfirm ? 'border-blue-500' :
                                                    t.status === 'requested' ? 'border-yellow-500' : 'border-red-500'
                                            }`}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.status === 'admin_approved' || t.status === 'hospital_approved' ? 'bg-green-100 text-green-700' :
                                                            isSentNotification ? 'bg-orange-100 text-orange-700' :
                                                                awaitingYourConfirm ? 'bg-blue-100 text-blue-700' :
                                                                    t.status === 'requested' ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-red-100 text-red-700'
                                                            }`}>{isSentNotification || (isPush && t.status === 'org_approved') ? 'BLOOD SENT TO YOU' : t.status.replace(/_/g, ' ').toUpperCase()}</span>
                                                        <span className="text-xs text-gray-500 font-mono">{t.transferId}</span>
                                                        {isPush && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Direct Send</span>}
                                                    </div>
                                                    <p className="font-semibold text-gray-800 mb-1">Organisation: {t.organisation?.organisationName}</p>
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {t.items.map((item, idx) => (
                                                            <span key={idx} className="bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-1 rounded font-semibold">
                                                                {item.bloodGroup}: {item.quantity} units
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {t.notes && <p className="text-xs text-gray-500 mb-1">Notes: {t.notes}</p>}
                                                    {t.status === 'org_rejected' && <p className="text-xs text-red-600">Org reason: {t.orgRejectionReason}</p>}
                                                    {t.status === 'hospital_rejected' && <p className="text-xs text-red-600">You rejected: {t.hospitalRejectionReason}</p>}
                                                    {(t.status === 'admin_approved' || t.status === 'hospital_approved') && <p className="text-xs text-green-700 font-semibold">✅ Stock has been added to your inventory</p>}
                                                    {isSentNotification && (
                                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mt-1 text-xs text-orange-800">
                                                            <i className="fa fa-info-circle mr-1"></i>
                                                            This organisation sent this blood directly. Check the details above, then use <strong>"Add Manual Record"</strong> to add it to your own stock.
                                                        </div>
                                                    )}
                                                    {isPush && t.status === 'org_approved' && t.hospitalAcknowledged && (
                                                        <p className="text-xs text-gray-500 mt-1">✓ Dismissed from pending</p>
                                                    )}
                                                    <p className="text-xs text-gray-400 mt-1">{new Date(t.createdAt).toLocaleString()}</p>
                                                </div>
                    
                                                {awaitingYourConfirm && (
                                                    <div className="flex flex-col gap-2 flex-shrink-0">
                                                        <button onClick={() => handleApproveTransfer(t._id)}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold">
                                                            ✅ Confirm Receipt
                                                        </button>
                                                        <button onClick={() => { setRejectTransferId(t._id); setRejectReason(''); }}
                                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold">
                                                            ❌ Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {isSentNotification && (
                                                    <div className="flex flex-col gap-2 flex-shrink-0">
                                                        <button onClick={() => openManualAddModal(t)}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold whitespace-nowrap">
                                                            <i className="fa fa-plus mr-1"></i> Add Manual Record
                                                        </button>
                                                        <button onClick={() => handleAcknowledge(t._id)}
                                                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-semibold whitespace-nowrap">
                                                            Dismiss
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {transfers.filter(t => transfersSubTab === 'pending' ? isTransferPending(t) : !isTransferPending(t)).length === 0 && (
                                    <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                                        <i className="fa fa-exchange-alt text-5xl text-gray-200 mb-3 block"></i>
                                        <p>{transfersSubTab === 'pending' ? 'Nothing pending right now' : 'No history yet'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div>
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Notifications ({notifications.length})</h2>
                            <div className="space-y-3">
                                {notifications.map((notif) => (
                                    <div key={notif.id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${notif.type === 'success' ? 'border-green-500' : notif.type === 'warning' ? 'border-orange-500' : 'border-red-500'}`}>
                                        <div className="flex items-start gap-3">
                                            <i className={`fa fa-${notif.icon} text-2xl ${notif.type === 'success' ? 'text-green-600' : notif.type === 'warning' ? 'text-orange-600' : 'text-red-600'}`}></i>
                                            <div className="flex-1">
                                                <p className="text-gray-800 font-medium">{notif.message}</p>
                                                <p className="text-sm text-gray-500 mt-1">{notif.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {notifications.length === 0 && (
                                    <div className="bg-white rounded-lg shadow p-12 text-center">
                                        <i className="fa fa-bell-slash text-4xl text-gray-300 mb-3"></i>
                                        <p className="text-gray-500">No notifications at this time</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="bg-white rounded-xl shadow p-6">
                                <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                                    <i className="fa fa-user-gear text-red-600"></i> Profile
                                </h2>
                                <form onSubmit={handleProfileSave} className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">Hospital Name</label>
                                        <input
                                            type="text"
                                            name="hospitalName"
                                            value={profileForm.hospitalName}
                                            onChange={handleProfileChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">Phone Number</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={profileForm.phone}
                                            onChange={handleProfileChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-gray-700 font-semibold mb-2">State</label>
                                            <select
                                                name="state"
                                                value={profileForm.state}
                                                onChange={handleProfileChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
                                            >
                                                <option value="">Select State</option>
                                                {profileStates.map((s, i) => <option key={i} value={s.state}>{s.state}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-semibold mb-2">District</label>
                                            <select
                                                name="district"
                                                value={profileForm.district}
                                                onChange={handleProfileChange}
                                                disabled={!profileForm.state}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 focus:ring-2 focus:ring-red-500 outline-none"
                                            >
                                                <option value="">Select District</option>
                                                {profileDistricts.map((d, i) => <option key={i} value={d.DIST_name}>{d.DIST_name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-semibold mb-2">City</label>
                                            <select
                                                name="city"
                                                value={profileForm.city}
                                                onChange={handleProfileChange}
                                                disabled={!profileForm.district}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 focus:ring-2 focus:ring-red-500 outline-none"
                                            >
                                                <option value="">Select City</option>
                                                {profileCities.map((c, i) => <option key={i} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    {profileMessage && (
                                        <p className={`text-sm ${profileMessage.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{profileMessage}</p>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={profileSaving}
                                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
                                    >
                                        {profileSaving ? 'Saving...' : 'Update Profile'}
                                    </button>
                                </form>
                            </div>

                            <div className="bg-white rounded-xl shadow p-6">
                                <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                                    <i className="fa fa-lock text-red-600"></i> Reset Password
                                </h2>
                                <form onSubmit={handlePasswordSave} className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">Current Password</label>
                                        <input
                                            type="password"
                                            name="currentPassword"
                                            value={passwordForm.currentPassword}
                                            onChange={handlePasswordChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 font-semibold mb-2">New Password</label>
                                            <input
                                                type="password"
                                                name="newPassword"
                                                value={passwordForm.newPassword}
                                                onChange={handlePasswordChange}
                                                required
                                                minLength={8}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-semibold mb-2">Confirm New Password</label>
                                            <input
                                                type="password"
                                                name="confirmNewPassword"
                                                value={passwordForm.confirmNewPassword}
                                                onChange={handlePasswordChange}
                                                required
                                                minLength={8}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    {passwordMessage && (
                                        <p className={`text-sm ${passwordMessage.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{passwordMessage}</p>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={passwordSaving}
                                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
                                    >
                                        {passwordSaving ? 'Saving...' : 'Change Password'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                    {showRequestModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl max-w-md w-full">
                                <div className="`bg-red-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <i className="fa fa-hand-holding-medical"></i>
                                        Request Blood
                                    </h2>
                                    <button
                                        onClick={() => setShowRequestModal(false)}
                                        className="text-white hover:text-gray-200"
                                    >
                                        <i className="fa fa-times text-xl"></i>
                                    </button>
                                </div>

                                <form onSubmit={handleRequestBlood} className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">Organisation *</label>
                                        <select
                                            value={requestFormData.organisation}
                                            onChange={(e) => setRequestFormData({ ...requestFormData, organisation: e.target.value })}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                        >
                                            <option value="">-- Select Organisation --</option>
                                            {orgsForRequest.map(o => <option key={o._id} value={o._id}>{o.organisationName}</option>)}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">The organisation will check stock and approve or reject your request</p>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-gray-700 font-semibold">Blood Group(s) *</label>
                                            <button type="button"
                                                onClick={() => setRequestItems(prev => [...prev, { bloodGroup: '', quantity: '' }])}
                                                className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold">
                                                <i className="fa fa-plus mr-1"></i> Add Blood Group
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {requestItems.map((item, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <select value={item.bloodGroup}
                                                        onChange={e => { const n = [...requestItems]; n[idx].bloodGroup = e.target.value; setRequestItems(n); }}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-sm">
                                                        <option value="">Blood Group</option>
                                                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => <option key={bg}>{bg}</option>)}
                                                    </select>
                                                    <input type="number" value={item.quantity} min="1" placeholder="Units"
                                                        onChange={e => { const n = [...requestItems]; n[idx].quantity = e.target.value; setRequestItems(n); }}
                                                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-sm" />
                                                    {requestItems.length > 1 && (
                                                        <button type="button"
                                                            onClick={() => setRequestItems(prev => prev.filter((_, i) => i !== idx))}
                                                            className="text-red-500 hover:text-red-700 px-2">
                                                            <i className="fa fa-trash text-sm"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Expiry dates will be set by the organisation when they approve</p>
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">Notes (Optional)</label>
                                        <textarea
                                            value={requestFormData.notes}
                                            onChange={(e) => setRequestFormData({ ...requestFormData, notes: e.target.value })}
                                            placeholder="Reason for request, urgency, patient info..."
                                            rows="2"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                                        <i className="fa fa-info-circle mr-1"></i>
                                        Flow: Your request → Organisation approves (their stock decreases) → You confirm receipt (your stock increases)
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button type="submit"
                                            className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition">
                                            Send Request
                                        </button>
                                        <button type="button" onClick={() => setShowRequestModal(false)}
                                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {showDecreaseModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl max-w-md w-full">
                                <div className="bg-orange-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <i className="fa fa-minus-circle"></i>
                                        Record Blood Usage
                                    </h2>
                                    <button
                                        onClick={() => setShowDecreaseModal(false)}
                                        className="text-white hover:text-gray-200"
                                    >
                                        <i className="fa fa-times text-xl"></i>
                                    </button>
                                </div>

                                <form onSubmit={handleDecreaseInventory} className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">Blood Group *</label>
                                        <select
                                            value={decreaseFormData.bloodGroup}
                                            onChange={(e) => setDecreaseFormData({ ...decreaseFormData, bloodGroup: e.target.value })}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        >
                                            <option value="">Select Blood Group</option>
                                            {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                                                <option key={bg} value={bg}>{bg}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">Quantity (units) *</label>
                                        <input
                                            type="number"
                                            value={decreaseFormData.quantity}
                                            onChange={(e) => setDecreaseFormData({ ...decreaseFormData, quantity: e.target.value })}
                                            required
                                            min="1"
                                            placeholder="Enter units used"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">Notes (Optional)</label>
                                        <textarea
                                            value={decreaseFormData.notes}
                                            onChange={(e) => setDecreaseFormData({ ...decreaseFormData, notes: e.target.value })}
                                            placeholder="e.g., Emergency surgery, Regular patient treatment"
                                            rows="3"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="submit"
                                            className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
                                        >
                                            Record Usage
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowDecreaseModal(false)}
                                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}


                    {showManualAddModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                                <div className="bg-blue-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between sticky top-0">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <i className="fa fa-plus"></i>
                                        Add Manual Record
                                    </h2>
                                    <button
                                        onClick={() => { setShowManualAddModal(false); setManualAddSourceTransferId(null); }}
                                        className="text-white hover:text-gray-200"
                                    >
                                        <i className="fa fa-times text-xl"></i>
                                    </button>
                                </div>

                                <form onSubmit={handleManualAddRecord} className="p-6 space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                                        <i className="fa fa-info-circle mr-1"></i>
                                        {manualAddSourceTransferId
                                            ? 'Pre-filled from the blood sent to you — check the details below, then confirm.'
                                            : "Use this to credit blood you've received — e.g. a direct send from an organisation, or a walk-in donor at your hospital."}
                                        {' '}Your stock increases immediately.
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-gray-700 font-semibold">Blood Group(s) *</label>
                                            <button type="button" onClick={addManualAddItem}
                                                className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold">
                                                <i className="fa fa-plus mr-1"></i> Add Blood Group
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {manualAddItems.map((item, idx) => (
                                                <div key={idx} className="rounded-lg p-3 border border-gray-200 bg-gray-50">
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <select value={item.bloodGroup} onChange={e => updateManualAddItem(idx, 'bloodGroup', e.target.value)}
                                                            className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                                            <option value="">Blood Group</option>
                                                            {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                                                                <option key={bg} value={bg}>{bg}</option>
                                                            ))}
                                                        </select>
                                                        <input type="number" placeholder="Units" value={item.quantity} min="1"
                                                            onChange={e => updateManualAddItem(idx, 'quantity', e.target.value)}
                                                            className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                                        <input type="date" value={item.expiryDate}
                                                            min={new Date().toISOString().split('T')[0]}
                                                            onChange={e => updateManualAddItem(idx, 'expiryDate', e.target.value)}
                                                            className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                                    </div>
                                                    {manualAddItems.length > 1 && (
                                                        <button type="button" onClick={() => removeManualAddItem(idx)}
                                                            className="text-xs text-red-500 hover:text-red-700 mt-1">
                                                            <i className="fa fa-trash mr-1"></i>Remove
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">Notes (Optional)</label>
                                        <textarea
                                            value={manualAddNotes}
                                            onChange={(e) => setManualAddNotes(e.target.value)}
                                            placeholder="e.g., Received from CityCare Organisation, walk-in donor..."
                                            rows="3"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="submit"
                                            disabled={manualAddSaving}
                                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                                        >
                                            {manualAddSaving ? 'Saving...' : 'Add Record'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowManualAddModal(false)}
                                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <EditInventoryModal
                        show={showEditModal}
                        onClose={() => setShowEditModal(false)}
                        onSuccess={() => { fetchInventory(); fetchTransfers(); }}
                        inventoryRecord={selectedInventory}
                    />

                    {showWalkinModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl w-full max-w-md">
                                <div className="bg-purple-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                                    <h2 className="font-bold flex items-center gap-2"><i className="fa fa-user-plus"></i> Walk-in / Unregistered Donation</h2>
                                    <button onClick={() => setShowWalkinModal(false)}><i className="fa fa-times text-xl"></i></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
                                        <i className="fa fa-info-circle mr-1"></i> For donors who are <strong>not registered</strong> in the system. This will be added to your own stock right away.
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Donor Name *</label>
                                        <input value={walkinForm.donorName} onChange={e => setWalkinForm({ ...walkinForm, donorName: e.target.value })}
                                            placeholder="Full name of donor"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
                                        <input value={walkinForm.donorPhone}
                                            onChange={e => setWalkinForm({ ...walkinForm, donorPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                            placeholder="10-digit mobile number"
                                            inputMode="numeric"
                                            maxLength={10}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Camp / Source Name</label>
                                        <input value={walkinForm.campName} onChange={e => setWalkinForm({ ...walkinForm, campName: e.target.value })}
                                            placeholder="e.g. In-hospital blood drive, Walk-in..."
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Blood Group *</label>
                                            <select value={walkinForm.bloodGroup} onChange={e => setWalkinForm({ ...walkinForm, bloodGroup: e.target.value })}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                                <option value="">Select</option>
                                                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => <option key={g}>{g}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Units *</label>
                                            <input type="number" value={walkinForm.quantity} onChange={e => setWalkinForm({ ...walkinForm, quantity: e.target.value })}
                                                placeholder="e.g. 1" min="1"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry Date *</label>
                                        <input type="date" value={walkinForm.expiryDate} onChange={e => setWalkinForm({ ...walkinForm, expiryDate: e.target.value })}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button disabled={walkinSaving} onClick={async () => {
                                            if (!walkinForm.donorName || !walkinForm.bloodGroup || !walkinForm.quantity || !walkinForm.expiryDate) {
                                                alert('Please fill all required fields'); return;
                                            }
                                            if (walkinForm.donorPhone && walkinForm.donorPhone.length !== 10) {
                                                alert('Mobile number must be exactly 10 digits'); return;
                                            }
                                            setWalkinSaving(true);
                                            try {
                                                const noteParts = [];
                                                if (walkinForm.campName) noteParts.push(walkinForm.campName);
                                                if (walkinForm.donorPhone) noteParts.push(`Phone: ${walkinForm.donorPhone}`);
                                                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/inventory/create-inventory`, {
                                                    method: 'POST', credentials: 'include',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        inventoryType: 'in',
                                                        bloodGroup: walkinForm.bloodGroup,
                                                        quantity: parseInt(walkinForm.quantity),
                                                        expiryDate: walkinForm.expiryDate,
                                                        hospital: user?.email,
                                                        source_name: walkinForm.donorName,
                                                        notes: noteParts.length ? noteParts.join(' — ') : 'Walk-in donation',
                                                        isManualEntry: false,
                                                        verified: false,
                                                        walkinDonor: true
                                                    })
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                    alert('✅ Walk-in donation recorded! Added to your blood stock.');
                                                    setShowWalkinModal(false);
                                                    setWalkinForm({ donorName: '', donorPhone: '', campName: '', bloodGroup: '', quantity: '', expiryDate: '' });
                                                    fetchInventory();
                                                } else alert(data.message || 'Failed');
                                            } catch (_) { alert('Error occurred'); }
                                            setWalkinSaving(false);
                                        }} className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 text-sm">
                                            {walkinSaving ? 'Saving...' : 'Record Walk-in Donation'}
                                        </button>
                                        <button onClick={() => setShowWalkinModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 text-sm">Cancel</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
                </main>
            </div>

            {rejectTransferId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg text-gray-800 mb-3">Reject Transfer</h3>
                        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            rows={3} placeholder="Reason for rejection (required)"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 resize-none mb-3" />
                        <div className="flex gap-3">
                            <button onClick={handleRejectTransfer} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 text-sm">Reject</button>
                            <button onClick={() => setRejectTransferId(null)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 text-sm">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HospitalDashboard;