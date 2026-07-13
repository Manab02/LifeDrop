import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import Swal from 'sweetalert2';
import DocumentUpload from '../components/DocumentUpload';

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authorizeDisplay, setAuthorizeDisplay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState(null);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [formData, setFormData] = useState({
    role: 'donor',
    name: '',
    organisationName: '',
    hospitalName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    bloodtype: '',
    age: '',
    state: '',
    district: '',
    city: '',
  });

  useEffect(() => {
    fetch('/states.json')
      .then(res => res.json())
      .then(data => setStates(data))
      .catch(err => console.error('Error loading states:', err));
  }, []);

  useEffect(() => {
    if (formData.state) {
      fetch('/districts.json')
        .then(res => res.json())
        .then(data => {
          const filtered = data.filter(d => d.state_name === formData.state);
          setDistricts(filtered);
          setFormData(prev => ({ ...prev, district: '', city: '' }));
        })
        .catch(err => console.error('Error loading districts:', err));
    } else {
      setDistricts([]);
    }
  }, [formData.state]);

  useEffect(() => {
    if (formData.district) {
      fetch('/cities.json')
        .then(res => res.json())
        .then(data => {
          const stateObj = data.india.states.find(s => s.name === formData.state);
          const districtObj = stateObj?.districts.find(d => d.name === formData.district);
          setCities(districtObj ? districtObj.cities : []);
          setFormData(prev => ({ ...prev, city: '' }));
        })
        .catch(err => console.error('Error loading cities:', err));
    } else {
      setCities([]);
    }
  }, [formData.district, formData.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Password validation
    if (formData.password !== formData.confirmPassword) {
      Swal.fire('Error', 'Passwords do not match!', 'error');
      return;
    }

    if (formData.password.length < 8) {
      Swal.fire('Error', 'Password must be at least 8 characters long!', 'error');
      return;
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
    if (!strongPasswordRegex.test(formData.password)) {
      Swal.fire('Error', 'Password must include an uppercase letter, a lowercase letter, a number, and a symbol!', 'error');
      return;
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      Swal.fire('Error', 'Phone number must be exactly 10 digits!', 'error');
      return;
    }

    if (formData.role === 'donor' && !authorizeDisplay) {
      Swal.fire('Error', 'Please authorize to display your contact info.', 'warning');
      return;
    }

    if ((formData.role === 'hospital' || formData.role === 'organisation') && !document) {
      Swal.fire('Error', 'Please upload your registration document!', 'warning');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('role', formData.role);
      submitData.append('email', formData.email);
      submitData.append('password', formData.password);
      submitData.append('phone', formData.phone);

      // Add role-specific fields
      if (formData.role === 'donor') {
        submitData.append('name', formData.name);
        submitData.append('bloodtype', formData.bloodtype);
        submitData.append('age', formData.age);
        submitData.append('state', formData.state);
        submitData.append('district', formData.district);
        submitData.append('city', formData.city);
      } else if (formData.role === 'organisation') {
        submitData.append('organisationName', formData.organisationName);
        submitData.append('registrationDocument', document);
        submitData.append('state', formData.state);
        submitData.append('district', formData.district);
        submitData.append('city', formData.city);
      } else if (formData.role === 'hospital') {
        submitData.append('hospitalName', formData.hospitalName);
        submitData.append('registrationDocument', document);
        submitData.append('state', formData.state);
        submitData.append('district', formData.district);
        submitData.append('city', formData.city);
      }

      const data = await authAPI.registerWithDocument(submitData);

      if (data.success) {
        if (formData.role === 'donor') {
          Swal.fire({
            icon: 'success',
            title: 'Registration Successful!',
            text: 'Please verify your email to continue.',
            confirmButtonColor: '#DC2626'
          });
          localStorage.setItem('user', JSON.stringify(data.user));
          navigate('/email-verify');
        } else {
          Swal.fire({
            icon: 'info',
            title: 'Registration Submitted!',
            html: `
              <p>Your ${formData.role} registration has been submitted for admin approval.</p>
              <p class="text-sm text-gray-600 mt-2">
                ℹ️ After approval, you can add your address and other details from your dashboard.
              </p>
            `,
            confirmButtonColor: '#DC2626'
          });
          navigate('/login');
        }
      } else {
        Swal.fire('Error', data.message || 'Registration failed!', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Swal.fire('Error', 'An error occurred. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isDonor = formData.role === 'donor';
  const isHospital = formData.role === 'hospital';
  const isOrganisation = formData.role === 'organisation';

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-10">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Register as {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-red-600 font-semibold mb-2">Select Role *</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="donor">Donor</option>
              <option value="organisation">Organisation</option>
              <option value="hospital">Hospital</option>
            </select>
          </div>

          {/* Name Fields */}
          {isDonor && (
            <div>
              <label className="block text-red-600 font-semibold mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {isOrganisation && (
            <div>
              <label className="block text-red-600 font-semibold mb-2">Organisation Name *</label>
              <input
                type="text"
                name="organisationName"
                value={formData.organisationName}
                onChange={handleChange}
                required
                placeholder="Enter organisation name"
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {isHospital && (
            <div>
              <label className="block text-red-600 font-semibold mb-2">Hospital Name *</label>
              <input
                type="text"
                name="hospitalName"
                value={formData.hospitalName}
                onChange={handleChange}
                required
                placeholder="Enter hospital name"
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {/* Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-red-600 font-semibold mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-red-600 font-semibold mb-2">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => handleChange({ target: { name: 'phone', value: e.target.value.replace(/\D/g, '').slice(0, 10) } })}
                required
                placeholder="10-digit mobile number"
                inputMode="numeric"
                maxLength={10}
                pattern="\d{10}"
                title="Phone number must be exactly 10 digits"
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-red-600 font-semibold mb-2">Password *</label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$"
                title="At least 8 characters, with uppercase, lowercase, a number, and a symbol"
                placeholder="Min 8 chars, incl. A-Z, a-z, 0-9, symbol"
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 pr-10"
              />
              <p className="text-xs text-gray-500 mt-1">Must include uppercase, lowercase, a number, and a symbol.</p>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-11 text-gray-500"
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>

            <div className="relative">
              <label className="block text-red-600 font-semibold mb-2">Confirm Password *</label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Re-enter password"
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-11 text-gray-500"
              >
                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Document Upload for Hospital/Organisation */}
          {(isHospital || isOrganisation) && (
            <DocumentUpload
              onFileSelect={setDocument}
              required={true}
            />
          )}

          {/* Location Fields - for Donor, Hospital, and Organisation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-red-600 font-semibold mb-2">State *</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 bg-white"
              >
                <option value="">Select State</option>
                {states.map((s, i) => (
                  <option key={i} value={s.state}>{s.state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-red-600 font-semibold mb-2">District *</label>
              <select
                name="district"
                value={formData.district}
                onChange={handleChange}
                required
                disabled={!formData.state}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 bg-white disabled:bg-gray-100"
              >
                <option value="">Select District</option>
                {districts.map((d, i) => (
                  <option key={i} value={d.DIST_name}>{d.DIST_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-red-600 font-semibold mb-2">City *</label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                disabled={!formData.district}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 bg-white disabled:bg-gray-100"
              >
                <option value="">Select City</option>
                {cities.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Donor-Specific Fields */}
          {isDonor && (
            <>
              {/* Age and Blood Group */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-red-600 font-semibold mb-2">Age *</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    required
                    min="18"
                    max="65"
                    placeholder="18-65 years"
                    className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-red-600 font-semibold mb-2">Blood Group *</label>
                  <select
                    name="bloodtype"
                    value={formData.bloodtype}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    <option value="">Select Blood Group</option>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Authorization Checkbox */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="authorize"
                  checked={authorizeDisplay}
                  onChange={(e) => setAuthorizeDisplay(e.target.checked)}
                  required
                  className="mt-1 accent-red-600 w-4 h-4"
                />
                <label htmlFor="authorize" className="text-sm text-gray-700">
                  I authorize LifeDrop to display my contact information to those in need of blood. *
                </label>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 font-semibold rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Registering...
              </>
            ) : (
              'Register'
            )}
          </button>

          {/* Login Link */}
          <p className="text-center text-sm mt-4">
            Already have an account?{' '}
            <a href="/login" className="text-red-600 font-semibold hover:underline">
              Login
            </a>
          </p>
        </form>
      </div>

      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"
      />
    </div>
  );
};

export default Register;