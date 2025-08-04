const express = require('express');
const Template = require('../models/Template');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all templates for user (including public ones)
router.get('/', auth, async (req, res) => {
  try {
    const { category, tags, search } = req.query;
    let query = {
      $or: [
        { user: req.user.userId },
        { isPublic: true }
      ]
    };

    // Add category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Add tags filter
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Add search filter
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const templates = await Template.find(query)
      .populate('user', 'name email')
      .sort({ usageCount: -1, createdAt: -1 });

    res.json(templates);
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get template by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      $or: [
        { user: req.user.userId },
        { isPublic: true }
      ]
    }).populate('user', 'name email');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(template);
  } catch (err) {
    console.error('Error fetching template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new template
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, category, timeEstimate, priority, steps, isPublic, tags } = req.body;

    const template = new Template({
      user: req.user.userId,
      name,
      description,
      category: category || 'General',
      timeEstimate,
      priority: priority || 'Medium',
      steps: steps || [],
      isPublic: isPublic || false,
      tags: tags || [],
    });

    await template.save();
    await template.populate('user', 'name email');
    
    res.status(201).json(template);
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update template
router.put('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found or unauthorized' });
    }

    const { name, description, category, timeEstimate, priority, steps, isPublic, tags } = req.body;

    template.name = name !== undefined ? name : template.name;
    template.description = description !== undefined ? description : template.description;
    template.category = category !== undefined ? category : template.category;
    template.timeEstimate = timeEstimate !== undefined ? timeEstimate : template.timeEstimate;
    template.priority = priority !== undefined ? priority : template.priority;
    template.steps = steps !== undefined ? steps : template.steps;
    template.isPublic = isPublic !== undefined ? isPublic : template.isPublic;
    template.tags = tags !== undefined ? tags : template.tags;

    await template.save();
    await template.populate('user', 'name email');

    res.json(template);
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete template
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found or unauthorized' });
    }

    await Template.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Use template (increment usage count)
router.post('/:id/use', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      $or: [
        { user: req.user.userId },
        { isPublic: true }
      ]
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Increment usage count
    template.usageCount += 1;
    await template.save();

    // Return template data for task creation
    res.json({
      name: template.name,
      timeEstimate: template.timeEstimate,
      priority: template.priority,
      steps: template.steps.map(step => ({
        description: step.description,
        status: 'Pending'
      }))
    });
  } catch (err) {
    console.error('Error using template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get template categories
router.get('/categories/list', auth, async (req, res) => {
  try {
    const categories = await Template.distinct('category', {
      $or: [
        { user: req.user.userId },
        { isPublic: true }
      ]
    });

    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get popular templates
router.get('/popular/list', auth, async (req, res) => {
  try {
    const templates = await Template.find({
      $or: [
        { user: req.user.userId },
        { isPublic: true }
      ]
    })
    .populate('user', 'name email')
    .sort({ usageCount: -1 })
    .limit(10);

    res.json(templates);
  } catch (err) {
    console.error('Error fetching popular templates:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;