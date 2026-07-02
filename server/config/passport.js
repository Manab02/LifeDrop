import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import userModel from "../models/userModels.js";
import jwt from "jsonwebtoken";

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:7000'}/api/auth/google/callback`
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists
            let user = await userModel.findOne({ email: profile.emails[0].value });

            if (user) {
                // User exists — only allow donors to login via Google
                if (user.role !== 'donor') {
                    return done(null, false, { message: 'Google login is only available for donors.' });
                }
                return done(null, user);
            }

<<<<<<< HEAD
=======
            // New user — create as donor
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
            user = await userModel.create({
                role: 'donor',
                name: profile.displayName,
                email: profile.emails[0].value,
                password: Math.random().toString(36).slice(-16), // random unusable password
                phone: '0000000000', // placeholder, user must update
                bloodtype: '',       // user must update from dashboard
                age: '',
                address: { state: '', district: '', city: '' },
                isAvailable: false,  // unavailable until profile is completed
                approvalStatus: 'approved',
                isAccountVerified: true
            });

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));

export default passport;