const express = require('express');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

const router = express.Router();

// Create Task
router.post('/', auth, async (req, res) => {
  try {
    const { name, timeEstimate, dependency, priority, onHoldReason, steps, date } = req.body;
    
    // Calculate progress percentage
    let progressPercentage = 0;
    if (Array.isArray(steps) && steps.length > 0) {
      const completedSteps = steps.filter(s => s.status === 'Completed').length;
      progressPercentage = Math.round((completedSteps / steps.length) * 100);
    }
    
    // Prepare task data
    const taskData = {
      user: req.user.userId,
      name,
      timeEstimate,
      dependency,
      priority,
      onHoldReason,
      date: date || new Date().toISOString().slice(0, 10), // Use provided date or default to today
      steps: Array.isArray(steps) ? steps : [],
      progressPercentage,
      moveCount: 0,
    };
    
    // Set initial status based on steps
    if (Array.isArray(steps) && steps.length > 0) {
      const completedSteps = steps.filter(s => s.status === 'Completed').length;
      if (completedSteps === steps.length) {
        taskData.status = 'Completed';
      } else if (completedSteps > 0) {
        taskData.status = 'In Progress';
      }
    }
    
    const task = new Task(taskData);
    await task.save();
    
    res.status(201).json(task);
  } catch (err) {
    console.error('Error creating task:', err);
    console.error('Error details:', err.message);
    if (err.errors) {
      console.error('Validation errors:', err.errors);
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk Create Tasks
router.post('/bulk', auth, async (req, res) => {
  try {
    const { tasks, rawText, defaultTimeEstimate = 30, defaultPriority = 'Medium', defaultDate } = req.body;
    
    let tasksToCreate = [];
    
    // If raw text is provided, parse it into tasks
    if (rawText && rawText.trim()) {
      const lines = rawText.split('\n').filter(line => line.trim());
      tasksToCreate = lines.map(line => {
        const trimmedLine = line.trim();
        // Try to extract time estimate from the line (e.g., "Task name (30min)" or "Task name - 30")
        const timeMatch = trimmedLine.match(/\((\d+)\s*(?:min|minutes?|h|hours?)\)|-\s*(\d+)\s*(?:min|minutes?|h|hours?)$/i);
        let timeEstimate = defaultTimeEstimate;
        let taskName = trimmedLine;
        
        if (timeMatch) {
          const timeValue = parseInt(timeMatch[1] || timeMatch[2]);
          if (timeValue) {
            timeEstimate = timeValue;
            // Remove the time part from the task name
            taskName = trimmedLine.replace(/\((\d+)\s*(?:min|minutes?|h|hours?)\)|-\s*(\d+)\s*(?:min|minutes?|h|hours?)$/i, '').trim();
          }
        }
        
        // Try to extract priority from the line (e.g., "[HIGH]", "[LOW]", "[MEDIUM]")
        const priorityMatch = taskName.match(/\[(HIGH|MEDIUM|LOW)\]/i);
        let priority = defaultPriority;
        
        if (priorityMatch) {
          priority = priorityMatch[1].toUpperCase();
          // Remove the priority part from the task name
          taskName = taskName.replace(/\[(HIGH|MEDIUM|LOW)\]/i, '').trim();
        }
        
        return {
          name: taskName,
          timeEstimate,
          priority,
          status: 'Pending',
          date: defaultDate || new Date().toISOString().slice(0, 10),
          steps: [],
          progressPercentage: 0,
          moveCount: 0,
        };
      });
    } else if (Array.isArray(tasks)) {
      // If tasks array is provided, use it directly
      tasksToCreate = tasks.map(task => ({
        name: task.name,
        timeEstimate: task.timeEstimate || defaultTimeEstimate,
        priority: task.priority || defaultPriority,
        status: task.status || 'Pending',
        dependency: task.dependency || '',
        onHoldReason: task.onHoldReason || '',
        date: task.date || defaultDate || new Date().toISOString().slice(0, 10),
        steps: Array.isArray(task.steps) ? task.steps : [],
        progressPercentage: 0,
        moveCount: 0,
      }));
    } else {
      return res.status(400).json({ message: 'Either tasks array or rawText must be provided' });
    }
    
    // Validate that we have tasks to create
    if (tasksToCreate.length === 0) {
      return res.status(400).json({ message: 'No valid tasks to create' });
    }
    
    // Add user ID to all tasks
    const tasksWithUser = tasksToCreate.map(task => ({
      ...task,
      user: req.user.userId,
    }));
    
    // Create all tasks
    const createdTasks = await Task.insertMany(tasksWithUser);
    
    res.status(201).json({
      message: `Successfully created ${createdTasks.length} tasks`,
      tasks: createdTasks,
      count: createdTasks.length
    });
  } catch (err) {
    console.error('Error creating bulk tasks:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tasks for user
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.userId });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, timeEstimate, dependency, priority, status, onHoldReason, date } = req.body;
    
    // Get current task to check if date is being changed
    const currentTask = await Task.findOne({ _id: req.params.id, user: req.user.userId });
    if (!currentTask) return res.status(404).json({ message: 'Task not found' });
    
    // Check if date is being changed (task is being moved)
    let moveCount = currentTask.moveCount;
    if (date && date !== currentTask.date) {
      moveCount += 1;
    }
    
    // Calculate progress percentage based on steps
    let progressPercentage = 0;
    if (currentTask.steps && currentTask.steps.length > 0) {
      const completedSteps = currentTask.steps.filter(s => s.status === 'Completed').length;
      progressPercentage = Math.round((completedSteps / currentTask.steps.length) * 100);
    }
    
    // If status is being set to 'Completed', mark all steps as completed
    let updateData = { 
      name, 
      timeEstimate, 
      dependency, 
      priority, 
      status, 
      onHoldReason,
      date,
      progressPercentage,
      moveCount
    };
    
    if (status === 'Completed') {
      // Mark all steps as completed
      if (currentTask.steps && currentTask.steps.length > 0) {
        const updatedSteps = currentTask.steps.map(step => ({
          ...step.toObject(),
          status: 'Completed',
          timestamp: new Date()
        }));
        updateData.steps = updatedSteps;
        updateData.progressPercentage = 100;
      }
    } else if (status === 'Pending' || status === 'In Progress') {
      // Recalculate status based on actual step completion
      if (currentTask.steps && currentTask.steps.length > 0) {
        const completedSteps = currentTask.steps.filter(s => s.status === 'Completed').length;
        const totalSteps = currentTask.steps.length;
        
        if (completedSteps === 0) {
          updateData.status = 'Pending';
        } else if (completedSteps === totalSteps) {
          updateData.status = 'Completed';
        } else {
          updateData.status = 'In Progress';
        }
      }
    }
    
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      updateData,
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a step to a task
router.post('/:id/steps', auth, async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ message: 'Step description required' });
    const task = await Task.findOne({ _id: req.params.id, user: req.user.userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    task.steps.push({ description });
    
    // Update task status to 'In Progress' when first step is added
    if (task.steps.length === 1) {
      task.status = 'In Progress';
    }
    
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a step (description or status)
router.put('/:id/steps/:stepIdx', auth, async (req, res) => {
  try {
    const { description, status } = req.body;
    const task = await Task.findOne({ _id: req.params.id, user: req.user.userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const step = task.steps[req.params.stepIdx];
    if (!step) return res.status(404).json({ message: 'Step not found' });
    if (description !== undefined) step.description = description;
    if (status !== undefined) {
      step.status = status;
      step.timestamp = status === 'Completed' ? new Date() : null;
    }
    
    // Auto-update task status based on step completion
    if (task.steps && task.steps.length > 0) {
      const completedSteps = task.steps.filter(s => s.status === 'Completed').length;
      const totalSteps = task.steps.length;
      
      // Calculate progress percentage
      const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
      
      if (completedSteps === 0) {
        task.status = 'Pending';
      } else if (completedSteps === totalSteps) {
        task.status = 'Completed';
      } else {
        task.status = 'In Progress';
      }
      
      // Update progress percentage
      task.progressPercentage = progressPercentage;
    }
    
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a step
router.delete('/:id/steps/:stepIdx', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!task.steps[req.params.stepIdx]) return res.status(404).json({ message: 'Step not found' });
    task.steps.splice(req.params.stepIdx, 1);
    
    // Auto-update task status based on remaining steps
    if (task.steps && task.steps.length > 0) {
      const completedSteps = task.steps.filter(s => s.status === 'Completed').length;
      const totalSteps = task.steps.length;
      
      if (completedSteps === 0) {
        task.status = 'Pending';
      } else if (completedSteps === totalSteps) {
        task.status = 'Completed';
      } else {
        task.status = 'In Progress';
      }
    } else {
      task.status = 'Pending';
    }
    
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 