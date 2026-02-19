
import express from "express";
import userModel from "../models/userModels.js";
import inventoryModels from "../models/inventoryModels.js";
import auditLogModel from "../models/auditLogModel.js";
import userAuth from "../middleware/userAuth.js";
import transporter from "../config/nodemailer.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { checkExpiredBlood, checkExpiringSoon } from "../services/expiryService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const isAdmin = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.body.userId);

        if (!user || user.role !== 'admin') {
            return res.json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.json({
            success: false,
            message: 'Authentication error'
        });
    }
};

router.get('/donor-list', userAuth, isAdmin, async (req, res) => {
    try {
        const donors = await userModel.find({ role: 'donor' })
            .select('-password')
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            data: donors,
            count: donors.length
        });
    } catch (error) {
        console.error('Get donor list error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/hospital-list', userAuth, isAdmin, async (req, res) => {
    try {
        const hospitals = await userModel.find({ role: 'hospital' })
            .select('-password')
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            data: hospitals,
            count: hospitals.length
        });
    } catch (error) {
        console.error('Get hospital list error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/org-list', userAuth, isAdmin, async (req, res) => {
    try {
        const organisations = await userModel.find({ role: 'organisation' })
            .select('-password')
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            data: organisations,
            count: organisations.length
        });
    } catch (error) {
        console.error('Get organisation list error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/all-inventory', userAuth, isAdmin, async (req, res) => {
    try {
        const { verified, status, bloodGroup, page = 1, limit = 100 } = req.query;

        let query = {};

        if (verified !== undefined) {
            query.verified = verified === 'true';
        }

        if (status) {
            query.status = status;
        }

        if (bloodGroup) {
            query.bloodGroup = bloodGroup;
        }

        const skip = (page - 1) * limit;

        const [inventory, total] = await Promise.all([
            inventoryModels.find(query)
                .populate('donor', 'name email bloodtype phone')
                .populate('hospital', 'hospitalName email phone systemId')
                .populate('organisation', 'organisationName email phone systemId')
                .populate('source_id', 'name hospitalName organisationName systemId role')
                .populate('target_id', 'name hospitalName organisationName systemId role')
                .populate('approvedBy', 'name hospitalName organisationName role')
                .populate('rejectedBy', 'name hospitalName organisationName role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            inventoryModels.countDocuments(query)
        ]);

        return res.json({
            success: true,
            data: inventory,
            count: inventory.length,
            total: total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get all inventory error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/unverified-entries', userAuth, isAdmin, async (req, res) => {
    try {
        const unverifiedEntries = await inventoryModels.find({ verified: false })
            .populate('donor', 'name email phone')
            .populate('hospital', 'hospitalName email')
            .populate('organisation', 'organisationName email')
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            data: unverifiedEntries,
            count: unverifiedEntries.length
        });
    } catch (error) {
        console.error('Get unverified entries error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/pending-transactions', userAuth, isAdmin, async (req, res) => {
    try {
        const pendingTransactions = await inventoryModels.find({ status: 'pending' })
            .populate('source_id', 'name hospitalName organisationName systemId')
            .populate('target_id', 'name hospitalName organisationName systemId')
            .populate('organisation', 'organisationName systemId')
            .populate('hospital', 'hospitalName systemId')
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            data: pendingTransactions,
            count: pendingTransactions.length
        });
    } catch (error) {
        console.error('Get pending transactions error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/stats', userAuth, isAdmin, async (req, res) => {
    try {
        const [
            donors,
            hospitals,
            organisations,
            inventory,
            pendingHospitals,
            pendingOrgs,
            unverifiedEntries,
            pendingTransactions,
            expiredItems
        ] = await Promise.all([
            userModel.countDocuments({ role: 'donor' }),
            userModel.countDocuments({ role: 'hospital' }),
            userModel.countDocuments({ role: 'organisation' }),
            inventoryModels.find(),
            userModel.countDocuments({ role: 'hospital', approvalStatus: 'pending' }),
            userModel.countDocuments({ role: 'organisation', approvalStatus: 'pending' }),
            inventoryModels.countDocuments({ verified: false }),
            inventoryModels.countDocuments({ status: 'pending' }),
            inventoryModels.countDocuments({ status: 'expired' })
        ]);

        const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
        const bloodStock = {};

        bloodGroups.forEach(group => {
            bloodStock[group] = 0;
        });

        inventory.forEach(item => {
            if (item.status !== 'expired' && item.expiryDate > new Date()) {
                if (item.inventoryType === 'in') {
                    bloodStock[item.bloodGroup] += item.quantity;
                } else if (item.inventoryType === 'out') {
                    bloodStock[item.bloodGroup] -= item.quantity;
                }
            }
        });

        const totalBloodUnits = Object.values(bloodStock).reduce((sum, val) => sum + val, 0);

        const expiryWarnings = await checkExpiringSoon();

        const lowStockGroups = [];
        Object.entries(bloodStock).forEach(([group, quantity]) => {
            if (quantity < 20 && quantity > 0) {
                lowStockGroups.push({ bloodGroup: group, quantity });
            }
        });

        return res.json({
            success: true,
            stats: {
                totalDonors: donors,
                totalHospitals: hospitals,
                totalOrganisations: organisations,
                pendingApprovals: pendingHospitals + pendingOrgs,
                totalInventoryRecords: inventory.length,
                totalBloodUnits: totalBloodUnits,
                bloodStock: bloodStock,
                unverifiedEntries: unverifiedEntries,
                pendingTransactions: pendingTransactions,
                expiredItems: expiredItems,
                expiringItemsCount: expiryWarnings.totalItemsExpiring || 0,
                lowStockGroups: lowStockGroups
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/expiry-warnings', userAuth, isAdmin, async (req, res) => {
    try {
        const warnings = await checkExpiringSoon();

        return res.json({
            success: true,
            warnings: warnings.warnings || [],
            totalItemsExpiring: warnings.totalItemsExpiring || 0
        });
    } catch (error) {
        console.error('Get expiry warnings error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/run-expiry-check', userAuth, isAdmin, async (req, res) => {
    try {
        const result = await checkExpiredBlood();

        return res.json({
            success: true,
            message: `Expiry check completed. ${result.expiredCount} items marked as expired.`,
            expiredCount: result.expiredCount
        });
    } catch (error) {
        console.error('Manual expiry check error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/audit-logs', userAuth, isAdmin, async (req, res) => {
    try {
        const { action, userId, page = 1, limit = 50 } = req.query;

        let query = {};

        if (action) query.action = action;
        if (userId) query.userId = userId;

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            auditLogModel.find(query)
                .populate('userId', 'name email hospitalName organisationName role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            auditLogModel.countDocuments(query)
        ]);

        return res.json({
            success: true,
            data: logs,
            count: logs.length,
            total: total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/transaction-history/:transactionId', userAuth, isAdmin, async (req, res) => {
    try {
        const { transactionId } = req.params;

        const transaction = await inventoryModels.findOne({ transactionId })
            .populate('donor', 'name email phone bloodtype')
            .populate('hospital', 'hospitalName email phone systemId')
            .populate('organisation', 'organisationName email phone systemId')
            .populate('source_id', 'name hospitalName organisationName systemId role')
            .populate('target_id', 'name hospitalName organisationName systemId role')
            .populate('approvedBy', 'name hospitalName organisationName role')
            .populate('rejectedBy', 'name hospitalName organisationName role');

        if (!transaction) {
            return res.json({
                success: false,
                message: 'Transaction not found'
            });
        }

        const auditLogs = await auditLogModel.find({ transactionId })
            .populate('userId', 'name email hospitalName organisationName role')
            .sort({ createdAt: 1 });

        return res.json({
            success: true,
            transaction: transaction,
            auditLogs: auditLogs
        });
    } catch (error) {
        console.error('Get transaction history error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/low-stock-alerts', userAuth, isAdmin, async (req, res) => {
    try {
        const hospitals = await userModel.find({ role: 'hospital', approvalStatus: 'approved' })
            .select('hospitalName systemId lowStockThreshold');

        const organisations = await userModel.find({ role: 'organisation', approvalStatus: 'approved' })
            .select('organisationName systemId lowStockThreshold');

        const alerts = [];

        for (const hospital of hospitals) {
            const inventory = await inventoryModels.find({
                hospital: hospital._id,
                status: { $ne: 'expired' },
                expiryDate: { $gt: new Date() }
            });

            const bloodStock = {};
            ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].forEach(group => {
                bloodStock[group] = 0;
            });

            inventory.forEach(item => {
                if (item.inventoryType === 'in') {
                    bloodStock[item.bloodGroup] += item.quantity;
                } else if (item.inventoryType === 'out') {
                    bloodStock[item.bloodGroup] -= item.quantity;
                }
            });

            const threshold = hospital.lowStockThreshold || 20;

            Object.entries(bloodStock).forEach(([group, quantity]) => {
                if (quantity < threshold && quantity >= 0) {
                    alerts.push({
                        type: 'hospital',
                        name: hospital.hospitalName,
                        systemId: hospital.systemId,
                        bloodGroup: group,
                        currentStock: quantity,
                        threshold: threshold,
                        severity: quantity === 0 ? 'critical' : quantity < 10 ? 'high' : 'medium'
                    });
                }
            });
        }

        for (const org of organisations) {
            const inventory = await inventoryModels.find({
                organisation: org._id,
                status: { $ne: 'expired' },
                expiryDate: { $gt: new Date() }
            });

            const bloodStock = {};
            ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].forEach(group => {
                bloodStock[group] = 0;
            });

            inventory.forEach(item => {
                if (item.inventoryType === 'in') {
                    bloodStock[item.bloodGroup] += item.quantity;
                } else if (item.inventoryType === 'out') {
                    bloodStock[item.bloodGroup] -= item.quantity;
                }
            });

            const threshold = org.lowStockThreshold || 20;

            Object.entries(bloodStock).forEach(([group, quantity]) => {
                if (quantity < threshold && quantity >= 0) {
                    alerts.push({
                        type: 'organisation',
                        name: org.organisationName,
                        systemId: org.systemId,
                        bloodGroup: group,
                        currentStock: quantity,
                        threshold: threshold,
                        severity: quantity === 0 ? 'critical' : quantity < 10 ? 'high' : 'medium'
                    });
                }
            });
        }

        alerts.sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });

        return res.json({
            success: true,
            alerts: alerts,
            count: alerts.length
        });
    } catch (error) {
        console.error('Get low stock alerts error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/view-document/:userId', userAuth, isAdmin, async (req, res) => {
    try {
        const user = await userModel.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.registrationDocument || !user.registrationDocument.path) {
            return res.status(404).json({
                success: false,
                message: 'No document found for this user'
            });
        }

        const filePath = path.resolve(user.registrationDocument.path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Document file not found on server'
            });
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png'
        };

        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${user.registrationDocument.originalName}"`);

        res.sendFile(filePath);

    } catch (error) {
        console.error('View document error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/approve-hospital/:id', userAuth, isAdmin, async (req, res) => {
    try {
        const hospital = await userModel.findOneAndUpdate(
            { _id: req.params.id, role: 'hospital' },
            {
                approvalStatus: 'approved',
                isAccountVerified: true,
                approvedAt: new Date(),
                approvedBy: req.body.userId
            },
            { new: true }
        );

        if (!hospital) {
            return res.json({
                success: false,
                message: 'Hospital not found'
            });
        }

        await auditLogModel.create({
            userId: req.body.userId,
            userRole: 'admin',
            action: 'approve_user',
            description: `Approved hospital: ${hospital.hospitalName}`,
            targetType: 'user',
            targetId: hospital._id,
            status: 'success'
        });

        try {
            const mailOptions = {
                from: process.env.SENDER_EMAIL,
                to: hospital.email,
                subject: 'Hospital Account Approved - LifeDrop',
                html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <body style="font-family: Arial, sans-serif; background-color: #f2f4f8; margin: 0; padding: 0;">
                    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); overflow: hidden;">
                        <div style="background-color: #DC2626; color: white; text-align: center; padding: 20px 0;">
                            <h2 style="margin: 0; font-size: 24px;">🎉 Account Approved!</h2>
                        </div>
                        <div style="padding: 30px; color: #333;">
                            <h3 style="color: #DC2626; margin-top: 0;">Congratulations, ${hospital.hospitalName}!</h3>
                            <p style="font-size: 15px; line-height: 1.6;">
                                Your hospital registration has been <strong>approved by the admin</strong>.
                            </p>
                            <p style="font-size: 15px; line-height: 1.6;">
                                Your System ID: <strong>${hospital.systemId}</strong>
                            </p>
                            <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin: 20px 0;">
                                <ul style="margin: 0; padding-left: 20px;">
                                    <li style="margin-bottom: 10px;">✅ Login to your hospital account</li>
                                    <li style="margin-bottom: 10px;">✅ Add your hospital address and details</li>
                                    <li style="margin-bottom: 10px;">✅ Update blood bank inventory</li>
                                    <li style="margin-bottom: 10px;">✅ Manage blood stock levels</li>
                                    <li style="margin-bottom: 10px;">✅ Request blood from organizations</li>
                                </ul>
                            </div>
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                                   style="background-color: #DC2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                                    Login Now
                                </a>
                            </div>
                        </div>
                    </div>
                    </body>
                    </html>
                `
            };
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.log('Email send failed (non-critical):', emailError.message);
        }

        return res.json({
            success: true,
            message: 'Hospital approved successfully',
            data: hospital
        });
    } catch (error) {
        console.error('Approve hospital error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/approve-organisation/:id', userAuth, isAdmin, async (req, res) => {
    try {
        const organisation = await userModel.findOneAndUpdate(
            { _id: req.params.id, role: 'organisation' },
            {
                approvalStatus: 'approved',
                isAccountVerified: true,
                approvedAt: new Date(),
                approvedBy: req.body.userId
            },
            { new: true }
        );

        if (!organisation) {
            return res.json({
                success: false,
                message: 'Organisation not found'
            });
        }

        await auditLogModel.create({
            userId: req.body.userId,
            userRole: 'admin',
            action: 'approve_user',
            description: `Approved organisation: ${organisation.organisationName}`,
            targetType: 'user',
            targetId: organisation._id,
            status: 'success'
        });

        try {
            const mailOptions = {
                from: process.env.SENDER_EMAIL,
                to: organisation.email,
                subject: '🎉 Organisation Account Approved - LifeDrop',
                html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <body style="font-family: Arial, sans-serif; background-color: #f2f4f8; margin: 0; padding: 0;">
                    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); overflow: hidden;">
                        <div style="background-color: #DC2626; color: white; text-align: center; padding: 20px 0;">
                            <h2 style="margin: 0; font-size: 24px;">🎉 Account Approved!</h2>
                        </div>
                        <div style="padding: 30px; color: #333;">
                            <h3 style="color: #DC2626; margin-top: 0;">Congratulations, ${organisation.organisationName}!</h3>
                            <p style="font-size: 15px; line-height: 1.6;">
                                Your organisation registration has been <strong>approved by the admin</strong>.
                            </p>
                            <p style="font-size: 15px; line-height: 1.6;">
                                Your System ID: <strong>${organisation.systemId}</strong>
                            </p>
                            <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin: 20px 0;">
                                <ul style="margin: 0; padding-left: 20px;">
                                    <li style="margin-bottom: 10px;">✅ Login to your organisation account</li>
                                    <li style="margin-bottom: 10px;">✅ Add your organisation address</li>
                                    <li style="margin-bottom: 10px;">✅ Collect blood from donors</li>
                                    <li style="margin-bottom: 10px;">✅ Distribute blood to hospitals</li>
                                    <li style="margin-bottom: 10px;">✅ Organize blood donation camps</li>
                                </ul>
                            </div>
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                                   style="background-color: #DC2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                                    Login Now
                                </a>
                            </div>
                        </div>
                    </div>
                    </body>
                    </html>
                `
            };
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.log('Email send failed (non-critical):', emailError.message);
        }

        return res.json({
            success: true,
            message: 'Organisation approved successfully',
            data: organisation
        });
    } catch (error) {
        console.error('Approve organisation error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/reject-hospital/:id', userAuth, isAdmin, async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const hospital = await userModel.findOneAndUpdate(
            { _id: req.params.id, role: 'hospital' },
            {
                approvalStatus: 'rejected',
                rejectionReason: reason,
                rejectedAt: new Date(),
                rejectedBy: req.body.userId
            },
            { new: true }
        );

        if (!hospital) {
            return res.json({
                success: false,
                message: 'Hospital not found'
            });
        }

        await auditLogModel.create({
            userId: req.body.userId,
            userRole: 'admin',
            action: 'reject_user',
            description: `Rejected hospital: ${hospital.hospitalName} - Reason: ${reason}`,
            targetType: 'user',
            targetId: hospital._id,
            status: 'success'
        });

        try {
            const mailOptions = {
                from: process.env.SENDER_EMAIL,
                to: hospital.email,
                subject: 'Hospital Registration Update - LifeDrop',
                html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <body style="font-family: Arial, sans-serif; background-color: #f2f4f8; margin: 0; padding: 0;">
                    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); overflow: hidden;">
                        <div style="background-color: #DC2626; color: white; text-align: center; padding: 20px 0;">
                            <h2 style="margin: 0; font-size: 24px;">Registration Update</h2>
                        </div>
                        <div style="padding: 30px; color: #333;">
                            <h3 style="color: #DC2626; margin-top: 0;">Hello, ${hospital.hospitalName}</h3>
                            <p style="font-size: 15px; line-height: 1.6;">
                                Thank you for your interest in LifeDrop. After reviewing your registration, we regret to inform you that your application could not be approved at this time.
                            </p>
                            <div style="background-color: #fef2f2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0;">
                                <p style="margin: 0; font-weight: bold; color: #DC2626;">Reason:</p>
                                <p style="margin: 5px 0 0 0;">${reason}</p>
                            </div>
                            <p style="font-size: 14px; color: #555;">
                                If you believe this is an error or would like to discuss this decision, please contact our support team.
                            </p>
                        </div>
                    </div>
                    </body>
                    </html>
                `
            };
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.log('Email send failed (non-critical):', emailError.message);
        }

        return res.json({
            success: true,
            message: 'Hospital rejected successfully',
            data: hospital
        });
    } catch (error) {
        console.error('Reject hospital error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/reject-organisation/:id', userAuth, isAdmin, async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const organisation = await userModel.findOneAndUpdate(
            { _id: req.params.id, role: 'organisation' },
            {
                approvalStatus: 'rejected',
                rejectionReason: reason,
                rejectedAt: new Date(),
                rejectedBy: req.body.userId
            },
            { new: true }
        );

        if (!organisation) {
            return res.json({
                success: false,
                message: 'Organisation not found'
            });
        }

        await auditLogModel.create({
            userId: req.body.userId,
            userRole: 'admin',
            action: 'reject_user',
            description: `Rejected organisation: ${organisation.organisationName} - Reason: ${reason}`,
            targetType: 'user',
            targetId: organisation._id,
            status: 'success'
        });
        try {
            const mailOptions = {
                from: process.env.SENDER_EMAIL,
                to: organisation.email,
                subject: 'Organisation Registration Update - LifeDrop',
                html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <body style="font-family: Arial, sans-serif; background-color: #f2f4f8; margin: 0; padding: 0;">
                    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); overflow: hidden;">
                        <div style="background-color: #DC2626; color: white; text-align: center; padding: 20px 0;">
                            <h2 style="margin: 0; font-size: 24px;">Registration Update</h2>
                        </div>
                        <div style="padding: 30px; color: #333;">
                            <h3 style="color: #DC2626; margin-top: 0;">Hello, ${organisation.organisationName}</h3>
                            <p style="font-size: 15px; line-height: 1.6;">
                                Thank you for your interest in LifeDrop. After reviewing your registration, we regret to inform you that your application could not be approved at this time.
                            </p>
                            <div style="background-color: #fef2f2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0;">
                                <p style="margin: 0; font-weight: bold; color: #DC2626;">Reason:</p>
                                <p style="margin: 5px 0 0 0;">${reason}</p>
                            </div>
                        </div>
                    </div>
                    </body>
                    </html>
                `
            };
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.log('Email send failed (non-critical):', emailError.message);
        }

        return res.json({
            success: true,
            message: 'Organisation rejected successfully',
            data: organisation
        });
    } catch (error) {
        console.error('Reject organisation error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/delete-donor/:id', userAuth, isAdmin, async (req, res) => {
    try {
        const donor = await userModel.findOneAndDelete({
            _id: req.params.id,
            role: 'donor'
        });

        if (!donor) {
            return res.json({
                success: false,
                message: 'Donor not found'
            });
        }

        await inventoryModels.deleteMany({ donor: req.params.id });

        await auditLogModel.create({
            userId: req.body.userId,
            userRole: 'admin',
            action: 'delete_user',
            description: `Deleted donor: ${donor.name}`,
            targetType: 'user',
            targetId: donor._id,
            status: 'success'
        });

        return res.json({
            success: true,
            message: 'Donor deleted successfully'
        });
    } catch (error) {
        console.error('Delete donor error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/delete-hospital/:id', userAuth, isAdmin, async (req, res) => {
    try {
        const hospital = await userModel.findOneAndDelete({
            _id: req.params.id,
            role: 'hospital'
        });

        if (!hospital) {
            return res.json({
                success: false,
                message: 'Hospital not found'
            });
        }

        if (hospital.registrationDocument && hospital.registrationDocument.path) {
            try {
                if (fs.existsSync(hospital.registrationDocument.path)) {
                    fs.unlinkSync(hospital.registrationDocument.path);
                }
            } catch (fileError) {
                console.log('Could not delete document file:', fileError.message);
            }
        }

        await inventoryModels.deleteMany({ hospital: req.params.id });

        await auditLogModel.create({
            userId: req.body.userId,
            userRole: 'admin',
            action: 'delete_user',
            description: `Deleted hospital: ${hospital.hospitalName}`,
            targetType: 'user',
            targetId: hospital._id,
            status: 'success'
        });

        return res.json({
            success: true,
            message: 'Hospital deleted successfully'
        });
    } catch (error) {
        console.error('Delete hospital error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/delete-organisation/:id', userAuth, isAdmin, async (req, res) => {
    try {
        const organisation = await userModel.findOneAndDelete({
            _id: req.params.id,
            role: 'organisation'
        });

        if (!organisation) {
            return res.json({
                success: false,
                message: 'Organisation not found'
            });
        }

        if (organisation.registrationDocument && organisation.registrationDocument.path) {
            try {
                if (fs.existsSync(organisation.registrationDocument.path)) {
                    fs.unlinkSync(organisation.registrationDocument.path);
                }
            } catch (fileError) {
                console.log('Could not delete document file:', fileError.message);
            }
        }

        await inventoryModels.deleteMany({ organisation: req.params.id });

        await auditLogModel.create({
            userId: req.body.userId,
            userRole: 'admin',
            action: 'delete_user',
            description: `Deleted organisation: ${organisation.organisationName}`,
            targetType: 'user',
            targetId: organisation._id,
            status: 'success'
        });

        return res.json({
            success: true,
            message: 'Organisation deleted successfully'
        });
    } catch (error) {
        console.error('Delete organisation error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/delete-inventory/:id', userAuth, isAdmin, async (req, res) => {
    try {
        const inventory = await inventoryModels.findByIdAndDelete(req.params.id);

        if (!inventory) {
            return res.json({
                success: false,
                message: 'Inventory record not found'
            });
        }

        await auditLogModel.create({
            userId: req.body.userId,
            userRole: 'admin',
            action: 'delete_inventory',
            description: `Deleted inventory record: ${inventory.transactionId}`,
            targetType: 'inventory',
            targetId: inventory._id,
            transactionId: inventory.transactionId,
            status: 'success'
        });

        return res.json({
            success: true,
            message: 'Inventory record deleted successfully'
        });
    } catch (error) {
        console.error('Delete inventory error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/verify-entry/:id', userAuth, isAdmin, async (req, res) => {
    try {
        const inventory = await inventoryModels.findById(req.params.id);

        if (!inventory) {
            return res.json({
                success: false,
                message: 'Inventory record not found'
            });
        }

        if (inventory.verified) {
            return res.json({
                success: false,
                message: 'Entry is already verified'
            });
        }

        inventory.verified = true;
        await inventory.save();

        await auditLogModel.create({
            userId: req.body.userId,
            userRole: 'admin',
            action: 'manual_entry',
            description: `Verified manual entry: ${inventory.transactionId}`,
            targetType: 'inventory',
            targetId: inventory._id,
            transactionId: inventory.transactionId,
            status: 'success'
        });

        return res.json({
            success: true,
            message: 'Entry verified successfully',
            inventory
        });
    } catch (error) {
        console.error('Verify entry error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/approve-transaction/:transactionId', userAuth, isAdmin, async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { notes } = req.body;

        const transaction = await inventoryModels.findOne({ transactionId });

        if (!transaction) {
            return res.json({
                success: false,
                message: 'Transaction not found'
            });
        }

        if (transaction.status !== 'pending') {
            return res.json({
                success: false,
                message: `Transaction is already ${transaction.status}`
            });
        }

        transaction.status = 'approved';
        transaction.approvedBy = req.body.userId;
        transaction.approvedAt = new Date();
        if (notes) transaction.notes = notes;

        await transaction.save();

        await auditLogModel.create({
            userId: req.body.userId,
            userRole: 'admin',
            action: 'approve_transaction',
            description: `Admin approved transaction ${transactionId}`,
            targetType: 'transaction',
            targetId: transaction._id,
            transactionId: transactionId,
            status: 'success'
        });

        return res.json({
            success: true,
            message: 'Transaction approved successfully by admin',
            transaction
        });

    } catch (error) {
        console.error('Admin approve transaction error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/reject-transaction/:transactionId', userAuth, isAdmin, async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const transaction = await inventoryModels.findOne({ transactionId });

        if (!transaction) {
            return res.json({
                success: false,
                message: 'Transaction not found'
            });
        }

        if (transaction.status !== 'pending') {
            return res.json({
                success: false,
                message: `Transaction is already ${transaction.status}`
            });
        }

        transaction.status = 'rejected';
        transaction.rejectedBy = req.body.userId;
        transaction.rejectedAt = new Date();
        transaction.rejectionReason = reason;

        await transaction.save();

        await auditLogModel.create({
            userId: req.body.userId,
            userRole: 'admin',
            action: 'reject_transaction',
            description: `Admin rejected transaction ${transactionId}: ${reason}`,
            targetType: 'transaction',
            targetId: transaction._id,
            transactionId: transactionId,
            status: 'success'
        });

        return res.json({
            success: true,
            message: 'Transaction rejected successfully by admin',
            transaction
        });

    } catch (error) {
        console.error('Admin reject transaction error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

export default router;