import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './services/api';
import { disconnectSocket } from './services/socket';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Toast from './components/Toast';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';

const App = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Toast notifier helper
  const showToast = (message, type = 'primary') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Restore authenticated session on reload
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
          setProfile(res.data.profile);
        }
      } catch (err) {
        console.error('Session restore failed:', err.message);
        // Clear corrupt storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('profile');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleLoginSuccess = (loggedInUser, userProfile) => {
    setUser(loggedInUser);
    setProfile(userProfile);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('profile');
      setUser(null);
      setProfile(null);
      disconnectSocket();
      showToast('Logged out successfully', 'info');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', backgroundColor: 'var(--bg-color)' }}>
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Restoring Session...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="d-flex flex-column min-h-100">
        <Navbar user={user} onLogout={handleLogout} />
        
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            
            <Route
              path="/login"
              element={
                user ? (
                  user.role === 'student' ? (
                    <Navigate to="/student-dashboard" replace />
                  ) : user.role === 'driver' ? (
                    <Navigate to="/driver-dashboard" replace />
                  ) : (
                    <Navigate to="/admin-dashboard" replace />
                  )
                ) : (
                  <Login onLoginSuccess={handleLoginSuccess} showToast={showToast} />
                )
              }
            />
            
            <Route
              path="/register"
              element={
                user ? (
                  user.role === 'student' ? (
                    <Navigate to="/student-dashboard" replace />
                  ) : user.role === 'driver' ? (
                    <Navigate to="/driver-dashboard" replace />
                  ) : (
                    <Navigate to="/admin-dashboard" replace />
                  )
                ) : (
                  <Register onLoginSuccess={handleLoginSuccess} showToast={showToast} />
                )
              }
            />

            {/* Guarded Student Dashboard */}
            <Route
              path="/student-dashboard"
              element={
                <ProtectedRoute user={user} loading={loading} allowedRoles={['student']}>
                  <StudentDashboard user={user} profile={profile} showToast={showToast} />
                </ProtectedRoute>
              }
            />

            {/* Guarded Driver Dashboard */}
            <Route
              path="/driver-dashboard"
              element={
                <ProtectedRoute user={user} loading={loading} allowedRoles={['driver']}>
                  <DriverDashboard user={user} showToast={showToast} />
                </ProtectedRoute>
              }
            />

            {/* Guarded Admin Dashboard */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute user={user} loading={loading} allowedRoles={['admin']}>
                  <AdminDashboard user={user} showToast={showToast} />
                </ProtectedRoute>
              }
            />

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Global Toast Alert Layer */}
        <div className="toast-container-custom">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={removeToast}
            />
          ))}
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
