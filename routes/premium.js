const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Task = require('../models/Task');

// Get user's premium features status
router.get('/features', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('subscriptionTier premiumFeatures subscriptionExpiry');
    res.json(user);
  } catch (error) {
    console.error('Error fetching premium features:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update subscription tier (for demo purposes - in production this would be handled by payment system)
router.put('/subscription', auth, async (req, res) => {
  try {
    const { tier } = req.body;
    
    const premiumFeatures = {
      free: {
        aiScheduling: false,
        advancedAnalytics: false,
        teamCollaboration: false,
        automationWorkflows: false,
        goalTracking: false,
        focusMode: false,
        aiCoach: false,
        customReports: false,
        unlimitedIntegrations: false
      },
      premium: {
        aiScheduling: true,
        advancedAnalytics: true,
        teamCollaboration: false,
        automationWorkflows: true,
        goalTracking: true,
        focusMode: true,
        aiCoach: true,
        customReports: true,
        unlimitedIntegrations: false
      },
      enterprise: {
        aiScheduling: true,
        advancedAnalytics: true,
        teamCollaboration: true,
        automationWorkflows: true,
        goalTracking: true,
        focusMode: true,
        aiCoach: true,
        customReports: true,
        unlimitedIntegrations: true
      }
    };

    const expiry = tier === 'free' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        subscriptionTier: tier,
        subscriptionExpiry: expiry,
        premiumFeatures: premiumFeatures[tier]
      },
      { new: true }
    );

    res.json(user);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Advanced Analytics
router.get('/analytics/advanced', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.premiumFeatures?.advancedAnalytics) {
      return res.status(403).json({ message: 'Premium feature not available' });
    }

    const { days = 30 } = req.query;
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const tasks = await Task.find({
      user: req.user.id,
      createdAt: { $gte: dateFrom }
    });

    // Calculate advanced metrics
    const analytics = await calculateAdvancedAnalytics(tasks, user);
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching advanced analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Focus Sessions
router.post('/focus-session/start', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.premiumFeatures?.focusMode) {
      return res.status(403).json({ message: 'Premium feature not available' });
    }

    const { duration, type = 'pomodoro' } = req.body;
    
    const session = {
      duration,
      type,
      startTime: new Date(),
      distractionsBlocked: 0,
      tasksCompleted: []
    };

    user.focusSessions.push(session);
    await user.save();

    res.json({ message: 'Focus session started', sessionId: user.focusSessions[user.focusSessions.length - 1]._id });
  } catch (error) {
    console.error('Error starting focus session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/focus-session/:sessionId/end', auth, async (req, res) => {
  try {
    const { productivity, tasksCompleted } = req.body;
    
    const user = await User.findById(req.user.id);
    const session = user.focusSessions.id(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Focus session not found' });
    }

    session.endTime = new Date();
    session.productivity = productivity;
    session.tasksCompleted = tasksCompleted;

    // Update user's total focus time
    const sessionDuration = Math.round((session.endTime - session.startTime) / (1000 * 60));
    user.totalFocusTime += sessionDuration;

    // Update streaks
    const today = new Date().toDateString();
    const lastActiveDate = new Date(user.streaks.lastActiveDate).toDateString();
    
    if (today === lastActiveDate) {
      // Same day, no streak change
    } else if (new Date(today).getTime() - new Date(lastActiveDate).getTime() === 24 * 60 * 60 * 1000) {
      // Consecutive day
      user.streaks.currentFocusStreak += 1;
      user.streaks.longestFocusStreak = Math.max(user.streaks.longestFocusStreak, user.streaks.currentFocusStreak);
    } else {
      // Streak broken
      user.streaks.currentFocusStreak = 1;
    }
    user.streaks.lastActiveDate = new Date();

    await user.save();

    res.json({ message: 'Focus session completed', session });
  } catch (error) {
    console.error('Error ending focus session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Goals Management
router.get('/goals', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.premiumFeatures?.goalTracking) {
      return res.status(403).json({ message: 'Premium feature not available' });
    }

    res.json(user.goals || []);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/goals', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.premiumFeatures?.goalTracking) {
      return res.status(403).json({ message: 'Premium feature not available' });
    }

    const goal = {
      ...req.body,
      createdAt: new Date()
    };

    user.goals.push(goal);
    await user.save();

    res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/goals/:goalId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const goal = user.goals.id(req.params.goalId);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    Object.assign(goal, req.body);
    
    if (req.body.status === 'completed' && !goal.completedAt) {
      goal.completedAt = new Date();
      
      // Award achievement points
      user.experiencePoints += goal.targetValue * 10;
      
      // Check for level up
      const newLevel = Math.floor(user.experiencePoints / 1000) + 1;
      if (newLevel > user.accountLevel) {
        user.accountLevel = newLevel;
        user.achievements.push({
          type: `level_${newLevel}`,
          title: `Level ${newLevel} Achieved!`,
          description: `Congratulations on reaching level ${newLevel}!`
        });
      }
    }

    await user.save();
    res.json(goal);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// AI Scheduling
router.post('/ai-schedule', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.premiumFeatures?.aiScheduling) {
      return res.status(403).json({ message: 'Premium feature not available' });
    }

    const tasks = await Task.find({
      user: req.user.id,
      status: { $in: ['Pending', 'In Progress'] }
    });

    const schedule = await generateAISchedule(tasks, user);
    
    res.json(schedule);
  } catch (error) {
    console.error('Error generating AI schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// AI Coach Recommendations
router.get('/ai-coach', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.premiumFeatures?.aiCoach) {
      return res.status(403).json({ message: 'Premium feature not available' });
    }

    const recommendations = await generateAIRecommendations(user);
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Productivity Insights
router.get('/insights', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.premiumFeatures?.advancedAnalytics) {
      return res.status(403).json({ message: 'Premium feature not available' });
    }

    const insights = await generateProductivityInsights(user);
    
    res.json(insights);
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper functions
async function calculateAdvancedAnalytics(tasks, user) {
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const totalTasks = tasks.length;
  
  const avgCompletionTime = completedTasks.reduce((sum, task) => {
    const completionTime = task.updatedAt - task.createdAt;
    return sum + completionTime;
  }, 0) / completedTasks.length || 0;

  const productivityByHour = {};
  tasks.forEach(task => {
    const hour = new Date(task.createdAt).getHours();
    if (!productivityByHour[hour]) productivityByHour[hour] = { created: 0, completed: 0 };
    productivityByHour[hour].created++;
    if (task.status === 'Completed') productivityByHour[hour].completed++;
  });

  const focusMetrics = {
    totalSessions: user.focusSessions?.length || 0,
    totalFocusTime: user.totalFocusTime || 0,
    averageSessionLength: user.focusSessions?.length ? user.totalFocusTime / user.focusSessions.length : 0,
    currentStreak: user.streaks?.currentFocusStreak || 0,
    longestStreak: user.streaks?.longestFocusStreak || 0
  };

  const goalProgress = user.goals?.map(goal => ({
    title: goal.title,
    progress: goal.currentValue / goal.targetValue * 100,
    daysRemaining: goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / (24 * 60 * 60 * 1000)) : null
  })) || [];

  return {
    overview: {
      totalTasks,
      completedTasks: completedTasks.length,
      completionRate: totalTasks > 0 ? (completedTasks.length / totalTasks * 100) : 0,
      avgCompletionTime: Math.round(avgCompletionTime / (1000 * 60 * 60)), // in hours
    },
    productivity: {
      byHour: Object.entries(productivityByHour).map(([hour, data]) => ({
        hour: parseInt(hour),
        created: data.created,
        completed: data.completed,
        efficiency: data.created > 0 ? (data.completed / data.created * 100) : 0
      })).sort((a, b) => a.hour - b.hour),
      peakHours: user.productivityPatterns?.mostProductiveHours || [],
      optimalWorkload: user.productivityPatterns?.optimalWorkload || 8
    },
    focus: focusMetrics,
    goals: goalProgress,
    achievements: user.achievements || [],
    level: user.accountLevel || 1,
    experiencePoints: user.experiencePoints || 0
  };
}

async function generateAISchedule(tasks, user) {
  const workingHours = user.preferences?.workingHours || { start: '09:00', end: '17:00' };
  const pomodoroLength = user.preferences?.pomodoroLength || 25;
  const breakDuration = user.preferences?.breakDuration || 15;
  
  // Sort tasks by priority and difficulty
  const sortedTasks = tasks.sort((a, b) => {
    const priorityWeight = { High: 3, Medium: 2, Low: 1 };
    const difficultyWeight = { Hard: 3, Medium: 2, Easy: 1 };
    
    const scoreA = priorityWeight[a.priority] * 2 + difficultyWeight[a.difficulty];
    const scoreB = priorityWeight[b.priority] * 2 + difficultyWeight[b.difficulty];
    
    return scoreB - scoreA;
  });

  const schedule = [];
  let currentTime = workingHours.start;
  
  for (const task of sortedTasks.slice(0, 8)) { // Limit to 8 tasks per day
    const duration = Math.min(task.timeEstimate, pomodoroLength);
    
    schedule.push({
      taskId: task._id,
      taskName: task.name,
      startTime: currentTime,
      duration,
      energyLevel: getOptimalEnergyLevel(currentTime),
      confidence: 0.85,
      reasoning: `Scheduled during ${getOptimalEnergyLevel(currentTime)} energy period based on priority and difficulty.`
    });
    
    // Update current time
    const [hours, minutes] = currentTime.split(':').map(Number);
    const newTime = new Date(0, 0, 0, hours, minutes + duration + breakDuration);
    currentTime = `${newTime.getHours().toString().padStart(2, '0')}:${newTime.getMinutes().toString().padStart(2, '0')}`;
    
    // Break if we've reached end of working hours
    if (currentTime >= workingHours.end) break;
  }

  return {
    date: new Date().toISOString().slice(0, 10),
    schedule,
    totalTasks: schedule.length,
    estimatedCompletionTime: currentTime
  };
}

function getOptimalEnergyLevel(time) {
  const hour = parseInt(time.split(':')[0]);
  if (hour >= 9 && hour <= 11) return 'high';
  if (hour >= 14 && hour <= 16) return 'medium';
  return 'low';
}

async function generateAIRecommendations(user) {
  const recommendations = [];
  
  // Analyze user patterns
  const focusStreakDays = user.streaks?.currentFocusStreak || 0;
  const totalFocusTime = user.totalFocusTime || 0;
  const completedTasks = user.totalTasksCompleted || 0;
  
  if (focusStreakDays < 3) {
    recommendations.push({
      type: 'focus',
      title: 'Build Your Focus Habit',
      description: 'Try to complete at least one 25-minute focus session daily to build momentum.',
      priority: 'high',
      actionable: true,
      estimatedImpact: '25% productivity increase'
    });
  }
  
  if (totalFocusTime > 0 && totalFocusTime < 120) { // Less than 2 hours total
    recommendations.push({
      type: 'time_management',
      title: 'Increase Deep Work Time',
      description: 'Aim for 2-4 hours of focused work daily for maximum productivity.',
      priority: 'medium',
      actionable: true,
      estimatedImpact: '40% better task completion'
    });
  }
  
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 9 && hour <= 11) {
    recommendations.push({
      type: 'energy',
      title: 'Peak Energy Window',
      description: 'This is typically a high-energy time. Consider tackling your most challenging tasks now.',
      priority: 'high',
      actionable: true,
      estimatedImpact: '30% faster completion'
    });
  }
  
  if (user.goals?.length === 0) {
    recommendations.push({
      type: 'goal_setting',
      title: 'Set Clear Goals',
      description: 'Users with defined goals are 42% more likely to achieve them. Start with one weekly goal.',
      priority: 'medium',
      actionable: true,
      estimatedImpact: '42% higher achievement rate'
    });
  }

  return recommendations;
}

async function generateProductivityInsights(user) {
  const insights = {};
  
  // Weekly summary
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  
  const thisWeekFocus = user.focusSessions?.filter(session => 
    new Date(session.startTime) >= weekStart
  ) || [];
  
  insights.thisWeek = {
    focusSessions: thisWeekFocus.length,
    totalFocusTime: thisWeekFocus.reduce((sum, session) => sum + (session.duration || 0), 0),
    averageProductivity: thisWeekFocus.length > 0 ? 
      thisWeekFocus.reduce((sum, session) => sum + (session.productivity || 0), 0) / thisWeekFocus.length : 0,
    currentStreak: user.streaks?.currentFocusStreak || 0
  };
  
  // Productivity patterns
  insights.patterns = {
    mostProductiveHours: user.productivityPatterns?.mostProductiveHours || [],
    preferredTaskDuration: user.productivityPatterns?.preferredTaskDuration || 30,
    optimalWorkload: user.productivityPatterns?.optimalWorkload || 8
  };
  
  // Achievement progress
  insights.achievements = {
    level: user.accountLevel || 1,
    experiencePoints: user.experiencePoints || 0,
    nextLevelAt: (Math.floor((user.experiencePoints || 0) / 1000) + 1) * 1000,
    unlockedCount: user.achievements?.length || 0
  };
  
  return insights;
}

module.exports = router;