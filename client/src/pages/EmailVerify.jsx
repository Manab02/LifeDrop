import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const EmailVerify = () => {
    const navigate = useNavigate();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [timer, setTimer] = useState(120);                 // 2 minutes otp validation
    const [canResend, setCanResend] = useState(false);
    const hasOtpBeenSent = useRef(false);                     

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id) {
            navigate('/login');
            return;
        }

        if (!hasOtpBeenSent.current) {
            hasOtpBeenSent.current = true;
            sendOtp();
        }

        const interval = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    setCanResend(true);
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);                                     
    const sendOtp = async () => {
        try {
            const data = await authAPI.sendVerifyOtp();
            if (data.success) {
                console.log('OTP sent successfully');
            } else {
                alert(data.message || 'Failed to send OTP');
            }
        } catch (error) {
            console.error('Send OTP error:', error);
            alert('Failed to send OTP. Please try again.');
        }
    };

    const handleResendOtp = async () => {
        setResendLoading(true);
        setCanResend(false);
        setTimer(120);

        try {
            const data = await authAPI.sendVerifyOtp();
            if (data.success) {
                alert('OTP resent successfully!');
                const interval = setInterval(() => {
                    setTimer((prev) => {
                        if (prev <= 1) {
                            setCanResend(true);
                            clearInterval(interval);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                alert(data.message || 'Failed to resend OTP');
                setCanResend(true);
            }
        } catch (error) {
            console.error('Resend OTP error:', error);
            alert('Failed to resend OTP');
            setCanResend(true);
        } finally {
            setResendLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (isNaN(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`).focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`).focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d+$/.test(pastedData)) {
            const newOtp = pastedData.split('');
            setOtp([...newOtp, ...Array(6 - newOtp.length).fill('')]);
            const focusIndex = Math.min(pastedData.length, 5);
            document.getElementById(`otp-${focusIndex}`).focus();
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();

        const otpString = otp.join('');
        if (otpString.length !== 6) {
            alert('Please enter complete OTP');
            return;
        }

        setLoading(true);

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const data = await authAPI.verifyEmail({
                userId: user.id,
                otp: otpString
            });

            if (data.success) {
                alert('Email verified successfully!');
                user.isAccountVerified = true;
                localStorage.setItem('user', JSON.stringify(user));

                switch (user.role) {
                    case 'donor':
                        navigate('/donor-dashboard');
                        break;
                    case 'hospital':
                        navigate('/hospital-dashboard');
                        break;
                    case 'organisation':
                        navigate('/organisation-dashboard');
                        break;
                    case 'admin':
                        navigate('/admin-dashboard');
                        break;
                    default:
                        navigate('/');
                }
            } else {
                alert(data.message || 'Invalid OTP');
                setOtp(['', '', '', '', '', '']);
                document.getElementById('otp-0').focus();
            }
        } catch (error) {
            console.error('Verify OTP error:', error);
            alert('Failed to verify OTP');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            
                <div className="text-center mb-8">
                    <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa fa-envelope text-red-600 text-3xl"></i>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Verify Your Email</h1>
                    <p className="text-gray-600">
                        We've sent a 6-digit OTP to your email address
                    </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                    <div>
                        <label className="block text-gray-700 font-semibold mb-3 text-center">
                            Enter OTP
                        </label>
                        <div className="flex gap-2 justify-center">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    maxLength="1"
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={index === 0 ? handlePaste : undefined}
                                    className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-200 focus:outline-none transition"
                                    required
                                />
                            ))}
                        </div>
                    </div>

                    <div className="text-center">
                        {!canResend ? (
                            <p className="text-gray-600">
                                Resend OTP in{' '}
                                <span className="font-bold text-red-600">{formatTime(timer)}</span>
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={resendLoading}
                                className="text-red-600 font-semibold hover:text-red-700 transition disabled:opacity-50"
                            >
                                {resendLoading ? (
                                    <span>
                                        <i className="fa fa-spinner fa-spin mr-2"></i>
                                        Sending...
                                    </span>
                                ) : (
                                    <>
                                        <i className="fa fa-redo mr-2"></i>
                                        Resend OTP
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span>
                                <i className="fa fa-spinner fa-spin mr-2"></i>
                                Verifying...
                            </span>
                        ) : (
                            <>
                                <i className="fa fa-check-circle mr-2"></i>
                                Verify Email
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            const user = JSON.parse(localStorage.getItem('user') || '{}');
                            switch (user.role) {
                                case 'donor':
                                    navigate('/donor-dashboard');
                                    break;
                                case 'hospital':
                                    navigate('/hospital-dashboard');
                                    break;
                                case 'organisation':
                                    navigate('/organisation-dashboard');
                                    break;
                                case 'admin':
                                    navigate('/admin-dashboard');
                                    break;
                                default:
                                    navigate('/');
                            }
                        }}
                        className="text-gray-600 hover:text-gray-800 transition"
                    >
                        <i className="fa fa-arrow-left mr-2"></i>
                        Back to Dashboard
                    </button>
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <i className="fa fa-info-circle mr-2"></i>
                        <strong>Tip:</strong> Check your spam folder if you don't see the email in your inbox.
                    </p>
                </div>
            </div>

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        </div>
    );
};

export default EmailVerify;