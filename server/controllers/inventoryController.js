import inventoryModels from "../models/inventoryModels.js";
import userModel from "../models/userModels.js";
import auditLogModel from "../models/auditLogModel.js";

const createAuditLog = async (userId, userRole, action, description, targetType, targetId, transactionId, changes = {}) => {
    try {
        await auditLogModel.create({
            userId,
            userRole,
            action,
            description,
            targetType,
            targetId,
            transactionId,
            changes,
            status: 'success'
        });
    } catch (error) {
        console.error('Audit log creation failed:', error);
    }
};

export const createInventory = async (req, res) => {
    try {
        console.log(' Create Inventory Request Body:', req.body);

        const {
            email,
            inventoryType,
            bloodGroup,
            quantity,
            expiryDate,
            organisation,
            hospital,
            donor,
            patientName,
            hospitalNameText,
            organisationNameText,
            notes,
            source_name,
            target_name,
            isManualEntry
        } = req.body;

    
        if (!bloodGroup) {
            console.log(' Missing blood group');
            return res.json({
                success: false,
                message: 'Blood group is required'
            });
        }

        if (!quantity || quantity < 1) {
            console.log(' Invalid quantity');
            return res.json({
                success: false,
                message: 'Valid quantity is required (minimum 1 unit)'
            });
        }

        if (!expiryDate) {
            console.log(' Missing expiry date');
            return res.json({
                success: false,
                message: 'Expiry date is mandatory for all blood units'
            });
        }

        
        const expiryDateObj = new Date(expiryDate);
        if (expiryDateObj <= new Date()) {
            console.log(' Expiry date in past');
            return res.json({
                success: false,
                message: 'Expiry date must be in the future'
            });
        }

        
        let finalInventoryType = inventoryType;

        if (!finalInventoryType) {
            
            if (donor || email) {
                finalInventoryType = 'in';
                console.log('Auto-detected inventoryType: IN (donor donation)');
            }
        
            else if (hospital) {
                finalInventoryType = 'out';
                console.log('Auto-detected inventoryType: OUT (hospital request)');
            }
            
            else if (organisation) {
                finalInventoryType = 'in';
                console.log('Auto-detected inventoryType: IN (organisation collection)');
            }
            else {
                
                finalInventoryType = 'in';
                console.log('Defaulting to inventoryType: IN');
            }
        }

        console.log('Final Inventory Type:', finalInventoryType);

        const inventoryData = {
            inventoryType: finalInventoryType,
            bloodGroup,
            quantity: parseInt(quantity),
            expiryDate: expiryDateObj,
            patientName: patientName || '',
            hospitalNameText: hospitalNameText || '',
            organisationNameText: organisationNameText || '',
            notes: notes || '',
            verified: !isManualEntry,
            status: 'completed'
        };
        if (isManualEntry) {
            inventoryData.verified = false;
            inventoryData.source_type = 'manual';
            inventoryData.target_type = 'manual';
            inventoryData.source_name = source_name || '';
            inventoryData.target_name = target_name || '';

            const inventory = new inventoryModels(inventoryData);
            await inventory.save();

            await createAuditLog(
                req.body.userId,
                'user',
                'manual_entry',
                `Manual blood entry: ${bloodGroup} ${quantity} units`,
                'inventory',
                inventory._id,
                inventory.transactionId
            );

            console.log('Manual entry created:', inventory.transactionId);

            return res.json({
                success: true,
                message: "Manual blood record added successfully (unverified)",
                inventory
            });
        }
        let orgUser = null;
        if (organisation) {
            orgUser = await userModel.findOne({
                email: organisation,
                role: 'organisation'
            });

            if (!orgUser) {
                console.log('Organisation not found:', organisation);
                return res.json({
                    success: false,
                    message: 'Organisation not found or invalid'
                });
            }
            inventoryData.organisation = orgUser._id;
            console.log('Organisation found:', orgUser.organisationName);
        }

        if (finalInventoryType === "in") {
            let donorEmail = donor || email;

            if (donorEmail) {
                const donorUser = await userModel.findOne({
                    email: donorEmail,
                    role: 'donor'
                });

                if (!donorUser) {
                    console.log('Donor not found:', donorEmail);
                    return res.json({
                        success: false,
                        message: 'Donor not found or invalid'
                    });
                }

                inventoryData.donor = donorUser._id;
                inventoryData.source_id = donorUser._id;
                inventoryData.source_type = 'donor';

                if (donorUser.nextEligibleDate && donorUser.nextEligibleDate > new Date()) {
                    const daysLeft = Math.ceil((donorUser.nextEligibleDate - new Date()) / (1000 * 60 * 60 * 24));
                    return res.json({
                        success: false,
                        message: `Donor is not eligible yet. ${daysLeft} days remaining until next donation.`
                    });
                }

                donorUser.isAvailable = false;
                donorUser.lastDonationDate = new Date();

                const nextEligible = new Date();
                nextEligible.setDate(nextEligible.getDate() + 90);
                donorUser.nextEligibleDate = nextEligible;

                await donorUser.save();
                console.log(`Donor ${donorUser.name} marked unavailable until ${nextEligible.toDateString()}`);
            }

            if (orgUser) {
                inventoryData.target_id = orgUser._id;
                inventoryData.target_type = 'organisation';
            }
        }
        else if (finalInventoryType === "out") {
            if (hospital) {
                const hospitalUser = await userModel.findOne({
                    email: hospital,
                    role: 'hospital'
                });

                if (!hospitalUser) {
                    console.log('Hospital not found:', hospital);
                    return res.json({
                        success: false,
                        message: 'Hospital not found or invalid'
                    });
                }
                inventoryData.hospital = hospitalUser._id;
                inventoryData.target_id = hospitalUser._id;
                inventoryData.target_type = 'hospital';
                console.log(' Hospital found:', hospitalUser.hospitalName);
            }
            if (orgUser) {
                inventoryData.source_id = orgUser._id;
                inventoryData.source_type = 'organisation';
            }
        }

        const inventory = new inventoryModels(inventoryData);
        await inventory.save();

        await createAuditLog(
            req.body.userId,
            'user',
            'create_inventory',
            `Created ${finalInventoryType} record: ${bloodGroup} ${quantity} units`,
            'inventory',
            inventory._id,
            inventory.transactionId,
            { inventoryData }
        );

        console.log('Inventory created successfully:', inventory.transactionId);

        return res.json({
            success: true,
            message: "New blood record added successfully",
            inventory
        });

    } catch (error) {
        console.error('Create inventory error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

export const getInventoryController = async (req, res) => {
    try {
        const user = await userModel.findById(req.body.userId);

        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        let query = {};

        if (user.role === 'organisation') {
            query.organisation = req.body.userId;
        } else if (user.role === 'hospital') {
            query.hospital = req.body.userId;
        } else if (user.role === 'donor') {
            query.donor = req.body.userId;
        } else if (user.role === 'admin') {
            query = {};
        } else {
            return res.json({
                success: false,
                message: 'Unauthorized role'
            });
        }

        const inventory = await inventoryModels
            .find(query)
            .populate('donor', 'name email bloodtype phone')
            .populate('hospital', 'hospitalName email phone systemId')
            .populate('organisation', 'organisationName email phone systemId')
            .populate('source_id', 'name hospitalName organisationName systemId')
            .populate('target_id', 'name hospitalName organisationName systemId')
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            message: "Records retrieved successfully",
            inventory,
            count: inventory.length
        });

    } catch (error) {
        console.error('Get inventory error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

export const decreaseInventory = async (req, res) => {
    try {
        const { bloodGroup, quantity, notes } = req.body;

        const user = await userModel.findById(req.body.userId);

        if (!user || user.role !== 'hospital') {
            return res.json({
                success: false,
                message: 'Only hospitals can decrease inventory'
            });
        }

        if (!bloodGroup || !quantity || quantity < 1) {
            return res.json({
                success: false,
                message: 'Valid blood group and quantity required'
            });
        }

        const inventory = await inventoryModels.find({
            hospital: req.body.userId,
            bloodGroup: bloodGroup,
            status: { $ne: 'expired' },
            expiryDate: { $gt: new Date() }
        }).sort({ expiryDate: 1 });

        let availableStock = 0;
        inventory.forEach(item => {
            if (item.inventoryType === 'in') {
                availableStock += item.quantity;
            } else if (item.inventoryType === 'out') {
                availableStock -= item.quantity;
            }
        });

        if (availableStock < quantity) {
            return res.json({
                success: false,
                message: `Insufficient stock. Available: ${availableStock} units`
            });
        }

        const usageRecord = new inventoryModels({
            inventoryType: 'out',
            bloodGroup,
            quantity: parseInt(quantity),
            hospital: req.body.userId,
            source_id: req.body.userId,
            source_type: 'hospital',
            target_type: 'patient',
            target_name: 'Daily Usage',
            notes: notes || 'Hospital daily usage',
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            status: 'completed',
            verified: true
        });

        await usageRecord.save();

        await createAuditLog(
            req.body.userId,
            user.role,
            'decrease_stock',
            `Decreased ${bloodGroup} by ${quantity} units`,
            'inventory',
            usageRecord._id,
            usageRecord.transactionId
        );

        return res.json({
            success: true,
            message: `Successfully decreased ${bloodGroup} by ${quantity} units`,
            usageRecord,
            remainingStock: availableStock - quantity
        });

    } catch (error) {
        console.error('Decrease inventory error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

export const getBloodStock = async (req, res) => {
    try {
        const user = await userModel.findById(req.body.userId);

        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        let query = {};

        if (user.role === 'organisation') {
            query.organisation = req.body.userId;
        } else if (user.role === 'hospital') {
            query.hospital = req.body.userId;
        } else {
            return res.json({
                success: false,
                message: 'Only organizations and hospitals can view blood stock'
            });
        }

        query.status = { $ne: 'expired' };
        query.expiryDate = { $gt: new Date() };

        const inventory = await inventoryModels.find(query);

        const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
        const bloodStock = {};
        const expiringUnits = {};

        bloodGroups.forEach(group => {
            bloodStock[group] = 0;
            expiringUnits[group] = 0;
        });

        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + (user.expiryNotificationDays || 5));

        inventory.forEach(item => {
            if (item.inventoryType === 'in') {
                bloodStock[item.bloodGroup] += item.quantity;

                if (item.expiryDate <= fiveDaysFromNow) {
                    expiringUnits[item.bloodGroup] += item.quantity;
                }
            } else if (item.inventoryType === 'out') {
                bloodStock[item.bloodGroup] -= item.quantity;
            }
        });

        return res.json({
            success: true,
            bloodStock,
            expiringUnits,
            totalUnits: Object.values(bloodStock).reduce((sum, val) => sum + val, 0),
            lowStockThreshold: user.lowStockThreshold || 20
        });

    } catch (error) {
        console.error('Get blood stock error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

export const getInventoryStats = async (req, res) => {
    try {
        const user = await userModel.findById(req.body.userId);

        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        let query = {};

        if (user.role === 'organisation') {
            query.organisation = req.body.userId;
        } else if (user.role === 'hospital') {
            query.hospital = req.body.userId;
        } else if (user.role === 'donor') {
            query.donor = req.body.userId;
        } else if (user.role === 'admin') {
            query = {};
        }

        const totalIn = await inventoryModels.countDocuments({ ...query, inventoryType: 'in' });
        const totalOut = await inventoryModels.countDocuments({ ...query, inventoryType: 'out' });

        const inRecords = await inventoryModels.find({ ...query, inventoryType: 'in' });
        const outRecords = await inventoryModels.find({ ...query, inventoryType: 'out' });

        const totalUnitsIn = inRecords.reduce((sum, item) => sum + item.quantity, 0);
        const totalUnitsOut = outRecords.reduce((sum, item) => sum + item.quantity, 0);

        const unverifiedCount = await inventoryModels.countDocuments({ ...query, verified: false });

        return res.json({
            success: true,
            stats: {
                totalDonations: totalIn,
                totalRequests: totalOut,
                totalUnitsCollected: totalUnitsIn,
                totalUnitsDistributed: totalUnitsOut,
                currentStock: totalUnitsIn - totalUnitsOut,
                unverifiedEntries: unverifiedCount
            }
        });

    } catch (error) {
        console.error('Get inventory stats error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

export const updateInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const { bloodGroup, quantity, expiryDate, notes } = req.body;

        if (!bloodGroup || !quantity) {
            return res.json({
                success: false,
                message: 'Blood group and quantity are required'
            });
        }

        const inventory = await inventoryModels.findById(id);

        if (!inventory) {
            return res.json({
                success: false,
                message: 'Inventory record not found'
            });
        }

        const user = await userModel.findById(req.body.userId);

        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        const isAdmin = user.role === 'admin';
        const isDonorOwner = user.role === 'donor' && inventory.donor && inventory.donor.toString() === user._id.toString();
        const isHospitalOwner = user.role === 'hospital' && inventory.hospital && inventory.hospital.toString() === user._id.toString();
        const isOrgOwner = user.role === 'organisation' && inventory.organisation && inventory.organisation.toString() === user._id.toString();

        if (!isAdmin && !isDonorOwner && !isHospitalOwner && !isOrgOwner) {
            return res.json({
                success: false,
                message: 'You are not authorized to edit this record'
            });
        }

        const oldValues = {
            bloodGroup: inventory.bloodGroup,
            quantity: inventory.quantity,
            expiryDate: inventory.expiryDate,
            notes: inventory.notes
        };

        inventory.bloodGroup = bloodGroup;
        inventory.quantity = quantity;
        if (expiryDate) inventory.expiryDate = new Date(expiryDate);
        if (notes) inventory.notes = notes;

        await inventory.save();

        await createAuditLog(
            req.body.userId,
            user.role,
            'update_inventory',
            `Updated inventory record ${inventory.transactionId}`,
            'inventory',
            inventory._id,
            inventory.transactionId,
            { before: oldValues, after: { bloodGroup, quantity, expiryDate, notes } }
        );

        return res.json({
            success: true,
            message: 'Inventory record updated successfully',
            inventory
        });

    } catch (error) {
        console.error('Update inventory error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

export const approveTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { notes } = req.body;

        const user = await userModel.findById(req.body.userId);

        if (!user || user.role !== 'hospital') {
            return res.json({
                success: false,
                message: 'Only hospitals can approve transactions'
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

        transaction.status = 'approved';
        transaction.approvedBy = req.body.userId;
        transaction.approvedAt = new Date();
        if (notes) transaction.notes = notes;

        await transaction.save();

        await createAuditLog(
            req.body.userId,
            user.role,
            'approve_transaction',
            `Approved transaction ${transactionId}`,
            'transaction',
            transaction._id,
            transactionId
        );

        return res.json({
            success: true,
            message: 'Transaction approved successfully',
            transaction
        });

    } catch (error) {
        console.error('Approve transaction error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

export const rejectTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const user = await userModel.findById(req.body.userId);

        if (!user || user.role !== 'hospital') {
            return res.json({
                success: false,
                message: 'Only hospitals can reject transactions'
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

        await createAuditLog(
            req.body.userId,
            user.role,
            'reject_transaction',
            `Rejected transaction ${transactionId}: ${reason}`,
            'transaction',
            transaction._id,
            transactionId
        );

        return res.json({
            success: true,
            message: 'Transaction rejected successfully',
            transaction
        });

    } catch (error) {
        console.error('Reject transaction error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

export default {
    createInventory,
    getInventoryController,
    decreaseInventory,
    getBloodStock,
    getInventoryStats,
    updateInventory,
    approveTransaction,
    rejectTransaction
};