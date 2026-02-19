import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        enum: ['admin', 'donor', 'organisation', 'hospital']
    },
    name: {
        type: String,
        required: function () {
            return this.role === 'donor' || this.role === 'admin';
        }
    },
    organisationName: {
        type: String,
        required: function () {
            return this.role === 'organisation';
        }
    },
    hospitalName: {
        type: String,
        required: function () {
            return this.role === 'hospital';
        }
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    bloodtype: {
        type: String,
        required: function () {
            return this.role === 'donor';
        }
    },
    age: {
        type: String,
        required: function () {
            return this.role === 'donor';
        }
    },
    address: {
        state: {
            type: String,
            required: function () {
                return this.role === 'donor';
            }
        },
        district: {
            type: String,
            required: function () {
                return this.role === 'donor';
            }
        },
        city: {
            type: String,
            required: function () {
                return this.role === 'donor';
            }
        }
    },
    phone: {
        type: String,
        required: true
    },
    isAvailable: {
        type: Boolean,
        default: true,
        required: function () {
            return this.role === 'donor';
        }
    },
    registrationDocument: {
        filename: {
            type: String,
            required: function () {
                return this.role === 'hospital' || this.role === 'organisation';
            }
        },
        originalName: String,
        path: String,
        mimetype: String,
        size: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: function () {
            return this.role === 'donor' ? 'approved' : 'pending';
        }
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    approvedAt: Date,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    verifyOtp: {
        type: String,
        default: ''
    },
    verifyOtpExprireAt: {
        type: Number,
        default: 0
    },
    isAccountVerified: {
        type: Boolean,
        default: false
    },
    resetOtp: {
        type: String,
        default: ''
    },
    resetOtpExprireAt: {
        type: Number,
        default: 0
    },
    systemId: {
        type: String,
        unique: true,
        sparse: true,
        default: function () {
            if (this.role === 'hospital') {
                return `HSP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            } else if (this.role === 'organisation') {
                return `ORG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            }
            return undefined;
        }
    },
    lastDonationDate: {
        type: Date,
        default: null
    },
    nextEligibleDate: {
        type: Date,
        default: null
    },
    lowStockThreshold: {
        type: Number,
        default: 20
    },
    expiryNotificationDays: {
        type: Number,
        default: 5
    },
    notificationsEnabled: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const userModel = mongoose.models.user || mongoose.model('user', userSchema);

export default userModel;