import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { initiateSocketConnection, getSocket } from '../services/socket';
import Map from '../components/Map';

// Campus Locations coordinate map
const campusLocations = {
  'Main Gate': [30.3582, 76.3705],
  'Hostel H': [30.3542, 76.3665],
  'Hostel J': [30.3528, 76.3638],
  'Hostel C': [30.3551, 76.3619],
  'COS': [30.3558, 76.3653],
  'Library': [30.3548, 76.3632],
  'Admin Block': [30.3575, 76.3670],
  'Auditorium': [30.3570, 76.3685],
  'Tan Building': [30.3555, 76.3695],
  'G Block': [30.3535, 76.3615],
  'Sports Complex': [30.3520, 76.3675],
  'Student Activity Center': [30.3530, 76.3645],
  'Cafeteria': [30.3562, 76.3640]
};

const DriverDashboard = ({ user, showToast }) => {
  const [stats, setStats] = useState({
    todayEarnings: 0,
    totalEarnings: 0,
    completedRidesCount: 0,
    isOnline: false,
    currentLocation: [30.3582, 76.3705]
  });

  const [activeRide, setActiveRide] = useState(null);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [isDriverArrivedAlert, setIsDriverArrivedAlert] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Simulation states
  const [currentCoords, setCurrentCoords] = useState([30.3582, 76.3705]);
  const simulationIntervalRef = useRef(null);

  // 1. Load initial stats, active rides and establish sockets
  useEffect(() => {
    fetchStats();
    fetchActiveRide();
    fetchHistory();

    const socket = initiateSocketConnection(user.id);

    // Socket: Incoming ride requests
    socket.on('new_ride_request', (ride) => {
      console.log('Driver incoming request:', ride);
      setIncomingRequest(ride);
      showToast('New ride request received!', 'warning');
    });

    // Socket: Student cancels active ride
    socket.on('ride_status_updated', (ride) => {
      if (ride.status === 'Cancelled') {
        showToast('Active ride has been cancelled by the student.', 'danger');
        setActiveRide(null);
        setIncomingRequest(null);
        setIsDriverArrivedAlert(false);
        fetchStats();
      } else {
        setActiveRide(ride);
      }
    });

    return () => {
      socket.off('new_ride_request');
      socket.off('ride_status_updated');
      stopSimulation();
    };
  }, [user]);

  // Coordinate movement simulator during active rides
  useEffect(() => {
    if (activeRide && stats.isOnline) {
      if (activeRide.status === 'Driver Assigned' || activeRide.status === 'Driver Arriving') {
        // Simulating moving towards pickup point
        startSimulation(currentCoords, activeRide.pickupCoords);
      } else if (activeRide.status === 'Ride Started') {
        // Simulating moving towards destination point
        startSimulation(currentCoords, activeRide.destinationCoords);
      } else {
        stopSimulation();
      }
    } else {
      stopSimulation();
    }

    return () => stopSimulation();
  }, [activeRide, stats.isOnline]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/drivers/dashboard');
      if (res.data.success) {
        setStats(res.data);
        setCurrentCoords(res.data.currentLocation || [30.3582, 76.3705]);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchActiveRide = async () => {
    try {
      const res = await api.get('/rides/current');
      if (res.data.success && res.data.ride && res.data.ride.driver?._id === user.id) {
        setActiveRide(res.data.ride);
      }
    } catch (err) {
      console.error('Error fetching active ride:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/rides/history');
      if (res.data.success) {
        setHistory(res.data.rides);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const toggleOnline = async () => {
    setLoading(true);
    try {
      const endpoint = stats.isOnline ? '/drivers/offline' : '/drivers/online';
      const res = await api.put(endpoint);
      if (res.data.success) {
        showToast(stats.isOnline ? 'You are now offline.' : 'You are now online & matching!', 'success');
        setStats({
          ...stats,
          isOnline: !stats.isOnline
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to toggle status', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (rideId) => {
    try {
      const res = await api.put(`/drivers/accept/${rideId}`);
      if (res.data.success) {
        setActiveRide(res.data.ride);
        setIncomingRequest(null);
        showToast('Ride request accepted! Route displayed.', 'success');
        fetchStats();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to accept ride', 'danger');
    }
  };

  const handleReject = async (rideId) => {
    try {
      const res = await api.put(`/drivers/reject/${rideId}`);
      if (res.data.success) {
        setIncomingRequest(null);
        showToast('Ride request rejected.', 'info');
        fetchStats();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject ride', 'danger');
    }
  };

  const handleArrived = () => {
    setIsDriverArrivedAlert(true);
    showToast('Student notified of your arrival!', 'success');
    
    // Broadcast arrival message to student room via socket
    const socket = getSocket();
    if (socket && activeRide) {
      socket.emit('join', activeRide.student._id); // Safety check
      // Let backend trigger arrival alert or emit direct event
      showToast('Arrived at pickup point.', 'info');
    }
  };

  const handleStart = async (rideId) => {
    try {
      const res = await api.put(`/drivers/start/${rideId}`);
      if (res.data.success) {
        setActiveRide(res.data.ride);
        setIsDriverArrivedAlert(false);
        showToast('Ride started. Drive safely!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to start ride', 'danger');
    }
  };

  const handleComplete = async (rideId) => {
    try {
      const res = await api.put(`/drivers/complete/${rideId}`);
      if (res.data.success) {
        showToast('Ride completed! Earnings credited.', 'success');
        setActiveRide(null);
        setIsDriverArrivedAlert(false);
        fetchStats();
        fetchHistory();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to complete ride', 'danger');
    }
  };

  // Coordinate movement simulator logic (LERP)
  const startSimulation = (start, target) => {
    stopSimulation();
    
    let currentPct = 0;
    const steps = 10; // Reach target in 10 ticks
    
    simulationIntervalRef.current = setInterval(async () => {
      currentPct += 1 / steps;
      if (currentPct > 1) {
        currentPct = 1;
        stopSimulation();
      }

      // Linear interpolation
      const lat = start[0] + (target[0] - start[0]) * currentPct;
      const lng = start[1] + (target[1] - start[1]) * currentPct;
      const nextCoords = [Number(lat.toFixed(5)), Number(lng.toFixed(5))];
      
      setCurrentCoords(nextCoords);

      // Post coordinate updates to database & active student map
      try {
        await api.put('/drivers/location', { coordinates: nextCoords });
      } catch (err) {
        console.error('Failed to sync simulated location:', err);
      }
    }, 4000); // Trigger every 4 seconds
  };

  const stopSimulation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
  };

  return (
    <div className="container py-4">
      {/* Page header and online offline switcher */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-0">Driver Portal</h2>
          <p className="text-muted mb-0">Welcome, {user.name} | Vehicle: {stats.vehicleNumber || 'M-MERN-CAB'}</p>
        </div>
        <div className="d-flex align-items-center gap-3 bg-white p-2 rounded-pill shadow-sm border" style={{ background: 'var(--card-bg)' }}>
          <span className={`fw-semibold ms-2 ${stats.isOnline ? 'text-success' : 'text-danger'}`}>
            <i className={`bi bi-circle-fill me-1 ${stats.isOnline ? 'text-success' : 'text-danger'}`} style={{ fontSize: '10px' }}></i>
            {stats.isOnline ? 'ONLINE & ACTIVE' : 'OFFLINE'}
          </span>
          <button
            onClick={toggleOnline}
            disabled={loading}
            className={`btn rounded-pill px-4 py-1.5 fw-bold ${stats.isOnline ? 'btn-danger' : 'btn-success'}`}
          >
            {stats.isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* Analytics Card Row */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="glass-card p-3 border-0 bg-primary text-white shadow-sm">
            <p className="mb-0 small text-uppercase fw-semibold opacity-75">Today's Earnings</p>
            <h3 className="fw-extrabold mb-1">₹{stats.todayEarnings}</h3>
            <small className="opacity-75">Updated real-time</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="glass-card p-3 border-0 bg-success text-white shadow-sm">
            <p className="mb-0 small text-uppercase fw-semibold opacity-75">Total Earnings</p>
            <h3 className="fw-extrabold mb-1">₹{stats.totalEarnings}</h3>
            <small className="opacity-75">Net career revenue</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="glass-card p-3 border-0 bg-dark text-white shadow-sm">
            <p className="mb-0 small text-uppercase fw-semibold opacity-75">Completed Rides</p>
            <h3 className="fw-extrabold mb-1">{stats.completedRidesCount}</h3>
            <small className="opacity-75">Trips completed successfully</small>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="row g-4">
        {/* Active Trip panel */}
        <div className="col-lg-5">
          {activeRide ? (
            <div className="glass-card p-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Current Assigned Ride</h5>
                <span className={`badge-status badge-${activeRide.status.toLowerCase().replace(' ', '-')}`}>
                  {activeRide.status}
                </span>
              </div>
              <hr />

              <div className="mb-3">
                <p className="mb-1 text-muted small">Pickup Spot</p>
                <h6 className="fw-semibold mb-0"><i className="bi bi-geo-alt-fill text-success me-2"></i>{activeRide.pickup}</h6>
              </div>
              <div className="mb-3">
                <p className="mb-1 text-muted small">Destination</p>
                <h6 className="fw-semibold mb-0"><i className="bi bi-flag-fill text-danger me-2"></i>{activeRide.destination}</h6>
              </div>

              <div className="row g-2 mb-3 text-center bg-light p-2 rounded mx-1">
                <div className="col-4 border-end">
                  <small className="text-muted d-block" style={{ fontSize: '11px' }}>Distance</small>
                  <span className="fw-bold">{activeRide.distance} km</span>
                </div>
                <div className="col-4 border-end">
                  <small className="text-muted d-block" style={{ fontSize: '11px' }}>Passengers</small>
                  <span className="fw-bold">{activeRide.passengers} pax</span>
                </div>
                <div className="col-4">
                  <small className="text-muted d-block" style={{ fontSize: '11px' }}>Fare</small>
                  <span className="fw-bold text-success">₹{activeRide.fare}</span>
                </div>
              </div>

              {/* Student details */}
              <div className="border rounded p-3 bg-light mb-4 shadow-sm">
                <h6 className="fw-bold small mb-2"><i className="bi bi-person-circle text-primary me-2"></i>Passenger Contact</h6>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="fw-bold d-block">{activeRide.student.name}</span>
                    <small className="text-muted">{activeRide.student.phone}</small>
                  </div>
                  <a href={`tel:${activeRide.student.phone}`} className="btn btn-outline-primary btn-sm rounded-pill">
                    <i className="bi bi-telephone"></i> Call Student
                  </a>
                </div>
              </div>

              {/* ACTION BUTTONS FLOW */}
              {activeRide.status === 'Driver Assigned' && (
                <div className="d-flex gap-2">
                  <button
                    onClick={() => handleAccept(activeRide._id)}
                    className="btn btn-success flex-grow-1 rounded-pill py-2 fw-semibold"
                  >
                    Accept Request
                  </button>
                  <button
                    onClick={() => handleReject(activeRide._id)}
                    className="btn btn-outline-danger rounded-pill px-4"
                  >
                    Reject
                  </button>
                </div>
              )}

              {activeRide.status === 'Driver Arriving' && (
                <div className="d-flex flex-column gap-2">
                  {!isDriverArrivedAlert ? (
                    <button
                      onClick={handleArrived}
                      className="btn btn-warning text-dark w-100 rounded-pill py-2.5 fw-bold shadow-sm"
                    >
                      <i className="bi bi-bell-fill me-2 animate-bounce"></i> Click to Notify: I have Arrived
                    </button>
                  ) : (
                    <div className="alert alert-warning border-warning text-center small py-2 mb-2">
                      <i className="bi bi-check-circle-fill text-success me-2"></i> Student notified. Waiting for boarding...
                    </div>
                  )}

                  <button
                    onClick={() => handleStart(activeRide._id)}
                    className="btn btn-primary-custom w-100 rounded-pill py-2.5 fw-bold"
                  >
                    Start Ride (Boarded)
                  </button>
                </div>
              )}

              {activeRide.status === 'Ride Started' && (
                <button
                  onClick={() => handleComplete(activeRide._id)}
                  className="btn btn-success w-100 rounded-pill py-2.5 fw-bold shadow-sm"
                >
                  <i className="bi bi-patch-check-fill me-2"></i> Complete Ride & Collect ₹{activeRide.fare}
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card p-4 h-100 d-flex flex-column justify-content-center align-items-center py-5">
              <i className="bi bi-check-circle text-success fs-1 mb-2"></i>
              <h5 className="fw-bold">No Active Jobs</h5>
              <p className="text-muted text-center small mb-0 px-4">
                {stats.isOnline
                  ? 'Waiting for incoming university ride requests... Keep this page open.'
                  : 'Go ONLINE above to start matching with student bookings.'}
              </p>
            </div>
          )}
        </div>

        {/* Live Map Panel */}
        <div className="col-lg-7">
          <div className="glass-card p-4 h-100">
            <h5 className="fw-bold mb-3">Live Transit Map</h5>
            {activeRide ? (
              <p className="text-muted small">Tracking route between <b>{activeRide.pickup}</b> and <b>{activeRide.destination}</b>...</p>
            ) : (
              <p className="text-muted small">Your current simulated location coordinates: {currentCoords.join(', ')}</p>
            )}
            <Map
              pickupCoords={activeRide ? campusLocations[activeRide.pickup] : null}
              destinationCoords={activeRide ? campusLocations[activeRide.destination] : null}
              driverCoords={currentCoords}
              status={activeRide ? activeRide.status : 'Offline'}
            />
          </div>
        </div>
      </div>

      {/* POPUP MODAL FOR NEW INCOMING BOOKING OFFER */}
      {incomingRequest && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-card border-0 shadow">
              <div className="modal-header border-bottom-0">
                <h5 className="modal-title fw-bold text-primary"><i className="bi bi-car-front-fill me-2"></i>New Ride Request Offered!</h5>
                <button type="button" className="btn-close" onClick={() => handleReject(incomingRequest._id)} aria-label="Close"></button>
              </div>
              <div className="modal-body py-3">
                <div className="d-flex justify-content-between mb-3 text-muted small">
                  <span>Trip Reference: #{incomingRequest._id.substring(16)}</span>
                  <span>Passenger: {incomingRequest.student?.name}</span>
                </div>
                <div className="mb-2">
                  <strong>Pickup Point:</strong> <br />
                  <i className="bi bi-geo-alt-fill text-success me-2"></i>{incomingRequest.pickup}
                </div>
                <div className="mb-3">
                  <strong>Destination Point:</strong> <br />
                  <i className="bi bi-flag-fill text-danger me-2"></i>{incomingRequest.destination}
                </div>
                <div className="row g-2 text-center bg-light rounded p-2 border">
                  <div className="col-6 border-end">
                    <span className="text-muted small d-block">Distance</span>
                    <strong className="fs-5">{incomingRequest.distance} km</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted small d-block">Estimated Earnings</span>
                    <strong className="fs-5 text-success">₹{incomingRequest.fare}</strong>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top-0 d-flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAccept(incomingRequest._id)}
                  className="btn btn-success flex-grow-1 rounded-pill py-2 fw-semibold"
                >
                  Accept Offer
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(incomingRequest._id)}
                  className="btn btn-outline-danger rounded-pill px-4"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Trips Log */}
      <div className="glass-card p-4 mt-4">
        <h5 className="fw-bold mb-3">Your Recent Completed Jobs</h5>
        {history.length > 0 ? (
          <div className="table-responsive">
            <table className="table align-middle table-hover text-nowrap">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Pickup</th>
                  <th>Destination</th>
                  <th>Distance</th>
                  <th>Earnings Collected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((ride) => (
                  <tr key={ride._id}>
                    <td className="small">
                      {new Date(ride.bookingTime).toLocaleDateString()}<br />
                      <span className="text-muted">{new Date(ride.bookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td>{ride.pickup}</td>
                    <td>{ride.destination}</td>
                    <td>{ride.distance} km</td>
                    <td className="fw-bold text-success">₹{ride.fare}</td>
                    <td>
                      <span className={`badge-status badge-${ride.status.toLowerCase().replace(' ', '-')}`}>
                        {ride.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted text-center py-4 mb-0">No job records found.</p>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
