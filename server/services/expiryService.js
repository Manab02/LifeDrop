
import Inventory from "../models/inventoryModels.js";
import userModel from "../models/userModels.js";
import auditLogModel from "../models/auditLogModel.js";

export const checkExpiredBlood = async () => {
    try {
        console.log('Running expiry check...');

        const expiredItems = await Inventory.findExpired();

        if (expiredItems.length === 0) {
            console.log(' No expired blood found');
            return { success: true, expiredCount: 0 };
        }

        let updatedCount = 0;

        for (const item of expiredItems) {
            item.status = 'expired';
            item.autoExpired = true;
            item.expiredAt = new Date();
            await item.save();

            await auditLogModel.create({
                userId: null,
                userRole: 'admin',
                action: 'system_expiry',
                description: `Auto-expired ${item.bloodGroup} ${item.quantity} units (Transaction: ${item.transactionId})`,
                targetType: 'inventory',
                targetId: item._id,
                transactionId: item.transactionId,
                status: 'success'
            });

            updatedCount++;
        }

        console.log(`Marked ${updatedCount} items as expired`);
        return { success: true, expiredCount: updatedCount };

    } catch (error) {
        console.error('Expiry check error:', error);
        return { success: false, error: error.message };
    }
};

export const checkExpiringSoon = async (userId = null) => {
    try {
        let query = {};

        if (userId) {
            const user = await userModel.findById(userId);
            if (user) {
                if (user.role === 'hospital') {
                    query.hospital = userId;
                } else if (user.role === 'organisation') {
                    query.organisation = userId;
                }
            }
        }

        const daysThreshold = 5;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysThreshold);

        const expiringItems = await Inventory.find({
            ...query,
            expiryDate: {
                $gte: new Date(),
                $lte: futureDate
            },
            status: { $ne: 'expired' },
            autoExpired: false,
            inventoryType: 'in'
        })
            .populate('hospital', 'hospitalName systemId')
            .populate('organisation', 'organisationName systemId')
            .sort({ expiryDate: 1 });

        const warnings = {};
        expiringItems.forEach(item => {
            if (!warnings[item.bloodGroup]) {
                warnings[item.bloodGroup] = {
                    bloodGroup: item.bloodGroup,
                    totalUnits: 0,
                    items: []
                };
            }
            warnings[item.bloodGroup].totalUnits += item.quantity;
            warnings[item.bloodGroup].items.push({
                transactionId: item.transactionId,
                quantity: item.quantity,
                expiryDate: item.expiryDate,
                daysRemaining: Math.ceil((item.expiryDate - new Date()) / (1000 * 60 * 60 * 24)),
                owner: item.hospital?.hospitalName || item.organisation?.organisationName || 'Unknown'
            });
        });

        return {
            success: true,
            warnings: Object.values(warnings),
            totalItemsExpiring: expiringItems.length
        };

    } catch (error) {
        console.error('Check expiring soon error:', error);
        return { success: false, error: error.message };
    }
};

export const getExpiryNotifications = async (req, res) => {
    try {
        const result = await checkExpiringSoon(req.body.userId);

        if (!result.success) {
            return res.json({
                success: false,
                message: result.error
            });
        }

        return res.json({
            success: true,
            warnings: result.warnings,
            totalItemsExpiring: result.totalItemsExpiring
        });

    } catch (error) {
        console.error('Get expiry notifications error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
};

export default {
    checkExpiredBlood,
    checkExpiringSoon,
    getExpiryNotifications
};