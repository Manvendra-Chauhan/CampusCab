const express = require('express');
const {
  goOnline,
  goOffline,
  updateLocation,
  acceptRide,
  rejectRide,
  startRide,
  completeRide,
  getDashboardStats
} = require('../controllers/driverController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes here require driver authentication
router.use(protect);
router.use(authorize('driver'));

router.put('/online', goOnline);
router.put('/offline', goOffline);
router.put('/location', updateLocation);
router.put('/accept/:rideId', acceptRide);
router.put('/reject/:rideId', rejectRide);
router.put('/start/:rideId', startRide);
router.put('/complete/:rideId', completeRide);
router.get('/dashboard', getDashboardStats);

module.exports = router;
