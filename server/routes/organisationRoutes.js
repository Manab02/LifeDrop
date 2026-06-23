import express from "express";
import userAuth from "../middleware/userAuth.js";
import { getOrganisationProfile, updateOrganisationProfile, getOrganisationBloodStock } from "../controllers/organisationController.js";

const router = express.Router();

router.get('/profile', userAuth, getOrganisationProfile);

router.put('/profile', userAuth, updateOrganisationProfile);

router.get('/blood-stock', userAuth, getOrganisationBloodStock);

export default router;