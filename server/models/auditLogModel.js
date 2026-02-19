import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    userRole: {
        type: String,
        enum: ['admin', 'donor', 'organisation', 'hospital'],
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'create_inventory',
            'update_inventory',
            'delete_inventory',
            'approve_transaction',
            'reject_transaction',
            'decrease_stock',
            'approve_user',
            'reject_user',
            'delete_user',
            'manual_entry',
            'system_expiry'
        ]
    },
    targetType: {
        type: String,
        enum: ['inventory', 'user', 'transaction', 'system']
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId
    },
    transactionId: {
        type: String
    },
    changes: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    description: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
    },
    errorMessage: {
        type: String
    }
}, { timestamps: true });

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ transactionId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);