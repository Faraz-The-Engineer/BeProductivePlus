const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  description: { type: String },
  status: { type: String, default: 'Pending' },
  timestamp: { type: Date, default: null },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  timeEstimate: { type: Number, required: true }, // in minutes or hours
  dependency: { type: String },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  date: { type: String, required: true, default: () => new Date().toISOString().slice(0, 10) },
  steps: [stepSchema],
  progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
  moveCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema); 