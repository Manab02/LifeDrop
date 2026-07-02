import express from "express";
import {
    createInventory,
    getInventoryController,
    getBloodStock,
    getInventoryStats,
    updateInventory,
    decreaseInventory,
    approveTransaction,
    rejectTransaction,
    createWalkinDonation
} from "../controllers/inventoryController.js";
import { getExpiryNotifications } from "../services/expiryService.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.post('/create-inventory', userAuth, createInventory);
router.get('/get-inventory', userAuth, getInventoryController);
router.get('/blood-stock', userAuth, getBloodStock);
router.get('/stats', userAuth, getInventoryStats);
router.put('/update-inventory/:id', userAuth, updateInventory);

router.post('/decrease-inventory', userAuth, decreaseInventory);
router.post('/approve-transaction/:transactionId', userAuth, approveTransaction);
router.post('/reject-transaction/:transactionId', userAuth, rejectTransaction);
router.post('/expiry-notifications', userAuth, getExpiryNotifications);
router.post('/walkin-donation', userAuth, createWalkinDonation);

export default router;