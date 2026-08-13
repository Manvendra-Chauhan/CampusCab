import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminDashboard = ({ user, showToast }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Stats states
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalDrivers: 0,
    onlineDrivers: 0,
    activeDrivers: 0,
    completedRides: 0,
    totalRevenue: 0
  });

  // Charts states
  const [dailyStats, setDailyStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);

  // Lists states
  const [usersList, setUsersList] = useState([]);
  const [ridesList, setRidesList] = useState([]);
  
  // Search & Filter states
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('');
  const [ridesSearch, setRidesSearch] = useState('');
  const [ridesStatusFilter, setRidesStatusFilter] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchRides();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data.success) {
        setMetrics(res.data.stats);
        setDailyStats(res.data.dailyStats);
        setMonthlyStats(res.data.monthlyStats);
      }
    } catch (err) {
      console.error('Error fetching admin statistics:', err);
    }
  };

  const fetchUsers = async (search = '', role = '') => {
    try {
      const res = await api.get(`/admin/users?search=${search}&role=${role}`);
      if (res.data.success) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchRides = async (search = '', status = '') => {
    try {
      const res = await api.get(`/admin/rides?search=${search}&status=${status}`);
      if (res.data.success) {
        setRidesList(res.data.rides);
      }
    } catch (err) {
      console.error('Error fetching rides:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('WARNING: Are you sure you want to permanently delete this user, their profile, and associated history?')) return;
    try {
      const res = await api.delete(`/admin/user/${userId}`);
      if (res.data.success) {
        showToast('User and associated records deleted successfully.', 'success');
        fetchUsers();
        fetchStats();
        fetchRides();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user', 'danger');
    }
  };

  const handleSuspendDriver = async (driverUserId) => {
    try {
      const res = await api.put(`/admin/suspend/${driverUserId}`);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to toggle driver suspension', 'danger');
    }
  };

  const handleUserSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(usersSearch, usersRoleFilter);
  };

  const handleRideSearchSubmit = (e) => {
    e.preventDefault();
    fetchRides(ridesSearch, ridesStatusFilter);
  };

  const handleUsersRoleFilterChange = (role) => {
    setUsersRoleFilter(role);
    fetchUsers(usersSearch, role);
  };

  const handleRidesStatusFilterChange = (status) => {
    setRidesStatusFilter(status);
    fetchRides(ridesSearch, status);
  };

  // --- CHART CONFIGURATIONS ---
  // A. Daily Rides Chart Data (Past 7 Completed Days)
  const dailyLabels = dailyStats.map(item => item._id);
  const dailyRidesCount = dailyStats.map(item => item.count);
  const dailyRevenueAmount = dailyStats.map(item => item.revenue);

  const dailyRidesChartData = {
    labels: dailyLabels.length > 0 ? dailyLabels : ['No Data'],
    datasets: [
      {
        label: 'Daily Completed Rides',
        data: dailyRidesCount.length > 0 ? dailyRidesCount : [0],
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#4f46e5'
      }
    ]
  };

  const dailyRevenueChartData = {
    labels: dailyLabels.length > 0 ? dailyLabels : ['No Data'],
    datasets: [
      {
        label: 'Daily Revenue (₹)',
        data: dailyRevenueAmount.length > 0 ? dailyRevenueAmount : [0],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#10b981'
      }
    ]
  };

  // B. Monthly Rides Chart Data (Past Year)
  const monthlyLabels = monthlyStats.map(item => item._id);
  const monthlyRidesCount = monthlyStats.map(item => item.count);

  const monthlyRidesChartData = {
    labels: monthlyLabels.length > 0 ? monthlyLabels : ['No Data'],
    datasets: [
      {
        label: 'Monthly Completed Rides',
        data: monthlyRidesCount.length > 0 ? monthlyRidesCount : [0],
        backgroundColor: '#f59e0b',
        borderRadius: 8
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'var(--text-color)'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: 'var(--text-muted)' },
        grid: { color: 'var(--border-color)' }
      },
      y: {
        ticks: { color: 'var(--text-muted)' },
        grid: { color: 'var(--border-color)' }
      }
    }
  };

  return (
    <div className="container py-4">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-0">Admin Controller Room</h2>
          <p className="text-muted mb-0">System metrics overview & account management</p>
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`btn rounded-pill px-3 py-1.5 fw-semibold ${activeTab === 'overview' ? 'btn-primary-custom' : 'btn-light border text-dark'}`}
          >
            <i className="bi bi-bar-chart-line-fill me-1"></i> Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`btn rounded-pill px-3 py-1.5 fw-semibold ${activeTab === 'users' ? 'btn-primary-custom' : 'btn-light border text-dark'}`}
          >
            <i className="bi bi-people-fill me-1"></i> Users Management
          </button>
          <button
            onClick={() => setActiveTab('rides')}
            className={`btn rounded-pill px-3 py-1.5 fw-semibold ${activeTab === 'rides' ? 'btn-primary-custom' : 'btn-light border text-dark'}`}
          >
            <i className="bi bi-map-fill me-1"></i> Rides Log
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-2">
          <div className="glass-card p-3 border-0 bg-white shadow-sm text-center">
            <p className="mb-0 small text-muted text-uppercase fw-semibold">Students</p>
            <h3 className="fw-extrabold mb-0 text-primary">{metrics.totalStudents}</h3>
          </div>
        </div>
        <div className="col-6 col-lg-2">
          <div className="glass-card p-3 border-0 bg-white shadow-sm text-center">
            <p className="mb-0 small text-muted text-uppercase fw-semibold">Drivers</p>
            <h3 className="fw-extrabold mb-0 text-dark">{metrics.totalDrivers}</h3>
          </div>
        </div>
        <div className="col-6 col-lg-2">
          <div className="glass-card p-3 border-0 bg-white shadow-sm text-center">
            <p className="mb-0 small text-muted text-uppercase fw-semibold">Online Cabs</p>
            <h3 className="fw-extrabold mb-0 text-success">{metrics.onlineDrivers}</h3>
          </div>
        </div>
        <div className="col-6 col-lg-2">
          <div className="glass-card p-3 border-0 bg-white shadow-sm text-center">
            <p className="mb-0 small text-muted text-uppercase fw-semibold">Active Free</p>
            <h3 className="fw-extrabold mb-0 text-info">{metrics.activeDrivers}</h3>
          </div>
        </div>
        <div className="col-6 col-lg-2">
          <div className="glass-card p-3 border-0 bg-white shadow-sm text-center">
            <p className="mb-0 small text-muted text-uppercase fw-semibold">Rides Done</p>
            <h3 className="fw-extrabold mb-0 text-warning">{metrics.completedRides}</h3>
          </div>
        </div>
        <div className="col-6 col-lg-2">
          <div className="glass-card p-3 border-0 bg-white shadow-sm text-center">
            <p className="mb-0 small text-muted text-uppercase fw-semibold">Revenue</p>
            <h3 className="fw-extrabold mb-0 text-success">₹{metrics.totalRevenue}</h3>
          </div>
        </div>
      </div>

      {/* RENDER VIEW */}

      {/* VIEW: OVERVIEW (CHARTS) */}
      {activeTab === 'overview' && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="glass-card p-4">
              <h5 className="fw-bold mb-3">Daily Completed Trips (Past 7 Days)</h5>
              <div style={{ position: 'relative', height: '280px' }}>
                <Line data={dailyRidesChartData} options={chartOptions} />
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="glass-card p-4">
              <h5 className="fw-bold mb-3">Daily Revenue Trend (Past 7 Days)</h5>
              <div style={{ position: 'relative', height: '280px' }}>
                <Line data={dailyRevenueChartData} options={chartOptions} />
              </div>
            </div>
          </div>
          <div className="col-lg-12">
            <div className="glass-card p-4">
              <h5 className="fw-bold mb-3">Monthly Rides Summary (Yearly Trend)</h5>
              <div style={{ position: 'relative', height: '300px' }}>
                <Bar data={monthlyRidesChartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="glass-card p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
            <h4 className="fw-bold mb-0">Registered Users ({usersList.length})</h4>
            
            <form onSubmit={handleUserSearchSubmit} className="d-flex gap-2 align-items-center flex-wrap">
              <select
                value={usersRoleFilter}
                onChange={(e) => handleUsersRoleFilterChange(e.target.value)}
                className="form-select form-control-custom py-1.5"
                style={{ width: '150px' }}
              >
                <option value="">All Roles</option>
                <option value="student">Students</option>
                <option value="driver">Drivers</option>
              </select>
              
              <input
                type="text"
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                placeholder="Search name, phone, roll..."
                className="form-control form-control-custom py-1.5"
                style={{ width: '220px' }}
              />
              <button type="submit" className="btn btn-primary-custom btn-sm rounded-pill px-3">
                Search
              </button>
            </form>
          </div>

          <div className="table-responsive">
            <table className="table align-middle table-hover">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Role</th>
                  <th>Contact Info</th>
                  <th>Extra Profile Attributes</th>
                  <th>Date Joined</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((usr) => (
                  <tr key={usr._id}>
                    <td>
                      <div className="fw-bold">{usr.name}</div>
                      <small className="text-muted">UID: #{usr._id.substring(18)}</small>
                    </td>
                    <td>
                      <span className={`badge ${usr.role === 'student' ? 'bg-primary-subtle text-primary border border-primary' : 'bg-dark-subtle text-dark border border-dark'} rounded-pill px-2.5 py-1 text-uppercase`} style={{ fontSize: '10px', fontWeight: '700' }}>
                        {usr.role}
                      </span>
                    </td>
                    <td>
                      <div className="small"><i className="bi bi-envelope me-1"></i> {usr.email}</div>
                      <div className="small text-muted"><i className="bi bi-telephone me-1"></i> {usr.phone}</div>
                    </td>
                    <td>
                      {usr.role === 'student' ? (
                        <div className="small">
                          <strong>Roll:</strong> {usr.profile?.rollNumber || 'N/A'}<br />
                          <strong>Batch:</strong> {usr.profile?.batch || 'N/A'}
                        </div>
                      ) : (
                        <div className="small">
                          <strong>Vehicle:</strong> {usr.profile?.vehicleNumber || 'N/A'}<br />
                          <strong>License:</strong> {usr.profile?.licenseNumber || 'N/A'}<br />
                          <strong>Earnings:</strong> <span className="text-success fw-bold">₹{usr.profile?.earnings || 0}</span>
                        </div>
                      )}
                    </td>
                    <td className="small text-muted">
                      {new Date(usr.createdAt).toLocaleDateString()}
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1.5">
                        {usr.role === 'driver' && usr.profile && (
                          <button
                            onClick={() => handleSuspendDriver(usr._id)}
                            className={`btn btn-xs rounded-pill ${usr.profile.isSuspended ? 'btn-success' : 'btn-warning'} btn-sm px-2.5 py-1 me-1`}
                          >
                            {usr.profile.isSuspended ? (
                              <><i className="bi bi-play-fill me-1"></i> Reactivate</>
                            ) : (
                              <><i className="bi bi-pause-fill me-1"></i> Suspend</>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(usr._id)}
                          className="btn btn-outline-danger btn-sm rounded-pill px-2.5 py-1"
                          title="Delete User"
                        >
                          <i className="bi bi-trash3-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: RIDES HISTORY */}
      {activeTab === 'rides' && (
        <div className="glass-card p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
            <h4 className="fw-bold mb-0">Trips Log ({ridesList.length})</h4>
            
            <form onSubmit={handleRideSearchSubmit} className="d-flex gap-2 align-items-center flex-wrap">
              <select
                value={ridesStatusFilter}
                onChange={(e) => handleRidesStatusFilterChange(e.target.value)}
                className="form-select form-control-custom py-1.5"
                style={{ width: '160px' }}
              >
                <option value="">All Statuses</option>
                <option value="Searching">Searching</option>
                <option value="Driver Assigned">Driver Assigned</option>
                <option value="Driver Arriving">Driver Arriving</option>
                <option value="Ride Started">Ride Started</option>
                <option value="Ride Completed">Ride Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              
              <input
                type="text"
                value={ridesSearch}
                onChange={(e) => setRidesSearch(e.target.value)}
                placeholder="Search pickup, student name..."
                className="form-control form-control-custom py-1.5"
                style={{ width: '220px' }}
              />
              <button type="submit" className="btn btn-primary-custom btn-sm rounded-pill px-3">
                Search
              </button>
            </form>
          </div>

          <div className="table-responsive">
            <table className="table align-middle table-hover">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Student</th>
                  <th>Driver</th>
                  <th>Trip Details</th>
                  <th>Distance & Fare</th>
                  <th>Status</th>
                  <th>Ratings / Feedback</th>
                </tr>
              </thead>
              <tbody>
                {ridesList.map((ride) => (
                  <tr key={ride._id}>
                    <td>
                      <span className="small font-monospace">#{ride._id.substring(16)}</span><br />
                      <small className="text-muted">{new Date(ride.bookingTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</small>
                    </td>
                    <td>
                      <div className="fw-semibold">{ride.student?.name || 'Deleted'}</div>
                      <small className="text-muted">{ride.student?.phone}</small>
                    </td>
                    <td>
                      {ride.driver ? (
                        <>
                          <div className="fw-semibold">{ride.driver.name}</div>
                          <small className="text-muted">{ride.driver.phone}</small>
                        </>
                      ) : (
                        <span className="text-muted italic small">No driver assigned</span>
                      )}
                    </td>
                    <td>
                      <div className="small"><strong>From:</strong> {ride.pickup}</div>
                      <div className="small"><strong>To:</strong> {ride.destination}</div>
                    </td>
                    <td>
                      <div className="small">{ride.distance} km</div>
                      <strong className="text-success small">₹{ride.fare}</strong>
                    </td>
                    <td>
                      <span className={`badge-status badge-${ride.status.toLowerCase().replace(' ', '-')}`}>
                        {ride.status}
                      </span>
                    </td>
                    <td>
                      {ride.rating ? (
                        <div>
                          <span className="text-warning fw-bold">
                            {Array.from({ length: ride.rating }).map((_, i) => (
                              <i key={i} className="bi bi-star-fill small"></i>
                            ))}
                          </span>
                          <span className="small d-block text-truncate" style={{ maxWidth: '150px' }} title={ride.review}>
                            {ride.review}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted small italic">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
