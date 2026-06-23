import userModel from "../models/userModels.js";

export const getDonorProfile = async (req, res) => {
    try {
        const donor = await userModel.findById(req.body.userId).select('-password');

        if (!donor || donor.role !== 'donor') {
            return res.json({ success: false, message: 'Donor not found' });
        }

        return res.json({
            success: true,
            donor: donor
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const updateDonorProfile = async (req, res) => {
    try {
        const { name, phone, bloodtype, age, state, district, city, isAvailable } = req.body;

        const donor = await userModel.findById(req.body.userId);

        if (!donor || donor.role !== 'donor') {
            return res.json({ success: false, message: 'Donor not found' });
        }

        if (name) donor.name = name;
        if (phone) donor.phone = phone;
        if (bloodtype) donor.bloodtype = bloodtype;
        if (age) donor.age = age;
        if (state || district || city) {
            donor.address = {
                state: state || donor.address.state,
                district: district || donor.address.district,
                city: city || donor.address.city
            };
        }
        if (typeof isAvailable !== 'undefined') {
            donor.isAvailable = isAvailable;
        }

        await donor.save();

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            donor: donor
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const toggleAvailability = async (req, res) => {
    try {
        const donor = await userModel.findById(req.body.userId);

        if (!donor || donor.role !== 'donor') {
            return res.json({ success: false, message: 'Donor not found' });
        }

        donor.isAvailable = !donor.isAvailable;
        await donor.save();

        return res.json({
            success: true,
            message: `You are now ${donor.isAvailable ? 'available' : 'unavailable'} for donation`,
            isAvailable: donor.isAvailable
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};