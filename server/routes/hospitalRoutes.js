import express from "express";
import userAuth from "../middleware/userAuth.js";
import { getHospitalProfile, updateHospitalProfile, getBloodStock } from "../controllers/hospitalController.js";

const router = express.Router();

router.get('/profile', userAuth, getHospitalProfile);

router.put('/profile', userAuth, updateHospitalProfile);

router.get('/blood-stock', userAuth, getBloodStock);

export default router;