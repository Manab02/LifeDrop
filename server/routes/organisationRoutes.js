import express from "express";
import userAuth from "../middleware/userAuth.js";
import { getOrganisationProfile, updateOrganisationProfile, getOrganisationBloodStock } from "../controllers/organisationController.js";

const router = express.Router();

// GET organisation profile
router.get('/profile', userAuth, getOrganisationProfile);

// UPDATE organisation profile
router.put('/profile', userAuth, updateOrganisationProfile);

// GET blood stock
router.get('/blood-stock', userAuth, getOrganisationBloodStock);

export default router;