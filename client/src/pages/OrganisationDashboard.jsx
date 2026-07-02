import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, inventoryAPI, organisationAPI, transferAPI } from '../services/api';
import ManualAddInventoryModal from '../components/ManualAddInventoryModal';
import EditInventoryModal from '../components/EditInventoryModal';
import RecordDonationModal from '../components/RecordDonationModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export default function OrganisationDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Data
    const [inventory, setInventory] = useState([]);
    const [bloodStock, setBloodStock] = useState({});
    const [donors, setDonors] = useState([]);
    const [camps, setCamps] = useState([]);
    const [campNotifications, setCampNotifications] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [expiryWarnings, setExpiryWarnings] = useState([]);
    const [stats, setStats] = useState({ totalCamps: 0, totalDonors: 0, bloodUnits: 0, partnerHospitals: 0 });

    // Modals
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [showManualAddModal, setShowManualAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCampModal, setShowCampModal] = useState(false);
    const [editingCamp, setEditingCamp] = useState(null);
    const [selectedInventory, setSelectedInventory] = useState(null);

    // Search
    const [searchDonors, setSearchDonors] = useState('');
    const [searchRecords, setSearchRecords] = useState('');
    const [searchHospital, setSearchHospital] = useState('');

    // Transfer
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showWalkinModal, setShowWalkinModal] = useState(false);
    const [walkinForm, setWalkinForm] = useState({ donorName: '', campName: '', bloodGroup: '', quantity: '', expiryDate: '' });
    const [walkinSaving, setWalkinSaving] = useState(false);
    const [transfers, setTransfers] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [transferForm, setTransferForm] = useState({ hospitalId: '', notes: '', items: [{ bloodGroup: '', quantity: '', expiryDate: '' }] });
    const [transferSaving, setTransferSaving] = useState(false);
    const [viewTransfer, setViewTransfer] = useState(null);

    // Camp form
    const [campForm, setCampForm] = useState({ title: '', location: '', date: '', description: '' });
    const [campSaving, setCampSaving] = useState(false);

    // ── Auth ──────────────────────────────────────────────────────
    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (!userData.id || userData.role !== 'organisation') {
            alert('Access denied. Organisations only.');
            navigate('/login');
            return;
        }
        setUser(userData);
        setLoading(false);
    }, []);

    // ── Fetch everything ──────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        await Promise.all([fetchInventory(), fetchCamps(), fetchDonors(), fetchTransfers(), fetchHospitals()]);
    }, []);

    useEffect(() => {
        if (!loading && user) fetchAll();
    }, [loading, user]);

    const fetchInventory = async () => {
        try {
            const data = await inventoryAPI.getInventory();
            if (data.success && data.inventory) {
                setInventory(data.inventory);
                calcBloodStock(data.inventory);
                calcStats(data.inventory);
                buildNotifications(data.inventory);
            }
            // expiry warnings
            try {
                const er = await fetch(`${API_URL}/api/inventory/expiry-notifications`, {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                const ed = await er.json();
                if (ed.success) setExpiryWarnings(ed.warnings || []);
            } catch (_) { }
        } catch (e) { console.error(e); }
    };

    const fetchCamps = async () => {
        const data = await organisationAPI.getCamps();
        if (data.success) setCamps(data.camps || []);
        const nd = await organisationAPI.getCampNotifications();
        if (nd.success) setCampNotifications(nd.notifications || []);
    };

    const fetchDonors = async () => {
        const data = await organisationAPI.getDonors();
        if (data.success) setDonors(data.donors || []);
    };

    const fetchTransfers = async () => {
        const data = await transferAPI.getOrgTransfers();
        if (data.success) setTransfers(data.transfers || []);
    };

    const [orgActionTransfer, setOrgActionTransfer] = useState(null); // transfer being approved/rejected
    const [orgStockCheck, setOrgStockCheck] = useState(null);         // stock check result
    const [orgExpiryItems, setOrgExpiryItems] = useState([]);          // expiry dates set by org
    const [orgRejectId, setOrgRejectId] = useState(null);
    const [orgRejectReason, setOrgRejectReason] = useState('');

    const handleOrgViewRequest = async (transfer) => {
        setOrgActionTransfer(transfer);
        setOrgExpiryItems(transfer.items.map(i => ({ ...i, expiryDate: '' })));
        const data = await transferAPI.checkStock(transfer._id);
        if (data.success) setOrgStockCheck(data);
        else setOrgStockCheck(null);
    };

    const handleOrgApprove = async () => {
        const missingExpiry = orgExpiryItems.some(i => !i.expiryDate);
        if (missingExpiry) { alert('Please set expiry date for all blood groups'); return; }
        const data = await transferAPI.orgApprove(orgActionTransfer._id, orgExpiryItems);
        if (data.success) {
            alert('✅ Transfer approved! Hospital will confirm receipt.');
            setOrgActionTransfer(null); setOrgStockCheck(null);
            fetchTransfers(); fetchAll();
        } else alert(data.message || 'Failed');
    };

    const handleOrgReject = async () => {
        if (!orgRejectReason.trim()) { alert('Enter rejection reason'); return; }
        const data = await transferAPI.orgReject(orgRejectId, orgRejectReason);
        if (data.success) {
            alert('Request rejected. Hospital has been notified.');
            setOrgRejectId(null); setOrgRejectReason('');
            fetchTransfers();
        } else alert(data.message || 'Failed');
    };

    const fetchHospitals = async () => {
        try {
            const res = await fetch(`${API_URL}/api/public/get-hospitals`);
            const data = await res.json();
            if (data.success) setHospitals(data.data || []);
        } catch (_) { }
    };

    // ── Calculations ──────────────────────────────────────────────
    const calcBloodStock = (inv) => {
        const stock = Object.fromEntries(BLOOD_GROUPS.map(g => [g, 0]));
        inv.forEach(item => {
            if (item.status !== 'expired' && new Date(item.expiryDate) > new Date()) {
                if (item.inventoryType === 'in') stock[item.bloodGroup] = (stock[item.bloodGroup] || 0) + item.quantity;
                else if (item.inventoryType === 'out') stock[item.bloodGroup] = (stock[item.bloodGroup] || 0) - item.quantity;
            }
        });
        // clamp negatives
        Object.keys(stock).forEach(g => { if (stock[g] < 0) stock[g] = 0; });
        setBloodStock(stock);
    };

    const calcStats = (inv) => {
        const donors = new Set();
        const hospitals = new Set();
        inv.forEach(item => {
            if (item.donor) donors.add(item.donor._id);
            if (item.hospital) hospitals.add(item.hospital._id);
        });
        // net available = sum of all (in - out) per group, clamped to 0
        const net = Object.fromEntries(BLOOD_GROUPS.map(g => [g, 0]));
        inv.forEach(item => {
            if (item.status !== 'expired' && new Date(item.expiryDate) > new Date()) {
                if (item.inventoryType === 'in') net[item.bloodGroup] = (net[item.bloodGroup] || 0) + item.quantity;
                else if (item.inventoryType === 'out') net[item.bloodGroup] = (net[item.bloodGroup] || 0) - item.quantity;
            }
        });
        const netTotal = Object.values(net).reduce((s, v) => s + Math.max(0, v), 0);
        setStats({
            totalCamps: camps.length,
            totalDonors: donors.size,
            bloodUnits: netTotal,
            partnerHospitals: hospitals.size
        });
    };

    const buildNotifications = (inv) => {
        const notifs = [];
        const now = new Date();
        // low/empty stock
        const stock = {};
        BLOOD_GROUPS.forEach(g => stock[g] = 0);
        inv.forEach(item => {
            if (item.status !== 'expired' && new Date(item.expiryDate) > now) {
                const delta = item.inventoryType === 'in' ? item.quantity : -item.quantity;
                stock[item.bloodGroup] = (stock[item.bloodGroup] || 0) + delta;
            }
        });
        BLOOD_GROUPS.forEach(g => {
            const qty = Math.max(0, stock[g] || 0);
            if (qty === 0) {
                notifs.push({ id: `empty-${g}`, type: 'error', icon: 'exclamation-circle', message: `${g} blood is OUT OF STOCK — urgent restocking needed`, time: 'Now' });
            } else if (qty < 10) {
                notifs.push({ id: `crit-${g}`, type: 'error', icon: 'exclamation-triangle', message: `${g} critically low: only ${qty} units remaining`, time: 'Now' });
            } else if (qty < 20) {
                notifs.push({ id: `low-${g}`, type: 'warning', icon: 'info-circle', message: `${g} is low: ${qty} units remaining`, time: 'Now' });
            }
        });
        // expiring soon
        inv.forEach(item => {
            const expiry = new Date(item.expiryDate);
            const days = Math.ceil((expiry - now) / 86400000);
            if (days > 0 && days <= 5 && item.inventoryType === 'in' && item.status !== 'expired') {
                notifs.push({ id: `exp-${item._id}`, type: 'warning', icon: 'clock', message: `${item.bloodGroup} — ${item.quantity} units expire in ${days} day(s)`, time: expiry.toLocaleDateString() });
            }
        });
        setNotifications(notifs.slice(0, 20));
    };

    // ── Camp CRUD ─────────────────────────────────────────────────
    const openCampModal = (camp = null) => {
        setEditingCamp(camp);
        setCampForm(camp ? { title: camp.title, location: camp.location, date: camp.date.slice(0, 10), description: camp.description || '' } : { title: '', location: '', date: '', description: '' });
        setShowCampModal(true);
    };

    const saveCamp = async () => {
        if (!campForm.title || !campForm.location || !campForm.date) {
            alert('Title, location and date are required.'); return;
        }
        setCampSaving(true);
        const fn = editingCamp
            ? organisationAPI.updateCamp(editingCamp._id, campForm)
            : organisationAPI.createCamp(campForm);
        const data = await fn;
        setCampSaving(false);
        if (data.success) {
            setShowCampModal(false);
            fetchCamps();
        } else {
            alert(data.message || 'Failed to save camp');
        }
    };

    const deleteCamp = async (id) => {
        if (!confirm('Delete this camp?')) return;
        await organisationAPI.deleteCamp(id);
        fetchCamps();
    };

    // ── Misc ──────────────────────────────────────────────────────
    const handleEdit = (item) => { setSelectedInventory(item); setShowEditModal(true); };

    const handleLogout = async () => {
        await authAPI.logout();
        localStorage.removeItem('user');
        navigate('/login');
    };

    const stockStatus = (qty) => {
        if (qty === 0) return { text: 'Out', cls: 'bg-red-100 text-red-700' };
        if (qty < 10) return { text: 'Critical', cls: 'bg-orange-100 text-orange-700' };
        if (qty < 20) return { text: 'Low', cls: 'bg-yellow-100 text-yellow-700' };
        return { text: 'Good', cls: 'bg-green-100 text-green-700' };
    };

    const fmtDate = (d) => new Date(d).toLocaleDateString();
    const totalStock = Object.values(bloodStock).reduce((s, v) => s + v, 0);
    const notifCount = notifications.length + campNotifications.length;

    if (loading) return <div className="flex items-center justify-center h-screen text-gray-600">Loading...</div>;

    // ── Sidebar nav items ─────────────────────────────────────────
    const navItems = [
        { id: 'dashboard', icon: 'fa-gauge', label: 'Dashboard' },
        { id: 'camps', icon: 'fa-calendar-plus', label: 'Upcoming Camps', badge: campNotifications.length || null },
        { id: 'donors', icon: 'fa-users', label: 'Donor List' },
        { id: 'records', icon: 'fa-hand-holding-heart', label: 'Donation Records' },
        { id: 'hospitals', icon: 'fa-hospital', label: 'Hospital Records' },
        { id: 'transfers', icon: 'fa-exchange-alt', label: 'Transfers', badge: transfers.filter(t => t.status === 'pending').length || null },
        { id: 'notifications', icon: 'fa-bell', label: 'Notifications', badge: notifCount || null },
    ];

    const SidebarContent = () => (
        <>
            <div className="p-5 text-center border-b border-red-600">
                <div className="text-3xl mb-1">🏢</div>
                <h2 className="text-lg font-bold leading-tight">{user?.organisationName || 'Organisation'}</h2>
                <p className="text-xs opacity-70 mt-1">Blood Donation Portal</p>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map(item => (
                    <button key={item.id}
                        onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition text-sm ${activeTab === item.id ? 'bg-red-600 font-semibold' : 'hover:bg-red-600/70'}`}>
                        <span className="flex items-center gap-2">
                            <i className={`fa ${item.icon} w-5 text-center`}></i>
                            {item.label}
                        </span>
                        {item.badge ? <span className="bg-white text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span> : null}
                    </button>
                ))}
            </nav>
            <div className="p-3 border-t border-red-600">
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 hover:bg-red-500 rounded-lg text-sm transition">
                    <i className="fa fa-sign-out-alt"></i> Logout
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Mobile overlay */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Sidebar — desktop fixed, mobile drawer */}
            <aside className={`fixed lg:relative z-40 h-full w-64 bg-red-700 text-white flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex-shrink-0`}>
                <SidebarContent />
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top bar (mobile) */}
                <header className="lg:hidden bg-red-700 text-white flex items-center justify-between px-4 py-3 flex-shrink-0">
                    <button onClick={() => setSidebarOpen(true)} className="text-xl"><i className="fa fa-bars"></i></button>
                    <span className="font-bold text-sm">Organisation Dashboard</span>
                    {notifCount > 0 && (
                        <button onClick={() => { setActiveTab('notifications'); }} className="relative">
                            <i className="fa fa-bell text-lg"></i>
                            <span className="absolute -top-1 -right-1 bg-white text-red-700 text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">{notifCount}</span>
                        </button>
                    )}
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <h1 className="text-xl lg:text-2xl font-semibold mb-5 text-gray-800">
                        Welcome, <span className="text-red-600">{user?.name || user?.organisationName}</span>
                    </h1>

                    {/* ── DASHBOARD TAB ─────────────────────────────── */}
                    {activeTab === 'dashboard' && (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                {[
                                    { label: 'Camps Organized', value: camps.length, color: 'text-red-600' },
                                    { label: 'Total Donors', value: stats.totalDonors, color: 'text-green-600' },
                                    { label: 'Blood Units', value: stats.bloodUnits, color: 'text-yellow-600' },
                                    { label: 'Partner Hospitals', value: stats.partnerHospitals, color: 'text-blue-600' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-white p-4 rounded-lg shadow">
                                        <p className="text-gray-500 text-xs">{s.label}</p>
                                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Blood Stock Summary */}
                            <div className="bg-white rounded-lg shadow p-5 mb-6">
                                <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <i className="fa fa-vials text-red-600"></i> Current Blood Stock
                                    <span className="ml-auto text-sm font-normal text-gray-500">Net Available: <strong className="text-red-600">{totalStock}</strong> units</span>
                                </h2>
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                    {BLOOD_GROUPS.map(g => {
                                        const qty = bloodStock[g] || 0;
                                        const s = stockStatus(qty);
                                        return (
                                            <div key={g} className={`text-center rounded-lg p-3 border-2 ${qty === 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                                                <div className="font-bold text-red-600 text-sm">{g}</div>
                                                <div className="text-2xl font-bold text-gray-800 my-1">{qty}</div>
                                                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${s.cls}`}>{s.text}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* In/Out breakdown */}
                                <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm text-gray-600">
                                    <span>📥 <strong>Stock IN:</strong> {inventory.filter(i => i.inventoryType === 'in').reduce((s, i) => s + i.quantity, 0)} units</span>
                                    <span>📤 <strong>Stock OUT:</strong> {inventory.filter(i => i.inventoryType === 'out').reduce((s, i) => s + i.quantity, 0)} units</span>
                                    <span>📦 <strong>Net Available:</strong> {totalStock} units</span>
                                </div>
                            </div>

                            {/* Alerts */}
                            {notifications.filter(n => n.type === 'error').length > 0 && (
                                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
                                    <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2"><i className="fa fa-exclamation-circle"></i> Urgent Alerts</h3>
                                    {notifications.filter(n => n.type === 'error').slice(0, 3).map(n => (
                                        <p key={n.id} className="text-sm text-red-700 mb-1">• {n.message}</p>
                                    ))}
                                </div>
                            )}

                            {/* Camp notifications */}
                            {campNotifications.length > 0 && (
                                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
                                    <h3 className="font-semibold text-blue-700 mb-2 flex items-center gap-2"><i className="fa fa-calendar-check"></i> Reminder: Camp Tomorrow</h3>
                                    {campNotifications.map(c => (
                                        <p key={c._id} className="text-sm text-blue-700">📍 <strong>{c.title}</strong> at {c.location} — {fmtDate(c.date)}</p>
                                    ))}
                                </div>
                            )}

                            {/* Quick add buttons */}
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button onClick={() => setShowRecordModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2">
                                    <i className="fa fa-heart"></i> Add Donor Record
                                </button>
                                <button onClick={() => setShowWalkinModal(true)} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm flex items-center gap-2">
                                    <i className="fa fa-user-plus"></i> Walk-in Donation
                                </button>
                                <button onClick={() => setShowManualAddModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2">
                                    <i className="fa fa-plus"></i> Add Hospital Record
                                </button>
                                <button onClick={() => { setActiveTab('camps'); openCampModal(); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-2">
                                    <i className="fa fa-calendar-plus"></i> Organize Camp
                                </button>
                            </div>

                            {/* Recent records */}
                            <div className="bg-white rounded-lg shadow overflow-x-auto">
                                <div className="p-4 border-b flex items-center justify-between">
                                    <h2 className="font-semibold text-gray-700">Recent Records</h2>
                                    <button onClick={() => setActiveTab('records')} className="text-blue-600 text-sm hover:underline">View All →</button>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>{['Type', 'Donor/Hospital', 'Blood', 'Units', 'Date', 'Status', 'Edit'].map(h => <th key={h} className="p-3 text-left text-gray-600">{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {inventory.slice(0, 6).map(item => {
                                            const expired = item.status === 'expired' || new Date(item.expiryDate) < new Date();
                                            return (
                                                <tr key={item._id} className={`border-b hover:bg-gray-50 ${expired ? 'bg-red-50' : ''}`}>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.inventoryType === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {item.inventoryType === 'in' ? '📥 IN' : '📤 OUT'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 truncate max-w-32">{item.donor?.name || item.hospital?.hospitalName || item.source_name || item.target_name || 'N/A'}</td>
                                                    <td className="p-3 font-bold text-red-600">{item.bloodGroup}</td>
                                                    <td className="p-3">{item.quantity}</td>
                                                    <td className="p-3">{fmtDate(item.createdAt)}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                            {item.status || 'Completed'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <button onClick={() => handleEdit(item)} disabled={expired} className="text-blue-600 hover:text-blue-800 disabled:opacity-30">
                                                            <i className="fa fa-edit"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {inventory.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-500">No records yet</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* ── CAMPS TAB ─────────────────────────────────── */}
                    {activeTab === 'camps' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-800">Upcoming Blood Donation Camps</h2>
                                <button onClick={() => openCampModal()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm">
                                    <i className="fa fa-calendar-plus"></i> Organize Camp
                                </button>
                            </div>

                            {campNotifications.length > 0 && (
                                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4 flex items-start gap-3">
                                    <i className="fa fa-bell text-blue-600 mt-0.5"></i>
                                    <div>
                                        <p className="font-semibold text-blue-800">🔔 Camp Reminder — Tomorrow!</p>
                                        {campNotifications.map(c => (
                                            <p key={c._id} className="text-sm text-blue-700 mt-1"><strong>{c.title}</strong> at {c.location}, {fmtDate(c.date)}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {camps.length === 0 ? (
                                <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                                    <i className="fa fa-calendar text-5xl text-gray-200 mb-3"></i>
                                    <p className="text-lg font-semibold">No camps scheduled</p>
                                    <p className="text-sm mt-1">Click "Organize Camp" to add one.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {camps.map(camp => {
                                        const isPast = new Date(camp.date) < new Date();
                                        const isTomorrow = campNotifications.some(c => c._id === camp._id);
                                        return (
                                            <div key={camp._id} className={`bg-white rounded-lg shadow p-5 border-l-4 ${isTomorrow ? 'border-blue-500' : isPast ? 'border-gray-300' : 'border-red-500'}`}>
                                                {isTomorrow && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold mb-2 inline-block">🔔 Tomorrow</span>}
                                                {isPast && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold mb-2 inline-block">Past</span>}
                                                <h3 className="font-bold text-gray-800 text-base mb-1">{camp.title}</h3>
                                                <p className="text-sm text-gray-600 flex items-center gap-1 mb-1"><i className="fa fa-map-marker-alt text-red-500"></i>{camp.location}</p>
                                                <p className="text-sm text-gray-600 flex items-center gap-1 mb-2"><i className="fa fa-calendar text-red-500"></i>{fmtDate(camp.date)}</p>
                                                {camp.description && <p className="text-xs text-gray-500 mb-3">{camp.description}</p>}
                                                <div className="flex gap-2">
                                                    <button onClick={() => openCampModal(camp)} className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"><i className="fa fa-edit mr-1"></i>Edit</button>
                                                    <button onClick={() => deleteCamp(camp._id)} className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"><i className="fa fa-trash mr-1"></i>Delete</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── DONORS TAB ────────────────────────────────── */}
                    {activeTab === 'donors' && (
                        <div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                                <h2 className="text-xl font-bold text-gray-800">Donor List ({donors.length})</h2>
                                <button onClick={() => setShowRecordModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2">
                                    <i className="fa fa-heart"></i> Add Donor Record
                                </button>
                            </div>
                            {/* Search */}
                            <div className="mb-4 flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 max-w-sm">
                                <i className="fa fa-search text-gray-400"></i>
                                <input value={searchDonors} onChange={e => setSearchDonors(e.target.value)}
                                    placeholder="Search by name, email or blood group..."
                                    className="flex-1 outline-none text-sm" />
                                {searchDonors && <button onClick={() => setSearchDonors('')}><i className="fa fa-times text-gray-400"></i></button>}
                            </div>
                            <div className="bg-white rounded-lg shadow overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>{['Donor Name', 'Email', 'Blood Type', 'Phone', 'Total Donations', 'Units Donated', 'Donated To', 'Last Donation', 'Actions'].map(h => (
                                            <th key={h} className="p-3 text-left text-gray-600">{h}</th>
                                        ))}</tr>
                                    </thead>
                                    <tbody>
                                        {donors.filter(({ donor }) => {
                                            const q = searchDonors.toLowerCase();
                                            return !q || donor.name?.toLowerCase().includes(q) || donor.email?.toLowerCase().includes(q) || donor.bloodtype?.toLowerCase().includes(q);
                                        }).map(({ donor, donations, totalUnits, type }) => {
                                            const lastDonation = [...donations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                                            const donatedTo = lastDonation?.donatedTo || lastDonation?.hospital?.hospitalName || lastDonation?.organisation?.organisationName || 'This Organisation';
                                            const campSource = lastDonation?.campSource || lastDonation?.notes || '';
                                            const isWalkin = type === 'walkin';
                                            return (
                                                <tr key={donor._id || donor.name} className="border-b hover:bg-gray-50">
                                                    <td className="p-3 font-semibold">
                                                        {donor.name}
                                                        {isWalkin && <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Walk-in</span>}
                                                    </td>
                                                    <td className="p-3 text-gray-600">{donor.email}</td>
                                                    <td className="p-3"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold">{donor.bloodtype}</span></td>
                                                    <td className="p-3">{donor.phone || '—'}</td>
                                                    <td className="p-3 text-center font-semibold">{donations.length}</td>
                                                    <td className="p-3 text-center font-semibold text-green-700">{totalUnits}</td>
                                                    <td className="p-3 text-xs text-gray-600">
                                                        {donatedTo}
                                                        {campSource && <div className="text-xs text-gray-400">Camp: {campSource}</div>}
                                                    </td>
                                                    <td className="p-3">{lastDonation ? fmtDate(lastDonation.createdAt) : '—'}</td>
                                                    <td className="p-3">
                                                        {lastDonation && !isWalkin && (
                                                            <button onClick={() => handleEdit(lastDonation)} className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1">
                                                                <i className="fa fa-edit"></i> Edit Last
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {donors.length === 0 && (
                                            <tr><td colSpan={9} className="p-8 text-center text-gray-500">No donors linked yet. Record a donation to link a donor.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── RECORDS TAB ───────────────────────────────── */}
                    {activeTab === 'records' && (
                        <div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                                <h2 className="text-xl font-bold text-gray-800">Donation Records ({inventory.filter(i => i.inventoryType === 'in').length})</h2>
                                <button onClick={() => setShowRecordModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2">
                                    <i className="fa fa-heart"></i> Add Donor Record
                                </button>
                            </div>
                            <div className="mb-4 flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 max-w-sm">
                                <i className="fa fa-search text-gray-400"></i>
                                <input value={searchRecords} onChange={e => setSearchRecords(e.target.value)}
                                    placeholder="Search by name, blood group or date..."
                                    className="flex-1 outline-none text-sm" />
                                {searchRecords && <button onClick={() => setSearchRecords('')}><i className="fa fa-times text-gray-400"></i></button>}
                            </div>
                            <RecordsTable inventory={inventory.filter(i => {
                                if (i.inventoryType !== 'in') return false;
                                const q = searchRecords.toLowerCase();
                                return !q || i.donor?.name?.toLowerCase().includes(q) || i.source_name?.toLowerCase().includes(q) || i.bloodGroup?.toLowerCase().includes(q) || fmtDate(i.createdAt).includes(q);
                            })} onEdit={handleEdit} fmtDate={fmtDate} />
                        </div>
                    )}

                    {/* ── HOSPITALS TAB ─────────────────────────────── */}
                    {activeTab === 'hospitals' && (
                        <div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                                <h2 className="text-xl font-bold text-gray-800">Hospital Records ({inventory.filter(i => i.inventoryType === 'out').length})</h2>
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => setShowTransferModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-2">
                                        <i className="fa fa-exchange-alt"></i> Send Transfer
                                    </button>
                                    <button onClick={() => setShowManualAddModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2">
                                        <i className="fa fa-plus"></i> Add Hospital Record
                                    </button>
                                </div>
                            </div>
                            <div className="mb-4 flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 max-w-sm">
                                <i className="fa fa-search text-gray-400"></i>
                                <input value={searchHospital} onChange={e => setSearchHospital(e.target.value)}
                                    placeholder="Search by hospital, blood group or date..."
                                    className="flex-1 outline-none text-sm" />
                                {searchHospital && <button onClick={() => setSearchHospital('')}><i className="fa fa-times text-gray-400"></i></button>}
                            </div>
                            <RecordsTable inventory={inventory.filter(i => {
                                if (i.inventoryType !== 'out') return false;
                                const q = searchHospital.toLowerCase();
                                return !q || i.hospital?.hospitalName?.toLowerCase().includes(q) || i.bloodGroup?.toLowerCase().includes(q) || fmtDate(i.createdAt).includes(q);
                            })} onEdit={handleEdit} fmtDate={fmtDate} />
                        </div>
                    )}

                    {/* ── TRANSFERS TAB ─────────────────────────────── */}
                    {activeTab === 'transfers' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-800">Blood Transfers & Requests</h2>
                                <button onClick={() => setShowTransferModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-2">
                                    <i className="fa fa-exchange-alt"></i> Send Transfer
                                </button>
                            </div>

                            {/* Status legend */}
                            <div className="flex flex-wrap gap-2 mb-4 text-xs">
                                {[
                                    { s: 'requested', c: 'bg-yellow-100 text-yellow-700', l: '🏥 Hospital Request — Action Needed' },
                                    { s: 'completed', c: 'bg-green-100 text-green-700', l: '✅ Completed — Stock Updated' },
                                    { s: 'org_rejected', c: 'bg-red-100 text-red-700', l: 'Rejected' },
                                    { s: 'admin_rejected', c: 'bg-gray-100 text-gray-700', l: 'Rejected by Admin' },
                                ].map(({ s, c, l }) => <span key={s} className={`px-2 py-1 rounded-full font-semibold ${c}`}>{l}</span>)}
                            </div>

                            <div className="space-y-3">
                                {transfers.map(t => (
                                    <div key={t._id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${t.status === 'completed' ? 'border-green-500' :
                                            t.status === 'requested' ? 'border-yellow-500' :
                                                'border-red-500'
                                        }`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                            t.status === 'requested' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                        }`}>{t.status.replace(/_/g, ' ').toUpperCase()}</span>
                                                    <span className="text-xs text-gray-500 font-mono">{t.transferId}</span>
                                                    {t.status === 'requested' && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">ACTION NEEDED</span>}
                                                </div>
                                                <p className="font-semibold text-gray-800">Hospital: {t.hospital?.hospitalName}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {t.items.map((item, idx) => (
                                                        <span key={idx} className="bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-1 rounded font-semibold">
                                                            {item.bloodGroup}: {item.quantity} units
                                                        </span>
                                                    ))}
                                                </div>
                                                {t.notes && <p className="text-xs text-gray-500 mt-1">Notes: {t.notes}</p>}
                                                {t.status === 'completed' && <p className="text-xs text-green-700 font-semibold mt-1">✅ Stock deducted from your inventory & added to hospital</p>}
                                                {t.status === 'org_rejected' && <p className="text-xs text-red-600 mt-1">Rejected: {t.orgRejectionReason}</p>}
                                                <p className="text-xs text-gray-400 mt-1">{fmtDate(t.createdAt)}</p>
                                            </div>
                                            <div className="flex flex-col gap-2 flex-shrink-0">
                                                {t.status === 'requested' && (
                                                    <>
                                                        <button onClick={() => handleOrgViewRequest(t)}
                                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold">
                                                            🔍 Review & Approve
                                                        </button>
                                                        <button onClick={() => { setOrgRejectId(t._id); setOrgRejectReason(''); }}
                                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-semibold">
                                                            ❌ Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {transfers.length === 0 && (
                                    <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                                        <i className="fa fa-exchange-alt text-5xl text-gray-200 mb-3 block"></i>
                                        <p>No transfers yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── NOTIFICATIONS TAB ─────────────────────────── */}
                    {activeTab === 'notifications' && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Notifications ({notifCount})</h2>
                            <div className="space-y-3">
                                {campNotifications.map(c => (
                                    <div key={c._id} className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500 flex items-start gap-3">
                                        <i className="fa fa-calendar-check text-blue-600 text-xl mt-0.5"></i>
                                        <div>
                                            <p className="font-semibold text-gray-800">🔔 Camp Tomorrow: {c.title}</p>
                                            <p className="text-sm text-gray-600">{c.location} — {fmtDate(c.date)}</p>
                                        </div>
                                    </div>
                                ))}
                                {notifications.map(n => (
                                    <div key={n.id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${n.type === 'error' ? 'border-red-500' : n.type === 'warning' ? 'border-orange-500' : 'border-green-500'}`}>
                                        <div className="flex items-start gap-3">
                                            <i className={`fa fa-${n.icon} text-xl mt-0.5 ${n.type === 'error' ? 'text-red-600' : n.type === 'warning' ? 'text-orange-600' : 'text-green-600'}`}></i>
                                            <div>
                                                <p className="text-gray-800">{n.message}</p>
                                                <p className="text-xs text-gray-500 mt-1">{n.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {notifCount === 0 && (
                                    <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                                        <i className="fa fa-bell-slash text-5xl text-gray-200 mb-3"></i>
                                        <p>No notifications</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* ── CAMP MODAL ──────────────────────────────────────── */}
            {showCampModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md">
                        <div className="bg-red-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                            <h2 className="font-bold flex items-center gap-2"><i className="fa fa-calendar-plus"></i> {editingCamp ? 'Edit Camp' : 'Organize Camp'}</h2>
                            <button onClick={() => setShowCampModal(false)} className="hover:opacity-70"><i className="fa fa-times text-xl"></i></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Camp Title *</label>
                                <input value={campForm.title} onChange={e => setCampForm({ ...campForm, title: e.target.value })}
                                    placeholder="e.g. World Blood Donor Day Camp"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Location / Venue *</label>
                                <input value={campForm.location} onChange={e => setCampForm({ ...campForm, location: e.target.value })}
                                    placeholder="e.g. City Hall, Kolkata"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                                <input type="date" value={campForm.date} onChange={e => setCampForm({ ...campForm, date: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Description (optional)</label>
                                <textarea value={campForm.description} onChange={e => setCampForm({ ...campForm, description: e.target.value })}
                                    rows={3} placeholder="Add any additional details..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none text-sm resize-none" />
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                                <i className="fa fa-bell mr-1"></i> You will receive a notification reminder 1 day before the camp.
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={saveCamp} disabled={campSaving}
                                    className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 text-sm">
                                    {campSaving ? 'Saving...' : editingCamp ? 'Update Camp' : 'Schedule Camp'}
                                </button>
                                <button onClick={() => setShowCampModal(false)}
                                    className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 text-sm">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <RecordDonationModal show={showRecordModal} onClose={() => setShowRecordModal(false)} onSuccess={fetchAll} organisationEmail={user?.email} />

            {/* Walk-in Donation Modal */}
            {showWalkinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md">
                        <div className="bg-orange-500 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                            <h2 className="font-bold flex items-center gap-2"><i className="fa fa-user-plus"></i> Walk-in / Unregistered Donation</h2>
                            <button onClick={() => setShowWalkinModal(false)}><i className="fa fa-times text-xl"></i></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800">
                                <i className="fa fa-info-circle mr-1"></i> For donors who are <strong>not registered</strong> in the system. This record will appear in Admin's unverified section.
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Donor Name *</label>
                                <input value={walkinForm.donorName} onChange={e => setWalkinForm({ ...walkinForm, donorName: e.target.value })}
                                    placeholder="Full name of donor"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Camp / Source Name</label>
                                <input value={walkinForm.campName} onChange={e => setWalkinForm({ ...walkinForm, campName: e.target.value })}
                                    placeholder="e.g. City Hall Blood Camp, Walk-in..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Blood Group *</label>
                                    <select value={walkinForm.bloodGroup} onChange={e => setWalkinForm({ ...walkinForm, bloodGroup: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                                        <option value="">Select</option>
                                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => <option key={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Units *</label>
                                    <input type="number" value={walkinForm.quantity} onChange={e => setWalkinForm({ ...walkinForm, quantity: e.target.value })}
                                        placeholder="e.g. 1" min="1"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry Date *</label>
                                <input type="date" value={walkinForm.expiryDate} onChange={e => setWalkinForm({ ...walkinForm, expiryDate: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button disabled={walkinSaving} onClick={async () => {
                                    if (!walkinForm.donorName || !walkinForm.bloodGroup || !walkinForm.quantity || !walkinForm.expiryDate) {
                                        alert('Please fill all required fields'); return;
                                    }
                                    setWalkinSaving(true);
                                    try {
                                        const res = await fetch(`${API_URL}/api/inventory/create-inventory`, {
                                            method: 'POST', credentials: 'include',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                inventoryType: 'in',
                                                bloodGroup: walkinForm.bloodGroup,
                                                quantity: parseInt(walkinForm.quantity),
                                                expiryDate: walkinForm.expiryDate,
                                                organisation: user?.email,
                                                source_name: walkinForm.donorName,
                                                notes: walkinForm.campName || 'Walk-in donation',
                                                isManualEntry: false,
                                                verified: false,
                                                walkinDonor: true
                                            })
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            alert('Walk-in donation recorded! ✅\nThis will appear in Admin\'s unverified section for review.');
                                            setShowWalkinModal(false);
                                            setWalkinForm({ donorName: '', campName: '', bloodGroup: '', quantity: '', expiryDate: '' });
                                            fetchAll();
                                        } else alert(data.message || 'Failed');
                                    } catch (_) { alert('Error occurred'); }
                                    setWalkinSaving(false);
                                }} className="flex-1 bg-orange-500 text-white py-2.5 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 text-sm">
                                    {walkinSaving ? 'Saving...' : 'Record Walk-in Donation'}
                                </button>
                                <button onClick={() => setShowWalkinModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 text-sm">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ManualAddInventoryModal show={showManualAddModal} onClose={() => setShowManualAddModal(false)} onSuccess={fetchAll} userRole="organisation" userEmail={user?.email} bloodStock={bloodStock} />
            <EditInventoryModal show={showEditModal} onClose={() => setShowEditModal(false)} onSuccess={fetchAll} inventoryRecord={selectedInventory} />

            {/* ── ORG REVIEW & APPROVE MODAL ── */}
            {orgActionTransfer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between sticky top-0">
                            <h2 className="font-bold flex items-center gap-2"><i className="fa fa-check-circle"></i> Review Blood Request</h2>
                            <button onClick={() => { setOrgActionTransfer(null); setOrgStockCheck(null); }}><i className="fa fa-times text-xl"></i></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm font-semibold text-gray-700">From: {orgActionTransfer.hospital?.hospitalName}</p>
                                <p className="text-xs text-gray-500">{orgActionTransfer.transferId}</p>
                                {orgActionTransfer.notes && <p className="text-xs text-gray-600 mt-1">Notes: {orgActionTransfer.notes}</p>}
                            </div>

                            {/* Stock check results */}
                            {orgStockCheck && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-gray-700 text-sm">Stock Availability Check:</h3>
                                    {orgStockCheck.stockCheck.map((s, i) => (
                                        <div key={i} className={`flex items-center justify-between rounded-lg p-3 border ${s.sufficient ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                            <div>
                                                <span className="font-bold text-red-600">{s.bloodGroup}</span>
                                                <span className="ml-2 text-sm text-gray-700">Requested: {s.requested} units</span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-sm font-bold ${s.sufficient ? 'text-green-700' : 'text-red-700'}`}>
                                                    {s.sufficient ? `✅ ${s.available} available` : `❌ Only ${s.available} available`}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {!orgStockCheck.allSufficient && (
                                        <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                                            <i className="fa fa-exclamation-circle mr-1"></i> Insufficient stock for some items. You can still approve partial or reject the request.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Set expiry dates per item */}
                            {orgStockCheck?.allSufficient && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-gray-700 text-sm">Set Expiry Dates (required to approve):</h3>
                                    {orgExpiryItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                                            <span className="font-bold text-red-600 w-10">{item.bloodGroup}</span>
                                            <span className="text-sm text-gray-600">{item.quantity} units</span>
                                            <input type="date" value={item.expiryDate}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={e => { const n = [...orgExpiryItems]; n[idx].expiryDate = e.target.value; setOrgExpiryItems(n); }}
                                                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3">
                                {orgStockCheck?.allSufficient ? (
                                    <button onClick={handleOrgApprove}
                                        className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 text-sm">
                                        ✅ Approve & Send
                                    </button>
                                ) : (
                                    <button disabled className="flex-1 bg-gray-300 text-gray-500 py-2.5 rounded-lg font-semibold text-sm cursor-not-allowed">
                                        Cannot Approve — Insufficient Stock
                                    </button>
                                )}
                                <button onClick={() => { setOrgRejectId(orgActionTransfer._id); setOrgRejectReason(''); setOrgActionTransfer(null); setOrgStockCheck(null); }}
                                    className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 text-sm">
                                    ❌ Reject Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ORG REJECT MODAL ── */}
            {orgRejectId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg text-gray-800 mb-3">Reject Blood Request</h3>
                        <textarea value={orgRejectReason} onChange={e => setOrgRejectReason(e.target.value)}
                            rows={3} placeholder="Reason (e.g. insufficient stock, blood type unavailable...)"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 resize-none mb-3" />
                        <div className="flex gap-3">
                            <button onClick={handleOrgReject} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 text-sm">Reject & Notify Hospital</button>
                            <button onClick={() => setOrgRejectId(null)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 text-sm">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SEND TRANSFER MODAL ── */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="bg-purple-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between sticky top-0">
                            <h2 className="font-bold flex items-center gap-2"><i className="fa fa-exchange-alt"></i> Send Blood Transfer</h2>
                            <button onClick={() => setShowTransferModal(false)}><i className="fa fa-times text-xl"></i></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Hospital *</label>
                                <select value={transferForm.hospitalId} onChange={e => setTransferForm({ ...transferForm, hospitalId: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                    <option value="">-- Choose Hospital --</option>
                                    {hospitals.map(h => <option key={h._id} value={h._id}>{h.hospitalName}</option>)}
                                </select>
                            </div>

                            {/* Blood items — multiple */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-semibold text-gray-700">Blood Items *</label>
                                    <button type="button" onClick={() => setTransferForm({ ...transferForm, items: [...transferForm.items, { bloodGroup: '', quantity: '', expiryDate: '' }] })}
                                        className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
                                        <i className="fa fa-plus mr-1"></i> Add Blood Group
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {transferForm.items.map((item, idx) => {
                                        const avail = bloodStock[item.bloodGroup] || 0;
                                        const over = item.quantity && parseInt(item.quantity) > avail;
                                        return (
                                            <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                <div className="grid grid-cols-3 gap-2 mb-1">
                                                    <select value={item.bloodGroup}
                                                        onChange={e => { const items = [...transferForm.items]; items[idx].bloodGroup = e.target.value; setTransferForm({ ...transferForm, items }); }}
                                                        className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                                        <option value="">Blood Group</option>
                                                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => <option key={g}>{g}</option>)}
                                                    </select>
                                                    <input type="number" placeholder="Units" value={item.quantity} min="1"
                                                        onChange={e => { const items = [...transferForm.items]; items[idx].quantity = e.target.value; setTransferForm({ ...transferForm, items }); }}
                                                        className={`border rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 ${over ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                                                    <input type="date" value={item.expiryDate}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        onChange={e => { const items = [...transferForm.items]; items[idx].expiryDate = e.target.value; setTransferForm({ ...transferForm, items }); }}
                                                        className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    {item.bloodGroup && (
                                                        <p className={`text-xs font-semibold ${avail === 0 ? 'text-red-600' : over ? 'text-orange-600' : 'text-green-600'}`}>
                                                            {avail === 0 ? `❌ No ${item.bloodGroup} stock` : over ? `⚠️ Exceeds stock (${avail} available)` : `✅ Available: ${avail} units`}
                                                        </p>
                                                    )}
                                                    {transferForm.items.length > 1 && (
                                                        <button type="button" onClick={() => { const items = transferForm.items.filter((_, i) => i !== idx); setTransferForm({ ...transferForm, items }); }}
                                                            className="text-xs text-red-500 hover:text-red-700 ml-auto">
                                                            <i className="fa fa-trash"></i> Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (optional)</label>
                                <textarea value={transferForm.notes} onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })}
                                    rows={2} placeholder="Any additional notes..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                                <i className="fa fa-info-circle mr-1"></i> Hospital must approve this transfer. Once approved, records are automatically added to both dashboards.
                            </div>

                            <div className="flex gap-3">
                                <button disabled={transferSaving} onClick={async () => {
                                    if (!transferForm.hospitalId) { alert('Select a hospital'); return; }
                                    const valid = transferForm.items.every(i => i.bloodGroup && i.quantity && i.expiryDate);
                                    if (!valid) { alert('Fill all blood group fields'); return; }
                                    const over = transferForm.items.some(i => parseInt(i.quantity) > (bloodStock[i.bloodGroup] || 0));
                                    if (over) { alert('One or more items exceed available stock'); return; }
                                    setTransferSaving(true);
                                    const data = await transferAPI.create({ hospitalId: transferForm.hospitalId, items: transferForm.items, notes: transferForm.notes });
                                    setTransferSaving(false);
                                    if (data.success) {
                                        alert('Transfer sent! Awaiting hospital approval.');
                                        setShowTransferModal(false);
                                        setTransferForm({ hospitalId: '', notes: '', items: [{ bloodGroup: '', quantity: '', expiryDate: '' }] });
                                        fetchTransfers();
                                    } else alert(data.message || 'Failed');
                                }} className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 text-sm">
                                    {transferSaving ? 'Sending...' : 'Send Transfer Request'}
                                </button>
                                <button onClick={() => setShowTransferModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 text-sm">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        </div>
    );
}

// ── Reusable records table ──────────────────────────────────
function RecordsTable({ inventory, onEdit, fmtDate }) {
    return (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-50">
                    <tr>{['Type', 'Donor/Hospital', 'Blood', 'Units', 'Expiry', 'Date', 'Status', 'Edit'].map(h => (
                        <th key={h} className="p-3 text-left text-gray-600">{h}</th>
                    ))}</tr>
                </thead>
                <tbody>
                    {inventory.map(item => {
                        const expired = item.status === 'expired' || new Date(item.expiryDate) < new Date();
                        const expiringSoon = !expired && new Date(item.expiryDate) < new Date(Date.now() + 5 * 86400000);
                        return (
                            <tr key={item._id} className={`border-b hover:bg-gray-50 ${expired ? 'bg-red-50' : expiringSoon ? 'bg-orange-50' : ''}`}>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.inventoryType === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {item.inventoryType === 'in' ? '📥 IN' : '📤 OUT'}
                                    </span>
                                </td>
                                <td className="p-3 truncate max-w-32">{item.donor?.name || item.hospital?.hospitalName || item.source_name || item.target_name || 'N/A'}</td>
                                <td className="p-3 font-bold text-red-600">{item.bloodGroup}</td>
                                <td className="p-3 font-semibold">{item.quantity}</td>
                                <td className="p-3">
                                    <span className={expired ? 'text-red-600 font-bold' : expiringSoon ? 'text-orange-600 font-semibold' : ''}>{fmtDate(item.expiryDate)}</span>
                                    {expired && <div className="text-xs text-red-600 font-bold">EXPIRED</div>}
                                    {expiringSoon && !expired && <div className="text-xs text-orange-600">{Math.ceil((new Date(item.expiryDate) - new Date()) / 86400000)}d left</div>}
                                </td>
                                <td className="p-3">{fmtDate(item.createdAt)}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${expired ? 'bg-red-100 text-red-700' : item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                        {item.status || 'Completed'}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <button onClick={() => onEdit(item)} disabled={expired} className="text-blue-600 hover:text-blue-800 disabled:opacity-30">
                                        <i className="fa fa-edit"></i>
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    {inventory.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-500">No records found</td></tr>}
                </tbody>
            </table>
        </div>
    );
}