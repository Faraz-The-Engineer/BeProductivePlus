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
  // AI & Premium features
  aiScheduled: { type: Boolean, default: false },
  optimalTimeSlot: { type: String }, // HH:MM format for AI-suggested time
  energyLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  contextSwitchCost: { type: Number, default: 1 }, // 1-5 scale
  distractionRisk: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  linkedGoals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User.goals' }],
  automationRules: [{
    trigger: { type: String }, // 'completion', 'deadline', 'status_change'
    action: { type: String }, // 'create_task', 'send_notification', 'update_status'
    config: { type: mongoose.Schema.Types.Mixed }
  }],
  // Focus and productivity metrics
  focusSessionsCount: { type: Number, default: 0 },
  averageProductivity: { type: Number, default: 0 }, // 1-10 scale
  lastProductivityRating: { type: Number, min: 1, max: 10 },
  // Collaboration fields
  workspace: { type: String },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  // Smart recommendations
  aiSuggestions: [{
    type: { type: String }, // 'time_slot', 'break_suggestion', 'dependency_order'
    suggestion: { type: String },
    confidence: { type: Number, min: 0, max: 1 },
    applied: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  // Performance analytics
  completionAccuracy: { type: Number, default: 0 }, // how close actual time was to estimate
  procrastinationScore: { type: Number, default: 0 }, // 0-100, higher = more procrastination
  motivationLevel: { type: Number, min: 1, max: 10, default: 5 },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema); 