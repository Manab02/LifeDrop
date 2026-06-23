import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, inventoryAPI } from '../services/api';
import RecordDonationModal from '../components/RecordDonationModal';
import ManualAddInventoryModal from '../components/ManualAddInventoryModal';
import EditInventoryModal from '../components/EditInventoryModal';

const OrganisationDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [stats, setStats] = useState({
        totalCamps: 0,
        totalDonors: 0,
        bloodUnits: 0,
        partnerHospitals: 0
    });
    const [loading, setLoading] = useState(true);
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [showManualAddModal, setShowManualAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [expiryWarnings, setExpiryWarnings] = useState([]);
    const [bloodStock, setBloodStock] = useState({});

    useEffect(() => {
        checkAuth();
        fetchInventory();
    }, []);

    const checkAuth = async () => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');

        if (!userData.id || userData.role !== 'organisation') {
            alert('Access denied. Organisations only.');
            navigate('/login');
            return;
        }

        setUser(userData);
        setLoading(false);
    };

    const fetchInventory = async () => {
        try {
            const data = await inventoryAPI.getInventory();
            if (data.success && data.inventory) {
                setInventory(data.inventory);
                calculateStats(data.inventory);
                calculateBloodStock(data.inventory);
            }

            try {
                const expiryResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/inventory/expiry-notifications`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                const expiryData = await expiryResponse.json();
                if (expiryData.success) {
                    setExpiryWarnings(expiryData.warnings || []);
                }
            } catch (expiryError) {
                console.error('Failed to fetch expiry warnings:', expiryError);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    const calculateBloodStock = (inventoryData) => {
        const stock = {};
        const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

        bloodGroups.forEach(group => {
            stock[group] = 0;
        });

        inventoryData.forEach(item => {
            if (item.status !== 'expired' && new Date(item.expiryDate) > new Date()) {
                if (item.inventoryType === 'in') {
                    stock[item.bloodGroup] = (stock[item.bloodGroup] || 0) + item.quantity;
                } else if (item.inventoryType === 'out') {
                    stock[item.bloodGroup] = (stock[item.bloodGroup] || 0) - item.quantity;
                }
            }
        });

        setBloodStock(stock);
    };

    const calculateStats = (inventoryData) => {
        const donors = new Set();
        const hospitals = new Set();
        let totalUnits = 0;

        inventoryData.forEach(item => {
            if (item.donor) donors.add(item.donor._id);
            if (item.hospital) hospitals.add(item.hospital._id);
            if (item.inventoryType === 'in') totalUnits += item.quantity;
        });

        setStats({
            totalCamps: inventory.length > 0 ? Math.floor(inventory.length / 3) : 0,
            totalDonors: donors.size,
            bloodUnits: totalUnits,
            partnerHospitals: hospitals.size
        });
    };

    const handleEdit = (inventoryItem) => {
        setSelectedInventory(inventoryItem);
        setShowEditModal(true);
    };

    const handleLogout = async () => {
        await authAPI.logout();
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-red-700 text-white flex flex-col">
                <div className="p-5 text-center border-b border-red-500">
                    <h2 className="text-2xl font-bold">🏢 Organization</h2>
                    <p className="text-sm opacity-80">Blood Donation Portal</p>
                </div>

                <nav className="flex-1 p-4 space-y-3">
                    <a href="#dashboard" className="flex items-center p-2 hover:bg-red-600 rounded-lg">
                        <i className="fa fa-gauge w-6"></i> Dashboard
                    </a>
                    <a href="#camps" className="flex items-center p-2 hover:bg-red-600 rounded-lg">
                        <i className="fa fa-calendar-plus w-6"></i> Upcoming Camps
                    </a>
                    <a href="#donors" className="flex items-center p-2 hover:bg-red-600 rounded-lg">
                        <i className="fa fa-users w-6"></i> Donor List
                    </a>
                    <a href="#donations" className="flex items-center p-2 hover:bg-red-600 rounded-lg">
                        <i className="fa fa-hand-holding-heart w-6"></i> Donation Records
                    </a>
                    <a href="#hospitals" className="flex items-center p-2 hover:bg-red-600 rounded-lg">
                        <i className="fa fa-hospital w-6"></i> Hospital Records
                    </a>
                    <a href="#notifications" className="flex items-center p-2 hover:bg-red-600 rounded-lg">
                        <i className="fa fa-bell w-6"></i> Notifications
                    </a>
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
                <h1 className="text-2xl font-semibold mb-6 text-gray-800">
                    Welcome, <span className="text-red-600">{user?.name}</span>
                </h1>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-gray-600 text-sm">Total Camps Organized</h2>
                        <p className="text-2xl font-bold text-red-600">{stats.totalCamps}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-gray-600 text-sm">Total Donors Registered</h2>
                        <p className="text-2xl font-bold text-green-600">{stats.totalDonors}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-gray-600 text-sm">Blood Units Collected</h2>
                        <p className="text-2xl font-bold text-yellow-600">{stats.bloodUnits}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-gray-600 text-sm">Partner Hospitals</h2>
                        <p className="text-2xl font-bold text-blue-600">{stats.partnerHospitals}</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-3 text-gray-700">Quick Actions</h2>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => setShowRecordModal(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 flex items-center gap-2"
                        >
                            <i className="fa fa-heart"></i>
                            Record Donation
                        </button>
                        <button
                            onClick={() => setShowManualAddModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center gap-2"
                        >
                            <i className="fa fa-plus"></i>
                            Add Manual Record
                        </button>
                        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500">
                            <i className="fa fa-calendar-plus mr-2"></i>
                            Organize Camp
                        </button>
                    </div>
                </div>

                {/* Current Blood Stock */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                        <i className="fa fa-vials text-red-600"></i>
                        Current Blood Stock
                    </h2>
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                            {Object.entries(bloodStock).map(([group, quantity]) => (
                                <div key={group} className="text-center bg-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:shadow-md transition">
                                    <div className="text-xl font-bold text-red-600 mb-2">{group}</div>
                                    <div className="text-3xl font-bold text-gray-800">{quantity}</div>
                                    <div className="text-xs text-gray-600 mt-1">units</div>
                                    <div className="mt-2">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${quantity > 50 ? 'bg-green-100 text-green-700' :
                                            quantity > 20 ? 'bg-yellow-100 text-yellow-700' :
                                                quantity > 0 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {quantity > 50 ? 'Good' : quantity > 20 ? 'Low' : quantity > 0 ? 'Critical' : 'Out'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 text-center border-t pt-4">
                            <span className="text-lg font-semibold text-gray-700">
                                Total Blood Units: <span className="text-red-600 text-2xl">{Object.values(bloodStock).reduce((sum, val) => sum + val, 0)}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Expiry Warnings */}
                {expiryWarnings.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                            <i className="fa fa-exclamation-triangle text-orange-600"></i>
                            Expiry Warnings ({expiryWarnings.length} Blood Groups)
                        </h2>
                        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {expiryWarnings.map((warning, idx) => (
                                    <div key={idx} className="bg-white rounded-lg p-4 border-l-4 border-orange-500 shadow">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <span className="font-bold text-orange-700 text-2xl">{warning.bloodGroup}</span>
                                                <span className="ml-3 text-gray-700 font-semibold">{warning.totalUnits} units expiring soon</span>
                                            </div>
                                            <i className="fa fa-clock text-orange-500 text-2xl"></i>
                                        </div>
                                        <div className="space-y-2">
                                            {warning.items.slice(0, 3).map((item, i) => (
                                                <div key={i} className="text-sm text-gray-600 bg-gray-50 p-2 rounded flex items-center justify-between">
                                                    <span>
                                                        <i className="fa fa-droplet text-red-500 mr-2"></i>
                                                        {item.quantity} units
                                                    </span>
                                                    <span className="font-semibold text-orange-600">
                                                        {item.daysRemaining} days left
                                                    </span>
                                                </div>
                                            ))}
                                            {warning.items.length > 3 && (
                                                <p className="text-xs text-gray-500 text-center mt-2">
                                                    +{warning.items.length - 3} more batches expiring
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Low Stock Alerts */}
                {Object.entries(bloodStock).filter(([group, qty]) => qty > 0 && qty < 20).length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                            <i className="fa fa-exclamation-circle text-red-600"></i>
                            Low Stock Alerts
                        </h2>
                        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(bloodStock)
                                    .filter(([group, qty]) => qty > 0 && qty < 20)
                                    .map(([group, qty]) => (
                                        <div key={group} className="bg-white rounded-lg px-4 py-2 border-l-4 border-red-500 shadow">
                                            <span className="font-bold text-red-600 text-lg">{group}</span>
                                            <span className="ml-2 text-gray-700">Only {qty} units left</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Upcoming Blood Camps */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-3 text-gray-700">Upcoming Blood Donation Camps</h2>
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                        <i className="fa fa-calendar-plus text-4xl text-gray-300 mb-3"></i>
                        <p className="text-lg font-semibold">No upcoming camps scheduled</p>
                        <p className="text-sm mt-1">Click "Organize Camp" to schedule a new blood donation camp.</p>
                    </div>
                </div>

                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-3 text-gray-700">Recent Donation Records</h2>
                    <div className="overflow-x-auto bg-white rounded-lg shadow">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Donor/Hospital</th>
                                    <th className="p-3">Blood Group</th>
                                    <th className="p-3">Units</th>
                                    <th className="p-3">Expiry Date</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventory.slice(0, 10).map((item) => {
                                    const isExpired = item.status === 'expired' || new Date(item.expiryDate) < new Date();
                                    const isExpiringSoon = !isExpired && new Date(item.expiryDate) < new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

                                    return (
                                        <tr key={item._id} className={`border-b ${isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-orange-50' : ''}`}>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${item.inventoryType === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {item.inventoryType === 'in' ? '📥 IN' : '📤 OUT'}
                                                    </span>
                                                    {!item.verified && (
                                                        <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700" title="Manual/Unverified Entry">
                                                            ⚠️ Manual
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">{item.donor?.name || item.hospital?.hospitalName || item.source_name || item.target_name || 'N/A'}</td>
                                            <td className="p-3 text-red-600 font-semibold">{item.bloodGroup}</td>
                                            <td className="p-3">{item.quantity}</td>
                                            <td className="p-3">
                                                <div className="flex flex-col">
                                                    <span className={isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-orange-600 font-semibold' : ''}>
                                                        {new Date(item.expiryDate).toLocaleDateString()}
                                                    </span>
                                                    {isExpired && (
                                                        <span className="text-xs text-red-600 font-semibold">EXPIRED</span>
                                                    )}
                                                    {isExpiringSoon && !isExpired && (
                                                        <span className="text-xs text-orange-600 font-semibold">
                                                            {Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} days left
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'expired' ? 'bg-red-100 text-red-700' :
                                                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        item.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                            item.status === 'rejected' ? 'bg-gray-100 text-gray-700' :
                                                                'bg-green-100 text-green-700'
                                                    }`}>
                                                    {item.status || 'Completed'}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Edit"
                                                    disabled={isExpired}
                                                >
                                                    <i className="fa fa-edit"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {inventory.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="p-3 text-center text-gray-500">
                                            No donation records yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-3 text-gray-700">Notifications</h2>
                    <div className="bg-white p-4 rounded-lg shadow space-y-3">
                        <div className="flex justify-between border-b pb-2">
                            <p><i className="fa fa-bell text-red-600 mr-2"></i> Collaboration request from City Hospital</p>
                            <span className="text-sm text-gray-500">10 mins ago</span>
                        </div>
                        <div className="flex justify-between">
                            <p><i className="fa fa-bell text-red-600 mr-2"></i> New donor registration completed.</p>
                            <span className="text-sm text-gray-500">1 hour ago</span>
                        </div>
                    </div>
                </div>

                <RecordDonationModal
                    show={showRecordModal}
                    onClose={() => setShowRecordModal(false)}
                    onSuccess={fetchInventory}
                    organisationEmail={user?.email}
                />

                <ManualAddInventoryModal
                    show={showManualAddModal}
                    onClose={() => setShowManualAddModal(false)}
                    onSuccess={fetchInventory}
                    userRole="organisation"
                    userEmail={user?.email}
                />
                <EditInventoryModal
                    show={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={fetchInventory}
                    inventoryRecord={selectedInventory}
                />
            </main>

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        </div>
    );
};

export default OrganisationDashboard;