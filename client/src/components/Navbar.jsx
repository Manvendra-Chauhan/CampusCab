import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DarkModeToggle from './DarkModeToggle';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogoutClick = async () => {
    await onLogout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-custom sticky-top mb-4">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center fs-3 font-weight-bold" to="/">
          <div className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center me-2 shadow-sm" style={{ width: '38px', height: '38px' }}>
            <i className="bi bi-car-front-fill" style={{ fontSize: '1.25rem' }}></i>
          </div>
          <span style={{ color: 'var(--primary)', fontWeight: '700' }}>Uni</span>
          <span style={{ color: 'var(--text-color)', fontWeight: '700' }}>Transit</span>
        </Link>
        
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
          style={{ border: 'none' }}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            <li className="nav-item">
              <Link className="nav-link nav-link-custom active" to="/">Home</Link>
            </li>

            {user ? (
              <>
                {user.role === 'student' && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link nav-link-custom" to="/student-dashboard?tab=book">Book Ride</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link nav-link-custom" to="/student-dashboard">Dashboard</Link>
                    </li>
                  </>
                )}
                {user.role === 'driver' && (
                  <li className="nav-item">
                    <Link className="nav-link nav-link-custom" to="/driver-dashboard">Driver Dashboard</Link>
                  </li>
                )}
                {user.role === 'admin' && (
                  <li className="nav-item">
                    <Link className="nav-link nav-link-custom" to="/admin-dashboard">Admin Panel</Link>
                  </li>
                )}
                
                <li className="nav-item ms-lg-3 my-2 my-lg-0">
                  <div className="d-flex align-items-center">
                    <span className="badge bg-light text-dark border me-3 py-2 px-3 rounded-pill shadow-sm d-none d-md-inline-block">
                      <i className="bi bi-person-circle text-primary me-1"></i> {user.name} ({user.role})
                    </span>
                    <DarkModeToggle />
                    <button
                      onClick={handleLogoutClick}
                      className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1.5"
                    >
                      <i className="bi bi-box-arrow-right me-1"></i> Logout
                    </button>
                  </div>
                </li>
              </>
            ) : (
              <li className="nav-item ms-lg-3 my-2 my-lg-0 d-flex align-items-center">
                <DarkModeToggle />
                <Link className="btn btn-outline-primary rounded-pill me-2 px-3" to="/login">
                  Login
                </Link>
                <Link className="btn btn-primary-custom rounded-pill px-3" to="/register">
                  Register
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
