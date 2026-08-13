import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { initiateSocketConnection, getSocket } from '../services/socket';
import Map from '../components/Map';
import { jsPDF } from 'jspdf';

// Static location coordinates mapping (must match backend values)
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

// Distance calculation
const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

const calculateFare = (distance) => {
  return Number((20 + distance * 10).toFixed(2));
};

const StudentDashboard = ({ user, profile, showToast }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  // Booking states
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [estimatedDistance, setEstimatedDistance] = useState(null);

  // Active ride states
  const [activeRide, setActiveRide] = useState(null);
  const [activeDriverProfile, setActiveDriverProfile] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);

  // History & search states
  const [history, setHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState('');

  // Review states
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const [loading, setLoading] = useState(false);

  // 1. Fetch current active ride and setup Sockets
  useEffect(() => {
    fetchActiveRide();
    fetchHistory();

    const socket = initiateSocketConnection(user.id);

    // Socket listeners for ride status and location
    socket.on('ride_status_updated', (ride) => {
      console.log('Socket ride update:', ride);
      setActiveRide(ride);
      
      if (ride.status === 'Driver Assigned' || ride.status === 'Driver Arriving' || ride.status === 'Ride Started') {
        // Fetch refreshed driver info
        fetchDriverProfile(ride.driver?._id);
      } else if (ride.status === 'Ride Completed') {
        showToast('Your ride is completed! Please rate the driver.', 'success');
        fetchHistory();
        setRatingSubmitted(false);
      } else if (ride.status === 'Cancelled') {
        showToast('Your ride booking was cancelled.', 'warning');
        setActiveRide(null);
        setActiveDriverProfile(null);
        setDriverLocation(null);
        fetchHistory();
      }
    });

    socket.on('driver_location_updated', (data) => {
      console.log('Driver location update:', data);
      setDriverLocation(data.coordinates);
    });

    return () => {
      socket.off('ride_status_updated');
      socket.off('driver_location_updated');
    };
  }, [user]);

  // Handle estimated fare when pickup or destination change
  useEffect(() => {
    if (pickup && destination) {
      if (pickup === destination) {
        setEstimatedFare(null);
        setEstimatedDistance(null);
        return;
      }
      const coords1 = campusLocations[pickup];
      const coords2 = campusLocations[destination];
      if (coords1 && coords2) {
        const dist = getDistanceInKm(coords1[0], coords1[1], coords2[0], coords2[1]);
        const price = calculateFare(dist);
        setEstimatedDistance(dist);
        setEstimatedFare(price);
      }
    } else {
      setEstimatedFare(null);
      setEstimatedDistance(null);
    }
  }, [pickup, destination]);

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const fetchActiveRide = async () => {
    try {
      const res = await api.get('/rides/current');
      if (res.data.success && res.data.ride) {
        setActiveRide(res.data.ride);
        setActiveDriverProfile(res.data.driverProfile);
        if (res.data.driverProfile) {
          setDriverLocation(res.data.driverProfile.currentLocation);
        }
      }
    } catch (err) {
      console.error('Error fetching active ride:', err);
    }
  };

  const fetchDriverProfile = async (driverUserId) => {
    if (!driverUserId) return;
    try {
      const res = await api.get('/rides/current'); // This loads updated profile info
      if (res.data.success) {
        setActiveDriverProfile(res.data.driverProfile);
        if (res.data.driverProfile) {
          setDriverLocation(res.data.driverProfile.currentLocation);
        }
      }
    } catch (err) {
      console.error('Error fetching driver profile:', err);
    }
  };

  const fetchHistory = async (search = '') => {
    try {
      const res = await api.get(`/rides/history?search=${search}`);
      if (res.data.success) {
        setHistory(res.data.rides);
      }
    } catch (err) {
      console.error('Error fetching ride history:', err);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!pickup || !destination) {
      showToast('Please select pickup and destination', 'danger');
      return;
    }
    if (pickup === destination) {
      showToast('Pickup and destination cannot be the same', 'danger');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/rides/book', { pickup, destination, passengers });
      if (res.data.success) {
        setActiveRide(res.data.ride);
        showToast('Ride booked successfully! Searching for driver...', 'success');
        handleTabChange('current-ride');
        // Reset form
        setPickup('');
        setDestination('');
        setPassengers(1);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to book ride', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeRide) return;
    if (!window.confirm('Are you sure you want to cancel this ride?')) return;

    try {
      const res = await api.put(`/rides/cancel/${activeRide._id}`);
      if (res.data.success) {
        showToast('Ride cancelled successfully', 'success');
        setActiveRide(null);
        setActiveDriverProfile(null);
        setDriverLocation(null);
        fetchHistory();
        handleTabChange('dashboard');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel ride', 'danger');
    }
  };

  const submitRating = async (e) => {
    e.preventDefault();
    if (!activeRide) return;
    try {
      const res = await api.post(`/rides/rate/${activeRide._id}`, { rating, review });
      if (res.data.success) {
        showToast('Thank you for rating your ride!', 'success');
        setRatingSubmitted(true);
        // Clear active ride after rating is complete
        setTimeout(() => {
          setActiveRide(null);
          setActiveDriverProfile(null);
          setDriverLocation(null);
          handleTabChange('dashboard');
        }, 1500);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit rating', 'danger');
    }
  };

  const handleHistorySearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory(historySearch);
  };

  const downloadReceipt = (ride) => {
    const doc = new jsPDF();
    
    // Aesthetic Styling
    doc.setFillColor(79, 70, 229); // Brand primary
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("UNITRANSIT", 20, 26);
    
    doc.setTextColor(43, 45, 66);
    doc.setFontSize(10);
    doc.text(`Receipt Reference: ${ride._id}`, 120, 55);
    doc.text(`Date & Time: ${new Date(ride.bookingTime).toLocaleString()}`, 120, 62);
    
    doc.setFontSize(16);
    doc.text("RIDE RECEIPT DETAILS", 20, 58);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 68, 190, 68);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    doc.text("PICKUP LOCATION:", 20, 80);
    doc.setFont("helvetica", "bold");
    doc.text(ride.pickup, 70, 80);
    
    doc.setFont("helvetica", "normal");
    doc.text("DESTINATION LOCATION:", 20, 90);
    doc.setFont("helvetica", "bold");
    doc.text(ride.destination, 70, 90);
    
    doc.setFont("helvetica", "normal");
    doc.text("RIDE DISTANCE:", 20, 100);
    doc.setFont("helvetica", "bold");
    doc.text(`${ride.distance} KM`, 70, 100);
    
    doc.setFont("helvetica", "normal");
    doc.text("NO. OF PASSENGERS:", 20, 110);
    doc.setFont("helvetica", "bold");
    doc.text(`${ride.passengers}`, 70, 110);
    
    doc.setFont("helvetica", "normal");
    doc.text("CAB DRIVER:", 20, 120);
    doc.setFont("helvetica", "bold");
    doc.text(ride.driver?.name || 'N/A', 70, 120);

    doc.line(20, 130, 190, 130);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL FARE PAID:", 20, 142);
    doc.setTextColor(16, 185, 129); // green success
    doc.text(`INR ${ride.fare}.00`, 70, 142);
    
    // Footer
    doc.setFillColor(244, 247, 246);
    doc.rect(0, 260, 210, 37, 'F');
    doc.setTextColor(108, 117, 125);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for riding with UniTransit! Help us maintain a green campus.", 45, 275);
    doc.text("For support, email support@unitransit.com", 70, 282);
    
    doc.save(`UniTransit_Receipt_${ride._id}.pdf`);
  };

  return (
    <div className="container py-4">
      {/* Dashboard Subheader */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-0">Student Portal</h2>
          <p className="text-muted mb-0">Welcome, {user.name} | Batch of {profile?.batch}</p>
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`btn rounded-pill px-3 py-1.5 fw-semibold ${activeTab === 'dashboard' ? 'btn-primary-custom' : 'btn-light border text-dark'}`}
          >
            <i className="bi bi-grid-fill me-1"></i> Dashboard
          </button>
          <button
            onClick={() => handleTabChange('book')}
            className={`btn rounded-pill px-3 py-1.5 fw-semibold ${activeTab === 'book' ? 'btn-primary-custom' : 'btn-light border text-dark'}`}
          >
            <i className="bi bi-compass-fill me-1"></i> Book Ride
          </button>
          <button
            onClick={() => handleTabChange('current-ride')}
            className={`btn rounded-pill px-3 py-1.5 fw-semibold position-relative ${activeTab === 'current-ride' ? 'btn-primary-custom' : 'btn-light border text-dark'}`}
          >
            <i className="bi bi-geo-alt-fill me-1"></i> Current Ride
            {activeRide && (
              <span className="position-absolute top-0 start-100 translate-middle p-1.5 bg-danger border border-light rounded-circle">
                <span className="visually-hidden">New alerts</span>
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('history')}
            className={`btn rounded-pill px-3 py-1.5 fw-semibold ${activeTab === 'history' ? 'btn-primary-custom' : 'btn-light border text-dark'}`}
          >
            <i className="bi bi-clock-history me-1"></i> History
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE VIEW */}
      
      {/* VIEW: MAIN DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="glass-card p-4 mb-4">
              <h4 className="fw-bold mb-3">Quick Actions</h4>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="border rounded-3 p-3 d-flex align-items-center bg-light cursor-pointer shadow-sm hover-grow" onClick={() => handleTabChange('book')} style={{ cursor: 'pointer' }}>
                    <div className="bg-primary text-white rounded-circle p-3 me-3">
                      <i className="bi bi-plus-circle fs-3"></i>
                    </div>
                    <div>
                      <h5 className="mb-1 fw-bold">New Booking</h5>
                      <p className="mb-0 text-muted small">Select pickup and destination to order a cab</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="border rounded-3 p-3 d-flex align-items-center bg-light cursor-pointer shadow-sm hover-grow" onClick={() => handleTabChange('current-ride')} style={{ cursor: 'pointer' }}>
                    <div className="bg-warning text-dark rounded-circle p-3 me-3">
                      <i className="bi bi-geo-fill fs-3"></i>
                    </div>
                    <div>
                      <h5 className="mb-1 fw-bold">Track Live Ride</h5>
                      <p className="mb-0 text-muted small">View active trip status and driver location on map</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Profile Summary */}
            <div className="glass-card p-4">
              <h4 className="fw-bold mb-3">Student Profile Details</h4>
              <div className="row g-3">
                <div className="col-md-6">
                  <p className="mb-1 text-muted small">Full Name</p>
                  <p className="fw-bold mb-0">{user.name}</p>
                </div>
                <div className="col-md-6">
                  <p className="mb-1 text-muted small">Roll Number</p>
                  <p className="fw-bold mb-0">{profile?.rollNumber}</p>
                </div>
                <div className="col-md-6">
                  <p className="mb-1 text-muted small">Email Address</p>
                  <p className="fw-bold mb-0">{user.email}</p>
                </div>
                <div className="col-md-6">
                  <p className="mb-1 text-muted small">Phone Number</p>
                  <p className="fw-bold mb-0">{user.phone}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="glass-card p-4 h-100">
              <h4 className="fw-bold mb-3">Active Ride Status</h4>
              {activeRide ? (
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="small text-muted">Trip ID: #{activeRide._id.substring(16)}</span>
                    <span className={`badge-status badge-${activeRide.status.toLowerCase().replace(' ', '-')}`}>
                      {activeRide.status}
                    </span>
                  </div>
                  <p className="mb-2"><strong>Pickup:</strong> {activeRide.pickup}</p>
                  <p className="mb-3"><strong>Destination:</strong> {activeRide.destination}</p>
                  
                  <button
                    onClick={() => handleTabChange('current-ride')}
                    className="btn btn-primary-custom w-100 rounded-pill btn-sm"
                  >
                    Track Current Ride
                  </button>
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-emoji-smile text-muted fs-1 mb-2"></i>
                  <p className="text-muted mb-0">No active ride bookings found</p>
                  <button onClick={() => handleTabChange('book')} className="btn btn-outline-primary btn-sm rounded-pill mt-3">
                    Book Ride Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: BOOK A RIDE */}
      {activeTab === 'book' && (
        <div className="row g-4">
          <div className="col-md-6">
            <div className="glass-card p-4">
              <h4 className="fw-bold mb-4">
                <i className="bi bi-compass-fill text-primary me-2"></i>Book Campus Ride
              </h4>

              <form onSubmit={handleBook}>
                <div className="mb-3">
                  <label className="form-label font-weight-medium">Select Pickup Location</label>
                  <select
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    className="form-select form-control-custom"
                    required
                  >
                    <option value="">-- Choose Pickup Point --</option>
                    {Object.keys(campusLocations).map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label font-weight-medium">Select Destination Location</label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="form-select form-control-custom"
                    required
                  >
                    <option value="">-- Choose Destination --</option>
                    {Object.keys(campusLocations).map((loc) => (
                      <option key={loc} value={loc} disabled={loc === pickup}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="form-label font-weight-medium">Number of Passengers</label>
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className="form-select form-control-custom"
                    required
                  >
                    <option value="1">1 Passenger</option>
                    <option value="2">2 Passengers</option>
                    <option value="3">3 Passengers</option>
                    <option value="4">4 Passengers (Max)</option>
                  </select>
                </div>

                {estimatedFare !== null && (
                  <div className="p-3 bg-light rounded-3 mb-4 border shadow-sm">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Estimated Distance:</span>
                      <strong className="text-dark">{estimatedDistance} km</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Base Fare (Fixed):</span>
                      <strong className="text-dark">₹20.00</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Distance Charge (₹10/km):</span>
                      <strong className="text-dark">₹{(estimatedDistance * 10).toFixed(2)}</strong>
                    </div>
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-primary">Estimated Fare:</span>
                      <h4 className="fw-extrabold text-success mb-0">₹{estimatedFare}</h4>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !pickup || !destination}
                  className="btn btn-primary-custom w-100 rounded-pill py-2.5 d-flex align-items-center justify-content-center"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Initiating Booking...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cart-plus me-2"></i> Request UniTransit
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="col-md-6">
            <div className="glass-card p-4 h-100">
              <h4 className="fw-bold mb-3">Campus Locations Map</h4>
              <p className="text-muted small">Select pickup & destination to draw the routing corridor</p>
              <Map
                pickupCoords={pickup ? campusLocations[pickup] : null}
                destinationCoords={destination ? campusLocations[destination] : null}
                status="Pre-booking"
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW: CURRENT RIDE TRACKING */}
      {activeTab === 'current-ride' && (
        <div className="row g-4">
          {activeRide ? (
            <>
              <div className="col-lg-5">
                <div className="glass-card p-4 mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0">Ride Progress</h5>
                    <span className={`badge-status badge-${activeRide.status.toLowerCase().replace(' ', '-')}`}>
                      {activeRide.status}
                    </span>
                  </div>

                  <hr />
                  
                  <div className="mb-3">
                    <p className="mb-1 text-muted small">Pickup Location</p>
                    <h6 className="fw-semibold mb-0"><i className="bi bi-geo-alt-fill text-success me-2"></i>{activeRide.pickup}</h6>
                  </div>
                  <div className="mb-3">
                    <p className="mb-1 text-muted small">Destination Location</p>
                    <h6 className="fw-semibold mb-0"><i className="bi bi-flag-fill text-danger me-2"></i>{activeRide.destination}</h6>
                  </div>
                  
                  <div className="row mb-3 bg-light rounded p-2 mx-1 text-center">
                    <div className="col-6 border-end">
                      <span className="text-muted small">Distance</span>
                      <h6 className="fw-bold mb-0">{activeRide.distance} km</h6>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small">Total Fare</span>
                      <h6 className="fw-bold mb-0 text-success">₹{activeRide.fare}</h6>
                    </div>
                  </div>

                  {activeRide.status === 'Searching' && (
                    <div className="text-center py-4 bg-light rounded border border-warning shadow-sm animate-pulse mb-3">
                      <div className="spinner-grow text-warning mb-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <h6 className="fw-bold mb-1 text-warning">Connecting to closest Driver...</h6>
                      <p className="text-muted small mb-0 px-3">E-rickshaw will auto-assign once a driver accepts</p>
                    </div>
                  )}

                  {/* Driver Profile */}
                  {activeRide.driver && activeDriverProfile && (
                    <div className="border rounded-3 p-3 bg-light mb-3 shadow-sm">
                      <h6 className="fw-bold mb-3"><i className="bi bi-person-badge text-primary me-2"></i>Your Driver Details</h6>
                      <div className="row g-2">
                        <div className="col-7">
                          <p className="mb-0 fw-bold">{activeRide.driver.name}</p>
                          <small className="text-muted d-block mb-1"><i className="bi bi-phone-fill me-1"></i> {activeRide.driver.phone}</small>
                          <a href={`tel:${activeRide.driver.phone}`} className="btn btn-outline-primary btn-xs py-0.5 px-2 rounded-pill mt-1" style={{ fontSize: '11px' }}>
                            <i className="bi bi-telephone"></i> Call Driver
                          </a>
                        </div>
                        <div className="col-5 border-start ps-3">
                          <small className="text-muted d-block">Vehicle Number</small>
                          <span className="badge bg-dark fw-bold mb-1">{activeDriverProfile.vehicleNumber}</span>
                          <small className="text-muted d-block">License</small>
                          <small className="fw-semibold text-dark">{activeDriverProfile.licenseNumber}</small>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cancel Ride Action */}
                  {['Searching', 'Driver Assigned', 'Driver Arriving'].includes(activeRide.status) && (
                    <button
                      onClick={handleCancel}
                      className="btn btn-outline-danger w-100 rounded-pill py-2 text-center"
                    >
                      <i className="bi bi-x-circle me-2"></i> Cancel Booking Request
                    </button>
                  )}

                  {/* Rating Section (upon completion) */}
                  {activeRide.status === 'Ride Completed' && (
                    <div className="border rounded-3 p-3 bg-light mt-3 shadow-sm">
                      {!ratingSubmitted ? (
                        <form onSubmit={submitRating}>
                          <h6 className="fw-bold mb-3 text-success">
                            <i className="bi bi-star-fill text-warning me-2"></i>Rate Your Experience
                          </h6>
                          <div className="mb-2">
                            <label className="form-label small mb-1">Stars (1 to 5)</label>
                            <div className="d-flex gap-2 mb-2 text-warning fs-4">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <i
                                  key={star}
                                  className={`bi cursor-pointer ${star <= rating ? 'bi-star-fill' : 'bi-star'}`}
                                  onClick={() => setRating(star)}
                                  style={{ cursor: 'pointer' }}
                                ></i>
                              ))}
                            </div>
                          </div>
                          <div className="mb-3">
                            <label className="form-label small mb-1">Written Review (Optional)</label>
                            <textarea
                              value={review}
                              onChange={(e) => setReview(e.target.value)}
                              className="form-control form-control-custom"
                              placeholder="Share your feedback..."
                              rows="2"
                            ></textarea>
                          </div>
                          <div className="d-flex gap-2">
                            <button type="submit" className="btn btn-success btn-sm rounded-pill px-3 flex-grow-1">
                              Submit Rating
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadReceipt(activeRide)}
                              className="btn btn-dark btn-sm rounded-pill px-3"
                            >
                              <i className="bi bi-download me-1"></i> Receipt
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="text-center py-2">
                          <i className="bi bi-check-circle-fill text-success fs-3 mb-1"></i>
                          <h6 className="fw-bold text-success mb-0">Rating Submitted! Thank you.</h6>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="col-lg-7">
                <div className="glass-card p-4 h-100">
                  <h4 className="fw-bold mb-3">Live Ride Map Tracker</h4>
                  {activeRide.driver && driverLocation ? (
                    <p className="text-muted small">Tracking driver <b>{activeRide.driver.name}</b> in real-time...</p>
                  ) : (
                    <p className="text-muted small">Locating pickup point and routes...</p>
                  )}
                  <Map
                    pickupCoords={campusLocations[activeRide.pickup]}
                    destinationCoords={campusLocations[activeRide.destination]}
                    driverCoords={driverLocation}
                    status={activeRide.status}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="col-12 text-center py-5">
              <div className="glass-card p-5 max-width-md mx-auto" style={{ maxWidth: '500px' }}>
                <i className="bi bi-compass-fill text-muted fs-1 mb-3 d-block"></i>
                <h4 className="fw-bold">No Active Bookings</h4>
                <p className="text-muted mb-4">You do not have any running cab ride request at the moment.</p>
                <button onClick={() => handleTabChange('book')} className="btn btn-primary-custom rounded-pill px-4">
                  Request E-Rickshaw Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: RIDE HISTORY */}
      {activeTab === 'history' && (
        <div className="glass-card p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-2">
            <h4 className="fw-bold mb-0">Previous Trips</h4>
            <form onSubmit={handleHistorySearchSubmit} className="d-flex gap-2">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search pickup/destination..."
                className="form-control form-control-custom py-1.5"
                style={{ width: '250px' }}
              />
              <button type="submit" className="btn btn-primary-custom btn-sm rounded-pill px-3">
                Search
              </button>
            </form>
          </div>

          {history.length > 0 ? (
            <div className="table-responsive">
              <table className="table align-middle table-hover">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Pickup</th>
                    <th>Destination</th>
                    <th>Distance</th>
                    <th>Fare</th>
                    <th>Driver</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((ride) => (
                    <tr key={ride._id}>
                      <td className="small text-nowrap">
                        {new Date(ride.bookingTime).toLocaleDateString()}<br />
                        <span className="text-muted">{new Date(ride.bookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td>{ride.pickup}</td>
                      <td>{ride.destination}</td>
                      <td>{ride.distance} km</td>
                      <td className="fw-bold text-success">₹{ride.fare}</td>
                      <td>
                        {ride.driver ? (
                          <span>{ride.driver.name}</span>
                        ) : (
                          <span className="text-muted italic">N/A</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge-status badge-${ride.status.toLowerCase().replace(' ', '-')}`}>
                          {ride.status}
                        </span>
                      </td>
                      <td className="text-end">
                        {ride.status === 'Ride Completed' && (
                          <button
                            onClick={() => downloadReceipt(ride)}
                            className="btn btn-light btn-sm border rounded-pill"
                            title="Download Receipt"
                          >
                            <i className="bi bi-file-earmark-pdf-fill text-danger me-1"></i> Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="bi bi-clock-history text-muted fs-1 mb-2"></i>
              <p className="text-muted">No rides record matching your criteria.</p>
            </div>
          )}
        </div>
      )}
      
      <style>{`
        .hover-grow {
          transition: transform 0.2s ease;
        }
        .hover-grow:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
};

export default StudentDashboard;
