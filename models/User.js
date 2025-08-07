const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema({
  duration: { type: Number, required: true }, // in minutes
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  type: { type: String, enum: ['pomodoro', 'deep-work', 'break'], default: 'pomodoro' },
  distractionsBlocked: { type: Number, default: 0 },
  productivity: { type: Number, min: 1, max: 10 }, // self-rated productivity
  tasksCompleted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
}, { _id: false });

const goalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'], default: 'custom' },
  targetValue: { type: Number, required: true },
  currentValue: { type: Number, default: 0 },
  unit: { type: String, default: 'tasks' }, // tasks, hours, projects, etc.
  deadline: { type: Date },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['active', 'completed', 'paused', 'archived'], default: 'active' },
  linkedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  milestones: [{
    title: String,
    targetValue: Number,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
}, { _id: true });

const productivityInsightSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  totalFocusTime: { type: Number, default: 0 }, // minutes
  tasksCompleted: { type: Number, default: 0 },
  averageProductivity: { type: Number, default: 0 }, // 1-10 scale
  peakHours: [{ type: Number }], // hours of day (0-23)
  distractionsCount: { type: Number, default: 0 },
  efficiency: { type: Number, default: 0 }, // percentage
  moodRating: { type: Number, min: 1, max: 10 },
  energyLevel: { type: Number, min: 1, max: 10 },
}, { _id: false });

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
  // Premium subscription fields
  subscriptionTier: {
    type: String,
    enum: ['free', 'premium', 'enterprise'],
    default: 'free'
  },
  subscriptionExpiry: { type: Date },
  premiumFeatures: {
    aiScheduling: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    teamCollaboration: { type: Boolean, default: false },
    automationWorkflows: { type: Boolean, default: false },
    goalTracking: { type: Boolean, default: false },
    focusMode: { type: Boolean, default: false },
    aiCoach: { type: Boolean, default: false },
    customReports: { type: Boolean, default: false },
    unlimitedIntegrations: { type: Boolean, default: false }
  },
  // User preferences and settings
  preferences: {
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' }
    },
    breakDuration: { type: Number, default: 15 }, // minutes
    pomodoroLength: { type: Number, default: 25 }, // minutes
    timezone: { type: String, default: 'UTC' },
    notifications: {
      taskReminders: { type: Boolean, default: true },
      breakReminders: { type: Boolean, default: true },
      achievementAlerts: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: true }
    },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    language: { type: String, default: 'en' }
  },
  // Productivity analytics
  dailyInsights: [productivityInsightSchema],
  focusSessions: [focusSessionSchema],
  goals: [goalSchema],
  // AI & ML fields
  productivityPatterns: {
    mostProductiveHours: [{ type: Number }],
    preferredTaskDuration: { type: Number, default: 30 },
    averageBreakTime: { type: Number, default: 15 },
    peakDays: [{ type: String }], // monday, tuesday, etc.
    optimalWorkload: { type: Number, default: 8 }, // tasks per day
    lastAnalyzed: { type: Date, default: Date.now }
  },
  achievements: [{
    type: { type: String, required: true }, // streak_7, tasks_100, focus_master, etc.
    title: { type: String, required: true },
    description: { type: String },
    unlockedAt: { type: Date, default: Date.now },
    level: { type: Number, default: 1 }
  }],
  streaks: {
    currentTaskStreak: { type: Number, default: 0 },
    longestTaskStreak: { type: Number, default: 0 },
    currentFocusStreak: { type: Number, default: 0 },
    longestFocusStreak: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: Date.now }
  },
  // Team collaboration (for enterprise)
  workspaces: [{
    name: String,
    role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  // Usage statistics
  totalFocusTime: { type: Number, default: 0 }, // lifetime focus time in minutes
  totalTasksCompleted: { type: Number, default: 0 },
  accountLevel: { type: Number, default: 1 }, // gamification level
  experiencePoints: { type: Number, default: 0 }
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