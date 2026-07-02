import transferModel from "../models/transferModel.js";
import inventoryModels from "../models/inventoryModels.js";
import userModel from "../models/userModels.js";

// ── Helper: net stock for an org ────────────────────────────────
const getOrgStock = async (orgId) => {
    const inv = await inventoryModels.find({
        organisation: orgId,
        status: { $ne: 'expired' },
        expiryDate: { $gt: new Date() }
    });
    const stock = {};
    inv.forEach(i => {
        stock[i.bloodGroup] = (stock[i.bloodGroup] || 0) + (i.inventoryType === 'in' ? i.quantity : -i.quantity);
    });
    Object.keys(stock).forEach(g => { if (stock[g] < 0) stock[g] = 0; });
    return stock;
};

// ── Helper: create OUT (org) + IN (hospital) inventory records ──
const createInventoryRecords = async (transfer) => {
    const records = [];
    for (const item of transfer.items) {
        const expiryDate = item.expiryDate || new Date(Date.now() + 42 * 86400000);
        const out = await inventoryModels.create({
            inventoryType: 'out',
            bloodGroup: item.bloodGroup,
            quantity: item.quantity,
            expiryDate,
            organisation: transfer.organisation,
            hospital: transfer.hospital,
            source_type: 'organisation',
            source_id: transfer.organisation,
            target_type: 'hospital',
            target_id: transfer.hospital,
            status: 'completed',
            verified: true,
            notes: `Transfer ${transfer.transferId} — sent to hospital`
        });
        const inp = await inventoryModels.create({
            inventoryType: 'in',
            bloodGroup: item.bloodGroup,
            quantity: item.quantity,
            expiryDate,
            hospital: transfer.hospital,
            organisation: transfer.organisation,
            source_type: 'organisation',
            source_id: transfer.organisation,
            target_type: 'hospital',
            target_id: transfer.hospital,
            status: 'completed',
            verified: true,
            notes: `Transfer ${transfer.transferId} — received from organisation`
        });
        records.push(out._id, inp._id);
    }
    return records;
};

// ── Org initiates transfer (org pushes blood to hospital directly) ─
export const orgInitiateTransfer = async (req, res) => {
    try {
        const { hospitalId, items, notes } = req.body;
        const user = await userModel.findById(req.body.userId);
        if (!user || user.role !== 'organisation')
            return res.json({ success: false, message: 'Only organisations can initiate transfers' });
        if (!hospitalId || !items?.length)
            return res.json({ success: false, message: 'Hospital and blood items required' });
        const hospital = await userModel.findById(hospitalId);
        if (!hospital || hospital.role !== 'hospital')
            return res.json({ success: false, message: 'Hospital not found' });

        // Validate stock
        const stock = await getOrgStock(req.body.userId);
        for (const item of items) {
            if (!item.bloodGroup || !item.quantity || !item.expiryDate)
                return res.json({ success: false, message: 'Each item needs blood group, quantity and expiry date' });
            const avail = stock[item.bloodGroup] || 0;
            if (avail < parseInt(item.quantity))
                return res.json({ success: false, message: `Insufficient ${item.bloodGroup}: have ${avail}, need ${item.quantity}` });
        }

        // Create inventory records immediately — org-initiated = no approval needed
        const transfer = await transferModel.create({
            organisation: req.body.userId,
            hospital: hospitalId,
            items: items.map(i => ({ bloodGroup: i.bloodGroup, quantity: parseInt(i.quantity), expiryDate: new Date(i.expiryDate) })),
            notes: notes || '',
            status: 'completed',
            initiatedBy: 'organisation',
            orgApprovedBy: req.body.userId,
            orgApprovedAt: new Date()
        });

        const records = await createInventoryRecords(transfer);
        transfer.inventoryRecords = records;
        await transfer.save();

        await transfer.populate('hospital', 'hospitalName email');
        return res.json({ success: true, message: 'Transfer completed. Blood stock updated on both dashboards.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 1. Hospital sends blood request to org ──────────────────────
export const createRequest = async (req, res) => {
    try {
        const { organisationId, items, notes } = req.body;
        const user = await userModel.findById(req.body.userId);
        if (!user || user.role !== 'hospital')
            return res.json({ success: false, message: 'Only hospitals can send blood requests' });
        if (!organisationId || !items?.length)
            return res.json({ success: false, message: 'Organisation and blood items required' });
        const org = await userModel.findById(organisationId);
        if (!org || org.role !== 'organisation')
            return res.json({ success: false, message: 'Organisation not found' });
        const cleanItems = items.map(i => ({ bloodGroup: i.bloodGroup, quantity: parseInt(i.quantity) }));
        for (const item of cleanItems) {
            if (!item.bloodGroup || !item.quantity || item.quantity < 1)
                return res.json({ success: false, message: 'Each item needs a valid blood group and quantity' });
        }
        const transfer = await transferModel.create({
            organisation: organisationId,
            hospital: req.body.userId,
            items: cleanItems,
            notes: notes || '',
            status: 'requested',
            initiatedBy: 'hospital'
        });
        await transfer.populate('organisation', 'organisationName email');
        await transfer.populate('hospital', 'hospitalName email');
        return res.json({ success: true, message: 'Blood request sent to organisation.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 2. Org checks stock for a specific request ──────────────────
export const checkRequestStock = async (req, res) => {
    try {
        const { transferId } = req.params;
        const user = await userModel.findById(req.body.userId);
        if (!user || user.role !== 'organisation')
            return res.json({ success: false, message: 'Organisation only' });
        const transfer = await transferModel.findById(transferId);
        if (!transfer) return res.json({ success: false, message: 'Request not found' });
        const stock = await getOrgStock(req.body.userId);
        const stockCheck = transfer.items.map(item => ({
            bloodGroup: item.bloodGroup,
            requested: item.quantity,
            available: stock[item.bloodGroup] || 0,
            sufficient: (stock[item.bloodGroup] || 0) >= item.quantity
        }));
        const allSufficient = stockCheck.every(s => s.sufficient);
        return res.json({ success: true, stockCheck, allSufficient });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 3. Org approves → immediately creates inventory records ─────
// No admin step needed for org-initiated or hospital-requested transfers
export const orgApproveRequest = async (req, res) => {
    try {
        const { transferId } = req.params;
        const { items } = req.body;
        const user = await userModel.findById(req.body.userId);
        if (!user || user.role !== 'organisation')
            return res.json({ success: false, message: 'Organisation only' });
        const transfer = await transferModel.findById(transferId)
            .populate('organisation', 'organisationName')
            .populate('hospital', 'hospitalName');
        if (!transfer) return res.json({ success: false, message: 'Request not found' });
        if (!['requested'].includes(transfer.status))
            return res.json({ success: false, message: `Cannot approve — status is ${transfer.status}` });
        // Re-validate stock
        const stock = await getOrgStock(req.body.userId);
        for (const item of transfer.items) {
            const avail = stock[item.bloodGroup] || 0;
            if (avail < item.quantity)
                return res.json({ success: false, message: `Insufficient ${item.bloodGroup}: need ${item.quantity}, have ${avail}` });
        }
        // Merge expiry dates
        if (items) {
            transfer.items = transfer.items.map((item, idx) => ({
                bloodGroup: item.bloodGroup,
                quantity: item.quantity,
                expiryDate: items[idx]?.expiryDate ? new Date(items[idx].expiryDate) : new Date(Date.now() + 42 * 86400000)
            }));
        } else {
            transfer.items = transfer.items.map(item => ({
                bloodGroup: item.bloodGroup,
                quantity: item.quantity,
                expiryDate: item.expiryDate || new Date(Date.now() + 42 * 86400000)
            }));
        }
        // Create inventory records immediately
        const records = await createInventoryRecords(transfer);
        transfer.status = 'completed';
        transfer.orgApprovedBy = req.body.userId;
        transfer.orgApprovedAt = new Date();
        transfer.inventoryRecords = records;
        await transfer.save();
        return res.json({ success: true, message: 'Transfer approved. Blood stock updated on both dashboards.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 4. Org rejects ──────────────────────────────────────────────
export const orgRejectRequest = async (req, res) => {
    try {
        const { transferId } = req.params;
        const { reason } = req.body;
        const user = await userModel.findById(req.body.userId);
        if (!user || user.role !== 'organisation')
            return res.json({ success: false, message: 'Organisation only' });
        const transfer = await transferModel.findById(transferId);
        if (!transfer) return res.json({ success: false, message: 'Request not found' });
        if (transfer.status !== 'requested')
            return res.json({ success: false, message: `Cannot reject — status is ${transfer.status}` });
        transfer.status = 'rejected';
        transfer.orgRejectionReason = reason || 'Insufficient stock or other reason';
        await transfer.save();
        return res.json({ success: true, message: 'Request rejected. Hospital has been notified.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 5. Admin can approve any stuck transfer ─────────────────────
export const adminApprove = async (req, res) => {
    try {
        const { transferId } = req.params;
        const user = await userModel.findById(req.body.userId);
        if (!user || user.role !== 'admin')
            return res.json({ success: false, message: 'Admin only' });
        const transfer = await transferModel.findById(transferId)
            .populate('organisation', 'organisationName')
            .populate('hospital', 'hospitalName');
        if (!transfer) return res.json({ success: false, message: 'Transfer not found' });
        if (transfer.status === 'completed')
            return res.json({ success: false, message: 'Transfer already completed' });
        // Final stock check
        const stock = await getOrgStock(transfer.organisation._id);
        for (const item of transfer.items) {
            const avail = stock[item.bloodGroup] || 0;
            if (avail < item.quantity)
                return res.json({ success: false, message: `Insufficient ${item.bloodGroup} in org: need ${item.quantity}, have ${avail}` });
        }
        // Ensure items have expiry
        transfer.items = transfer.items.map(item => ({
            bloodGroup: item.bloodGroup,
            quantity: item.quantity,
            expiryDate: item.expiryDate || new Date(Date.now() + 42 * 86400000)
        }));
        const records = await createInventoryRecords(transfer);
        transfer.status = 'completed';
        transfer.adminApprovedBy = req.body.userId;
        transfer.adminApprovedAt = new Date();
        transfer.inventoryRecords = records;
        await transfer.save();
        return res.json({ success: true, message: 'Transfer completed by admin. Stock updated.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 6. Admin rejects ────────────────────────────────────────────
export const adminReject = async (req, res) => {
    try {
        const { transferId } = req.params;
        const { reason } = req.body;
        const user = await userModel.findById(req.body.userId);
        if (!user || user.role !== 'admin')
            return res.json({ success: false, message: 'Admin only' });
        const transfer = await transferModel.findById(transferId);
        if (!transfer) return res.json({ success: false, message: 'Transfer not found' });
        transfer.status = 'rejected';
        transfer.adminRejectionReason = reason || 'Rejected by admin';
        await transfer.save();
        return res.json({ success: true, message: 'Transfer rejected by admin.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── GET: transfers for org ──────────────────────────────────────
export const getOrgTransfers = async (req, res) => {
    try {
        const transfers = await transferModel.find({ organisation: req.body.userId })
            .populate('hospital', 'hospitalName email')
            .populate('orgApprovedBy', 'name organisationName')
            .sort({ createdAt: -1 });
        return res.json({ success: true, transfers });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── GET: transfers for hospital ─────────────────────────────────
export const getHospitalTransfers = async (req, res) => {
    try {
        const transfers = await transferModel.find({ hospital: req.body.userId })
            .populate('organisation', 'organisationName email')
            .sort({ createdAt: -1 });
        return res.json({ success: true, transfers });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── GET: admin — all non-completed transfers ────────────────────
export const getAllPendingTransfers = async (req, res) => {
    try {
        const user = await userModel.findById(req.body.userId);
        if (!user || user.role !== 'admin')
            return res.json({ success: false, message: 'Admin only' });
        const transfers = await transferModel.find({ status: { $in: ['requested', 'rejected'] } })
            .populate('organisation', 'organisationName email')
            .populate('hospital', 'hospitalName email')
            .sort({ createdAt: -1 });
        return res.json({ success: true, transfers });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};