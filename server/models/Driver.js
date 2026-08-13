const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Please add a vehicle number'],
    unique: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'Please add a license number'],
    unique: true,
    trim: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    type: [Number], // [latitude, longitude]
    default: [30.3582, 76.3705] // Default to Main Gate coordinates
  },
  earnings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Driver', driverSchema);
