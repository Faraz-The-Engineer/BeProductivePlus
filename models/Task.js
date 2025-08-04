const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  description: { type: String },
  status: { type: String, default: 'Pending' },
  timestamp: { type: Date, default: null },
}, { _id: false });

const timeLogSchema = new mongoose.Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number, default: 0 }, // in minutes
  description: { type: String },
  isActive: { type: Boolean, default: false },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  timeEstimate: { type: Number, required: true }, // in minutes or hours
  dependency: { type: String },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'On Hold'], default: 'Pending' },
  onHoldReason: { type: String },
  date: { type: String, required: true, default: () => new Date().toISOString().slice(0, 10) },
  dueDate: { type: Date },
  dueTime: { type: String }, // Time in HH:MM format
  reminderDate: { type: Date },
  isRecurring: { type: Boolean, default: false },
  recurringPattern: { type: String, enum: ['daily', 'weekly', 'monthly'], default: null },
  steps: [stepSchema],
  progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
  moveCount: { type: Number, default: 0, min: 0 },
  // Enhanced filtering fields
  tags: [{ type: String }],
  category: { type: String, default: 'General' },
  project: { type: String },
  assignedTo: { type: String },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  // Time tracking fields
  timeLogs: [timeLogSchema],
  totalTimeSpent: { type: Number, default: 0 }, // in minutes
  isTimerActive: { type: Boolean, default: false },
  timerStartTime: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema); 