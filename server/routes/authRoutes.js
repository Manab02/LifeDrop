import express from "express";
import { register, login, logout, isAuthenticated, sendVerifyOtp, sendResetOtp, verifyEmail, resetPassword, changePassword } from "../controllers/authController.js";
import { uploadDocument, handleUploadError } from "../middleware/upload.js";
import userAuth from "../middleware/userAuth.js";

const authRouter = express.Router();

authRouter.post('/register', uploadDocument, handleUploadError, register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/send-verify-otp', userAuth, sendVerifyOtp);
authRouter.post('/verify-account', userAuth, verifyEmail);
authRouter.post('/is-auth', userAuth, isAuthenticated);
authRouter.post('/send-reset-otp', sendResetOtp);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/change-password', userAuth, changePassword);

export default authRouter;