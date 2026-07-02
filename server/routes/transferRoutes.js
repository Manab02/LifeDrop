import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
    orgInitiateTransfer, createRequest, checkRequestStock,
    orgApproveRequest, orgRejectRequest,
    adminApprove, adminReject,
    getOrgTransfers, getHospitalTransfers, getAllPendingTransfers
} from "../controllers/transferController.js";

const router = express.Router();

router.post('/create', userAuth, orgInitiateTransfer);       // org pushes blood to hospital
router.post('/request', userAuth, createRequest);            // hospital requests blood from org
router.get('/check-stock/:transferId', userAuth, checkRequestStock);
router.post('/org-approve/:transferId', userAuth, orgApproveRequest);
router.post('/org-reject/:transferId', userAuth, orgRejectRequest);
router.post('/admin-approve/:transferId', userAuth, adminApprove);
router.post('/admin-reject/:transferId', userAuth, adminReject);
router.get('/org', userAuth, getOrgTransfers);
router.get('/hospital', userAuth, getHospitalTransfers);
router.get('/admin/pending', userAuth, getAllPendingTransfers);

export default router;