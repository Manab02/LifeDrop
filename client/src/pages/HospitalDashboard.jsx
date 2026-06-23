import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, inventoryAPI } from '../services/api';
import ManualAddInventoryModal from '../components/ManualAddInventoryModal';
import EditInventoryModal from '../components/EditInventoryModal';

const HospitalDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
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
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [showDecreaseModal, setShowDecreaseModal] = useState(false);
    const [decreaseFormData, setDecreaseFormData] = useState({
        bloodGroup: '',
        quantity: '',
        notes: ''
    });

    const [requestFormData, setRequestFormData] = useState({
        bloodGroup: '',
        quantity: '',
        expiryDate: '',
        organisation: '',
        notes: ''
    });

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (user) {
            fetchInventory();
            const interval = setInterval(() => {
                fetchInventory();
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

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
                    isExpiringSoon: isExpiringSoon,
                    createdAt: item.createdAt,
                    status: item.status
                });
            }
        });

        Object.keys(stock).forEach(group => {
            if (stock[group].total < 0) {
                stock[group].total = 0;
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

        const expiringCount = inventoryData.filter(item => {
            const now = new Date();
            const expiry = new Date(item.expiryDate);
            const fiveDays = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));
            return expiry > now && expiry <= fiveDays && item.inventoryType === 'in' && item.status !== 'expired';
        }).length;

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

        // Check expiring blood
        inventoryData.forEach(item => {
            const expiry = new Date(item.expiryDate);
            const daysDiff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

            if (daysDiff > 0 && daysDiff <= 5 && item.inventoryType === 'in' && item.status !== 'expired') {
                notifs.push({
                    id: `expiry-${item._id}`,
                    type: 'warning',
                    icon: 'exclamation-triangle',
                    message: `Blood expiring in ${daysDiff} days: ${item.bloodGroup} - ${item.quantity} units`,
                    time: `Expires ${expiry.toLocaleDateString()}`
                });
            }
        });

        // Check low stock
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

        if (!requestFormData.bloodGroup || !requestFormData.quantity || !requestFormData.expiryDate) {
            alert('Please fill all required fields');
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/inventory/create-inventory`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inventoryType: 'out',
                    bloodGroup: requestFormData.bloodGroup,
                    quantity: parseInt(requestFormData.quantity),
                    expiryDate: requestFormData.expiryDate,
                    organisation: requestFormData.organisation || undefined,
                    email: user?.email,
                    notes: requestFormData.notes
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Blood request submitted successfully!');
                setShowRequestModal(false);
                setRequestFormData({
                    bloodGroup: '',
                    quantity: '',
                    expiryDate: '',
                    organisation: '',
                    notes: ''
                });
                fetchInventory();
            } else {
                alert(data.message || 'Failed to submit request');
            }
        } catch (error) {
            console.error('Request error:', error);
            alert('An error occurred');
        }
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
        navigate('/login');
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
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-red-700 text-white flex flex-col flex-shrink-0">
                <div className="p-5 text-center border-b border-red-500">
                    <h2 className="text-2xl font-bold">🏥 Hospital Panel</h2>
                    <p className="text-sm opacity-80">{user?.hospitalName}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-gauge w-6"></i> Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'requests' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-hand-holding-medical w-6"></i>
                        Blood Requests ({allRequests.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('stock')}
                        className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'stock' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-vial w-6"></i> Blood Stock
                    </button>
                    <button
                        onClick={() => setActiveTab('records')}
                        className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'records' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-list w-6"></i> All Records ({inventory.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'notifications' ? 'bg-red-600' : 'hover:bg-red-600'}`}
                    >
                        <i className="fa fa-bell w-6"></i>
                        Notifications ({notifications.length})
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

            {/* Main Content */}
            <main className="flex-1 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-semibold text-gray-800">
                        Welcome, <span className="text-red-600">{user?.name}</span>
                    </h1>
                    <button
                        onClick={fetchInventory}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        title="Refresh data"
                    >
                        <i className="fa fa-refresh"></i>
                        Refresh
                    </button>
                </div>

                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                    <>
                        {/* Stats Cards */}
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

                        {/* Quick Actions */}
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
                                    onClick={() => setShowManualAddModal(true)}
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
                            </div>
                        </div>

                        {/* Alert Cards */}
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

                        {/* Recent Records Preview */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-semibold text-gray-700">Recent Records</h2>
                                <button
                                    onClick={() => setActiveTab('records')}
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

                        {/* Recent Notifications Preview */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-semibold text-gray-700">Recent Notifications</h2>
                                <button
                                    onClick={() => setActiveTab('notifications')}
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

                {/* BLOOD REQUESTS TAB */}
                {activeTab === 'requests' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Blood Requests</h2>
                            <button
                                onClick={() => setShowRequestModal(true)}
                                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-md hover:shadow-lg transition"
                            >
                                <i className="fa fa-hand-holding-medical"></i>
                                Request Blood
                            </button>
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
                                    {allRequests.map((request) => {
                                        const expiryDate = new Date(request.expiryDate);
                                        const now = new Date();
                                        const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                                        const isExpired = expiryDate < now;
                                        const isExpiringSoon = !isExpired && daysToExpiry <= 5;

                                        return (
                                            <tr key={request._id} className="border-b hover:bg-gray-50">
                                                <td className="p-3 text-xs font-mono text-blue-600">
                                                    {request.transactionId?.slice(-8)}
                                                </td>
                                                <td className="p-3">
                                                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-bold">
                                                        {request.bloodGroup}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-semibold">{request.quantity} units</td>
                                                <td className="p-3 text-sm">
                                                    {request.organisation?.organisationName || request.organisationNameText || 'N/A'}
                                                </td>
                                                <td className="p-3">
                                                    <div className="text-sm">
                                                        <span className={isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-orange-600 font-semibold' : 'text-gray-700'}>
                                                            {expiryDate.toLocaleDateString()}
                                                        </span>
                                                        {isExpired && (
                                                            <div className="text-xs text-red-600 font-semibold">EXPIRED</div>
                                                        )}
                                                        {isExpiringSoon && !isExpired && (
                                                            <div className="text-xs text-orange-600 font-semibold">{daysToExpiry} days left</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-sm">{new Date(request.createdAt).toLocaleDateString()}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${request.status === 'completed' || request.status === 'approved' ? 'bg-green-100 text-green-700' : request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : request.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {request.status?.toUpperCase() || 'PENDING'}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <button
                                                        onClick={() => handleEdit(request)}
                                                        className="text-blue-600 hover:text-blue-800 mr-2"
                                                        title="Edit"
                                                    >
                                                        <i className="fa fa-edit"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {allRequests.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="p-8 text-center text-gray-500">
                                                <i className="fa fa-inbox text-4xl mb-3 text-gray-300"></i>
                                                <p>No blood requests yet</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* BLOOD STOCK TAB */}
                {activeTab === 'stock' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Blood Stock (Real-time)</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <i className="fa fa-sync-alt animate-spin"></i>
                                <span>Auto-refresh every 30 seconds</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {Object.entries(bloodStock).map(([group, data]) => {
                                const status = getStockStatus(data.total);

                                return (
                                    <div key={group} className={`bg-white rounded-xl shadow-lg p-6 ${data.total === 0 ? 'border-2 border-red-500' : data.total < 10 ? 'border-2 border-orange-500' : ''}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-16 h-16 ${data.total === 0 ? 'bg-red-200' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                                                    <span className="text-2xl font-bold text-red-600">{group}</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-bold text-gray-800">{data.total} units</h3>
                                                    <span className={`text-sm font-semibold ${status.color}`}>{status.text}</span>
                                                    {data.total === 0 && (
                                                        <div className="text-xs text-red-600 font-bold mt-1">⚠️ URGENT: Restock needed!</div>
                                                    )}
                                                </div>
                                            </div>
                                            {data.expiring > 0 && (
                                                <div className="bg-orange-100 px-4 py-2 rounded-lg">
                                                    <p className="text-sm font-semibold text-orange-700">
                                                        ⚠️ {data.expiring} units expiring soon
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {data.items.length > 0 && (
                                            <div className="border-t pt-4">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Inventory Details:</h4>
                                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                                    {data.items.map((item) => (
                                                        <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${item.isExpiringSoon ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                                                            <div className="flex items-center gap-3">
                                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${item.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {item.type === 'in' ? 'IN' : 'OUT'}
                                                                </span>
                                                                <span className="font-semibold">{item.quantity} units</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`text-sm font-semibold ${item.isExpiringSoon ? 'text-orange-600' : 'text-gray-600'}`}>
                                                                    Expires: {new Date(item.expiryDate).toLocaleDateString()}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    Added: {new Date(item.createdAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ALL RECORDS TAB */}
                {activeTab === 'records' && (
                    <div>
                        <h2 className="text-xl font-bold mb-4 text-gray-800">All Inventory Records</h2>
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left text-sm">Type</th>
                                        <th className="p-3 text-left text-sm">Blood Group</th>
                                        <th className="p-3 text-left text-sm">Quantity</th>
                                        <th className="p-3 text-left text-sm">Source/Target</th>
                                        <th className="p-3 text-left text-sm">Expiry Date</th>
                                        <th className="p-3 text-left text-sm">Date</th>
                                        <th className="p-3 text-left text-sm">Status</th>
                                        <th className="p-3 text-left text-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventory.map((item) => {
                                        const isExpired = item.status === 'expired' || new Date(item.expiryDate) < new Date();
                                        const isExpiringSoon = !isExpired && new Date(item.expiryDate) < new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

                                        return (
                                            <tr key={item._id} className={`border-b hover:bg-gray-50 ${isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-orange-50' : ''}`}>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${item.inventoryType === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {item.inventoryType?.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-red-600 font-bold">{item.bloodGroup}</td>
                                                <td className="p-3 font-semibold">{item.quantity}</td>
                                                <td className="p-3 text-sm">
                                                    {item.donor?.name || item.organisation?.organisationName || item.source_name || item.target_name || 'N/A'}
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
                                    {inventory.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="p-8 text-center text-gray-500">
                                                No inventory records found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* NOTIFICATIONS TAB */}
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
            </main>

            {/* Request Blood Modal */}
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
                                <label className="block text-gray-700 font-semibold mb-2">Blood Group *</label>
                                <select
                                    value={requestFormData.bloodGroup}
                                    onChange={(e) => setRequestFormData({ ...requestFormData, bloodGroup: e.target.value })}
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
                                <label className="block text-gray-700 font-semibold mb-2">Quantity (units) *</label>
                                <input
                                    type="number"
                                    value={requestFormData.quantity}
                                    onChange={(e) => setRequestFormData({ ...requestFormData, quantity: e.target.value })}
                                    required
                                    min="1"
                                    placeholder="Enter quantity"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Expiry Date *</label>
                                <input
                                    type="date"
                                    value={requestFormData.expiryDate}
                                    onChange={(e) => setRequestFormData({ ...requestFormData, expiryDate: e.target.value })}
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Organisation (Optional)</label>
                                <input
                                    type="text"
                                    value={requestFormData.organisation}
                                    onChange={(e) => setRequestFormData({ ...requestFormData, organisation: e.target.value })}
                                    placeholder="Organisation name"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Notes (Optional)</label>
                                <textarea
                                    value={requestFormData.notes}
                                    onChange={(e) => setRequestFormData({ ...requestFormData, notes: e.target.value })}
                                    placeholder="Additional information"
                                    rows="3"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                                >
                                    Submit Request
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowRequestModal(false)}
                                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Decrease Modal */}
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

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        </div>
    );
};

export default HospitalDashboard;