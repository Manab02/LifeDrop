import express from "express";
import userAuth from "../middleware/userAuth.js";
import userModel from "../models/userModels.js";

const router = express.Router();


router.post('/toggle-availability', userAuth, async (req, res) => {
    try {
        const donor = await userModel.findById(req.body.userId);

        if (!donor || donor.role !== 'donor') {
            return res.json({
                success: false,
                message: 'Donor not found'
            });
        }

        donor.isAvailable = !donor.isAvailable;
        await donor.save();

        console.log(`Donor ${donor.name} availability changed to: ${donor.isAvailable}`);

        return res.json({
            success: true,
            message: `You are now ${donor.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'} for donation`,
            isAvailable: donor.isAvailable
        });
    } catch (error) {
        console.error('Toggle availability error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/profile', userAuth, async (req, res) => {
    try {
        const donor = await userModel.findById(req.body.userId).select('-password');

        if (!donor || donor.role !== 'donor') {
            return res.json({
                success: false,
                message: 'Donor not found'
            });
        }

        return res.json({
            success: true,
            donor: donor
        });
    } catch (error) {
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.put('/profile', userAuth, async (req, res) => {
    try {
        const { name, phone, bloodtype, age, state, district, city, isAvailable } = req.body;

        const donor = await userModel.findById(req.body.userId);

        if (!donor || donor.role !== 'donor') {
            return res.json({
                success: false,
                message: 'Donor not found'
            });
        }
        if (name) donor.name = name;
        if (phone) donor.phone = phone;
        if (bloodtype) donor.bloodtype = bloodtype;
        if (age) donor.age = age;
        if (state || district || city) {
            donor.address = {
                state: state || donor.address?.state || '',
                district: district || donor.address?.district || '',
                city: city || donor.address?.city || ''
            };
        }

        if (typeof isAvailable !== 'undefined') {
            donor.isAvailable = isAvailable;
        }

        await donor.save();

        console.log(`Profile updated for donor: ${donor.name}`);

        const updatedDonor = await userModel.findById(req.body.userId).select('-password');

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            donor: updatedDonor
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/search', async (req, res) => {
    try {
        const { bloodGroup, state, district, city } = req.body;

        if (!bloodGroup || !state || !district || !city) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const donors = await userModel.find({
            role: 'donor',
            bloodtype: bloodGroup,
            'address.state': state,
            'address.district': district,
            'address.city': city,
            isAccountVerified: true,
            isAvailable: true
        }).select('name email phone bloodtype address isAvailable');

        res.status(200).json({
            success: true,
            donors: donors,
            count: donors.length
        });

    } catch (error) {
        console.error('Donor search error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while searching donors'
        });
    }
});

export default router;