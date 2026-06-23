import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { authAPI } from '../services/api';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);                // 1: Email, 2: OTP & Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

    const handleOtpChange = (index, value) => {
        if (isNaN(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            document.getElementById(`reset-otp-${index + 1}`).focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`reset-otp-${index - 1}`).focus();
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();

        if (!email) {
            alert('Please enter your email');
            return;
        }

        setLoading(true);

        try {
            const data = await authAPI.sendResetOtp(email);

            if (data.success) {
                alert('OTP sent to your email!');
                setStep(2);
            } else {
                alert(data.message || 'Failed to send OTP');
            }
        } catch (error) {
            console.error('Send OTP error:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        const otpString = otp.join('');
        if (otpString.length !== 6) {
            alert('Please enter complete OTP');
            return;
        }

        setLoading(true);

        try {
            const data = await authAPI.resetPassword({
                email,
                otp: otpString,
                newPassword
            });

            if (data.success) {
                alert('Password reset successful! Please login with your new password.');
                navigate('/login');
            } else {
                alert(data.message || 'Password reset failed!');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 px-4">
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap');
        * { font-family: 'Montserrat', sans-serif; }
      `}</style>

            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-10 h-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Reset Password
                    </h2>
                    <p className="text-gray-600 text-sm">
                        {step === 1
                            ? 'Enter your email to receive a reset code'
                            : 'Enter the OTP and your new password'
                        }
                    </p>
                </div>

                {step === 1 ? (
                    // Step 1: Email Input
                    <form onSubmit={handleSendOtp}>
                        <div className="relative mb-6">
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => setEmailFocused(false)}
                                required
                                className="w-full border-b-2 border-gray-300 focus:border-red-600 outline-none py-2 bg-transparent text-base pr-10"
                            />
                            <label
                                htmlFor="email"
                                className={`absolute left-0 text-sm transition-all pointer-events-none ${emailFocused || email
                                        ? '-top-4 text-xs text-red-600'
                                        : 'top-2 text-gray-400 text-base'
                                    }`}
                            >
                                Email Address
                            </label>
                            <Mail className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={18} />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sending...' : 'Send Reset Code'}
                        </button>

                        <div className="text-center mt-6">
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="text-sm text-red-600 hover:underline"
                            >
                                Back to Login
                            </button>
                        </div>
                    </form>
                ) : (
                    // Step 2: OTP & New Password
                    <form onSubmit={handleResetPassword}>
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                                Enter 6-Digit OTP
                            </label>
                            <div className="flex justify-center gap-2">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`reset-otp-${index}`}
                                        type="text"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className="w-10 h-10 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-red-600 focus:outline-none transition"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* New Password */}
                        <div className="relative mb-6">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                required
                                className="w-full border-b-2 border-gray-300 focus:border-red-600 outline-none py-2 bg-transparent text-base pr-10"
                            />
                            <label
                                htmlFor="newPassword"
                                className={`absolute left-0 text-sm transition-all pointer-events-none ${passwordFocused || newPassword
                                        ? '-top-4 text-xs text-red-600'
                                        : 'top-2 text-gray-400 text-base'
                                    }`}
                            >
                                New Password
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-3 text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Confirm Password */}
                        <div className="relative mb-6">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onFocus={() => setConfirmPasswordFocused(true)}
                                onBlur={() => setConfirmPasswordFocused(false)}
                                required
                                className="w-full border-b-2 border-gray-300 focus:border-red-600 outline-none py-2 bg-transparent text-base pr-10"
                            />
                            <label
                                htmlFor="confirmPassword"
                                className={`absolute left-0 text-sm transition-all pointer-events-none ${confirmPasswordFocused || confirmPassword
                                        ? '-top-4 text-xs text-red-600'
                                        : 'top-2 text-gray-400 text-base'
                                    }`}
                            >
                                Confirm New Password
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-2 top-3 text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>

                        <div className="text-center mt-6 space-y-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-sm text-gray-600 hover:underline block w-full"
                            >
                                Change Email
                            </button>
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={loading}
                                className="text-sm text-red-600 hover:underline disabled:opacity-50"
                            >
                                Resend OTP
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;