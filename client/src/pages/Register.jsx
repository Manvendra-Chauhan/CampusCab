import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const Register = ({ onLoginSuccess, showToast }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [role, setRole] = useState('student'); // 'student' or 'driver'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    rollNumber: '',
    batch: '',
    vehicleNumber: '',
    licenseNumber: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle preset role query parameter (e.g. ?role=driver)
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'driver' || roleParam === 'student') {
      setRole(roleParam);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, phone, password, confirmPassword, rollNumber, batch, vehicleNumber, licenseNumber } = formData;

    // Common validations
    if (!name || !phone || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Role specific validations
    if (role === 'student') {
      if (!email || !rollNumber || !batch) {
        setError('Please fill in student Email, Roll Number and Batch');
        return;
      }
    } else if (role === 'driver') {
      if (!vehicleNumber || !licenseNumber) {
        setError('Please fill in vehicle number and license details');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name,
        email: role === 'student' ? email : (email || undefined), // Allow drivers to leave email empty
        phone,
        password,
        role,
        ...(role === 'student' ? { rollNumber, batch } : { vehicleNumber, licenseNumber })
      };

      const res = await api.post('/auth/register', payload);
      
      const { token, user, profile } = res.data;
      
      // Save details locally
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (profile) {
        localStorage.setItem('profile', JSON.stringify(profile));
      }

      onLoginSuccess(user, profile);
      showToast('Registration successful!', 'success');

      // Navigate based on role
      if (user.role === 'student') {
        navigate('/student-dashboard');
      } else {
        navigate('/driver-dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Please check your details.');
      showToast(err.response?.data?.message || 'Registration failed', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="glass-card p-4 p-md-5">
            <div className="text-center mb-4">
              <i className="bi bi-car-front-fill text-primary fs-1"></i>
              <h2 className="fw-bold mt-2">Create Account</h2>
              <p className="text-muted">Register as a Student or Driver for UniTransit</p>
            </div>

            {/* Role Select Toggle Tabs */}
            <div className="nav nav-pills nav-fill mb-4 p-1 rounded bg-light" style={{ border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                className={`nav-link py-2 rounded-pill fw-semibold border-0 ${role === 'student' ? 'active bg-primary text-white shadow-sm' : 'text-secondary bg-transparent'}`}
              >
                <i className="bi bi-mortarboard me-2"></i> Student
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('driver')}
                className={`nav-link py-2 rounded-pill fw-semibold border-0 ${role === 'driver' ? 'active bg-primary text-white shadow-sm' : 'text-secondary bg-transparent'}`}
              >
                <i className="bi bi-car-front me-2"></i> Driver
              </button>
            </div>

            {error && (
              <div className="alert alert-danger rounded-3" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <h5 className="fw-bold mb-3 border-bottom pb-2">
                <i className="bi bi-person me-1 text-primary"></i> Personal Details
              </h5>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label font-weight-medium">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-control form-control-custom"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label font-weight-medium">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-control form-control-custom"
                    placeholder="10-digit mobile"
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label font-weight-medium">
                  Email Address {role === 'student' ? '*' : '(Optional)'}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-control form-control-custom"
                  placeholder="name@email.com"
                  required={role === 'student'}
                />
              </div>

              {/* Role-Specific Fields */}
              {role === 'student' ? (
                <div>
                  <h5 className="fw-bold mb-3 mt-4 border-bottom pb-2">
                    <i className="bi bi-mortarboard me-1 text-primary"></i> Academic Details
                  </h5>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label font-weight-medium">Roll Number *</label>
                      <input
                        type="text"
                        name="rollNumber"
                        value={formData.rollNumber}
                        onChange={handleChange}
                        className="form-control form-control-custom"
                        placeholder="e.g. 102103045"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label font-weight-medium">Batch Year *</label>
                      <input
                        type="text"
                        name="batch"
                        value={formData.batch}
                        onChange={handleChange}
                        className="form-control form-control-custom"
                        placeholder="e.g. 2025"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h5 className="fw-bold mb-3 mt-4 border-bottom pb-2">
                    <i className="bi bi-card-checklist me-1 text-primary"></i> Vehicle & License Details
                  </h5>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label font-weight-medium">Vehicle Number *</label>
                      <input
                        type="text"
                        name="vehicleNumber"
                        value={formData.vehicleNumber}
                        onChange={handleChange}
                        className="form-control form-control-custom"
                        placeholder="e.g. PB-11-AB-1234"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label font-weight-medium">License Number *</label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleChange}
                        className="form-control form-control-custom"
                        placeholder="e.g. DL-123456789"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <h5 className="fw-bold mb-3 mt-4 border-bottom pb-2">
                <i className="bi bi-shield-lock me-1 text-primary"></i> Security
              </h5>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label font-weight-medium">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-control form-control-custom"
                    placeholder="Min 6 characters"
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label font-weight-medium">Confirm Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="form-control form-control-custom"
                    placeholder="Re-enter password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary-custom w-100 rounded-pill py-2.5 mt-4 d-flex align-items-center justify-content-center"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-plus-fill me-2"></i> Register Account
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-4">
              <span className="text-muted small">Already have an account? </span>
              <Link to="/login" className="small text-decoration-none fw-semibold" style={{ color: 'var(--primary)' }}>
                Sign In here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
