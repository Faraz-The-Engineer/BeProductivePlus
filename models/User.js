const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
}, { 
  timestamps: true,
  // Ensure no old indexes cause issues
  strict: true
});

// Drop any existing indexes that might conflict
userSchema.on('index', function(error) {
  if (error) {
    console.log('Index error:', error);
  }
});

module.exports = mongoose.model('User', userSchema); 