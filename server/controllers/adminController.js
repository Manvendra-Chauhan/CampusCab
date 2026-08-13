const User = require('../models/User');
const Student = require('../models/Student');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');

// @desc    Get all users (Students & Drivers) with search
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
  try {
    const { search, role } = req.query;

    let matchQuery = { role: { $ne: 'admin' } };
    if (role) {
      matchQuery.role = role;
    }

    if (search) {
      matchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(matchQuery);
    
    // Populate profiles
    const usersWithProfiles = await Promise.all(
      users.map(async (user) => {
        let profile = null;
        if (user.role === 'student') {
          profile = await Student.findOne({ user: user._id });
        } else if (user.role === 'driver') {
          profile = await Driver.findOne({ user: user._id });
        }
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
          profile
        };
      })
    );

    // If searching by roll number or vehicle number, filter matches in JS
    let filteredUsers = usersWithProfiles;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = usersWithProfiles.filter(u => {
        if (!u.profile) return true;
        if (u.role === 'student') {
          return u.profile.rollNumber?.toLowerCase().includes(searchLower) || u.name.toLowerCase().includes(searchLower);
        } else if (u.role === 'driver') {
          return (
            u.profile.vehicleNumber?.toLowerCase().includes(searchLower) ||
            u.profile.licenseNumber?.toLowerCase().includes(searchLower) ||
            u.name.toLowerCase().includes(searchLower)
          );
        }
        return true;
      });
    }

    res.status(200).json({
      success: true,
      count: filteredUsers.length,
      users: filteredUsers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all rides with search and filters
// @route   GET /api/admin/rides
// @access  Private (Admin)
exports.getRides = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { pickup: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } }
      ];
    }

    let rides = await Ride.find(query)
      .populate({ path: 'student', select: 'name email phone' })
      .populate({ path: 'driver', select: 'name email phone' })
      .sort({ bookingTime: -1 });

    // JS filter for student or driver name if search query is provided
    if (search) {
      const searchLower = search.toLowerCase();
      rides = rides.filter(r => {
        const studentMatch = r.student?.name?.toLowerCase().includes(searchLower) || r.student?.phone?.includes(searchLower);
        const driverMatch = r.driver?.name?.toLowerCase().includes(searchLower) || r.driver?.phone?.includes(searchLower);
        const locationMatch = r.pickup.toLowerCase().includes(searchLower) || r.destination.toLowerCase().includes(searchLower);
        return studentMatch || driverMatch || locationMatch;
      });
    }

    res.status(200).json({
      success: true,
      count: rides.length,
      rides
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a user and their profile
// @route   DELETE /api/admin/user/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin user cannot be deleted' });
    }

    // Delete corresponding profile
    if (user.role === 'student') {
      await Student.findOneAndDelete({ user: user._id });
      // Delete their rides
      await Ride.deleteMany({ student: user._id });
    } else if (user.role === 'driver') {
      await Driver.findOneAndDelete({ user: user._id });
      // Clear driver ref from rides or delete them
      await Ride.updateMany({ driver: user._id }, { driver: null, status: 'Searching' });
    }

    await User.findByIdAndDelete(user._id);

    res.status(200).json({
      success: true,
      message: 'User and all associated profile and ride records deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suspend/reactivate a driver
// @route   PUT /api/admin/suspend/:id
// @access  Private (Admin)
exports.suspendDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ user: req.params.id });

    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    // Toggle status
    driver.isSuspended = !driver.isSuspended;
    
    // If suspending, force offline
    if (driver.isSuspended) {
      driver.isOnline = false;
    }
    
    await driver.save();

    res.status(200).json({
      success: true,
      message: driver.isSuspended ? 'Driver suspended successfully' : 'Driver reactivated successfully',
      profile: driver
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getStats = async (req, res, next) => {
  try {
    // 1. Basic Stats
    const totalStudents = await Student.countDocuments();
    const totalDrivers = await Driver.countDocuments();
    const onlineDrivers = await Driver.countDocuments({ isOnline: true });
    
    // Active Drivers: online and not suspended
    const activeDrivers = await Driver.countDocuments({ isOnline: true, isSuspended: false });
    
    const completedRides = await Ride.countDocuments({ status: 'Ride Completed' });
    
    // Revenue sum
    const revenueObj = await Ride.aggregate([
      { $match: { status: 'Ride Completed' } },
      { $group: { _id: null, total: { $sum: '$fare' } } }
    ]);
    
    const totalRevenue = revenueObj.length > 0 ? revenueObj[0].total : 0;

    // 2. Daily Rides & Revenue (past 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyStats = await Ride.aggregate([
      {
        $match: {
          bookingTime: { $gte: sevenDaysAgo },
          status: 'Ride Completed'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$bookingTime" } },
          count: { $sum: 1 },
          revenue: { $sum: "$fare" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Monthly Rides & Revenue (past 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyStats = await Ride.aggregate([
      {
        $match: {
          bookingTime: { $gte: twelveMonthsAgo },
          status: 'Ride Completed'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$bookingTime" } },
          count: { $sum: 1 },
          revenue: { $sum: "$fare" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        totalDrivers,
        onlineDrivers,
        activeDrivers,
        completedRides,
        totalRevenue
      },
      dailyStats,
      monthlyStats
    });
  } catch (error) {
    next(error);
  }
};
