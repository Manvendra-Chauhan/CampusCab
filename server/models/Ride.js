const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pickup: {
    type: String,
    required: [true, 'Please add a pickup location']
  },
  pickupCoords: {
    type: [Number], // [latitude, longitude]
    required: true
  },
  destination: {
    type: String,
    required: [true, 'Please add a destination location']
  },
  destinationCoords: {
    type: [Number], // [latitude, longitude]
    required: true
  },
  passengers: {
    type: Number,
    required: true,
    default: 1
  },
  distance: {
    type: Number, // In Kilometers
    required: true
  },
  fare: {
    type: Number, // In Rupees
    required: true
  },
  status: {
    type: String,
    enum: ['Searching', 'Driver Assigned', 'Driver Arriving', 'Ride Started', 'Ride Completed', 'Cancelled'],
    default: 'Searching'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  review: {
    type: String,
    default: ''
  },
  bookingTime: {
    type: Date,
    default: Date.now
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Ride', rideSchema);
