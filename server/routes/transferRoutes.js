import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
    orgInitiateTransfer, createRequest, checkRequestStock,
    orgApproveRequest, orgRejectRequest,
    hospitalApproveTransfer, hospitalRejectTransfer, acknowledgeTransfer,
    adminApprove, adminReject,
    getOrgTransfers, getHospitalTransfers, getAllPendingTransfers
} from "../controllers/transferController.js";

const router = express.Router();

router.post('/create', userAuth, orgInitiateTransfer);       
router.post('/request', userAuth, createRequest);            
router.get('/check-stock/:transferId', userAuth, checkRequestStock);
router.post('/org-approve/:transferId', userAuth, orgApproveRequest);
router.post('/org-reject/:transferId', userAuth, orgRejectRequest);
router.post('/hospital-approve/:transferId', userAuth, hospitalApproveTransfer);
router.post('/hospital-reject/:transferId', userAuth, hospitalRejectTransfer);
router.post('/acknowledge/:transferId', userAuth, acknowledgeTransfer);
router.post('/admin-approve/:transferId', userAuth, adminApprove);
router.post('/admin-reject/:transferId', userAuth, adminReject);
router.get('/org', userAuth, getOrgTransfers);
router.get('/hospital', userAuth, getHospitalTransfers);
router.get('/admin/pending', userAuth, getAllPendingTransfers);

export default router;