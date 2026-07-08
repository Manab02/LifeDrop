import transferModel from "../models/transferModel.js";
import inventoryModels from "../models/inventoryModels.js";
import userModel from "../models/userModels.js";

// ── Helper: net stock for an org ─────────────────────────────────
const getOrgStock = async (orgId) => {
    const inv = await inventoryModels.find({
        organisation: orgId,
        status: { $ne: 'expired' },
        expiryDate: { $gt: new Date() },
        $or: [
            { inventoryType: 'out' },
            { inventoryType: 'in', target_type: { $ne: 'hospital' } }
        ]
    });
    const stock = {};
    inv.forEach(i => {
        stock[i.bloodGroup] = (stock[i.bloodGroup] || 0) + (i.inventoryType === 'in' ? i.quantity : -i.quantity);
    });
    Object.keys(stock).forEach(g => { if (stock[g] < 0) stock[g] = 0; });
    return stock;
};

// ── Helper: org's OUT record only (their stock decreases now) ────
const createOrgOutRecords = async (transfer) => {
    const records = [];
    for (const item of transfer.items) {
        const expiryDate = item.expiryDate || new Date(Date.now() + 42 * 86400000);
        const orgId = transfer.organisation._id || transfer.organisation;
        const hospId = transfer.hospital._id || transfer.hospital;

        const out = await inventoryModels.create({
            inventoryType: 'out',
            bloodGroup: item.bloodGroup,
            quantity: item.quantity,
            expiryDate,
            organisation: orgId,
            hospital: hospId,
            source_type: 'organisation',
            target_type: 'hospital',
            status: 'completed',
            verified: true,
            notes: `Transfer ${transfer.transferId}`
        });
        records.push(out._id);
    }
    return records;
};

// ── Helper: hospital's IN record only (their stock increases now) ─
const createHospitalInRecords = async (transfer) => {
    const records = [];
    for (const item of transfer.items) {
        const expiryDate = item.expiryDate || new Date(Date.now() + 42 * 86400000);
        const orgId = transfer.organisation._id || transfer.organisation;
        const hospId = transfer.hospital._id || transfer.hospital;

        const inp = await inventoryModels.create({
            inventoryType: 'in',
            bloodGroup: item.bloodGroup,
            quantity: item.quantity,
            expiryDate,
            hospital: hospId,
            organisation: orgId,
            source_type: 'organisation',
            target_type: 'hospital',
            status: 'completed',
            verified: true,
            notes: `Transfer ${transfer.transferId}`
        });
        records.push(inp._id);
    }
    return records;
};

// ── Helper: give the org back stock the hospital rejected ────────
const createOrgReturnRecords = async (transfer, reason) => {
    const records = [];
    for (const item of transfer.items) {
        const orgId = transfer.organisation._id || transfer.organisation;
        const ret = await inventoryModels.create({
            inventoryType: 'in',
            bloodGroup: item.bloodGroup,
            quantity: item.quantity,
            expiryDate: item.expiryDate || new Date(Date.now() + 42 * 86400000),
            organisation: orgId,
            source_type: 'manual',
            status: 'completed',
            verified: true,
            notes: `Returned — hospital rejected transfer ${transfer.transferId}: ${reason || ''}`
        });
        records.push(ret._id);
    }
    return records;
};

// ── 1. Org initiates transfer directly (no approval needed) ──────
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

        const transfer = await transferModel.create({
            organisation: req.body.userId,
            hospital: hospitalId,
            items: items.map(i => ({ bloodGroup: i.bloodGroup, quantity: parseInt(i.quantity), expiryDate: new Date(i.expiryDate) })),
            notes: notes || '',
            status: 'org_approved',   // sent — this is a notification to the hospital, not an auto-credit
            initiatedBy: 'organisation',
            orgApprovedBy: req.body.userId,
            orgApprovedAt: new Date()
        });

        const records = await createOrgOutRecords(transfer);
        transfer.inventoryRecords = records;
        await transfer.save();
        await transfer.populate('hospital', 'hospitalName email');

        return res.json({ success: true, message: 'Sent! Your stock has decreased. The hospital has been notified and can add their own record.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 2. Hospital sends blood request to org ────────────────────────
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

        for (const item of items) {
            if (!item.bloodGroup || !item.quantity || item.quantity < 1)
                return res.json({ success: false, message: 'Each item needs a valid blood group and quantity' });
        }

        const transfer = await transferModel.create({
            organisation: organisationId,
            hospital: req.body.userId,
            items: items.map(i => ({ bloodGroup: i.bloodGroup, quantity: parseInt(i.quantity) })),
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

// ── 3. Org checks stock for a request ────────────────────────────
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

// ── 4. Org approves hospital request → creates inventory immediately
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
        if (transfer.status !== 'requested')
            return res.json({ success: false, message: `Cannot approve — status is ${transfer.status}` });

        // Re-validate stock
        const stock = await getOrgStock(req.body.userId);
        for (const item of transfer.items) {
            const avail = stock[item.bloodGroup] || 0;
            if (avail < item.quantity)
                return res.json({ success: false, message: `Insufficient ${item.bloodGroup}: need ${item.quantity}, have ${avail}` });
        }

        // Merge expiry dates from org's approval form
        transfer.items = transfer.items.map((item, idx) => ({
            bloodGroup: item.bloodGroup,
            quantity: item.quantity,
            expiryDate: items?.[idx]?.expiryDate ? new Date(items[idx].expiryDate) : new Date(Date.now() + 42 * 86400000)
        }));

        const records = await createOrgOutRecords(transfer);
        transfer.status = 'org_approved';   // awaiting hospital to confirm receipt
        transfer.orgApprovedBy = req.body.userId;
        transfer.orgApprovedAt = new Date();
        transfer.inventoryRecords = records;
        await transfer.save();

        return res.json({ success: true, message: 'Approved! Your stock has decreased. Waiting for the hospital to confirm receipt.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 5. Org rejects hospital request ──────────────────────────────
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

        transfer.status = 'org_rejected';
        transfer.orgRejectionReason = reason || 'Insufficient stock or other reason';
        await transfer.save();

        return res.json({ success: true, message: 'Request rejected.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 5b. Hospital confirms receipt of a request the org already sent ──
// Only makes sense for hospital-initiated requests (org already decreased
// their stock at approval time) — creates the hospital's own IN record now.
export const hospitalApproveTransfer = async (req, res) => {
    try {
        const { transferId } = req.params;
        const user = await userModel.findById(req.body.userId);
        if (!user || user.role !== 'hospital')
            return res.json({ success: false, message: 'Hospital only' });

        const transfer = await transferModel.findById(transferId)
            .populate('organisation', 'organisationName')
            .populate('hospital', 'hospitalName');
        if (!transfer) return res.json({ success: false, message: 'Transfer not found' });
        if (transfer.hospital._id.toString() !== req.body.userId)
            return res.json({ success: false, message: 'Not your transfer' });
        if (transfer.status !== 'org_approved')
            return res.json({ success: false, message: `Cannot confirm — status is ${transfer.status}` });

        const records = await createHospitalInRecords(transfer);
        transfer.status = 'hospital_approved';
        transfer.hospitalApprovedBy = req.body.userId;
        transfer.hospitalApprovedAt = new Date();
        transfer.inventoryRecords = [...(transfer.inventoryRecords || []), ...records];
        await transfer.save();

        return res.json({ success: true, message: 'Receipt confirmed! Your stock has increased.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 5c. Hospital rejects — gives the org their stock back ────────────
export const hospitalRejectTransfer = async (req, res) => {
    try {
        const { transferId } = req.params;
        const { reason } = req.body;
        const user = await userModel.findById(req.body.userId);
        if (!user || user.role !== 'hospital')
            return res.json({ success: false, message: 'Hospital only' });

        const transfer = await transferModel.findById(transferId)
            .populate('organisation', 'organisationName')
            .populate('hospital', 'hospitalName');
        if (!transfer) return res.json({ success: false, message: 'Transfer not found' });
        if (transfer.hospital._id.toString() !== req.body.userId)
            return res.json({ success: false, message: 'Not your transfer' });
        if (transfer.status !== 'org_approved')
            return res.json({ success: false, message: `Cannot reject — status is ${transfer.status}` });

        const records = await createOrgReturnRecords(transfer, reason);
        transfer.status = 'hospital_rejected';
        transfer.hospitalRejectionReason = reason || 'Rejected by hospital';
        transfer.inventoryRecords = [...(transfer.inventoryRecords || []), ...records];
        await transfer.save();

        return res.json({ success: true, message: 'Rejected. The stock has been returned to the organisation.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 6. Admin approves any stuck/pending transfer ──────────────────
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
        if (['hospital_approved', 'admin_approved'].includes(transfer.status))
            return res.json({ success: false, message: 'Transfer already completed' });

        // Stock check only needed if the org side hasn't already been deducted
        if (transfer.status !== 'org_approved') {
            const stock = await getOrgStock(transfer.organisation._id);
            for (const item of transfer.items) {
                const avail = stock[item.bloodGroup] || 0;
                if (avail < item.quantity)
                    return res.json({ success: false, message: `Insufficient ${item.bloodGroup}: need ${item.quantity}, have ${avail}` });
            }
        }

        // Add default expiry if missing
        transfer.items = transfer.items.map(item => ({
            bloodGroup: item.bloodGroup,
            quantity: item.quantity,
            expiryDate: item.expiryDate || new Date(Date.now() + 42 * 86400000)
        }));

        const newRecords = [];
        if (transfer.status !== 'org_approved') {
            newRecords.push(...await createOrgOutRecords(transfer));
        }
        newRecords.push(...await createHospitalInRecords(transfer));

        transfer.status = 'admin_approved';
        transfer.adminApprovedBy = req.body.userId;
        transfer.adminApprovedAt = new Date();
        transfer.inventoryRecords = [...(transfer.inventoryRecords || []), ...newRecords];
        await transfer.save();

        return res.json({ success: true, message: 'Transfer approved by admin. Stock updated on both dashboards.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 7. Admin rejects ─────────────────────────────────────────────
export const adminReject = async (req, res) => {
    try {
        const { transferId } = req.params;
        const { reason } = req.body;
        const user = await userModel.findById(req.body.userId);
        if (!user || user.role !== 'admin')
            return res.json({ success: false, message: 'Admin only' });

        const transfer = await transferModel.findById(transferId);
        if (!transfer) return res.json({ success: false, message: 'Transfer not found' });

        transfer.status = 'admin_rejected';
        transfer.adminRejectionReason = reason || 'Rejected by admin';
        await transfer.save();

        return res.json({ success: true, message: 'Transfer rejected by admin.', transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── 5d. Hospital dismisses a push-notification from their Pending list ──
// (Used after they've manually added their own record, or just to clear it.)
export const acknowledgeTransfer = async (req, res) => {
    try {
        const { transferId } = req.params;
        const transfer = await transferModel.findById(transferId);
        if (!transfer) return res.json({ success: false, message: 'Transfer not found' });
        if (transfer.hospital.toString() !== req.body.userId)
            return res.json({ success: false, message: 'Not your transfer' });

        transfer.hospitalAcknowledged = true;
        await transfer.save();

        return res.json({ success: true, transfer });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── GET: transfers for org ────────────────────────────────────────
export const getOrgTransfers = async (req, res) => {
    try {
        const transfers = await transferModel.find({ organisation: req.body.userId })
            .populate('hospital', 'hospitalName email')
            .sort({ createdAt: -1 });
        return res.json({ success: true, transfers });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── GET: transfers for hospital ───────────────────────────────────
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

// ── GET: admin — all non-completed transfers ──────────────────────
export const getAllPendingTransfers = async (req, res) => {
    try {
        const user = await userModel.findById(req.body.userId);
        if (!user || user.role !== 'admin')
            return res.json({ success: false, message: 'Admin only' });

        const transfers = await transferModel.find({
            status: { $in: ['requested', 'org_rejected', 'hospital_rejected'] }
        })
            .populate('organisation', 'organisationName email')
            .populate('hospital', 'hospitalName email')
            .sort({ createdAt: -1 });

        return res.json({ success: true, transfers });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};