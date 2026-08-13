const express = require('express');
const { bookRide, getCurrentRide, getRideHistory, cancelRide, rateRide } = require('../controllers/rideController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/book', protect, authorize('student'), bookRide);
router.get('/current', protect, getCurrentRide);
router.get('/history', protect, getRideHistory);
router.put('/cancel/:id', protect, cancelRide);
router.post('/rate/:id', protect, authorize('student'), rateRide);

module.exports = router;
