const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const User = require('../models/User');
const { getDistanceInKm } = require('../utils/fareCalculator');

// Helper to get driver profile by user id
const getDriverProfile = async (userId) => {
  const driver = await Driver.findOne({ user: userId });
  if (!driver) throw new Error('Driver profile not found');
  return driver;
};

// @desc    Go online
// @route   PUT /api/drivers/online
// @access  Private (Driver)
exports.goOnline = async (req, res, next) => {
  try {
    const driver = await getDriverProfile(req.user._id);
    if (driver.isSuspended) {
      return res.status(403).json({ message: 'Cannot go online. Driver account is suspended.' });
    }
    driver.isOnline = true;
    await driver.save();

    res.status(200).json({
      success: true,
      profile: driver
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Go offline
// @route   PUT /api/drivers/offline
// @access  Private (Driver)
exports.goOffline = async (req, res, next) => {
  try {
    const driver = await getDriverProfile(req.user._id);
    driver.isOnline = false;
    await driver.save();

    res.status(200).json({
      success: true,
      profile: driver
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update driver location and emit to student if on active ride
// @route   PUT /api/drivers/location
// @access  Private (Driver)
exports.updateLocation = async (req, res, next) => {
  try {
    const { coordinates } = req.body; // [latitude, longitude]

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    const driver = await getDriverProfile(req.user._id);
    driver.currentLocation = coordinates;
    await driver.save();

    // Check if driver has an active ride that is assigned, arriving, or started
    const activeRide = await Ride.findOne({
      driver: req.user._id,
      status: { $in: ['Driver Assigned', 'Driver Arriving', 'Ride Started'] }
    });

    if (activeRide) {
      // Emit location update to the student's room via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.to(activeRide.student.toString()).emit('driver_location_updated', {
          rideId: activeRide._id,
          driverId: req.user._id,
          coordinates
        });
      }
    }

    res.status(200).json({
      success: true,
      coordinates: driver.currentLocation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept ride request
// @route   PUT /api/drivers/accept/:rideId
// @access  Private (Driver)
exports.acceptRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) {
      return res.status(404).json({ message: 'Ride request not found' });
    }

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this ride' });
    }

    if (ride.status !== 'Driver Assigned') {
      return res.status(400).json({ message: `Ride is not in a requestable state (Current: ${ride.status})` });
    }

    ride.status = 'Driver Arriving';
    await ride.save();

    const populatedRide = await Ride.findById(ride._id)
      .populate({ path: 'student', select: 'name phone' })
      .populate({ path: 'driver', select: 'name phone' });

    // Notify student via sockets
    const io = req.app.get('io');
    if (io) {
      io.to(ride.student.toString()).emit('ride_status_updated', populatedRide);
      io.to(ride.driver.toString()).emit('ride_status_updated', populatedRide);
    }

    res.status(200).json({
      success: true,
      ride: populatedRide
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject ride request (auto-reassign to next nearest driver)
// @route   PUT /api/drivers/reject/:rideId
// @access  Private (Driver)
exports.rejectRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) {
      return res.status(404).json({ message: 'Ride request not found' });
    }

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this ride' });
    }

    if (ride.status !== 'Driver Assigned') {
      return res.status(400).json({ message: 'Cannot reject a ride that is already in progress or cancelled' });
    }

    const currentDriverId = req.user._id;

    // Find all online, non-suspended drivers EXCEPT the rejecting one
    const onlineDrivers = await Driver.find({
      isOnline: true,
      isSuspended: false,
      user: { $ne: currentDriverId }
    }).populate('user');

    // Find active rides (busy drivers)
    const activeRides = await Ride.find({
      status: { $in: ['Driver Assigned', 'Driver Arriving', 'Ride Started'] },
      driver: { $ne: null }
    });

    const busyDriverIds = activeRides.map(r => r.driver.toString());
    const availableDrivers = onlineDrivers.filter(d => !busyDriverIds.includes(d.user._id.toString()));

    let nextDriver = null;
    let nextStatus = 'Searching';

    if (availableDrivers.length > 0) {
      let minDistance = Infinity;
      availableDrivers.forEach(driver => {
        const dist = getDistanceInKm(
          driver.currentLocation[0],
          driver.currentLocation[1],
          ride.pickupCoords[0],
          ride.pickupCoords[1]
        );
        if (dist < minDistance) {
          minDistance = dist;
          nextDriver = driver;
        }
      });
    }

    if (nextDriver) {
      ride.driver = nextDriver.user._id;
      ride.status = 'Driver Assigned';
    } else {
      ride.driver = null;
      ride.status = 'Searching';
    }

    await ride.save();

    const populatedRide = await Ride.findById(ride._id)
      .populate({ path: 'student', select: 'name phone' })
      .populate({ path: 'driver', select: 'name phone' });

    // Notify sockets
    const io = req.app.get('io');
    if (io) {
      // Notify original student
      io.to(ride.student.toString()).emit('ride_status_updated', populatedRide);
      // Notify original driver that request has cleared
      io.to(currentDriverId.toString()).emit('ride_request_cleared', { rideId: ride._id });
      
      if (nextDriver) {
        // Send request to the next driver
        io.to(nextDriver.user._id.toString()).emit('new_ride_request', populatedRide);
      } else {
        // Broadcast searching ride to all other online drivers
        availableDrivers.forEach(d => {
          io.to(d.user._id.toString()).emit('searching_ride_available', populatedRide);
        });
      }
    }

    res.status(200).json({
      success: true,
      message: nextDriver ? 'Ride reassigned successfully' : 'Ride status set back to searching',
      ride: populatedRide
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start ride
// @route   PUT /api/drivers/start/:rideId
// @access  Private (Driver)
exports.startRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (ride.status !== 'Driver Arriving') {
      return res.status(400).json({ message: 'Driver must arrive before starting the ride' });
    }

    ride.status = 'Ride Started';
    ride.startTime = Date.now();
    await ride.save();

    const populatedRide = await Ride.findById(ride._id)
      .populate({ path: 'student', select: 'name phone' })
      .populate({ path: 'driver', select: 'name phone' });

    // Notify sockets
    const io = req.app.get('io');
    if (io) {
      io.to(ride.student.toString()).emit('ride_status_updated', populatedRide);
      io.to(ride.driver.toString()).emit('ride_status_updated', populatedRide);
    }

    res.status(200).json({
      success: true,
      ride: populatedRide
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete ride and credit earnings
// @route   PUT /api/drivers/complete/:rideId
// @access  Private (Driver)
exports.completeRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (ride.status !== 'Ride Started') {
      return res.status(400).json({ message: 'Ride must be started before it can be completed' });
    }

    ride.status = 'Ride Completed';
    ride.endTime = Date.now();
    await ride.save();

    // Credit earnings to driver profile
    const driver = await getDriverProfile(req.user._id);
    driver.earnings += ride.fare;
    await driver.save();

    const populatedRide = await Ride.findById(ride._id)
      .populate({ path: 'student', select: 'name phone' })
      .populate({ path: 'driver', select: 'name phone' });

    // Notify sockets
    const io = req.app.get('io');
    if (io) {
      io.to(ride.student.toString()).emit('ride_status_updated', populatedRide);
      io.to(ride.driver.toString()).emit('ride_status_updated', populatedRide);
    }

    res.status(200).json({
      success: true,
      ride: populatedRide
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get driver dashboard details (earnings, completed count)
// @route   GET /api/drivers/dashboard
// @access  Private (Driver)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const driver = await getDriverProfile(req.user._id);

    // Count completed rides
    const completedRidesCount = await Ride.countDocuments({
      driver: req.user._id,
      status: 'Ride Completed'
    });

    // Today's completed rides earnings calculation
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayRides = await Ride.find({
      driver: req.user._id,
      status: 'Ride Completed',
      endTime: { $gte: startOfToday }
    });

    const todayEarnings = todayRides.reduce((sum, r) => sum + r.fare, 0);

    res.status(200).json({
      success: true,
      todayEarnings,
      totalEarnings: driver.earnings,
      completedRidesCount,
      isOnline: driver.isOnline,
      currentLocation: driver.currentLocation
    });
  } catch (error) {
    next(error);
  }
};
