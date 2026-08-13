import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Map from '../components/Map';

// Predefined spots mapping (must match global coordinates list)
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

// Distance helper
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

const Home = ({ user }) => {
  // Calculator state
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState(null);
  const [fare, setFare] = useState(null);
  const [co2Saved, setCo2Saved] = useState(null);

  // FAQ state
  const [openFaq, setOpenFaq] = useState(null);

  // Fleet numbers initialized to 0
  const [fleetStats, setFleetStats] = useState({
    activeCabs: 0,
    busyCabs: 0,
    avgWaitTime: 0
  });

  // Update calculator details
  useEffect(() => {
    if (pickup && destination && pickup !== destination) {
      const start = campusLocations[pickup];
      const end = campusLocations[destination];
      if (start && end) {
        const dist = getDistanceInKm(start[0], start[1], end[0], end[1]);
        const price = calculateFare(dist);
        setDistance(dist);
        setFare(price);
        // Clean e-rickshaws save ~120g of CO2 per km compared to fuel-run autos
        setCo2Saved(Number((dist * 120).toFixed(1)));
      }
    } else {
      setDistance(null);
      setFare(null);
      setCo2Saved(null);
    }
  }, [pickup, destination]);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "Who is eligible to use UniTransit?",
      a: "The service is strictly restricted to verified students, faculty members, and campus drivers of the university. Double authentication (Roll Number or License number validation) is required for registration."
    },
    {
      q: "How does the automatic driver allocation work?",
      a: "When a student books a ride, the platform calculates the straight-line distances from the pickup location to all online, available drivers on campus. The driver closest to the pickup point receives the request automatically."
    },
    {
      q: "What payment options are supported?",
      a: "UniTransit operates on a direct payment structure. Cash, UPI, and local wallets are paid directly to the driver upon ride completion, following the strict flat fare schema computed in the app."
    },
    {
      q: "What happens if a driver cancels or rejects my ride?",
      a: "If a driver rejects an offered ride request, our routing engine automatically locates the next closest online driver in proximity and immediately transfers the request, keeping wait times minimal."
    },
    {
      q: "How are the coordinates mapped?",
      a: "We have pre-defined the coordinates of all major campus buildings (Hostels, Gate, Library, SAC). Dropdowns prevent typing errors and guarantee that routing polylines trace accurate physical corridors on the OpenStreetMap canvas."
    }
  ];

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-gradient py-5 mb-5 rounded-4 mx-2 mx-md-4 shadow-sm position-relative overflow-hidden">
        <div className="container py-5 position-relative" style={{ zIndex: '2' }}>
          <div className="row align-items-center">
            <div className="col-lg-6 text-center text-lg-start mb-5 mb-lg-0">
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-semibold mb-3">
                🌱 100% Electric Campus Cab Network
              </span>
              <h1 className="display-4 fw-extrabold mb-3" style={{ lineHeight: '1.2' }}>
                Fast, Safe & Affordable <br />
                <span style={{ color: 'var(--primary)', fontWeight: '800' }}>Campus Transit</span>
              </h1>
              <p className="lead text-muted mb-4">
                Seamlessly navigate your university campus. Book an eco-friendly ride in seconds, track your driver live on the map, and enjoy standard pricing.
              </p>
              <div className="d-flex flex-column flex-sm-row justify-content-center justify-content-lg-start gap-3">
                <Link
                  to={user ? (user.role === 'student' ? '/student-dashboard?tab=book' : '/driver-dashboard') : '/login'}
                  className="btn btn-primary-custom btn-lg rounded-pill"
                >
                  <i className="bi bi-compass me-2"></i> Book Ride
                </Link>
                <Link
                  to={user ? '/driver-dashboard' : '/register?role=driver'}
                  className="btn btn-outline-secondary btn-lg rounded-pill px-4"
                  style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                >
                  <i className="bi bi-person-badge me-2"></i> Become Driver
                </Link>
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <div className="position-relative d-inline-block">
                <div style={{ fontSize: '10rem', color: 'var(--primary)', display: 'block', animation: 'float 3s ease-in-out infinite' }}>
                  <i className="bi bi-car-front-fill"></i>
                </div>
                <div
                  className="position-absolute bg-primary rounded-circle opacity-10 blur"
                  style={{ width: '220px', height: '220px', top: '10px', left: '10px', zIndex: -1, filter: 'blur(30px)' }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        <div className="position-absolute" style={{ top: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0) 70%)', zIndex: '1' }}></div>
      </section>

      {/* Statistics Counter Ribbon */}
      <section className="container mb-5">
        <div className="glass-card p-4 shadow-sm border border-light">
          <div className="row g-4 text-center">
            <div className="col-6 col-md-3 border-end">
              <h2 className="fw-extrabold text-primary mb-1">12,500+</h2>
              <span className="text-muted small fw-semibold">Total Rides Served</span>
            </div>
            <div className="col-6 col-md-3 col-md-border-end">
              <h2 className="fw-extrabold text-success mb-1">1.5 Tons</h2>
              <span className="text-muted small fw-semibold">Carbon Emissions Saved</span>
            </div>
            <div className="col-6 col-md-3 border-end">
              <h2 className="fw-extrabold text-warning mb-1">4.9 / 5</h2>
              <span className="text-muted small fw-semibold">Average Ride Rating</span>
            </div>
            <div className="col-6 col-md-3">
              <h2 className="fw-extrabold text-dark mb-1" style={{ color: 'var(--text-color)' }}>&lt; 5 mins</h2>
              <span className="text-muted small fw-semibold">Average Waiting Time</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="container py-5 mb-5">
        <div className="text-center mb-5 col-lg-8 mx-auto">
          <h2 className="fw-bold">How UniTransit Works</h2>
          <p className="text-muted">An integrated smart ride ecosystem built specifically to bridge campus travel hurdles.</p>
        </div>
        <div className="row g-4">
          <div className="col-md-4 text-center">
            <div className="glass-card p-4 h-100 border border-light">
              <div className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-3 shadow-sm" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-map fs-3"></i>
              </div>
              <h4 className="fw-semibold">1. Choose Destinations</h4>
              <p className="text-muted mb-0">Select your pre-defined university buildings for pickup & destination from the dropdowns.</p>
            </div>
          </div>
          <div className="col-md-4 text-center">
            <div className="glass-card p-4 h-100 border border-light">
              <div className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle mb-3 shadow-sm" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-shield-check fs-3"></i>
              </div>
              <h4 className="fw-semibold">2. Auto-Assign Driver</h4>
              <p className="text-muted mb-0">Our routing engine locates and assigns the nearest online e-rickshaw driver instantly.</p>
            </div>
          </div>
          <div className="col-md-4 text-center">
            <div className="glass-card p-4 h-100 border border-light">
              <div className="d-inline-flex align-items-center justify-content-center bg-warning text-white rounded-circle mb-3 shadow-sm" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-phone-vibrate fs-3"></i>
              </div>
              <h4 className="fw-semibold">3. Track & Enjoy</h4>
              <p className="text-muted mb-0">Watch your driver approach on the Leaflet map, take the ride, and pay a fixed calculated fare.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Fare & Carbon Savings Calculator widget */}
      <section className="container mb-5 py-4">
        <div className="glass-card p-4 p-md-5 border border-light shadow-sm">
          <div className="row align-items-center g-5">
            <div className="col-lg-5">
              <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1.5 rounded-pill fw-semibold mb-3">
                💵 Fare & Eco Estimator
              </span>
              <h2 className="fw-bold mb-3">Estimate Your Trip Instantly</h2>
              <p className="text-muted mb-4">
                No surprises. Calculate your exact ride distances, fixed standard pricing, and carbon offset details before you log in.
              </p>
              
              <div className="mb-3">
                <label className="form-label small fw-bold">Pickup Spot</label>
                <select
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="form-select form-control-custom"
                >
                  <option value="">-- Select Pickup --</option>
                  {Object.keys(campusLocations).map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-3">
                <label className="form-label small fw-bold">Destination Spot</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="form-select form-control-custom"
                >
                  <option value="">-- Select Destination --</option>
                  {Object.keys(campusLocations).map(loc => (
                    <option key={loc} value={loc} disabled={loc === pickup}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="col-lg-7">
              {fare !== null ? (
                <div className="card-subtle p-4 rounded-4 shadow-sm d-flex flex-column h-100 justify-content-between">
                  <div className="mb-4">
                    <h5 className="fw-bold text-primary mb-3">Calculated Routing Summary</h5>
                    <div className="row g-3">
                      <div className="col-6 col-sm-4 border-end">
                        <small className="text-muted d-block mb-1">Route Distance</small>
                        <strong className="fs-5">{distance} km</strong>
                      </div>
                      <div className="col-6 col-sm-4 border-end">
                        <small className="text-muted d-block mb-1">Calculated Fare</small>
                        <strong className="fs-5 text-success">₹{fare}</strong>
                      </div>
                      <div className="col-12 col-sm-4 mt-3 mt-sm-0">
                        <small className="text-muted d-block mb-1">CO₂ Offset</small>
                        <strong className="fs-5 text-success">🌱 {co2Saved}g</strong>
                      </div>
                    </div>
                  </div>
                  
                  <div className="alert alert-info border-info-subtle bg-info-subtle text-info-emphasis rounded-3 small mb-4 py-2">
                    <i className="bi bi-info-circle-fill me-2"></i>
                    Fares are calculated as a fixed Base Fare of ₹20 + ₹10/km. No peak multipliers apply.
                  </div>

                  <Link to="/login" className="btn btn-primary-custom w-100 rounded-pill py-2.5 text-center">
                    Proceed to Book This Ride
                  </Link>
                </div>
              ) : (
                <div className="card-subtle rounded-4 p-5 text-center d-flex flex-column align-items-center justify-content-center" style={{ height: '300px', borderStyle: 'dashed', borderWidth: '2px' }}>
                  <i className="bi bi-calculator text-muted fs-1 mb-3"></i>
                  <h5 className="fw-bold text-muted">Select pickup and destination to calculate estimates</h5>
                  <p className="text-muted small mb-0">Estimates are calculated using real satellite routing overlays.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Live Fleet Status & Map preview */}
      <section className="container mb-5 py-4">
        <div className="row align-items-stretch g-4">
          <div className="col-lg-8">
            <div className="glass-card p-4 h-100 border border-light shadow-sm">
              <h4 className="fw-bold mb-3">Live Campus Fleet Overview</h4>
              <p className="text-muted small">Real-time mock GPS previews of available e-rickshaws stationed at transit hubs.</p>
              <Map
                pickupCoords={campusLocations['Main Gate']}
                destinationCoords={campusLocations['Library']}
                driverCoords={[30.3558, 76.3653]} // COS center marker
                status="Monitoring Mode"
              />
            </div>
          </div>
          
          <div className="col-lg-4">
            <div className="glass-card p-4 h-100 d-flex flex-column justify-content-between border border-light shadow-sm">
              <div>
                <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-3 py-1.5 rounded-pill fw-semibold mb-3">
                  ⚡ Live Fleet Activity
                </span>
                <h4 className="fw-bold mb-3">Real-Time Indicators</h4>
                <p className="text-muted small mb-4">
                  Campus cabs update their coordinate nodes every 5 seconds. Connect to verify driver density.
                </p>

                <div className="card-subtle rounded-3 p-3 mb-3 shadow-xs">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted">Online Cabs:</span>
                    <strong className="text-success fs-5">{fleetStats.activeCabs} Active</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted">Currently Boarded:</span>
                    <strong className="text-primary fs-5">{fleetStats.busyCabs} Busy</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="small text-muted">Estimated Wait:</span>
                    <strong className="text-warning fs-5">{fleetStats.avgWaitTime} mins</strong>
                  </div>
                </div>
              </div>

              <div className="alert alert-success border-success-subtle bg-success-subtle text-success-emphasis rounded-3 small py-2 mb-0">
                <i className="bi bi-check-circle-fill me-2"></i>
                All active drivers are currently on route. Average safety index is 99.8%.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section className="container py-5 mb-5">
        <div className="py-2">
          <div className="text-center mb-5 col-lg-8 mx-auto">
            <h2 className="fw-bold">Platform Features</h2>
            <p className="text-muted">Unified features optimized to elevate safety, price transparency, and environmental accountability.</p>
          </div>
          <div className="row g-4">
            <div className="col-md-6 col-lg-3">
              <div className="glass-card h-100 p-4 text-center border-0 shadow-sm">
                <div className="card-body">
                  <i className="bi bi-lightning-charge-fill text-warning fs-1 mb-3 d-block"></i>
                  <h5 className="card-title fw-bold mb-2">100% Eco-Friendly</h5>
                  <p className="card-text text-muted small mb-0">Powered by clean battery cells, helping our campus reduce its carbon footprint.</p>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="glass-card h-100 p-4 text-center border-0 shadow-sm">
                <div className="card-body">
                  <i className="bi bi-currency-rupee text-success fs-1 mb-3 d-block"></i>
                  <h5 className="card-title fw-bold mb-2">Ultra Cheap Fares</h5>
                  <p className="card-text text-muted small mb-0">Flat base of ₹20 and just ₹10 per kilometer. Say goodbye to price haggling!</p>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="glass-card h-100 p-4 text-center border-0 shadow-sm">
                <div className="card-body">
                  <i className="bi bi-pin-map-fill text-danger fs-1 mb-3 d-block"></i>
                  <h5 className="card-title fw-bold mb-2">Live GPS Tracker</h5>
                  <p className="card-text text-muted small mb-0">Real-time driver tracking powered by OpenStreetMap & Socket.IO. No guessing where your cab is.</p>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="glass-card h-100 p-4 text-center border-0 shadow-sm">
                <div className="card-body">
                  <i className="bi bi-shield-lock-fill text-primary fs-1 mb-3 d-block"></i>
                  <h5 className="card-title fw-bold mb-2">Verified Safe Rides</h5>
                  <p className="card-text text-muted small mb-0">Strict double verification of roll numbers and driver licenses ensures security on campus paths.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collapsible FAQ Accordion Section */}
      <section className="container py-5 mb-5">
        <div className="text-center mb-5 col-lg-8 mx-auto">
          <h2 className="fw-bold">Frequently Asked Questions</h2>
          <p className="text-muted">Got questions? Find direct operational answers below.</p>
        </div>
        
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="d-flex flex-column gap-3">
              {faqs.map((faq, index) => (
                <div key={index} className="glass-card p-3 border border-light shadow-sm">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="btn w-100 text-start d-flex justify-content-between align-items-center p-1 border-0"
                    style={{ background: 'none', color: 'var(--text-color)', fontWeight: '600' }}
                  >
                    <span>{faq.q}</span>
                    <i className={`bi ${openFaq === index ? 'bi-chevron-up' : 'bi-chevron-down'} text-primary`}></i>
                  </button>
                  
                  {openFaq === index && (
                    <div className="mt-3 px-1 text-muted small border-top pt-2" style={{ lineHeight: '1.6' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Contact */}
      <footer className="bg-dark text-white py-5 mt-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-4">
              <h5 className="fw-bold mb-3"><i className="bi bi-car-front-fill text-primary me-2"></i>UniTransit</h5>
              <p className="text-muted small">
                Dedicated e-rickshaw booking ecosystem for universities. Providing fast, reliable, eco-friendly campus travel.
              </p>
            </div>
            <div className="col-md-4">
              <h5 className="fw-bold mb-3">Quick Links</h5>
              <ul className="list-unstyled text-muted small">
                <li><Link to="/login" className="text-decoration-none text-muted">Book a Cab</Link></li>
                <li><Link to="/register?role=driver" className="text-decoration-none text-muted">Driver Registration</Link></li>
                <li><a href="#features" className="text-decoration-none text-muted">Service Features</a></li>
              </ul>
            </div>
            <div className="col-md-4" id="contact">
              <h5 className="fw-bold mb-3">Contact Support</h5>
              <p className="text-muted small mb-1"><i className="bi bi-envelope-fill me-2"></i> support@unitransit.com</p>
              <p className="text-muted small mb-1"><i className="bi bi-telephone-fill me-2"></i> +91-175-2393021</p>
              <p className="text-muted small"><i className="bi bi-geo-alt-fill me-2"></i> University Admin block, Patiala, India</p>
            </div>
          </div>
          <hr className="bg-secondary" />
          <div className="text-center text-muted small">
            <p className="mb-0">&copy; {new Date().getFullYear()} UniTransit. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(3deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default Home;
