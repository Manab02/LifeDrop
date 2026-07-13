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

        if (expiringItems.length === 0) {
            return { success: true, warnings: [], totalItemsExpiring: 0 };
        }

        // For each item, figure out its TRUE owner — a hospital<->organisation
        // transfer record has both fields set, so we can't just pick one.
        // Then compute that owner's real net stock for that blood group, so a
        // batch that's already been fully used (OUT) doesn't get reported as
        // "expiring soon" — it's gone, not about to expire.
        const ownerKeys = new Set();
        const ownerOf = (item) => {
            if (item.hospital) return { type: 'hospital', id: item.hospital._id.toString(), name: item.hospital.hospitalName };
            if (item.organisation) return { type: 'organisation', id: item.organisation._id.toString(), name: item.organisation.organisationName };
            return null;
        };

        expiringItems.forEach(item => {
            const owner = ownerOf(item);
            if (owner) ownerKeys.add(`${owner.type}:${owner.id}`);
        });

        const netStockCache = {}; // "hospital:id:bloodGroup" -> net units
        for (const key of ownerKeys) {
            const [type, id] = key.split(':');
            const ownField = type === 'hospital' ? 'hospital' : 'organisation';
            const otherField = type === 'hospital' ? 'organisation' : 'hospital';

            const records = await Inventory.find({
                [ownField]: id,
                status: { $ne: 'expired' },
                expiryDate: { $gt: new Date() }
            });

            records.forEach(r => {
                // Structural ownership check, same as elsewhere in the app:
                // skip the counterparty's mirrored copy of a transfer.
                const isOwnRecord = type === 'hospital'
                    ? (r.inventoryType === 'in' || (r.inventoryType === 'out' && !r.organisation))
                    : (r.inventoryType === 'out' || (r.inventoryType === 'in' && !r.hospital));
                if (!isOwnRecord) return;

                const cacheKey = `${type}:${id}:${r.bloodGroup}`;
                netStockCache[cacheKey] = (netStockCache[cacheKey] || 0) + (r.inventoryType === 'in' ? r.quantity : -r.quantity);
            });
        }

        const warnings = {};
        expiringItems.forEach(item => {
            const owner = ownerOf(item);
            if (!owner) return;

            const cacheKey = `${owner.type}:${owner.id}:${item.bloodGroup}`;
            const netStock = Math.max(0, netStockCache[cacheKey] || 0);
            if (netStock <= 0) return; // fully used up — not "expiring", just gone

            // Don't report more units expiring than the owner actually still has
            const reportedQuantity = Math.min(item.quantity, netStock);
            if (reportedQuantity <= 0) return;

            if (!warnings[item.bloodGroup]) {
                warnings[item.bloodGroup] = {
                    bloodGroup: item.bloodGroup,
                    totalUnits: 0,
                    items: []
                };
            }
            warnings[item.bloodGroup].totalUnits += reportedQuantity;
            warnings[item.bloodGroup].items.push({
                transactionId: item.transactionId,
                quantity: reportedQuantity,
                expiryDate: item.expiryDate,
                daysRemaining: Math.ceil((item.expiryDate - new Date()) / (1000 * 60 * 60 * 24)),
                owner: owner.name || 'Unknown'
            });
        });

        const totalItemsExpiring = Object.values(warnings).reduce((sum, w) => sum + w.items.length, 0);

        return {
            success: true,
            warnings: Object.values(warnings),
            totalItemsExpiring
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