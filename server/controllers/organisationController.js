import userModel from "../models/userModels.js";
import inventoryModels from "../models/inventoryModels.js";
import campModel from "../models/campModel.js";

export const getOrganisationProfile = async (req, res) => {
    try {
        const organisation = await userModel.findById(req.body.userId).select('-password');
        if (!organisation || organisation.role !== 'organisation') {
            return res.json({ success: false, message: 'Organisation not found' });
        }
        return res.json({ success: true, organisation });
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
            return res.json({ success: false, message: 'Your account is pending admin approval. You cannot edit details yet.' });
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
        return res.json({ success: true, message: 'Profile updated successfully', organisation });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const getOrganisationBloodStock = async (req, res) => {
    try {
        const organisation = await userModel.findById(req.body.userId);
        if (!organisation || organisation.role !== 'organisation') {
            return res.json({ success: false, message: 'Organisation not found' });
        }
        const inventory = await inventoryModels.find({
            organisation: req.body.userId,
            status: { $ne: 'expired' },
            expiryDate: { $gt: new Date() },
            $or: [
                { inventoryType: 'out' },
                { inventoryType: 'in', hospital: null }
            ]
        })
            .populate('donor').populate('hospital');
        const bloodStock = {};
        const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
        bloodGroups.forEach(group => { bloodStock[group] = 0; });
        inventory.forEach(item => {
            if (item.inventoryType === 'in') bloodStock[item.bloodGroup] += item.quantity;
            else if (item.inventoryType === 'out') bloodStock[item.bloodGroup] -= item.quantity;
        });
        Object.keys(bloodStock).forEach(g => { if (bloodStock[g] < 0) bloodStock[g] = 0; });
        return res.json({ success: true, bloodStock, inventory });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ── CAMP ROUTES ────────────────────────────────────────────

export const getCamps = async (req, res) => {
    try {
        const camps = await campModel
            .find({ organisation: req.body.userId })
            .sort({ date: 1 });
        return res.json({ success: true, camps });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const createCamp = async (req, res) => {
    try {
        const { title, location, date, description } = req.body;
        if (!title || !location || !date) {
            return res.json({ success: false, message: 'Title, location and date are required' });
        }
        const campDate = new Date(date);
        if (isNaN(campDate.getTime())) {
            return res.json({ success: false, message: 'Invalid date' });
        }
        const camp = await campModel.create({
            title,
            location,
            date: campDate,
            description: description || '',
            organisation: req.body.userId
        });
        return res.json({ success: true, message: 'Camp scheduled successfully', camp });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const updateCamp = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, location, date, description } = req.body;
        const camp = await campModel.findOne({ _id: id, organisation: req.body.userId });
        if (!camp) return res.json({ success: false, message: 'Camp not found' });
        if (title) camp.title = title;
        if (location) camp.location = location;
        if (date) camp.date = new Date(date);
        if (description !== undefined) camp.description = description;
        await camp.save();
        return res.json({ success: true, message: 'Camp updated', camp });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const deleteCamp = async (req, res) => {
    try {
        const { id } = req.params;
        await campModel.findOneAndDelete({ _id: id, organisation: req.body.userId });
        return res.json({ success: true, message: 'Camp deleted' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Returns camps whose date is tomorrow (for notification badge)
export const getCampNotifications = async (req, res) => {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const upcoming = await campModel.find({
            organisation: req.body.userId,
            date: { $gte: tomorrow, $lt: dayAfter }
        });
        return res.json({ success: true, notifications: upcoming });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Donor list for this org
export const getOrgDonors = async (req, res) => {
    try {
        // Registered donors
        const registeredRecords = await inventoryModels.find({
            organisation: req.body.userId,
            inventoryType: 'in',
            donor: { $ne: null }
        }).populate('donor', 'name email bloodtype phone')
            .populate('hospital', 'hospitalName')
            .populate('organisation', 'organisationName');

        // Walk-in (unregistered) donors — source_name set, donor null
        const walkinRecords = await inventoryModels.find({
            organisation: req.body.userId,
            inventoryType: 'in',
            donor: null,
            source_name: { $exists: true, $ne: '' }
        }).populate('hospital', 'hospitalName')
            .populate('organisation', 'organisationName');

        const donorMap = {};

        registeredRecords.forEach(r => {
            if (r.donor) {
                const id = r.donor._id.toString();
                if (!donorMap[id]) {
                    donorMap[id] = { type: 'registered', donor: r.donor, donations: [], totalUnits: 0 };
                }
                donorMap[id].donations.push({
                    ...r.toObject(),
                    donatedTo: r.organisation?.organisationName || 'This Organisation'
                });
                donorMap[id].totalUnits += r.quantity;
            }
        });

        walkinRecords.forEach(r => {
            const id = `walkin_${r._id}`;
            donorMap[id] = {
                type: 'walkin',
                donor: { name: r.source_name, email: '—', bloodtype: r.bloodGroup, phone: '—' },
                donations: [{
                    ...r.toObject(),
                    donatedTo: r.organisation?.organisationName || 'This Organisation',
                    campSource: r.notes || ''
                }],
                totalUnits: r.quantity
            };
        });

        return res.json({ success: true, donors: Object.values(donorMap) });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};