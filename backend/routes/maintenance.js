const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   POST /api/maintenance
// @desc    Schedule a maintenance task
// @access  Private
router.post('/', [
  auth,
  body('tool').isMongoId().withMessage('Tool ID is required'),
  body('maintenanceType').isIn(['preventive', 'corrective', 'emergency', 'inspection'])
    .withMessage('Invalid maintenance type'),
  body('scheduledDate').isISO8601().toDate().withMessage('Scheduled date is required'),
  body('estimatedDuration').isNumeric().withMessage('Estimated duration must be a number')
    .isFloat({ min: 0.5 }).withMessage('Duration must be at least 0.5 hours'),
  body('description').trim().notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { tool, maintenanceType, scheduledDate, estimatedDuration, description } = req.body;

    const maintenanceTask = new Maintenance({
      tool,
      maintenanceType,
      scheduledDate,
      estimatedDuration,
      description,
      scheduledBy: req.user.id
    });

    await maintenanceTask.save();

    res.status(201).json({
      success: true,
      message: 'Maintenance task scheduled successfully',
      data: maintenanceTask
    });
  } catch (error) {
    console.error('Error scheduling maintenance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/maintenance
// @desc    Get all maintenance tasks
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, maintenanceType, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (maintenanceType) filter.maintenanceType = maintenanceType;

    const maintenanceTasks = await Maintenance.find(filter)
      .populate('tool', 'name category serialNumber')
      .populate('scheduledBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ scheduledDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Maintenance.countDocuments(filter);

    res.json({
      success: true,
      data: maintenanceTasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching maintenance tasks:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/maintenance/:id
// @desc    Get single maintenance task
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id)
      .populate('tool', 'name category serialNumber location')
      .populate('scheduledBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance task not found' });
    }

    res.json({ success: true, data: maintenance });
  } catch (error) {
    console.error('Error fetching maintenance task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/maintenance/:id
// @desc    Update maintenance task
// @access  Private
router.put('/:id', [
  auth,
  body('status').optional().isIn(['scheduled', 'in-progress', 'completed', 'cancelled', 'overdue'])
    .withMessage('Invalid status'),
  body('assignedTo').optional().isMongoId().withMessage('Invalid assigned user ID'),
  body('actualStartDate').optional().isISO8601().toDate(),
  body('actualEndDate').optional().isISO8601().toDate(),
  body('completionNotes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const maintenance = await Maintenance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('tool', 'name category serialNumber')
     .populate('scheduledBy', 'firstName lastName email')
     .populate('assignedTo', 'firstName lastName email');

    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance task not found' });
    }

    // Broadcast real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('maintenance-updated', {
        message: 'Maintenance task updated',
        maintenance: maintenance,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Maintenance task updated successfully',
      data: maintenance
    });
  } catch (error) {
    console.error('Error updating maintenance task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/maintenance/:id
// @desc    Delete maintenance task
// @access  Private (Admin/Manager only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins and managers can delete maintenance tasks.'
      });
    }

    const maintenance = await Maintenance.findByIdAndDelete(req.params.id);

    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance task not found' });
    }

    res.json({
      success: true,
      message: 'Maintenance task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting maintenance task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/maintenance/stats/dashboard
// @desc    Get maintenance statistics
// @access  Private
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const [
      totalMaintenance,
      scheduledMaintenance,
      inProgressMaintenance,
      completedMaintenance,
      overdueMaintenance
    ] = await Promise.all([
      Maintenance.countDocuments(),
      Maintenance.countDocuments({ status: 'scheduled' }),
      Maintenance.countDocuments({ status: 'in-progress' }),
      Maintenance.countDocuments({ status: 'completed' }),
      Maintenance.countDocuments({ status: 'overdue' })
    ]);

    res.json({
      success: true,
      data: {
        total: totalMaintenance,
        scheduled: scheduledMaintenance,
        inProgress: inProgressMaintenance,
        completed: completedMaintenance,
        overdue: overdueMaintenance
      }
    });
  } catch (error) {
    console.error('Error fetching maintenance stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
