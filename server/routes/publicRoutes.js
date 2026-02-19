
import express from "express";
import userModel from "../models/userModels.js";
import inventoryModels from "../models/inventoryModels.js";

const router = express.Router();

router.post('/search', async (req, res) => {
    try {
        const { type, bloodGroup, state, district, city } = req.body;

        if (!type) {
            return res.json({
                success: false,
                message: 'Search type is required (donor/hospital/organisation)'
            });
        }

        // Build base query
        let query = {
            approvalStatus: 'approved',
            isAccountVerified: true
        };

        // Add type-specific filters
        if (type === 'donor') {
            query.role = 'donor';
            query.isAvailable = true;

            if (bloodGroup) query.bloodtype = bloodGroup;

            // Address filters for donors
            if (state) query['address.state'] = state;
            if (district) query['address.district'] = district;
            if (city) query['address.city'] = city;

            const donors = await userModel
                .find(query)
                .select('name phone bloodtype address isAvailable');

            return res.json({
                success: true,
                type: 'donor',
                results: donors,
                count: donors.length
            });

        } else if (type === 'hospital') {
            query.role = 'hospital';

            // Address filters for hospitals
            if (state) query['address.state'] = state;
            if (district) query['address.district'] = district;
            if (city) query['address.city'] = city;

            const hospitals = await userModel
                .find(query)
                .select('hospitalName email phone address');

            // Calculate blood stock for each hospital
            const hospitalsWithStock = await Promise.all(
                hospitals.map(async (hospital) => {
                    const inventory = await inventoryModels.find({
                        hospital: hospital._id
                    });

                    // Calculate stock
                    const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
                    const bloodStock = {};

                    bloodGroups.forEach(group => {
                        bloodStock[group] = 0;
                    });

                    inventory.forEach(item => {
                        if (item.inventoryType === 'in') {
                            bloodStock[item.bloodGroup] = (bloodStock[item.bloodGroup] || 0) + item.quantity;
                        } else if (item.inventoryType === 'out') {
                            bloodStock[item.bloodGroup] = (bloodStock[item.bloodGroup] || 0) - item.quantity;
                        }
                    });

                    // Filter by requested blood group if specified
                    if (bloodGroup && bloodStock[bloodGroup] <= 0) {
                        return null; // Skip hospitals without requested blood
                    }

                    return {
                        _id: hospital._id,
                        hospitalName: hospital.hospitalName,
                        email: hospital.email,
                        phone: hospital.phone,
                        address: hospital.address,
                        bloodStock: bloodStock,
                        totalUnits: Object.values(bloodStock).reduce((sum, val) => sum + val, 0)
                    };
                })
            );

            // Remove null entries (hospitals without requested blood)
            const filteredHospitals = hospitalsWithStock.filter(h => h !== null);

            return res.json({
                success: true,
                type: 'hospital',
                results: filteredHospitals,
                count: filteredHospitals.length
            });

        } else if (type === 'organisation') {
            query.role = 'organisation';

            // Address filters for organisations
            if (state) query['address.state'] = state;
            if (district) query['address.district'] = district;
            if (city) query['address.city'] = city;

            const organisations = await userModel
                .find(query)
                .select('organisationName email phone address');

            // Calculate blood stock for each organisation
            const organisationsWithStock = await Promise.all(
                organisations.map(async (org) => {
                    const inventory = await inventoryModels.find({
                        organisation: org._id
                    });

                    // Calculate stock
                    const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
                    const bloodStock = {};

                    bloodGroups.forEach(group => {
                        bloodStock[group] = 0;
                    });

                    inventory.forEach(item => {
                        if (item.inventoryType === 'in') {
                            bloodStock[item.bloodGroup] = (bloodStock[item.bloodGroup] || 0) + item.quantity;
                        } else if (item.inventoryType === 'out') {
                            bloodStock[item.bloodGroup] = (bloodStock[item.bloodGroup] || 0) - item.quantity;
                        }
                    });

                    // Filter by requested blood group if specified
                    if (bloodGroup && bloodStock[bloodGroup] <= 0) {
                        return null; // Skip organisations without requested blood
                    }

                    return {
                        _id: org._id,
                        organisationName: org.organisationName,
                        email: org.email,
                        phone: org.phone,
                        address: org.address,
                        bloodStock: bloodStock,
                        totalUnits: Object.values(bloodStock).reduce((sum, val) => sum + val, 0)
                    };
                })
            );

            // Remove null entries
            const filteredOrganisations = organisationsWithStock.filter(o => o !== null);

            return res.json({
                success: true,
                type: 'organisation',
                results: filteredOrganisations,
                count: filteredOrganisations.length
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

//LEGACY: Keep old endpoints for backward compatibility
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

// GET list of approved hospitals
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

// GET list of approved organisations
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

export default router;