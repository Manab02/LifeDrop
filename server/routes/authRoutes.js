import express from "express";
import passport from "passport";
import "../config/passport.js";
import jwt from "jsonwebtoken";
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

authRouter.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

authRouter.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed` }),
    (req, res) => {
        const user = req.user;

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const userData = encodeURIComponent(JSON.stringify({
            id: user._id,
            email: user.email,
            role: user.role,
            name: user.name,
            bloodtype: user.bloodtype,
            phone: user.phone,
            age: user.age,
            address: user.address,
            isAccountVerified: user.isAccountVerified,
            isAvailable: user.isAvailable,
            approvalStatus: user.approvalStatus
        }));

        const profileComplete = user.bloodtype && user.age && user.address?.state;
        const redirectPath = profileComplete ? '/donor-dashboard' : '/complete-profile';

        res.redirect(`${process.env.FRONTEND_URL}${redirectPath}?user=${userData}`);
    }
);

export default authRouter;