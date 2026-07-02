import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, RefreshCw, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
<<<<<<< HEAD
import { authAPI, API_URL } from '../services/api';
=======
import { authAPI } from '../services/api';
>>>>>>> 142ce276d2e571211da685c661614482fd0df331

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('donor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [captchaFocused, setCaptchaFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateCaptcha = () => {
    const newCaptcha = Math.random().toString(36).substring(2, 7).toUpperCase();
    setCaptcha(newCaptcha);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (captchaInput.toUpperCase() !== captcha) {
      alert('Invalid CAPTCHA! Please try again.');
      generateCaptcha();
      setCaptchaInput('');
      return;
    }

    setLoading(true);

    try {
      const data = await authAPI.login({ email, password, role, rememberMe });

      if (data.success) {
        alert(`Login successful! Welcome ${data.user?.name}`);

        localStorage.setItem('user', JSON.stringify(data.user));

        switch (role) {
          case 'donor':
            navigate('/donor-dashboard');
            break;
          case 'organisation':
            navigate('/organisation-dashboard');
            break;
          case 'hospital':
            navigate('/hospital-dashboard');
            break;
          case 'admin':
            navigate('/admin-dashboard');
            break;
          default:
            navigate('/');
        }
      } else {
        alert(data.message || 'Login failed!');
        generateCaptcha();
        setCaptchaInput('');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-red-50 via-white to-red-50 py-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap');
        * { font-family: 'Montserrat', sans-serif; }
      `}</style>

      <div className="w-full max-w-[22rem] sm:max-w-md md:max-w-lg px-5 z-10 relative">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10 text-gray-800 relative border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-red-600 mb-2">
              LifeDrop Login
            </h2>
            <p className="text-gray-500 text-sm">Access your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="relative mb-6">
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full border-b-2 border-gray-300 focus:border-red-600 outline-none py-2 bg-transparent text-base pr-10 cursor-pointer appearance-none"
              >
                <option value="donor">Donor</option>
                <option value="organisation">Organisation</option>
                <option value="hospital">Hospital</option>
                <option value="admin">Admin</option>
              </select>
              <label
                htmlFor="role"
                className="absolute left-0 -top-4 text-xs text-red-600"
              >
                Login As
              </label>
              <User className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={18} />
            </div>
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
                Email
              </label>
              <Mail className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={18} />
            </div>
            <div className="relative mb-6">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                required
                className="w-full border-b-2 border-gray-300 focus:border-red-600 outline-none py-2 bg-transparent text-base pr-10"
              />
              <label
                htmlFor="password"
                className={`absolute left-0 text-sm transition-all pointer-events-none ${passwordFocused || password
                  ? '-top-4 text-xs text-red-600'
                  : 'top-2 text-gray-400 text-base'
                  }`}
              >
                Password
              </label>
              <button
                type="button"
                onClick={togglePassword}
                className="absolute right-2 top-3 text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  id="captchaInput"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  onFocus={() => setCaptchaFocused(true)}
                  onBlur={() => setCaptchaFocused(false)}
                  required
                  className="w-full border-b-2 border-gray-300 focus:border-red-600 outline-none py-2 bg-transparent text-base"
                />
                <label
                  htmlFor="captchaInput"
                  className={`absolute left-0 text-sm transition-all pointer-events-none ${captchaFocused || captchaInput
                    ? '-top-4 text-xs text-red-600'
                    : 'top-2 text-gray-400 text-base'
                    }`}
                >
                  Enter CAPTCHA
                </label>
              </div>

              <div className="flex items-center">
                <span className="bg-gray-200 text-red-600 font-bold px-4 py-2 rounded-md select-none font-mono text-lg tracking-wider">
                  {captcha}
                </span>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="ml-3 text-gray-400 hover:text-red-600 cursor-pointer transition focus:outline-none"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm mb-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="accent-red-600"
                />
                <span className="text-gray-600">Remember Me</span>
              </label>
              <a href="/reset-password" className="text-red-600 hover:underline">
                Forgot Password?
              </a>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
            </button>
            <div className="my-6 flex items-center justify-center">
              <span className="h-px w-16 bg-gray-300"></span>
              <span className="mx-3 text-gray-500 text-sm">or continue with</span>
              <span className="h-px w-16 bg-gray-300"></span>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
<<<<<<< HEAD
                onClick={() => window.location.href = `${API_URL}/api/auth/google`}
=======
                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/auth/google`}
>>>>>>> 142ce276d2e571211da685c661614482fd0df331
                className="flex items-center gap-3 border border-gray-300 rounded-full px-6 py-2 hover:bg-gray-50 transition font-medium text-gray-700"
              >
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>
            </div>
            <div className="text-center mt-6 text-sm">
              <p>
                Don't have an account?{' '}
                <a href="/register" className="text-red-600 hover:underline font-medium">
                  Register
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;