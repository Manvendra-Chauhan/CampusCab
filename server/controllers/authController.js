const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Driver = require('../models/Driver');

// Helper to sign JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretcampuscabjwttoken123!', {
    expiresIn: '30d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, rollNumber, batch, vehicleNumber, licenseNumber } = req.body;

    // Check if user already exists (by phone or email)
    const existingUserByPhone = await User.findOne({ phone });
    if (existingUserByPhone) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    let userEmail = email;
    if (!userEmail && role === 'driver') {
      userEmail = `driver_${phone}@unitransit.com`;
    }

    if (!userEmail) {
      return res.status(400).json({ message: 'Please provide an email address' });
    }

    const existingUserByEmail = await User.findOne({ email: userEmail });
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email address already registered' });
    }

    // Role-specific validation
    if (role === 'student') {
      if (!rollNumber || !batch) {
        return res.status(400).json({ message: 'Roll number and batch are required for students' });
      }
      const existingStudent = await Student.findOne({ rollNumber });
      if (existingStudent) {
        return res.status(400).json({ message: 'Roll number already registered' });
      }
    } else if (role === 'driver') {
      if (!vehicleNumber || !licenseNumber) {
        return res.status(400).json({ message: 'Vehicle number and license number are required for drivers' });
      }
      const existingDriverVehicle = await Driver.findOne({ vehicleNumber });
      if (existingDriverVehicle) {
        return res.status(400).json({ message: 'Vehicle number already registered' });
      }
      const existingDriverLicense = await Driver.findOne({ licenseNumber });
      if (existingDriverLicense) {
        return res.status(400).json({ message: 'License number already registered' });
      }
    }

    // Create Base User
    const user = await User.create({
      name,
      email: userEmail,
      phone,
      password,
      role: role || 'student'
    });

    let profile = null;

    // Create Role Profile
    if (user.role === 'student') {
      profile = await Student.create({
        user: user._id,
        rollNumber,
        batch
      });
    } else if (user.role === 'driver') {
      profile = await Driver.create({
        user: user._id,
        vehicleNumber,
        licenseNumber
      });
    }

    const token = signToken(user._id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      profile
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ message: 'Please provide email/phone and password' });
    }

    // Check for user
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Load profile and check suspension
    let profile = null;
    if (user.role === 'student') {
      profile = await Student.findOne({ user: user._id });
    } else if (user.role === 'driver') {
      profile = await Driver.findOne({ user: user._id });
      if (profile && profile.isSuspended) {
        return res.status(403).json({ message: 'Your driver account is suspended. Please contact the administrator.' });
      }
    }

    const token = signToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      profile
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      httpOnly: true,
      expires: new Date(Date.now() + 10 * 1000)
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user details & profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === 'student') {
      profile = await Student.findOne({ user: user._id });
    } else if (user.role === 'driver') {
      profile = await Driver.findOne({ user: user._id });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      profile
    });
  } catch (error) {
    next(error);
  }
};
