import userModel from "../models/userModels.js";
import inventoryModels from "../models/inventoryModels.js";

export const getHospitalProfile = async (req, res) => {
    try {
        const hospital = await userModel.findById(req.body.userId).select('-password');

        if (!hospital || hospital.role !== 'hospital') {
            return res.json({ success: false, message: 'Hospital not found' });
        }

        return res.json({
            success: true,
            hospital: hospital
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const updateHospitalProfile = async (req, res) => {
    try {
        const { hospitalName, phone, email, state, district, city } = req.body;

        const hospital = await userModel.findById(req.body.userId);

        if (!hospital || hospital.role !== 'hospital') {
            return res.json({ success: false, message: 'Hospital not found' });
        }

        if (!hospital.isAccountVerified) {
            return res.json({
                success: false,
                message: 'Your account is pending admin approval. You cannot edit details yet.'
            });
        }

        if (hospitalName) hospital.hospitalName = hospitalName;
        if (phone) hospital.phone = phone;
        if (email) hospital.email = email;
        if (state || district || city) {
            hospital.address = {
                state: state || hospital.address?.state,
                district: district || hospital.address?.district,
                city: city || hospital.address?.city
            };
        }

        await hospital.save();

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            hospital: hospital
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const getBloodStock = async (req, res) => {
    try {
        const hospital = await userModel.findById(req.body.userId);

        if (!hospital || hospital.role !== 'hospital') {
            return res.json({ success: false, message: 'Hospital not found' });
        }

        if (!hospital.isAccountVerified) {
            return res.json({
                success: false,
                message: 'Your account is pending admin approval.'
            });
        }

        const inventory = await inventoryModels.find({
            hospital: req.body.userId,
            status: { $ne: 'expired' },
            expiryDate: { $gt: new Date() },
            $or: [
                { inventoryType: 'in' },
                { inventoryType: 'out', organisation: null }
            ]
        }).populate('donor').populate('organisation');

        const bloodStock = {};
        const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

        bloodGroups.forEach(group => {
            bloodStock[group] = 0;
        });

        inventory.forEach(item => {
            if (item.inventoryType === 'in') {
                bloodStock[item.bloodGroup] += item.quantity;
            } else if (item.inventoryType === 'out') {
                bloodStock[item.bloodGroup] -= item.quantity;
            }
        });

        Object.keys(bloodStock).forEach(g => { if (bloodStock[g] < 0) bloodStock[g] = 0; });

        return res.json({
            success: true,
            bloodStock: bloodStock,
            inventory: inventory
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};