const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Tool = require('../models/Tool');
const auth = require('../middleware/auth');

// @route   GET /api/tools
// @desc    Get all tools with optional filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { category, status, location, search } = req.query;
    const filter = {};

    // Build filter object
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (location) filter.location = new RegExp(location, 'i');
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { model: new RegExp(search, 'i') }
      ];
    }

    const tools = await Tool.find(filter)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tools.length,
      data: tools
    });
  } catch (error) {
    console.error('Error fetching tools:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tools/:id
// @desc    Get single tool by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email department')
      .populate('createdBy', 'firstName lastName email');

    if (!tool) {
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }

    res.json({ success: true, data: tool });
  } catch (error) {
    console.error('Error fetching tool:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid tool ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/tools
// @desc    Create a new tool
// @access  Private
router.post('/', [
  auth,
  body('name').trim().notEmpty().withMessage('Tool name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').isIn(['Hand Tools', 'Power Tools', 'Measuring Tools', 'Safety Equipment', 'Other'])
    .withMessage('Invalid category'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('serialNumber').optional().trim(),
  body('brand').optional().trim(),
  body('model').optional().trim(),
  body('purchasePrice').optional().isNumeric().withMessage('Purchase price must be a number')
], async (req, res) => {
  try {
    // Check if user has permission to create tools (Manager/Admin only)
    if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only managers and admins can create tools.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const toolData = {
      ...req.body,
      createdBy: req.user.id
    };

    const tool = new Tool(toolData);
    await tool.save();

    await tool.populate('createdBy', 'firstName lastName email');

    // Broadcast real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('tool-created', {
        message: 'New tool added to inventory',
        tool: tool,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Tool created successfully',
      data: tool
    });
  } catch (error) {
    console.error('Error creating tool:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tool with this serial number already exists'
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tools/:id
// @desc    Update a tool
// @access  Private
router.put('/:id', [
  auth,
  body('name').optional().trim().notEmpty().withMessage('Tool name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('category').optional().isIn(['Hand Tools', 'Power Tools', 'Measuring Tools', 'Safety Equipment', 'Other'])
    .withMessage('Invalid category'),
  body('location').optional().trim().notEmpty().withMessage('Location cannot be empty'),
  body('purchasePrice').optional().isNumeric().withMessage('Purchase price must be a number')
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

    const tool = await Tool.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'firstName lastName email')
     .populate('createdBy', 'firstName lastName email');

    if (!tool) {
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }

    res.json({
      success: true,
      message: 'Tool updated successfully',
      data: tool
    });
  } catch (error) {
    console.error('Error updating tool:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid tool ID' });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tool with this serial number already exists'
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/tools/:id
// @desc    Delete a tool
// @access  Private (Admin/Manager only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }

    // Check if user has permission to delete (Admin or Manager)
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins and managers can delete tools.'
      });
    }

    await Tool.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Tool deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tool:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid tool ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tools/:id/assign
// @desc    Assign/unassign a tool to/from a user
// @access  Private
router.put('/:id/assign', [
  auth,
  body('userId').optional().isMongoId().withMessage('Invalid user ID')
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

    const { userId } = req.body;
    const updateData = userId ? 
      { assignedTo: userId, assignedDate: new Date(), status: 'In Use' } :
      { assignedTo: null, assignedDate: null, status: 'Available' };

    const tool = await Tool.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'firstName lastName email department');

    if (!tool) {
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }

    res.json({
      success: true,
      message: userId ? 'Tool assigned successfully' : 'Tool unassigned successfully',
      data: tool
    });
  } catch (error) {
    console.error('Error assigning tool:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
