const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Tool = require('../models/Tool');
const Maintenance = require('../models/Maintenance');
const ToolRequest = require('../models/ToolRequest');
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

// @route   POST /api/users
// @desc    Create a new user
// @access  Private (Admin only)
router.post('/', [
  auth,
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['Admin', 'Manager', 'Employee']).withMessage('Invalid role'),
  body('department').optional().trim(),
  body('employeeId').optional().trim(),
  body('phone').optional().trim()
], async (req, res) => {
  try {
    // Only admins can create users
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can create users.'
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

    const { firstName, lastName, email, password, role, department, employeeId, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate employee ID if not provided
    let finalEmployeeId = employeeId;
    if (!finalEmployeeId) {
      const lastUser = await User.findOne().sort({ createdAt: -1 });
      const lastIdNumber = lastUser && lastUser.employeeId ? 
        parseInt(lastUser.employeeId.replace(/\D/g, '')) || 0 : 0;
      finalEmployeeId = `U${String(lastIdNumber + 1).padStart(3, '0')}`;
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role,
      department,
      employeeId: finalEmployeeId,
      phone
    });

    await user.save();

    // Broadcast real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('user-created', {
        message: `New ${role.toLowerCase()} created: ${firstName} ${lastName}`,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          department: user.department
        },
        timestamp: new Date()
      });
    }

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
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

// @route   DELETE /api/users/:id/permanent
// @desc    Permanently delete user
// @access  Private (Admin only)
router.delete('/:id/permanent', auth, async (req, res) => {
  try {
    // Only admins can permanently delete users
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can permanently delete users.'
      });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Unassign all tools from this user
    await Tool.updateMany(
      { assignedTo: req.params.id },
      {
        $unset: { assignedTo: 1, assignedDate: 1 },
        status: 'Available'
      }
    );

    await User.findByIdAndDelete(req.params.id);

    // Broadcast real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('user-deleted', {
        message: `User ${user.employeeId} deleted`,
        userId: req.params.id,
        userName: `${user.firstName} ${user.lastName}`,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'User permanently deleted successfully'
    });
  } catch (error) {
    console.error('Error permanently deleting user:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/users/assign-tool
// @desc    Assign tool to employee
// @access  Private (Manager/Admin only)
router.post('/assign-tool', [
  auth,
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('toolId').isMongoId().withMessage('Invalid tool ID'),
  body('expectedReturnDate').optional().isISO8601().toDate().withMessage('Invalid return date')
], async (req, res) => {
  try {
    // Check if user has permission (Manager/Admin only)
    if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only managers and admins can assign tools.'
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

    const { userId, toolId, expectedReturnDate } = req.body;

    // Check if user exists and is active
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot assign tool to inactive user' });
    }

    // Check if tool exists and is available
    const tool = await Tool.findById(toolId);
    if (!tool) {
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }
    if (tool.status !== 'Available') {
      return res.status(400).json({ success: false, message: 'Tool is not available for assignment' });
    }

    // Assign tool to user
    tool.assignedTo = userId;
    tool.assignedDate = new Date();
    tool.status = 'In Use';
    if (expectedReturnDate) {
      tool.expectedReturnDate = expectedReturnDate;
    }
    await tool.save();

    await tool.populate('assignedTo', 'firstName lastName email employeeId department');

    // Broadcast real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('tool-assigned', {
        message: `Tool "${tool.name}" assigned to ${user.firstName} ${user.lastName}`,
        tool: tool,
        user: user,
        assignedBy: req.user,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Tool assigned successfully',
      data: {
        tool: tool,
        assignedTo: user
      }
    });
  } catch (error) {
    console.error('Error assigning tool:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/users/export
// @desc    Export user data
// @access  Private (Admin/Manager only)
router.post('/export', auth, async (req, res) => {
  try {
    // Check if user has permission (Admin/Manager only)
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins and managers can export data.'
      });
    }

    const { format = 'json', filters = {} } = req.body;

    // Build filter query
    const query = {};
    if (filters.role) query.role = filters.role;
    if (filters.department) query.department = new RegExp(filters.department, 'i');
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const users = await User.find(query)
      .select('-password')
      .populate('assignedTools', 'name category status assignedDate')
      .sort({ createdAt: -1 });

    // Add assigned tools count
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const assignedToolsCount = await Tool.countDocuments({ assignedTo: user._id });
        return {
          ...user.toJSON(),
          assignedToolsCount
        };
      })
    );

    const exportData = {
      exportedAt: new Date(),
      exportedBy: {
        id: req.user.id,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email
      },
      totalUsers: usersWithStats.length,
      filters: filters,
      data: usersWithStats
    };

    // Set appropriate headers based on format
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=users-export-${Date.now()}.csv`);
      
      // Convert to CSV format
      const csvHeaders = ['Employee ID', 'First Name', 'Last Name', 'Email', 'Role', 'Department', 'Phone', 'Active', 'Assigned Tools', 'Created At'];
      const csvRows = usersWithStats.map(user => [
        user.employeeId || '',
        user.firstName || '',
        user.lastName || '',
        user.email || '',
        user.role || '',
        user.department || '',
        user.phone || '',
        user.isActive ? 'Yes' : 'No',
        user.assignedToolsCount || 0,
        user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      res.send(csvContent);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=users-export-${Date.now()}.json`);
      res.json(exportData);
    }
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/users/backup
// @desc    Create system backup
// @access  Private (Admin only)
router.post('/backup', auth, async (req, res) => {
  try {
    // Only admins can create backups
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can create system backups.'
      });
    }

    const backupData = {
      timestamp: new Date(),
      createdBy: {
        id: req.user.id,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email
      },
      users: await User.find({}).select('-password'),
      tools: await Tool.find({}).populate('assignedTo', 'firstName lastName employeeId'),
      maintenance: await Maintenance.find({}).populate('tool scheduledBy assignedTo'),
      toolRequests: await ToolRequest.find({}).populate('requestedBy tool reviewedBy')
    };

    const backupStats = {
      totalUsers: backupData.users.length,
      totalTools: backupData.tools.length,
      totalMaintenance: backupData.maintenance.length,
      totalToolRequests: backupData.toolRequests.length
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=system-backup-${Date.now()}.json`);

    // Broadcast real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('system-backup-created', {
        message: 'System backup created successfully',
        createdBy: req.user.firstName + ' ' + req.user.lastName,
        stats: backupStats,
        timestamp: new Date()
      });
    }

    res.json({
      ...backupData,
      stats: backupStats
    });
  } catch (error) {
    console.error('Error creating system backup:', error);
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
