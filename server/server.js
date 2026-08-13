require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');

// Route files
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const driverRoutes = require('./routes/driverRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO Setup
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Set io instance on app so controllers can access it
app.set('io', io);

// Socket Event Handlers
io.on('connection', (socket) => {
  console.log(`New WebSocket connection: ${socket.id}`);

  // User joins a room named after their database ID for targeted messages
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined personal room: ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`WebSocket disconnected: ${socket.id}`);
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/admin', adminRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'UniTransit API is running...' });
});

// Error handling middleware
app.use(errorHandler);

// Database Seeding Helper
const User = require('./models/User');
const Student = require('./models/Student');
const Driver = require('./models/Driver');
const Ride = require('./models/Ride');

const seedDatabase = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      console.log('Seeding initial system users...');
      
      // 1. Seed Admin
      const admin = await User.create({
        name: 'System Admin',
        email: 'admin@unitransit.com',
        phone: '9999999999',
        password: 'admin123', // Will be hashed by pre-save hook
        role: 'admin'
      });
      console.log('Seed: Admin user created (email: admin@unitransit.com / pass: admin123)');

      // 2. Seed Student
      const studentUser = await User.create({
        name: 'Rahul Sharma',
        email: 'student@unitransit.com',
        phone: '8888888888',
        password: 'student123',
        role: 'student'
      });
      await Student.create({
        user: studentUser._id,
        rollNumber: '102103045',
        batch: '2025'
      });
      console.log('Seed: Student user created (email: student@unitransit.com / pass: student123)');

      // 3. Seed Driver 1 (Online & Available)
      const driverUser1 = await User.create({
        name: 'Jagmeet Singh',
        email: 'driver1@unitransit.com',
        phone: '7777777777',
        password: 'driver123',
        role: 'driver'
      });
      await Driver.create({
        user: driverUser1._id,
        vehicleNumber: 'PB-11-AB-1234',
        licenseNumber: 'DL-987654321',
        isOnline: true,
        currentLocation: [30.3582, 76.3705] // Main Gate
      });
      console.log('Seed: Driver 1 created (email: driver1@unitransit.com / pass: driver123, online: true)');

      // 4. Seed Driver 2 (Offline)
      const driverUser2 = await User.create({
        name: 'Gurpreet Singh',
        email: 'driver2@unitransit.com',
        phone: '6666666666',
        password: 'driver123',
        role: 'driver'
      });
      await Driver.create({
        user: driverUser2._id,
        vehicleNumber: 'PB-11-CD-5678',
        licenseNumber: 'DL-123456789',
        isOnline: false,
        currentLocation: [30.3548, 76.3632] // Library
      });
      console.log('Seed: Driver 2 created (email: driver2@unitransit.com / pass: driver123, online: false)');
    }
  } catch (err) {
    console.error('Error seeding database:', err.message);
  }
};

// Run Seeder on Startup
seedDatabase();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
