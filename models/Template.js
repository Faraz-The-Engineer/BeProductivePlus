const mongoose = require('mongoose');

const templateStepSchema = new mongoose.Schema({
  description: { type: String, required: true },
}, { _id: false });

const templateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: 'General' },
  timeEstimate: { type: Number, required: true }, // in minutes
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  steps: [templateStepSchema],
  isPublic: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0 },
  tags: [{ type: String }],
}, { timestamps: true });

// Index for better search performance
templateSchema.index({ user: 1, name: 1 });
templateSchema.index({ category: 1, isPublic: 1 });
templateSchema.index({ tags: 1 });

module.exports = mongoose.model('Template', templateSchema);