import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = ({ onLoginSuccess, showToast }) => {
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.emailOrPhone || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', formData);
      
      const { token, user, profile } = res.data;
      
      // Save details locally
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (profile) {
        localStorage.setItem('profile', JSON.stringify(profile));
      }

      onLoginSuccess(user, profile);
      showToast(`Welcome back, ${user.name}!`, 'success');

      // Navigate based on role
      if (user.role === 'student') {
        navigate('/student-dashboard');
      } else if (user.role === 'driver') {
        navigate('/driver-dashboard');
      } else if (user.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
      showToast(err.response?.data?.message || 'Login failed', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="glass-card p-4 p-md-5">
            <div className="text-center mb-4">
              <i className="bi bi-car-front-fill text-primary fs-1"></i>
              <h2 className="fw-bold mt-2">Sign In</h2>
              <p className="text-muted">Enter your credentials to access UniTransit</p>
            </div>

            {error && (
              <div className="alert alert-danger rounded-3" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label font-weight-medium">Email or Phone Number</label>
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--border-color)' }}>
                    <i className="bi bi-envelope text-muted"></i>
                  </span>
                  <input
                    type="text"
                    name="emailOrPhone"
                    value={formData.emailOrPhone}
                    onChange={handleChange}
                    className="form-control form-control-custom border-start-0"
                    placeholder="name@email.com or 9876543210"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label font-weight-medium">Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--border-color)' }}>
                    <i className="bi bi-lock text-muted"></i>
                  </span>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-control form-control-custom border-start-0"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary-custom w-100 rounded-pill py-2.5 d-flex align-items-center justify-content-center"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Logging in...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-2"></i> Login
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-4">
              <span className="text-muted small">Don't have an account? </span>
              <Link to="/register" className="small text-decoration-none fw-semibold" style={{ color: 'var(--primary)' }}>
                Register here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
