import React, { useState, useEffect } from 'react';
import { X, FileText, Eye, Trash2, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { authAPI, adminAPI, transferAPI } from '../services/api';
import EditInventoryModal from '../components/EditInventoryModal';


const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState(null);
  const [bloodGroupDetails, setBloodGroupDetails] = useState([]);
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [rejectTransferId, setRejectTransferId] = useState(null);
  const [showIDs, setShowIDs] = useState(false);

  // Modals
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Data
  const [stats, setStats] = useState({
    totalDonors: 0,
    totalHospitals: 0,
    totalOrganisations: 0,
    pendingApprovals: 0,
    totalBloodUnits: 0,
    unverifiedEntries: 0,
    pendingTransactions: 0,
    expiredItems: 0,
    expiringItemsCount: 0,
    lowStockGroups: []
  });

  const [inventory, setInventory] = useState([]);
  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [unverifiedEntries, setUnverifiedEntries] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [expiryWarnings, setExpiryWarnings] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.id || userData.role !== 'admin') {
      alert('Access denied. Admin only.');
      window.location.href = '/login';
      return;
    }
    setUser(userData);
    fetchAllData();
    fetchPendingTransfers();
  }, []);

  const checkAuth = () => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.id || userData.role !== 'admin') {
      alert('Access denied. Admin only.');
      window.location.href = '/login';
      return;
    }
    setUser(userData);
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [
        statsRes,
        inventoryRes,
        donorsRes,
        hospitalsRes,
        orgsRes,
        unverifiedRes,
        pendingRes,
        expiryRes,
        lowStockRes
      ] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getAllInventory(),
        adminAPI.getDonorList(),
        adminAPI.getHospitalList(),
        adminAPI.getOrgList(),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/admin/unverified-entries`, {
          credentials: 'include'
        }).then(r => r.json()),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/admin/pending-transactions`, {
          credentials: 'include'
        }).then(r => r.json()),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/admin/expiry-warnings`, {
          credentials: 'include'
        }).then(r => r.json()),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/admin/low-stock-alerts`, {
          credentials: 'include'
        }).then(r => r.json())
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (inventoryRes.success) setInventory(inventoryRes.data || []);
      if (donorsRes.success) setDonors(donorsRes.data || []);
      if (hospitalsRes.success) setHospitals(hospitalsRes.data || []);
      if (orgsRes.success) setOrganisations(orgsRes.data || []);
      if (unverifiedRes.success) setUnverifiedEntries(unverifiedRes.data || []);
      if (pendingRes.success) setPendingTransactions(pendingRes.data || []);
      if (expiryRes.success) setExpiryWarnings(expiryRes.warnings || []);
      if (lowStockRes.success) setLowStockAlerts(lowStockRes.alerts || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  };

  const fetchPendingTransfers = async () => {
    const data = await transferAPI.adminPending();
    if (data.success) setPendingTransfers(data.transfers || []);
  };

  const fetchBloodGroupDetails = async (group) => {
    setSelectedBloodGroup(group);
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:7000';
      const res = await fetch(`${API}/api/admin/blood-group-details/${group}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setBloodGroupDetails(data.details || []);
    } catch (_) { setBloodGroupDetails([]); }
  };

  const handleAdminApproveTransfer = async (id) => {
    if (!window.confirm('Approve this transfer? Stock will update on both dashboards.')) return;
    const data = await transferAPI.adminApprove(id);
    if (data.success) { alert('Transfer approved!'); fetchPendingTransfers(); fetchAllData(); }
    else alert(data.message || 'Failed');
  };

  const handleAdminRejectTransfer = async () => {
    if (!rejectReason.trim()) { alert('Please enter a reason'); return; }
    const data = await transferAPI.adminReject(rejectTransferId, rejectReason);
    if (data.success) { setRejectTransferId(null); fetchPendingTransfers(); }
    else alert(data.message || 'Failed');
  };

  // Document Viewer
  const handleViewDocument = (userId) => {
    const docUrl = adminAPI.viewDocument(userId);
    setSelectedDoc(docUrl);
    setShowDocModal(true);
  };

  // Approve
  const handleApprove = async (id, type) => {
    if (!window.confirm(`Approve this ${type}?`)) return;

    try {
      const data = type === 'hospital'
        ? await adminAPI.approveHospital(id)
        : await adminAPI.approveOrganisation(id);

      if (data.success) {
        alert(`${type} approved successfully!`);
        fetchAllData();
      } else {
        alert(data.message || 'Approval failed');
      }
    } catch (error) {
      console.error('Approval error:', error);
      alert('An error occurred');
    }
  };

  // Reject Modal
  const openRejectModal = (id, type) => {
    setRejectTarget({ id, type });
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const data = rejectTarget.type === 'hospital'
        ? await adminAPI.rejectHospital(rejectTarget.id, rejectReason)
        : await adminAPI.rejectOrganisation(rejectTarget.id, rejectReason);

      if (data.success) {
        alert(`${rejectTarget.type} rejected successfully!`);
        setShowRejectModal(false);
        fetchAllData();
      } else {
        alert(data.message || 'Rejection failed');
      }
    } catch (error) {
      console.error('Rejection error:', error);
      alert('An error occurred');
    }
  };

  // Edit
  const handleEdit = (inventoryItem) => {
    setSelectedInventory(inventoryItem);
    setShowEditModal(true);
  };

  // Delete
  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      let data;
      if (type === 'donor') data = await adminAPI.deleteDonor(id);
      else if (type === 'hospital') data = await adminAPI.deleteHospital(id);
      else if (type === 'organisation') data = await adminAPI.deleteOrganisation(id);
      else if (type === 'inventory') data = await adminAPI.deleteInventory(id);

      if (data.success) {
        alert(`${type} deleted successfully!`);
        fetchAllData();
      } else {
        alert(data.message || 'Deletion failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('An error occurred');
    }
  };

  // View Transaction Details
  const handleViewTransaction = async (transactionId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/admin/transaction-history/${transactionId}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setSelectedTransaction(data);
        setShowTransactionModal(true);
      } else {
        alert('Failed to load transaction details');
      }
    } catch (error) {
      console.error('View transaction error:', error);
      alert('An error occurred');
    }
  };

  // Approve Transaction
  const handleApproveTransaction = async (transactionId) => {
    if (!window.confirm('Approve this transaction?')) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/admin/approve-transaction/${transactionId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (data.success) {
        alert('Transaction approved successfully!');
        fetchAllData();
      } else {
        alert(data.message || 'Approval failed');
      }
    } catch (error) {
      console.error('Approve transaction error:', error);
      alert('An error occurred');
    }
  };

  //  Reject Transaction
  const handleRejectTransaction = async (transactionId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/admin/reject-transaction/${transactionId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await response.json();

      if (data.success) {
        alert('Transaction rejected successfully!');
        fetchAllData();
      } else {
        alert(data.message || 'Rejection failed');
      }
    } catch (error) {
      console.error('Reject transaction error:', error);
      alert('An error occurred');
    }
  };

  //  Verify Manual Entry
  const handleVerifyEntry = async (id) => {
    if (!window.confirm('Verify this manual entry?')) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/admin/verify-entry/${id}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        alert('Entry verified successfully!');
        fetchAllData();
      } else {
        alert(data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verify entry error:', error);
      alert('An error occurred');
    }
  };

  // Run Manual Expiry Check
  const handleRunExpiryCheck = async () => {
    if (!window.confirm('Run manual expiry check now?')) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/admin/run-expiry-check`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message);
        fetchAllData();
      } else {
        alert('Expiry check failed');
      }
    } catch (error) {
      console.error('Run expiry check error:', error);
      alert('An error occurred');
    }
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
          <h2 className="text-2xl font-bold">🩸 LifeDrop</h2>
          <p className="text-sm opacity-80">Admin Dashboard</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-red-600' : 'hover:bg-red-600'}`}>
            <i className="fa fa-gauge w-6"></i> Dashboard
          </button>
          <button onClick={() => { setActiveTab('inventory'); setSidebarOpen(false); }} className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'inventory' ? 'bg-red-600' : 'hover:bg-red-600'}`}>
            <i className="fa fa-vials w-6"></i> Inventory ({inventory.length})
          </button>

          <button onClick={() => { setActiveTab('unverified'); setSidebarOpen(false); }} className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'unverified' ? 'bg-red-600' : 'hover:bg-red-600'}`}>
            <i className="fa fa-exclamation-triangle w-6"></i> Unverified ({stats.unverifiedEntries})
          </button>
          <button onClick={() => { setActiveTab('pending'); setSidebarOpen(false); }} className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'pending' ? 'bg-red-600' : 'hover:bg-red-600'}`}>
            <i className="fa fa-clock w-6"></i> Pending ({stats.pendingTransactions})
          </button>
          <button onClick={() => { setActiveTab('expiry'); setSidebarOpen(false); }} className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'expiry' ? 'bg-red-600' : 'hover:bg-red-600'}`}>
            <i className="fa fa-calendar-times w-6"></i> Expiry ({stats.expiringItemsCount})
          </button>
          <button onClick={() => { setActiveTab('lowstock'); setSidebarOpen(false); }} className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'lowstock' ? 'bg-red-600' : 'hover:bg-red-600'}`}>
            <i className="fa fa-chart-line w-6"></i> Low Stock ({stats.lowStockGroups.length})
          </button>
          <button onClick={() => { setActiveTab('hospitals'); setSidebarOpen(false); }} className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'hospitals' ? 'bg-red-600' : 'hover:bg-red-600'}`}>
            <i className="fa fa-hospital w-6"></i> Hospitals ({hospitals.filter(h => h.approvalStatus === 'pending').length})
          </button>
          <button onClick={() => { setActiveTab('organisations'); setSidebarOpen(false); }} className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'organisations' ? 'bg-red-600' : 'hover:bg-red-600'}`}>
            <i className="fa fa-building w-6"></i> Organizations ({organisations.filter(o => o.approvalStatus === 'pending').length})
          </button>
          <button onClick={() => { setActiveTab('donors'); setSidebarOpen(false); }} className={`w-full flex items-center p-3 rounded-lg transition ${activeTab === 'donors' ? 'bg-red-600' : 'hover:bg-red-600'}`}>
            <i className="fa fa-users w-6"></i> Donors ({donors.length})
          </button>
        </nav>

        <div className="p-4 border-t border-red-600">
          <button onClick={handleLogout} className="w-full flex items-center justify-center p-3 bg-red-600 hover:bg-red-500 rounded-lg transition">
            <i className="fa fa-sign-out-alt mr-2"></i> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden bg-red-700 text-white flex items-center justify-between px-4 py-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-xl"><i className="fa fa-bars"></i></button>
          <span className="font-bold text-sm">Admin Dashboard</span>
          <span className="w-6"></span>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            {/* Header with Show IDs Toggle */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-800">
                Welcome, <span className="text-red-600">{user?.name}</span>
              </h1>

              {/*  Show IDs Toggle */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={showIDs}
                    onChange={() => setShowIDs(!showIDs)}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className="text-sm font-semibold text-gray-700">Show System IDs</span>
                </label>
              </div>
            </div>

            {/* Dashboard Stats */}
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90 mb-1">Total Donors</p>
                        <p className="text-4xl font-bold">{stats.totalDonors}</p>
                      </div>
                      <i className="fa fa-users text-4xl opacity-50"></i>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90 mb-1">Hospitals</p>
                        <p className="text-4xl font-bold">{stats.totalHospitals}</p>
                      </div>
                      <i className="fa fa-hospital text-4xl opacity-50"></i>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90 mb-1">Organizations</p>
                        <p className="text-4xl font-bold">{stats.totalOrganisations}</p>
                      </div>
                      <i className="fa fa-building text-4xl opacity-50"></i>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90 mb-1">Pending</p>
                        <p className="text-4xl font-bold">{stats.pendingApprovals}</p>
                      </div>
                      <i className="fa fa-clock text-4xl opacity-50"></i>
                    </div>
                  </div>
                </div>

                {/*  Alert Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Unverified Entries</p>
                        <p className="text-3xl font-bold text-yellow-600">{stats.unverifiedEntries}</p>
                      </div>
                      <AlertTriangle className="w-10 h-10 text-yellow-500" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Pending Transactions</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.pendingTransactions}</p>
                      </div>
                      <Clock className="w-10 h-10 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Expiring Soon</p>
                        <p className="text-3xl font-bold text-orange-600">{stats.expiringItemsCount}</p>
                      </div>
                      <i className="fa fa-calendar-times text-4xl text-orange-500"></i>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Low Stock Groups</p>
                        <p className="text-3xl font-bold text-red-600">{stats.lowStockGroups.length}</p>
                      </div>
                      <i className="fa fa-chart-line text-4xl text-red-500"></i>
                    </div>
                  </div>
                </div>

                {/* Blood Stock Overview */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Blood Stock Overview</h2>
                    <button
                      onClick={handleRunExpiryCheck}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm"
                    >
                      <i className="fa fa-sync"></i>
                      Run Expiry Check
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {stats.bloodStock && Object.entries(stats.bloodStock).map(([group, quantity]) => (
                      <div key={group} onClick={() => fetchBloodGroupDetails(group)}
                        className="text-center bg-gray-50 rounded-lg p-4 cursor-pointer hover:shadow-md hover:bg-red-50 transition border-2 border-transparent hover:border-red-200">
                        <div className="text-2xl font-bold text-red-600">{group}</div>
                        <div className="text-3xl font-bold text-gray-800">{quantity}</div>
                        <div className="text-sm text-gray-600">units</div>
                        <div className="mt-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${quantity > 50 ? 'bg-green-100 text-green-700' : quantity > 20 ? 'bg-yellow-100 text-yellow-700' : quantity > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                            {quantity > 50 ? 'Good' : quantity > 20 ? 'Low' : quantity > 0 ? 'Critical' : 'Out'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Click for breakdown</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <span className="text-lg font-semibold text-gray-700">
                      Total Blood Units: <span className="text-red-600">{stats.totalBloodUnits}</span>
                    </span>
                  </div>
                </div>

                {/* Recent Inventory */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Inventory Records</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-3 text-left text-sm">Type</th>
                          <th className="p-3 text-left text-sm">Blood</th>
                          <th className="p-3 text-left text-sm">Qty</th>
                          <th className="p-3 text-left text-sm">Entity</th>
                          {showIDs && <th className="p-3 text-left text-sm">System ID</th>}
                          <th className="p-3 text-left text-sm">Expiry</th>
                          <th className="p-3 text-left text-sm">Date</th>
                          <th className="p-3 text-left text-sm">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.slice(0, 10).map((item, idx) => {
                          const isExpired = item.status === 'expired' || new Date(item.expiryDate) < new Date();
                          const isExpiringSoon = !isExpired && new Date(item.expiryDate) < new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

                          return (
                            <tr key={item._id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${item.inventoryType === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {item.inventoryType === 'in' ? 'IN' : 'OUT'}
                                  </span>
                                  {!item.verified && (
                                    <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">⚠️</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-red-600 font-bold">{item.bloodGroup}</td>
                              <td className="p-3">{item.quantity}</td>
                              <td className="p-3 text-sm">
                                {item.donor?.name || item.hospital?.hospitalName || item.organisation?.organisationName || 'N/A'}
                              </td>
                              {showIDs && (
                                <td className="p-3 text-xs text-gray-600">
                                  {item.hospital?.systemId || item.organisation?.systemId || '-'}
                                </td>
                              )}
                              <td className="p-3">
                                <span className={isExpired ? 'text-red-600 font-bold text-sm' : isExpiringSoon ? 'text-orange-600 font-semibold text-sm' : 'text-gray-600 text-sm'}>
                                  {new Date(item.expiryDate).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="p-3 text-sm text-gray-600">
                                {new Date(item.createdAt).toLocaleString()}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'expired' ? 'bg-red-100 text-red-700' :
                                  item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                  {item.status || 'completed'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/*  Unverified Entries Tab */}
            {activeTab === 'unverified' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  Unverified Entries ({unverifiedEntries.length})
                </h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>ℹ️ Note:</strong> These are manual entries without registered entity IDs. Review and verify them.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left text-sm">Transaction ID</th>
                        <th className="p-3 text-left text-sm">Type</th>
                        <th className="p-3 text-left text-sm">Blood Group</th>
                        <th className="p-3 text-left text-sm">Quantity</th>
                        <th className="p-3 text-left text-sm">Source</th>
                        <th className="p-3 text-left text-sm">Target</th>
                        <th className="p-3 text-left text-sm">Expiry Date</th>
                        <th className="p-3 text-left text-sm">Date</th>
                        <th className="p-3 text-left text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unverifiedEntries.map((item, idx) => (
                        <tr key={item._id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="p-3 text-xs font-mono text-gray-600">{item.transactionId}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${item.inventoryType === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.inventoryType.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-red-600">{item.bloodGroup}</td>
                          <td className="p-3">{item.quantity}</td>
                          <td className="p-3 text-sm">
                            {item.source_name || item.donor?.name || 'Unknown'}
                          </td>
                          <td className="p-3 text-sm">
                            {item.target_name || item.hospital?.hospitalName || item.organisation?.organisationName || 'Unknown'}
                          </td>
                          <td className="p-3 text-sm">{new Date(item.expiryDate).toLocaleDateString()}</td>
                          <td className="p-3 text-xs text-gray-600">{new Date(item.createdAt).toLocaleDateString()}</td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVerifyEntry(item._id)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                              >
                                ✓ Verify
                              </button>
                              <button
                                onClick={() => handleEdit(item)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item._id, 'inventory')}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {unverifiedEntries.length === 0 && (
                        <tr>
                          <td colSpan="9" className="p-6 text-center text-gray-500">
                            No unverified entries found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pending Transactions Tab */}
            {activeTab === 'pending' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-blue-600" />
                  Pending Transactions ({pendingTransactions.length})
                </h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Note:</strong> These transactions are waiting for approval from hospitals or admin.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left text-sm">Transaction ID</th>
                        <th className="p-3 text-left text-sm">Blood Group</th>
                        <th className="p-3 text-left text-sm">Quantity</th>
                        <th className="p-3 text-left text-sm">From</th>
                        <th className="p-3 text-left text-sm">To</th>
                        {showIDs && <th className="p-3 text-left text-sm">System IDs</th>}
                        <th className="p-3 text-left text-sm">Expiry</th>
                        <th className="p-3 text-left text-sm">Date</th>
                        <th className="p-3 text-left text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTransactions.map((item, idx) => (
                        <tr key={item._id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="p-3 text-xs font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => handleViewTransaction(item.transactionId)}>
                            {item.transactionId}
                          </td>
                          <td className="p-3 font-bold text-red-600">{item.bloodGroup}</td>
                          <td className="p-3">{item.quantity}</td>
                          <td className="p-3 text-sm">
                            {item.source_id?.organisationName || item.organisation?.organisationName || 'N/A'}
                          </td>
                          <td className="p-3 text-sm">
                            {item.target_id?.hospitalName || item.hospital?.hospitalName || 'N/A'}
                          </td>
                          {showIDs && (
                            <td className="p-3 text-xs text-gray-600">
                              {item.source_id?.systemId || item.organisation?.systemId} → {item.target_id?.systemId || item.hospital?.systemId}
                            </td>
                          )}
                          <td className="p-3 text-sm">{new Date(item.expiryDate).toLocaleDateString()}</td>
                          <td className="p-3 text-xs text-gray-600">{new Date(item.createdAt).toLocaleDateString()}</td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveTransaction(item.transactionId)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectTransaction(item.transactionId)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </button>
                              <button
                                onClick={() => handleViewTransaction(item.transactionId)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pendingTransactions.length === 0 && (
                        <tr>
                          <td colSpan={showIDs ? "9" : "8"} className="p-6 text-center text-gray-500">
                            No pending transactions
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Blood Transfers — Admin can step in */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <i className="fa fa-exchange-alt text-purple-600"></i> Pending Blood Transfers
                    {pendingTransfers.length > 0 && <span className="bg-purple-100 text-purple-700 text-sm px-2 py-0.5 rounded-full font-semibold">{pendingTransfers.length}</span>}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">Organisation → Hospital transfers that are pending. Admin can approve or reject when org/hospital can't act.</p>
                  {pendingTransfers.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 text-sm">No pending transfers</div>
                  ) : (
                    <div className="space-y-3">
                      {pendingTransfers.map(t => (
                        <div key={t._id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{t.status.replace(/_/g, ' ').toUpperCase()}</span>
                                <span className="text-xs text-gray-500 font-mono">{t.transferId}</span>
                              </div>
                              <p className="text-sm font-semibold">Org: <span className="text-purple-700">{t.organisation?.organisationName}</span></p>
                              <p className="text-sm font-semibold">Hospital: <span className="text-blue-700">{t.hospital?.hospitalName}</span></p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {t.items.map((item, idx) => (
                                  <span key={idx} className="bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-1 rounded font-semibold">
                                    {item.bloodGroup}: {item.quantity} units
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{new Date(t.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <button onClick={() => handleAdminApproveTransfer(t._id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-semibold">✅ Approve</button>
                              <button onClick={() => setRejectTransferId(t._id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-semibold">❌ Reject</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/*  Expiry Warnings Tab */}
            {activeTab === 'expiry' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <i className="fa fa-calendar-times text-orange-600"></i>
                  Expiry Warnings ({expiryWarnings.length} Blood Groups)
                </h2>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-orange-800">
                    <strong>⚠️ Warning:</strong> The following blood units are expiring within 5 days.
                  </p>
                </div>
                {expiryWarnings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No blood units expiring soon
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {expiryWarnings.map((warning, idx) => (
                      <div key={idx} className="bg-white border-2 border-orange-300 rounded-lg p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <span className="text-3xl font-bold text-orange-700">{warning.bloodGroup}</span>
                            <span className="ml-3 text-gray-700 font-semibold">{warning.totalUnits} units expiring</span>
                          </div>
                          <i className="fa fa-exclamation-triangle text-4xl text-orange-500"></i>
                        </div>
                        <div className="space-y-3">
                          {warning.items.map((item, i) => (
                            <div key={i} className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-gray-800">{item.quantity} units</span>
                                <span className="text-sm font-bold text-orange-600">
                                  {item.daysRemaining} day{item.daysRemaining !== 1 ? 's' : ''} left
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                <div>Expires: {new Date(item.expiryDate).toLocaleDateString()}</div>
                                <div>Owner: {item.owner}</div>
                                <div className="text-xs font-mono text-gray-500">TX: {item.transactionId}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Low Stock Alerts Tab */}
            {activeTab === 'lowstock' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <i className="fa fa-chart-line text-red-600"></i>
                  Low Stock Alerts ({lowStockAlerts.length})
                </h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800">
                    <strong>🚨 Alert:</strong> The following facilities have low blood stock.
                  </p>
                </div>
                {lowStockAlerts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    All facilities have adequate stock
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lowStockAlerts.map((alert, idx) => (
                      <div key={idx} className={`rounded-lg p-4 border-l-4 shadow ${alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                        alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                          'bg-yellow-50 border-yellow-500'
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${alert.severity === 'critical' ? 'bg-red-600 text-white' :
                            alert.severity === 'high' ? 'bg-orange-600 text-white' :
                              'bg-yellow-600 text-white'
                            }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <i className={`fa ${alert.type === 'hospital' ? 'fa-hospital' : 'fa-building'} text-2xl ${alert.severity === 'critical' ? 'text-red-600' :
                            alert.severity === 'high' ? 'text-orange-600' :
                              'text-yellow-600'
                            }`}></i>
                        </div>
                        <h3 className="font-bold text-gray-800 mb-1">{alert.name}</h3>
                        {showIDs && <p className="text-xs text-gray-500 mb-2">ID: {alert.systemId}</p>}
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-red-600">{alert.bloodGroup}</span>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-800">{alert.currentStock} units</div>
                            <div className="text-xs text-gray-600">Threshold: {alert.threshold}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  All Inventory Records ({inventory.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left text-sm">TX ID</th>
                        <th className="p-3 text-left text-sm">Type</th>
                        <th className="p-3 text-left text-sm">Blood</th>
                        <th className="p-3 text-left text-sm">Qty</th>
                        <th className="p-3 text-left text-sm">Donor</th>
                        <th className="p-3 text-left text-sm">Hospital</th>
                        <th className="p-3 text-left text-sm">Org</th>
                        {showIDs && <th className="p-3 text-left text-sm">System ID</th>}
                        <th className="p-3 text-left text-sm">Expiry</th>
                        <th className="p-3 text-left text-sm">Date</th>
                        <th className="p-3 text-left text-sm">Status</th>
                        <th className="p-3 text-left text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item, idx) => {
                        const isExpired = item.status === 'expired' || new Date(item.expiryDate) < new Date();
                        const isExpiringSoon = !isExpired && new Date(item.expiryDate) < new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

                        return (
                          <tr key={item._id} className={`${idx % 2 === 0 ? 'bg-gray-50' : ''} ${isExpired ? 'opacity-60' : ''}`}>
                            <td className="p-3 text-xs font-mono text-gray-600">{item.transactionId?.slice(-8)}</td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${item.inventoryType === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {item.inventoryType.toUpperCase()}
                                </span>
                                {!item.verified && (
                                  <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">Manual</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-bold text-red-600">{item.bloodGroup}</td>
                            <td className="p-3">{item.quantity}</td>
                            <td className="p-3 text-sm">{item.donor?.name || '-'}</td>
                            <td className="p-3 text-sm">{item.hospital?.hospitalName || '-'}</td>
                            <td className="p-3 text-sm">{item.organisation?.organisationName || '-'}</td>
                            {showIDs && (
                              <td className="p-3 text-xs text-gray-600">
                                {item.hospital?.systemId || item.organisation?.systemId || '-'}
                              </td>
                            )}
                            <td className="p-3">
                              <span className={isExpired ? 'text-red-600 font-bold text-xs' : isExpiringSoon ? 'text-orange-600 font-semibold text-xs' : 'text-gray-600 text-xs'}>
                                {new Date(item.expiryDate).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-gray-600">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'expired' ? 'bg-red-100 text-red-700' :
                                item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  item.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                    item.status === 'rejected' ? 'bg-gray-100 text-gray-700' :
                                      'bg-green-100 text-green-700'
                                }`}>
                                {item.status || 'completed'}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit"
                                >
                                  <i className="fa fa-edit w-4 h-4"></i>
                                </button>
                                <button
                                  onClick={() => handleDelete(item._id, 'inventory')}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Hospitals Tab */}
            {activeTab === 'hospitals' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  All Hospitals ({hospitals.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left text-sm">Name</th>
                        {showIDs && <th className="p-3 text-left text-sm">System ID</th>}
                        <th className="p-3 text-left text-sm">Email</th>
                        <th className="p-3 text-left text-sm">Phone</th>
                        <th className="p-3 text-left text-sm">Document</th>
                        <th className="p-3 text-left text-sm">Status</th>
                        <th className="p-3 text-left text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hospitals.map((hospital, idx) => (
                        <tr key={hospital._id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="p-3 font-semibold">{hospital.hospitalName}</td>
                          {showIDs && (
                            <td className="p-3 text-xs font-mono text-gray-600">{hospital.systemId || '-'}</td>
                          )}
                          <td className="p-3 text-sm">{hospital.email}</td>
                          <td className="p-3">{hospital.phone}</td>
                          <td className="p-3">
                            {hospital.registrationDocument ? (
                              <button
                                onClick={() => handleViewDocument(hospital._id)}
                                className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${hospital.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                              hospital.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                              {hospital.approvalStatus}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              {hospital.approvalStatus === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(hospital._id, 'hospital')}
                                    className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(hospital._id, 'hospital')}
                                    className="px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs flex items-center gap-1"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDelete(hospital._id, 'hospital')}
                                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Organizations Tab */}
            {activeTab === 'organisations' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  All Organizations ({organisations.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left text-sm">Name</th>
                        {showIDs && <th className="p-3 text-left text-sm">System ID</th>}
                        <th className="p-3 text-left text-sm">Email</th>
                        <th className="p-3 text-left text-sm">Phone</th>
                        <th className="p-3 text-left text-sm">Document</th>
                        <th className="p-3 text-left text-sm">Status</th>
                        <th className="p-3 text-left text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {organisations.map((org, idx) => (
                        <tr key={org._id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="p-3 font-semibold">{org.organisationName}</td>
                          {showIDs && (
                            <td className="p-3 text-xs font-mono text-gray-600">{org.systemId || '-'}</td>
                          )}
                          <td className="p-3 text-sm">{org.email}</td>
                          <td className="p-3">{org.phone}</td>
                          <td className="p-3">
                            {org.registrationDocument ? (
                              <button
                                onClick={() => handleViewDocument(org._id)}
                                className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${org.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                              org.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                              {org.approvalStatus}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              {org.approvalStatus === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(org._id, 'organisation')}
                                    className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(org._id, 'organisation')}
                                    className="px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs flex items-center gap-1"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDelete(org._id, 'organisation')}
                                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Donors Tab */}
            {activeTab === 'donors' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  All Donors ({donors.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left text-sm">Name</th>
                        <th className="p-3 text-left text-sm">Email</th>
                        <th className="p-3 text-left text-sm">Phone</th>
                        <th className="p-3 text-left text-sm">Blood</th>
                        <th className="p-3 text-left text-sm">Location</th>
                        <th className="p-3 text-left text-sm">Available</th>
                        <th className="p-3 text-left text-sm">Verified</th>
                        <th className="p-3 text-left text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donors.map((donor, idx) => (
                        <tr key={donor._id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="p-3">{donor.name}</td>
                          <td className="p-3 text-sm">{donor.email}</td>
                          <td className="p-3">{donor.phone}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold text-sm">
                              {donor.bloodtype}
                            </span>
                          </td>
                          <td className="p-3 text-sm">
                            {donor.address?.city}, {donor.address?.state}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${donor.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {donor.isAvailable ? '✓ Available' : '✗ Unavailable'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${donor.isAccountVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {donor.isAccountVerified ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleDelete(donor._id, 'donor')}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Document Viewer Modal */}
        {showDocModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  Registration Document
                </h3>
                <button
                  onClick={() => setShowDocModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
                <iframe
                  src={selectedDoc}
                  className="w-full h-[70vh] border rounded"
                  title="Document Viewer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  Reject {rejectTarget?.type}
                </h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  rows="4"
                  required
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleReject}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-semibold"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Inventory Modal */}
        <EditInventoryModal
          show={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchAllData}
          inventoryRecord={selectedInventory}
        />

        {/* Transaction Details Modal */}
        {showTransactionModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white">
                <h3 className="text-lg font-bold">Transaction Details</h3>
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                {/* Transaction Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-bold text-gray-800 mb-3">Transaction Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Transaction ID:</span>
                      <span className="ml-2 font-mono font-semibold">{selectedTransaction.transaction?.transactionId}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${selectedTransaction.transaction?.inventoryType === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {selectedTransaction.transaction?.inventoryType?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Blood Group:</span>
                      <span className="ml-2 font-bold text-red-600">{selectedTransaction.transaction?.bloodGroup}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <span className="ml-2 font-semibold">{selectedTransaction.transaction?.quantity} units</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Expiry Date:</span>
                      <span className="ml-2 font-semibold">{new Date(selectedTransaction.transaction?.expiryDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${selectedTransaction.transaction?.status === 'completed' ? 'bg-green-100 text-green-700' :
                        selectedTransaction.transaction?.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          selectedTransaction.transaction?.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        {selectedTransaction.transaction?.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Verified:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${selectedTransaction.transaction?.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {selectedTransaction.transaction?.verified ? 'Yes' : 'No (Manual)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-2">{new Date(selectedTransaction.transaction?.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Source & Target */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                    <h4 className="font-bold text-gray-800 mb-2">📤 Source</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Type:</strong> {selectedTransaction.transaction?.source_type || 'N/A'}</div>
                      <div><strong>Name:</strong> {
                        selectedTransaction.transaction?.source_id?.name ||
                        selectedTransaction.transaction?.source_id?.organisationName ||
                        selectedTransaction.transaction?.source_name ||
                        'N/A'
                      }</div>
                      {showIDs && selectedTransaction.transaction?.source_id?.systemId && (
                        <div><strong>ID:</strong> <span className="font-mono">{selectedTransaction.transaction.source_id.systemId}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <h4 className="font-bold text-gray-800 mb-2">📥 Target</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Type:</strong> {selectedTransaction.transaction?.target_type || 'N/A'}</div>
                      <div><strong>Name:</strong> {
                        selectedTransaction.transaction?.target_id?.hospitalName ||
                        selectedTransaction.transaction?.target_id?.organisationName ||
                        selectedTransaction.transaction?.target_name ||
                        'N/A'
                      }</div>
                      {showIDs && selectedTransaction.transaction?.target_id?.systemId && (
                        <div><strong>ID:</strong> <span className="font-mono">{selectedTransaction.transaction.target_id.systemId}</span></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit Trail */}
                {selectedTransaction.auditLogs && selectedTransaction.auditLogs.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-800 mb-3">📋 Audit Trail</h4>
                    <div className="space-y-2">
                      {selectedTransaction.auditLogs.map((log, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border-l-4 border-gray-400 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-800">{log.action.replace(/_/g, ' ').toUpperCase()}</span>
                            <span className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="text-gray-600">{log.description}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            By: {log.userId?.name || log.userId?.hospitalName || log.userId?.organisationName || 'System'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />

        {/* Reject Transfer Modal */}
        {rejectTransferId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-6">
              <h3 className="font-bold text-lg text-gray-800 mb-3">Reject Transfer</h3>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                rows={3} placeholder="Reason for rejection (required)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 resize-none mb-3" />
              <div className="flex gap-3">
                <button onClick={handleAdminRejectTransfer} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 text-sm">Reject</button>
                <button onClick={() => setRejectTransferId(null)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Blood Group Breakdown Modal */}
        {selectedBloodGroup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
              <div className="bg-red-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                <h2 className="font-bold text-lg">{selectedBloodGroup} — Stock Breakdown</h2>
                <button onClick={() => { setSelectedBloodGroup(null); setBloodGroupDetails([]); }} className="hover:opacity-70">
                  <i className="fa fa-times text-xl"></i>
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                {bloodGroupDetails.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No data for {selectedBloodGroup}</p>
                ) : (
                  <div className="space-y-3">
                    {bloodGroupDetails.map((d, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div>
                          <p className="font-semibold text-gray-800">{d.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{d.type}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${d.net === 0 ? 'text-red-600' : d.net < 10 ? 'text-orange-600' : 'text-green-600'}`}>{d.net}</p>
                          <p className="text-xs text-gray-500">units</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;