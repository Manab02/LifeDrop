import express from "express";
import userAuth from "../middleware/userAuth.js";
import { getHospitalProfile, updateHospitalProfile, getBloodStock } from "../controllers/hospitalController.js";

const router = express.Router();

// GET hospital profile
router.get('/profile', userAuth, getHospitalProfile);

// UPDATE hospital profile
router.put('/profile', userAuth, updateHospitalProfile);

// GET blood stock
router.get('/blood-stock', userAuth, getBloodStock);

export default router;