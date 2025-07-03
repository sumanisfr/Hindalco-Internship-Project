const mongoose = require('mongoose');

const toolRequestSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tool: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tool',
    required: true
  },
  requestType: {
    type: String,
    enum: ['borrow', 'return', 'maintenance', 'replacement'],
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  expectedDuration: {
    type: Number, // in days
    required: function() { return this.requestType === 'borrow'; },
    min: [1, 'Duration must be at least 1 day']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewComments: {
    type: String,
    trim: true,
    maxlength: [500, 'Review comments cannot exceed 500 characters']
  },
  approvedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  attachment: {
    type: String, // URL to uploaded file
    trim: true
  },
  metadata: {
    department: String,
    location: String,
    project: String
  }
}, {
  timestamps: true
});

// Index for better query performance
toolRequestSchema.index({ requestedBy: 1, status: 1 });
toolRequestSchema.index({ status: 1, createdAt: -1 });
toolRequestSchema.index({ tool: 1 });

// Pre-save middleware to update approval timestamp
toolRequestSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  next();
});

// Virtual for request age
toolRequestSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // in days
});

// Ensure virtual fields are serialized
toolRequestSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('ToolRequest', toolRequestSchema);
