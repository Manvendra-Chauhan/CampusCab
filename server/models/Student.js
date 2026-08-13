const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  rollNumber: {
    type: String,
    required: [true, 'Please add a roll number'],
    unique: true,
    trim: true
  },
  batch: {
    type: String,
    required: [true, 'Please add a batch (e.g. 2024)']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);
