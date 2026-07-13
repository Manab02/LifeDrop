import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Feedback from './pages/Feedback';
import Login from './pages/Login';
import Register from './pages/Register';
import EmailVerify from './pages/EmailVerify';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import CompleteProfile from './pages/Completeprofile';
import ProtectedRoute from './components/Protectedroute';
import AdminDashboard from './pages/AdminDashboard';
import DonorDashboard from './pages/DonorDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import OrganisationDashboard from './pages/OrganisationDashboard';
import Search from './pages/Search';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/email-verify" element={<EmailVerify />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/search" element={<Search />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />

        <Route path="/admin-dashboard" element={<ProtectedRoute element={<AdminDashboard />} role="admin" />} />
        <Route path="/donor-dashboard" element={<ProtectedRoute element={<DonorDashboard />} role="donor" />} />
        <Route path="/hospital-dashboard" element={<ProtectedRoute element={<HospitalDashboard />} role="hospital" />} />
        <Route path="/organisation-dashboard" element={<ProtectedRoute element={<OrganisationDashboard />} role="organisation" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;