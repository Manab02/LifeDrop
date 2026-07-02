import express from "express";
import {
    createInventory,
    getInventoryController,
    getBloodStock,
    getInventoryStats,
    updateInventory,
    decreaseInventory,
    approveTransaction,
<<<<<<< HEAD
    rejectTransaction,
    createWalkinDonation
=======
    rejectTransaction
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
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
<<<<<<< HEAD
router.post('/walkin-donation', userAuth, createWalkinDonation);
=======
>>>>>>> 142ce276d2e571211da685c661614482fd0df331

export default router;