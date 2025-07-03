const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tool name is required'],
    trim: true,
    maxlength: [100, 'Tool name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Tool description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Tool category is required'],
    enum: ['Hand Tools', 'Power Tools', 'Measuring Tools', 'Safety Equipment', 'Other'],
    default: 'Other'
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  },
  model: {
    type: String,
    trim: true,
    maxlength: [50, 'Model cannot exceed 50 characters']
  },
  serialNumber: {
    type: String,
    unique: true,
    trim: true,
    maxlength: [50, 'Serial number cannot exceed 50 characters']
  },
  location: {
    type: String,
    required: [true, 'Tool location is required'],
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  status: {
    type: String,
    enum: ['Available', 'In Use', 'Maintenance', 'Damaged', 'Lost'],
    default: 'Available'
  },
  condition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor'],
    default: 'Good'
  },
  purchaseDate: {
    type: Date
  },
  purchasePrice: {
    type: Number,
    min: [0, 'Purchase price cannot be negative']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedDate: {
    type: Date,
    default: null
  },
  lastMaintenanceDate: {
    type: Date
  },
  nextMaintenanceDate: {
    type: Date
  },
  imageUrl: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
toolSchema.index({ name: 1, category: 1 });
toolSchema.index({ serialNumber: 1 });
toolSchema.index({ status: 1 });

module.exports = mongoose.model('Tool', toolSchema);
