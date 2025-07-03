const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  tool: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tool',
    required: true
  },
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  maintenanceType: {
    type: String,
    enum: ['preventive', 'corrective', 'emergency', 'inspection'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  estimatedDuration: {
    type: Number, // in hours
    required: true,
    min: [0.5, 'Duration must be at least 0.5 hours']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'overdue'],
    default: 'scheduled'
  },
  actualStartDate: {
    type: Date,
    default: null
  },
  actualEndDate: {
    type: Date,
    default: null
  },
  actualDuration: {
    type: Number, // in hours
    default: null
  },
  completionNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Completion notes cannot exceed 1000 characters']
  },
  cost: {
    type: Number,
    min: [0, 'Cost cannot be negative'],
    default: 0
  },
  partsUsed: [{
    partName: String,
    quantity: Number,
    cost: Number
  }],
  nextMaintenanceDate: {
    type: Date
  },
  attachments: [{
    filename: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
maintenanceSchema.index({ tool: 1, scheduledDate: 1 });
maintenanceSchema.index({ status: 1, scheduledDate: 1 });
maintenanceSchema.index({ assignedTo: 1, status: 1 });

// Pre-save middleware to check for overdue status
maintenanceSchema.pre('save', function(next) {
  if (this.status === 'scheduled' && this.scheduledDate < new Date()) {
    this.status = 'overdue';
  }
  next();
});

// Virtual for duration variance
maintenanceSchema.virtual('durationVariance').get(function() {
  if (this.actualDuration && this.estimatedDuration) {
    return this.actualDuration - this.estimatedDuration;
  }
  return null;
});

// Ensure virtual fields are serialized
maintenanceSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);
