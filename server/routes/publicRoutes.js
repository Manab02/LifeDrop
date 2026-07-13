import express from "express";
import userModel from "../models/userModels.js";
import inventoryModels from "../models/inventoryModels.js";

const router = express.Router();

// ── Helpers: compute a hospital's / organisation's own real stock ────────
const getHospitalStock = async (hospitalId) => {
    const inventory = await inventoryModels.find({
        hospital: hospitalId,
        status: { $ne: 'expired' },
        expiryDate: { $gt: new Date() },
        $or: [
            { inventoryType: 'in' },
            { inventoryType: 'out', organisation: null }
        ]
    });
    const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    const bloodStock = {};
    bloodGroups.forEach(g => { bloodStock[g] = 0; });
    inventory.forEach(item => {
        if (item.inventoryType === 'in') bloodStock[item.bloodGroup] += item.quantity;
        else if (item.inventoryType === 'out') bloodStock[item.bloodGroup] -= item.quantity;
    });
    Object.keys(bloodStock).forEach(g => { if (bloodStock[g] < 0) bloodStock[g] = 0; });
    return bloodStock;
};

const getOrgStockForSearch = async (orgId) => {
    const inventory = await inventoryModels.find({
        organisation: orgId,
        status: { $ne: 'expired' },
        expiryDate: { $gt: new Date() },
        $or: [
            { inventoryType: 'out' },
            { inventoryType: 'in', hospital: null }
        ]
    });
    const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    const bloodStock = {};
    bloodGroups.forEach(g => { bloodStock[g] = 0; });
    inventory.forEach(item => {
        if (item.inventoryType === 'in') bloodStock[item.bloodGroup] += item.quantity;
        else if (item.inventoryType === 'out') bloodStock[item.bloodGroup] -= item.quantity;
    });
    Object.keys(bloodStock).forEach(g => { if (bloodStock[g] < 0) bloodStock[g] = 0; });
    return bloodStock;
};

// ── Helper: run a location query at a given precision, filtering by stock ──
const findHospitalsAtLevel = async (baseQuery, locationFilter, bloodGroup, matchLevel) => {
    const hospitals = await userModel.find({ ...baseQuery, ...locationFilter }).select('hospitalName email phone address');
    const withStock = await Promise.all(hospitals.map(async (hospital) => {
        const bloodStock = await getHospitalStock(hospital._id);
        if (bloodGroup && bloodStock[bloodGroup] <= 0) return null;
        return {
            _id: hospital._id,
            hospitalName: hospital.hospitalName,
            email: hospital.email,
            phone: hospital.phone,
            address: hospital.address,
            bloodStock,
            totalUnits: Object.values(bloodStock).reduce((s, v) => s + v, 0),
            matchLevel
        };
    }));
    return withStock.filter(h => h !== null);
};

const findOrganisationsAtLevel = async (baseQuery, locationFilter, bloodGroup, matchLevel) => {
    const orgs = await userModel.find({ ...baseQuery, ...locationFilter }).select('organisationName email phone address');
    const withStock = await Promise.all(orgs.map(async (org) => {
        const bloodStock = await getOrgStockForSearch(org._id);
        if (bloodGroup && bloodStock[bloodGroup] <= 0) return null;
        return {
            _id: org._id,
            organisationName: org.organisationName,
            email: org.email,
            phone: org.phone,
            address: org.address,
            bloodStock,
            totalUnits: Object.values(bloodStock).reduce((s, v) => s + v, 0),
            matchLevel
        };
    }));
    return withStock.filter(o => o !== null);
};

router.post('/search', async (req, res) => {
    try {
        const { type, bloodGroup, state, district, city } = req.body;

        if (!type) {
            return res.json({
                success: false,
                message: 'Search type is required (donor/hospital/organisation)'
            });
        }


        let query = {
            approvalStatus: 'approved',
            isAccountVerified: true
        };

        if (type === 'donor') {
            const donorBaseQuery = { role: 'donor', approvalStatus: 'approved', isAccountVerified: true, isAvailable: true };
            if (bloodGroup) donorBaseQuery.bloodtype = bloodGroup;

            const runDonorQuery = async (locationFilter, matchLevel) => {
                const donors = await userModel
                    .find({ ...donorBaseQuery, ...locationFilter })
                    .select('name phone bloodtype address isAvailable');
                return donors.map(d => ({ ...d.toObject(), matchLevel }));
            };

            // Same city -> district -> state fallback as hospitals/organisations.
            let donorResults = [];
            if (city) donorResults = await runDonorQuery({ 'address.state': state, 'address.district': district, 'address.city': city }, 'city');
            if (donorResults.length === 0 && district) donorResults = await runDonorQuery({ 'address.state': state, 'address.district': district }, 'district');
            if (donorResults.length === 0 && state) donorResults = await runDonorQuery({ 'address.state': state }, 'state');

            return res.json({
                success: true,
                type: 'donor',
                results: donorResults,
                count: donorResults.length,
                matchLevel: donorResults[0]?.matchLevel || null
            });

        } else if (type === 'hospital') {
            const baseQuery = { role: 'hospital', approvalStatus: 'approved', isAccountVerified: true };

            // Try exact city first; if nothing matches, widen to the whole
            // district, then the whole state — so a real nearby hospital
            // still turns up instead of an empty results page.
            let filteredHospitals = [];
            if (city) {
                filteredHospitals = await findHospitalsAtLevel(baseQuery, { 'address.state': state, 'address.district': district, 'address.city': city }, bloodGroup, 'city');
            }
            if (filteredHospitals.length === 0 && district) {
                filteredHospitals = await findHospitalsAtLevel(baseQuery, { 'address.state': state, 'address.district': district }, bloodGroup, 'district');
            }
            if (filteredHospitals.length === 0 && state) {
                filteredHospitals = await findHospitalsAtLevel(baseQuery, { 'address.state': state }, bloodGroup, 'state');
            }

            return res.json({
                success: true,
                type: 'hospital',
                results: filteredHospitals,
                count: filteredHospitals.length,
                matchLevel: filteredHospitals[0]?.matchLevel || null
            });

        } else if (type === 'organisation') {
            const baseQuery = { role: 'organisation', approvalStatus: 'approved', isAccountVerified: true };

            // Same city -> district -> state fallback as hospitals, so a
            // nearby organisation with the requested blood group still shows
            // up instead of an empty page when the exact city has none.
            let filteredOrganisations = [];
            if (city) {
                filteredOrganisations = await findOrganisationsAtLevel(baseQuery, { 'address.state': state, 'address.district': district, 'address.city': city }, bloodGroup, 'city');
            }
            if (filteredOrganisations.length === 0 && district) {
                filteredOrganisations = await findOrganisationsAtLevel(baseQuery, { 'address.state': state, 'address.district': district }, bloodGroup, 'district');
            }
            if (filteredOrganisations.length === 0 && state) {
                filteredOrganisations = await findOrganisationsAtLevel(baseQuery, { 'address.state': state }, bloodGroup, 'state');
            }

            return res.json({
                success: true,
                type: 'organisation',
                results: filteredOrganisations,
                count: filteredOrganisations.length,
                matchLevel: filteredOrganisations[0]?.matchLevel || null
            });

        } else {
            return res.json({
                success: false,
                message: 'Invalid search type. Use: donor, hospital, or organisation'
            });
        }

    } catch (error) {
        console.error('Unified search error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/search-donors', async (req, res) => {
    try {
        const { bloodGroup, state, district, city } = req.body;

        if (!bloodGroup) {
            return res.json({
                success: false,
                message: 'Blood group is required'
            });
        }

        const query = {
            role: 'donor',
            bloodtype: bloodGroup,
            isAccountVerified: true,
            approvalStatus: 'approved',
            isAvailable: true
        };

        if (state) query['address.state'] = state;
        if (district) query['address.district'] = district;
        if (city) query['address.city'] = city;

        const donors = await userModel
            .find(query)
            .select('name phone bloodtype address isAvailable');

        return res.json({
            success: true,
            donors: donors,
            count: donors.length
        });

    } catch (error) {
        console.error('Search donors error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/search-hospitals', async (req, res) => {
    try {
        const { state, district, city } = req.body;

        const query = {
            role: 'hospital',
            approvalStatus: 'approved',
            isAccountVerified: true
        };

        if (state) query['address.state'] = state;
        if (district) query['address.district'] = district;
        if (city) query['address.city'] = city;

        const hospitals = await userModel
            .find(query)
            .select('hospitalName email phone address');

        return res.json({
            success: true,
            hospitals: hospitals,
            count: hospitals.length
        });

    } catch (error) {
        console.error('Search hospitals error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/search-organisations', async (req, res) => {
    try {
        const { state, district, city } = req.body;

        const query = {
            role: 'organisation',
            approvalStatus: 'approved',
            isAccountVerified: true
        };

        if (state) query['address.state'] = state;
        if (district) query['address.district'] = district;
        if (city) query['address.city'] = city;

        const organisations = await userModel
            .find(query)
            .select('organisationName email phone address');

        return res.json({
            success: true,
            organisations: organisations,
            count: organisations.length
        });

    } catch (error) {
        console.error('Search organisations error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/get-hospitals', async (req, res) => {
    try {
        const hospitals = await userModel.find({
            role: 'hospital',
            approvalStatus: 'approved',
            isAccountVerified: true
        })
            .select('hospitalName email systemId address')
            .sort({ hospitalName: 1 });

        return res.json({
            success: true,
            data: hospitals,
            count: hospitals.length
        });
    } catch (error) {
        console.error('Get hospitals error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.get('/get-organisations', async (req, res) => {
    try {
        const organisations = await userModel.find({
            role: 'organisation',
            approvalStatus: 'approved',
            isAccountVerified: true
        })
            .select('organisationName email systemId address')
            .sort({ organisationName: 1 });

        return res.json({
            success: true,
            data: organisations,
            count: organisations.length
        });
    } catch (error) {
        console.error('Get organisations error:', error);
        return res.json({
            success: false,
            message: error.message
        });
    }
});

router.post('/get-donor-by-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.json({ success: false, message: 'Email required' });

        const donor = await userModel.findOne({
            email: email.toLowerCase().trim(),
            role: 'donor'
        }).select('name bloodtype email');

        if (!donor) return res.json({ success: false, message: 'Donor not found' });

        return res.json({ success: true, donor: { name: donor.name, bloodtype: donor.bloodtype, email: donor.email } });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
});

router.post('/check-org-stock', async (req, res) => {
    try {
        const { organisationId, bloodGroup, quantity } = req.body;
        if (!organisationId || !bloodGroup || !quantity)
            return res.json({ success: false, message: 'Missing required fields' });

        const inventory = await inventoryModels.find({
            organisation: organisationId,
            bloodGroup,
            status: { $ne: 'expired' },
            expiryDate: { $gt: new Date() },
            $or: [
                { inventoryType: 'out' },
                { inventoryType: 'in', hospital: null }
            ]
        });

        let net = 0;
        inventory.forEach(item => {
            net += item.inventoryType === 'in' ? item.quantity : -item.quantity;
        });
        net = Math.max(0, net);

        if (net === 0) return res.json({ success: false, message: `This organisation has no ${bloodGroup} blood in stock` });
        if (net < quantity) return res.json({ success: false, message: `Insufficient stock. Organisation has only ${net} units of ${bloodGroup}` });

        return res.json({ success: true, available: net });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
});

export default router;