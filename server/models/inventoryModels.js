
import mongoose from "mongoose";

export const inventorySchema = new mongoose.Schema({
    transactionId: {
        type: String,
        unique: true,
        required: true,
        default: () => `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    },

    inventoryType: {
        type: String,
        required: true,
        enum: ['in', 'out']
    },

    bloodGroup: {
        type: String,
        required: true,
        enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
    },

    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
    },

    expiryDate: {
        type: Date,
        required: [true, 'Expiry date is mandatory for all blood units'],
        validate: {
            validator: function (value) {
                return value > new Date();
            },
            message: 'Expiry date must be in the future'
        }
    },

    verified: {
        type: Boolean,
        default: true
    },

    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'expired'],
        default: 'completed'
    },

    source_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },

    source_type: {
        type: String,
        enum: ['donor', 'organisation', 'hospital', 'manual'],
        default: null
    },

    source_name: {
        type: String,
        default: ''
    },

    target_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },

    target_type: {
        type: String,
        enum: ['organisation', 'hospital', 'patient', 'manual'],
        default: null
    },

    target_name: {
        type: String,
        default: ''
    },

    patientName: {
        type: String,
        default: ''
    },

    hospitalNameText: {
        type: String,
        default: ''
    },

    organisationNameText: {
        type: String,
        default: ''
    },

    organisation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },

    hospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null
    },

    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },

    // APPROVAL TRACKING
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },

    approvedAt: {
        type: Date,
        default: null
    },

    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },

    rejectedAt: {
        type: Date,
        default: null
    },

    rejectionReason: {
        type: String,
        default: ''
    },

    notes: {
        type: String,
        default: ''
    },

    expiryNotificationSent: {
        type: Boolean,
        default: false
    },

    autoExpired: {
        type: Boolean,
        default: false
    },

    expiredAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true,
    indexes: [
        { transactionId: 1 },
        { expiryDate: 1 },
        { status: 1 },
        { verified: 1 }
    ]
});

inventorySchema.pre('save', function (next) {
    if (!this.source_id && !this.target_id && !this.donor && !this.hospital && !this.organisation) {
        this.verified = false;
    }

    if (this.donor && !this.source_type) {
        this.source_type = 'donor';
        this.source_id = this.donor;
    }

    if (this.hospital && this.inventoryType === 'out') {
        this.target_type = 'hospital';
        this.target_id = this.hospital;
    }

    if (this.organisation && this.inventoryType === 'in') {
        this.target_type = 'organisation';
        this.target_id = this.organisation;
    }

    next();
});

inventorySchema.statics.findExpiringSoon = function (daysThreshold = 5) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysThreshold);

    return this.find({
        expiryDate: {
            $gte: new Date(),
            $lte: futureDate
        },
        status: { $ne: 'expired' },
        autoExpired: false
    });
};

inventorySchema.statics.findExpired = function () {
    return this.find({
        expiryDate: { $lt: new Date() },
        status: { $ne: 'expired' },
        autoExpired: false
    });
};

export default mongoose.model('Inventory', inventorySchema);