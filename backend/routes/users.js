const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Tool = require('../models/Tool');
const auth = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin/Manager only)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user has permission to view users
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins and managers can view users.'
      });
    }

    const { department, role, isActive, search } = req.query;
    const filter = {};

    // Build filter object
    if (department) filter.department = new RegExp(department, 'i');
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { employeeId: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    // Users can view their own profile, admins/managers can view any profile
    if (req.user.id !== req.params.id && req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get tools assigned to this user
    const assignedTools = await Tool.find({ assignedTo: req.params.id })
      .select('name category status assignedDate');

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        assignedTools
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', [
  auth,
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('department').optional().trim(),
  body('phone').optional().trim(),
  body('role').optional().isIn(['Admin', 'Manager', 'Employee']).withMessage('Invalid role')
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

    // Users can update their own profile, admins can update any profile
    if (req.user.id !== req.params.id && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    // If updating role, only admins can do that
    if (req.body.role && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can change user roles.'
      });
    }

    const updateData = { ...req.body };
    delete updateData.password; // Password changes handled separately

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Deactivate user (soft delete)
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Only admins can deactivate users
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can deactivate users.'
      });
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Deactivate user instead of deleting
    user.isActive = false;
    await user.save();

    // Unassign all tools from this user
    await Tool.updateMany(
      { assignedTo: req.params.id },
      {
        $unset: { assignedTo: 1, assignedDate: 1 },
        status: 'Available'
      }
    );

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/users/:id/activate
// @desc    Activate user
// @access  Private (Admin only)
router.put('/:id/activate', auth, async (req, res) => {
  try {
    // Only admins can activate users
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can activate users.'
      });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = true;
    await user.save();

    res.json({
      success: true,
      message: 'User activated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error activating user:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/:id/tools
// @desc    Get tools assigned to a user
// @access  Private
router.get('/:id/tools', auth, async (req, res) => {
  try {
    // Users can view their own tools, admins/managers can view any user's tools
    if (req.user.id !== req.params.id && req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    const tools = await Tool.find({ assignedTo: req.params.id })
      .populate('createdBy', 'firstName lastName email')
      .sort({ assignedDate: -1 });

    res.json({
      success: true,
      count: tools.length,
      data: tools
    });
  } catch (error) {
    console.error('Error fetching user tools:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/stats/dashboard
// @desc    Get dashboard statistics
// @access  Private (Admin/Manager only)
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    // Check if user has permission to view stats
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins and managers can view statistics.'
      });
    }

    const [
      totalUsers,
      activeUsers,
      totalTools,
      availableTools,
      toolsInUse,
      toolsByCategory
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Tool.countDocuments(),
      Tool.countDocuments({ status: 'Available' }),
      Tool.countDocuments({ status: 'In Use' }),
      Tool.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        tools: {
          total: totalTools,
          available: availableTools,
          inUse: toolsInUse,
          maintenance: await Tool.countDocuments({ status: 'Maintenance' }),
          damaged: await Tool.countDocuments({ status: 'Damaged' })
        },
        toolsByCategory: toolsByCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
