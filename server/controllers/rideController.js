const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Student = require('../models/Student');
const { campusLocations, getDistanceInKm, calculateFare } = require('../utils/fareCalculator');

// @desc    Book a ride
// @route   POST /api/rides/book
// @access  Private (Student)
exports.bookRide = async (req, res, next) => {
  try {
    const { pickup, destination, passengers } = req.body;

    if (!pickup || !destination) {
      return res.status(400).json({ message: 'Pickup and destination are required' });
    }

    const pickupCoords = campusLocations[pickup];
    const destCoords = campusLocations[destination];

    if (!pickupCoords || !destCoords) {
      return res.status(400).json({ message: 'Invalid pickup or destination location' });
    }

    // Calculate distance & fare
    const distance = getDistanceInKm(pickupCoords[0], pickupCoords[1], destCoords[0], destCoords[1]);
    const fare = calculateFare(distance);

    // Check if student already has an active ride
    const activeRide = await Ride.findOne({
      student: req.user._id,
      status: { $in: ['Searching', 'Driver Assigned', 'Driver Arriving', 'Ride Started'] }
    });

    if (activeRide) {
      return res.status(400).json({ message: 'You already have an active ride booking' });
    }

    // Find all online, non-suspended drivers
    const onlineDrivers = await Driver.find({ isOnline: true, isSuspended: false }).populate('user');
    
    // Find drivers who are currently not in an active ride
    const activeRides = await Ride.find({
      status: { $in: ['Driver Assigned', 'Driver Arriving', 'Ride Started'] },
      driver: { $ne: null }
    });
    
    const busyDriverIds = activeRides.map(r => r.driver.toString());
    const availableDrivers = onlineDrivers.filter(d => !busyDriverIds.includes(d.user._id.toString()));

    let assignedDriver = null;
    let rideStatus = 'Searching';

    if (availableDrivers.length > 0) {
      // Find nearest driver
      let minDistance = Infinity;
      
      availableDrivers.forEach(driver => {
        const dist = getDistanceInKm(
          driver.currentLocation[0],
          driver.currentLocation[1],
          pickupCoords[0],
          pickupCoords[1]
        );
        if (dist < minDistance) {
          minDistance = dist;
          assignedDriver = driver;
        }
      });
    }

    if (assignedDriver) {
      rideStatus = 'Driver Assigned';
    }

    const ride = await Ride.create({
      student: req.user._id,
      driver: assignedDriver ? assignedDriver.user._id : null,
      pickup,
      pickupCoords,
      destination,
      destinationCoords,
      passengers: passengers || 1,
      distance,
      fare,
      status: rideStatus
    });

    // Populate student and driver user info for Socket.IO emits
    const populatedRide = await Ride.findById(ride._id)
      .populate({ path: 'student', select: 'name phone' })
      .populate({ path: 'driver', select: 'name phone' });

    // Handle Real-time socket events
    const io = req.app.get('io');
    if (io) {
      if (assignedDriver) {
        // Send request to the driver
        io.to(assignedDriver.user._id.toString()).emit('new_ride_request', populatedRide);
        // Inform the student
        io.to(req.user._id.toString()).emit('ride_status_updated', populatedRide);
      } else {
        // Broadcast to all online drivers that a ride is searching (in case they free up)
        availableDrivers.forEach(d => {
          io.to(d.user._id.toString()).emit('searching_ride_available', populatedRide);
        });
      }
    }

    res.status(201).json({
      success: true,
      ride: populatedRide
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current active ride
// @route   GET /api/rides/current
// @access  Private
exports.getCurrentRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({
      $or: [
        { student: req.user._id },
        { driver: req.user._id }
      ],
      status: { $in: ['Searching', 'Driver Assigned', 'Driver Arriving', 'Ride Started'] }
    })
    .populate({ path: 'student', select: 'name phone' })
    .populate({ path: 'driver', select: 'name phone' });

    // If driver is assigned, include driver's vehicle and location info
    let driverProfile = null;
    if (ride && ride.driver) {
      driverProfile = await Driver.findOne({ user: ride.driver._id });
    }

    res.status(200).json({
      success: true,
      ride,
      driverProfile
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ride history
// @route   GET /api/rides/history
// @access  Private
exports.getRideHistory = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'student') {
      query.student = req.user._id;
    } else if (req.user.role === 'driver') {
      query.driver = req.user._id;
    }

    // Handle optional search query (pickup or destination)
    const { search } = req.query;
    if (search) {
      query.$or = [
        { pickup: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } }
      ];
    }

    const rides = await Ride.find(query)
      .populate({ path: 'student', select: 'name phone' })
      .populate({ path: 'driver', select: 'name phone' })
      .sort({ bookingTime: -1 });

    res.status(200).json({
      success: true,
      count: rides.length,
      rides
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel ride
// @route   PUT /api/rides/cancel/:id
// @access  Private
exports.cancelRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Authorization check
    if (ride.student.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this ride' });
    }

    // Can only cancel before ride starts
    if (['Ride Started', 'Ride Completed', 'Cancelled'].includes(ride.status)) {
      return res.status(400).json({ message: `Cannot cancel ride in state: ${ride.status}` });
    }

    const oldDriverId = ride.driver;
    ride.status = 'Cancelled';
    ride.endTime = Date.now();
    await ride.save();

    const populatedRide = await Ride.findById(ride._id)
      .populate({ path: 'student', select: 'name phone' })
      .populate({ path: 'driver', select: 'name phone' });

    // Notify via sockets
    const io = req.app.get('io');
    if (io) {
      io.to(ride.student.toString()).emit('ride_status_updated', populatedRide);
      if (oldDriverId) {
        io.to(oldDriverId.toString()).emit('ride_status_updated', populatedRide);
      }
    }

    res.status(200).json({
      success: true,
      ride: populatedRide
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rate and review a completed ride
// @route   POST /api/rides/rate/:id
// @access  Private (Student)
exports.rateRide = async (req, res, next) => {
  try {
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Please provide a valid rating between 1 and 5' });
    }

    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to rate this ride' });
    }

    if (ride.status !== 'Ride Completed') {
      return res.status(400).json({ message: 'Only completed rides can be rated' });
    }

    ride.rating = rating;
    ride.review = review || '';
    await ride.save();

    res.status(200).json({
      success: true,
      ride
    });
  } catch (error) {
    next(error);
  }
};
