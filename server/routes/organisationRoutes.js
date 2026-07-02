import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
    getOrganisationProfile,
    updateOrganisationProfile,
    getOrganisationBloodStock,
    getCamps,
    createCamp,
    updateCamp,
    deleteCamp,
    getCampNotifications,
    getOrgDonors
} from "../controllers/organisationController.js";

const router = express.Router();

router.get('/profile', userAuth, getOrganisationProfile);
router.put('/profile', userAuth, updateOrganisationProfile);
router.get('/blood-stock', userAuth, getOrganisationBloodStock);

// Camp routes
router.get('/camps', userAuth, getCamps);
router.post('/camps', userAuth, createCamp);
router.put('/camps/:id', userAuth, updateCamp);
router.delete('/camps/:id', userAuth, deleteCamp);
router.get('/camp-notifications', userAuth, getCampNotifications);

// Donor list
router.get('/donors', userAuth, getOrgDonors);

export default router;