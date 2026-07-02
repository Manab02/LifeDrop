import mongoose from "mongoose";

const transferItemSchema = new mongoose.Schema({
    bloodGroup: { type: String, required: true, enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] },
    quantity: { type: Number, required: true, min: 1 },
    expiryDate: { type: Date }   // set by org when they approve; optional on request
}, { _id: false });

const transferSchema = new mongoose.Schema({
    transferId: {
        type: String, unique: true,
        default: () => `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    },
    organisation: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    items: { type: [transferItemSchema], required: true },
    notes: { type: String, default: '' },

    // Status flow:
    // 'requested'        → hospital sent a blood request to org
    // 'org_approved'     → org confirmed stock & sent blood
    // 'org_rejected'     → org rejected (insufficient stock or other reason)
    // 'hospital_approved'→ hospital confirmed receiving
    // 'hospital_rejected'→ hospital rejected
    // 'admin_approved'   → admin finalised → inventory records created
    // 'admin_rejected'   → admin rejected
    status: {
        type: String,
        enum: ['requested', 'org_approved', 'org_rejected', 'hospital_approved', 'hospital_rejected', 'admin_approved', 'admin_rejected'],
        default: 'requested'
    },

    initiatedBy: { type: String, enum: ['hospital', 'organisation'], default: 'hospital' },

    orgApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    orgApprovedAt: { type: Date, default: null },
    orgRejectionReason: { type: String, default: '' },

    hospitalApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    hospitalApprovedAt: { type: Date, default: null },
    hospitalRejectionReason: { type: String, default: '' },

    adminApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    adminApprovedAt: { type: Date, default: null },
    adminRejectionReason: { type: String, default: '' },

    inventoryRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' }]
}, { timestamps: true });

export default mongoose.model('Transfer', transferSchema);