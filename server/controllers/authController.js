import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModels.js";
import transporter from "../config/nodemailer.js";

export const register = async (req, res) => {
    console.log('Registration request:', req.body);
    console.log('Uploaded file:', req.file);

    const { email, password, role, name, organisationName, hospitalName, bloodtype, age, phone, state, district, city } = req.body;


    if (!email || !password || !role || !phone) {
        console.log('Missing basic fields');
        return res.json({ success: false, message: 'Email, password, role, and phone are required!' });
    }

    if (role === 'donor' && (!name || !bloodtype || !age || !state || !district || !city)) {
        console.log(' Missing donor fields');
        return res.json({ success: false, message: 'Please provide all donor details!' });
    }

    if (role === 'hospital' && (!hospitalName || !state || !district || !city)) {
        console.log(' Missing hospital fields');
        return res.json({ success: false, message: 'Please provide hospital name and location!' });
    }

    if (role === 'organisation' && (!organisationName || !state || !district || !city)) {
        console.log(' Missing organisation fields');
        return res.json({ success: false, message: 'Please provide organisation name and location!' });
    }

    if ((role === 'hospital' || role === 'organisation') && !req.file) {
        console.log('Missing registration document');
        return res.json({
            success: false,
            message: 'Registration document is required for hospitals and organisations!'
        });
    }

    try {
        console.log('Checking existing user...');
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            console.log(' User already exists');
            return res.json({ success: false, message: "User already exists" });
        }

        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('Building user data...');
        const userData = {
            role,
            email,
            password: hashedPassword,
            phone,
            isAccountVerified: false
        };

        if (role === 'donor') {
            userData.name = name;
            userData.bloodtype = bloodtype;
            userData.age = age;
            userData.address = { state, district, city };
            userData.isAvailable = true;
            userData.approvalStatus = 'approved';
        } else if (role === 'organisation') {
            userData.organisationName = organisationName;
            userData.address = { state, district, city };
            userData.approvalStatus = 'pending';

            if (req.file) {
                userData.registrationDocument = {
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    path: req.file.path,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    uploadedAt: new Date()
                };
            }
        } else if (role === 'hospital') {
            userData.hospitalName = hospitalName;
            userData.address = { state, district, city };
            userData.approvalStatus = 'pending';

            if (req.file) {
                userData.registrationDocument = {
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    path: req.file.path,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    uploadedAt: new Date()
                };
            }
        } else if (role === 'admin') {
            userData.name = name;
            userData.approvalStatus = 'approved';
        }

        console.log('Creating user...');
        const user = new userModel(userData);
        await user.save();

        console.log(' User created, generating token...');
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        console.log('Attempting to send email...');
        try {
            let emailContent = `
                <h2>Welcome to Life Drop!</h2>
                <p>Your account has been successfully created.</p>
                <p><strong>Email:</strong> ${email}</p>
            `;

            if (role === 'donor') {
                emailContent += '<p>Please verify your email to start donating.</p>';
            } else if (role === 'hospital') {
                emailContent += `
                    <p><strong>Status:</strong> Pending Admin Approval</p>
                    <p>Your hospital registration document has been submitted for review.</p>
                    <p>You will receive an email once the admin approves your account.</p>
                    <p><em>Note: After approval, you can add your hospital address and blood bank details.</em></p>
                `;
            } else if (role === 'organisation') {
                emailContent += `
                    <p><strong>Status:</strong> Pending Admin Approval</p>
                    <p>Your organisation registration document has been submitted for review.</p>
                    <p>You will receive an email once the admin approves your account.</p>
                    <p><em>Note: After approval, you can add your organisation address and blood bank details.</em></p>
                `;
            }

            emailContent += '<p>Thank you for joining us in saving lives!</p>';

            const mailOptions = {
                from: process.env.SENDER_EMAIL,
                to: email,
                subject: 'Welcome to Life Drop',
                html: emailContent
            };

            await transporter.sendMail(mailOptions);
            console.log('Email sent');
        } catch (emailError) {
            console.log('Email send failed (non-critical):', emailError.message);
        }

        console.log('Registration successful!');
        return res.json({
            success: true,
            message: role === 'donor'
                ? 'Registration successful!'
                : 'Registration submitted! Waiting for admin approval.',
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                name: user.name || user.organisationName || user.hospitalName,
                organisationName: user.organisationName,
                hospitalName: user.hospitalName,
                phone: user.phone,
                bloodtype: user.bloodtype,
                age: user.age,
                address: user.address,
                isAvailable: user.isAvailable,
                isAccountVerified: user.isAccountVerified,
                approvalStatus: user.approvalStatus,
                systemId: user.systemId,
                nextEligibleDate: user.nextEligibleDate,
                lastDonationDate: user.lastDonationDate
            }
        });

    } catch (error) {
        console.error(' Registration error:', error);
        return res.json({ success: false, message: error.message });
    }
};

export const login = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: 'Email and Password are required' });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: 'Invalid email' });
        }

        if (user.role !== role) {
            return res.json({
                success: false,
                message: `This account is registered as ${user.role}. Please select the correct role.`
            });
        }

        if ((user.role === 'hospital' || user.role === 'organisation') && user.approvalStatus !== 'approved') {
            if (user.approvalStatus === 'pending') {
                return res.json({
                    success: false,
                    message: 'Your account is pending admin approval. Please wait for approval email.'
                });
            } else if (user.approvalStatus === 'rejected') {
                return res.json({
                    success: false,
                    message: `Your account was rejected. Reason: ${user.rejectionReason || 'Not specified'}`
                });
            }
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.json({ success: false, message: 'Invalid Password' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.json({
            success: true,
            message: 'Login successful!',
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                name: user.name || user.organisationName || user.hospitalName,
                organisationName: user.organisationName,
                hospitalName: user.hospitalName,
                phone: user.phone,
                bloodtype: user.bloodtype,
                age: user.age,
                address: user.address,
                isAvailable: user.isAvailable,
                isAccountVerified: user.isAccountVerified,
                approvalStatus: user.approvalStatus,
                systemId: user.systemId,
                nextEligibleDate: user.nextEligibleDate,
                lastDonationDate: user.lastDonationDate
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.json({ success: false, message: error.message });
    }
};

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        });

        return res.json({ success: true, message: "Logged Out" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const sendVerifyOtp = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (user.isAccountVerified) {
            return res.json({ success: false, message: "Account Already Verified" });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        user.verifyOtp = otp;
        user.verifyOtpExprireAt = Date.now() + 2 * 60 * 1000;

        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Account Verification OTP',
            html: `
                <!DOCTYPE html>
                <html lang="en">
                <body style="font-family: Arial, sans-serif; background-color: #f2f4f8; margin: 0; padding: 0;">
                <div style="max-width: 500px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); overflow: hidden;">
                    <div style="background-color: #DC2626; color: white; text-align: center; padding: 16px 0;">
                    <h2 style="margin: 0; font-size: 20px;">Your OTP Code</h2>
                    </div>
                    <div style="padding: 24px; color: #333;">
                    <p style="font-size: 15px;">Hello,</p>
                    <p style="font-size: 15px;">Your One-Time Password (OTP) for <b>account verification</b> is:</p>
                    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 14px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 28px; font-weight: bold; color: #DC2626;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #444;">
                        This OTP is valid for <strong>2 minutes</strong>. Please do not share this code with anyone.
                    </p>
                    <p style="font-size: 14px; color: #555;">
                        If you didn't request this code, please ignore this email.<br>
                        Thank you for using our service!
                    </p>
                    </div>
                </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);

        return res.json({ success: true, message: "OTP sent to email." });

    } catch (error) {
        console.error('Send OTP error:', error);
        return res.json({ success: false, message: error.message });
    }
};

export const verifyEmail = async (req, res) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        return res.json({ success: false, message: "Missing Details!" });
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found!" });
        }

        if (user.verifyOtp === '' || user.verifyOtp !== otp) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        if (user.verifyOtpExprireAt < Date.now()) {
            return res.json({ success: false, message: "OTP Expired" });
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExprireAt = 0;

        await user.save();
        return res.json({ success: true, message: "Email verified Successfully." });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const isAuthenticated = async (req, res) => {
    try {
        const user = await userModel.findById(req.body.userId).select('-password');

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        return res.json({
            success: true,
            message: "Authenticated",
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                name: user.name || user.organisationName || user.hospitalName,
                isAccountVerified: user.isAccountVerified,
                approvalStatus: user.approvalStatus
            }
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const sendResetOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.json({ success: false, message: "Email is required" });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        user.resetOtp = otp;
        user.resetOtpExprireAt = Date.now() + 2 * 60 * 1000;

        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Password Reset OTP',
            html: `
                <!DOCTYPE html>
                <html lang="en">
                <body style="font-family: Arial, sans-serif; background-color: #f2f4f8; margin: 0; padding: 0;">
                <div style="max-width: 500px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); overflow: hidden;">
                    <div style="background-color: #DC2626; color: white; text-align: center; padding: 16px 0;">
                    <h2 style="margin: 0; font-size: 20px;">Password Reset OTP</h2>
                    </div>
                    <div style="padding: 24px; color: #333;">
                    <p style="font-size: 15px;">Hello,</p>
                    <p style="font-size: 15px;">Your One-Time Password (OTP) for <b>password reset</b> is:</p>
                    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 14px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 28px; font-weight: bold; color: #DC2626;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #444;">
                        This OTP is valid for <strong>2 minutes</strong>. Please do not share this code with anyone.
                    </p>
                    <p style="font-size: 14px; color: #555;">
                        If you didn't request this code, please ignore this email.<br>
                        Thank you for using our service!
                    </p>
                    </div>
                </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);

        return res.json({ success: true, message: "OTP sent to email." });

    } catch (error) {
        console.error('Reset OTP error:', error);
        return res.json({ success: false, message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.json({ success: false, message: "Email, OTP and new password are required" });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (user.resetOtp === "" || user.resetOtp !== otp) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        if (user.resetOtpExprireAt < Date.now()) {
            return res.json({ success: false, message: "OTP is Expired" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.resetOtp = "";
        user.resetOtpExprireAt = 0;
        await user.save();

        return res.json({ success: true, message: "Password reset successful" });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.body.userId;

        if (!currentPassword || !newPassword) {
            return res.json({ success: false, message: 'Required fields missing' });
        }

        if (newPassword.length < 6) {
            return res.json({ success: false, message: 'Password must be at least 6 characters' });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Current password incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};