const mongoose = require('mongoose');

const toolAdditionRequestSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toolData: {
    name: {
      type: String,
      required: [true, 'Tool name is required'],
      trim: true,
      maxlength: [100, 'Tool name cannot exceed 100 characters']
    },
    category: {
      type: String,
      required: [true, 'Tool category is required'],
      enum: ['Hand Tools', 'Power Tools', 'Measuring Tools', 'Safety Equipment', 'Other'],
      default: 'Other'
    },
    location: {
      type: String,
      required: [true, 'Tool location is required'],
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters']
    }
  },
  reason: {
    type: String,
    required: [true, 'Reason for tool addition is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  expectedReturnDate: {
    type: Date
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
  createdToolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tool',
    default: null
  },
  metadata: {
    department: String
  }
}, {
  timestamps: true
});

// Index for better query performance
toolAdditionRequestSchema.index({ requestedBy: 1, status: 1 });
toolAdditionRequestSchema.index({ status: 1, createdAt: -1 });
toolAdditionRequestSchema.index({ urgency: 1, createdAt: -1 });

// Pre-save middleware to update approval timestamp
toolAdditionRequestSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  next();
});

// Virtual for request age in days
toolAdditionRequestSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for formatted tool name
toolAdditionRequestSchema.virtual('formattedToolName').get(function() {
  return this.toolData.name || 'Unknown Tool';
});

// Ensure virtual fields are serialized
toolAdditionRequestSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('ToolAdditionRequest', toolAdditionRequestSchema);
