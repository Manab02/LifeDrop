import userModel from "../models/userModels.js";
import inventoryModels from "../models/inventoryModels.js"

export const getOrganisationProfile = async (req, res) => {
    try {
        const organisation = await userModel.findById(req.body.userId).select('-password');

        if (!organisation || organisation.role !== 'organisation') {
            return res.json({ success: false, message: 'Organisation not found' });
        }

        return res.json({
            success: true,
            organisation: organisation
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const updateOrganisationProfile = async (req, res) => {
    try {
        const { organisationName, phone, email, state, district, city } = req.body;

        const organisation = await userModel.findById(req.body.userId);

        if (!organisation || organisation.role !== 'organisation') {
            return res.json({ success: false, message: 'Organisation not found' });
        }

        
        if (!organisation.isAccountVerified) {
            return res.json({
                success: false,
                message: 'Your account is pending admin approval. You cannot edit details yet.'
            });
        }

        
        if (organisationName) organisation.organisationName = organisationName;
        if (phone) organisation.phone = phone;
        if (email) organisation.email = email;
        if (state || district || city) {
            organisation.address = {
                state: state || organisation.address?.state,
                district: district || organisation.address?.district,
                city: city || organisation.address?.city
            };
        }

        await organisation.save();

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            organisation: organisation
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// GET blood stock for organisation
export const getOrganisationBloodStock = async (req, res) => {
    try {
        const organisation = await userModel.findById(req.body.userId);

        if (!organisation || organisation.role !== 'organisation') {
            return res.json({ success: false, message: 'Organisation not found' });
        }

        if (!organisation.isAccountVerified) {
            return res.json({
                success: false,
                message: 'Your account is pending admin approval.'
            });
        }

        
        const inventory = await inventoryModels.find({
            organisation: req.body.userId
        }).populate('donor').populate('hospital');

        
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

        return res.json({
            success: true,
            bloodStock: bloodStock,
            inventory: inventory
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};