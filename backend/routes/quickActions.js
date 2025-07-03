const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Tool = require('../models/Tool');
const Maintenance = require('../models/Maintenance');
const ToolRequest = require('../models/ToolRequest');
const auth = require('../middleware/auth');

// @route   POST /api/quick-actions/assign-tool
// @desc    Quick tool assignment
// @access  Private (Manager/Admin only)
router.post('/assign-tool', [
  auth,
  body('employeeId').trim().notEmpty().withMessage('Employee ID is required'),
  body('toolName').trim().notEmpty().withMessage('Tool name is required'),
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

    const { employeeId, toolName, expectedReturnDate } = req.body;

    // Find user by employee ID
    const user = await User.findOne({ employeeId, isActive: true });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Active employee not found with this ID' 
      });
    }

    // Find available tool by name (partial match)
    const tool = await Tool.findOne({ 
      name: new RegExp(toolName, 'i'), 
      status: 'Available' 
    });
    
    if (!tool) {
      return res.status(404).json({ 
        success: false, 
        message: 'Available tool not found with this name' 
      });
    }

    // Assign tool to user
    tool.assignedTo = user._id;
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
      io.emit('quick-tool-assigned', {
        message: `Quick assignment: "${tool.name}" → ${user.firstName} ${user.lastName}`,
        tool: tool,
        user: user,
        assignedBy: req.user,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Tool assigned successfully via quick action',
      data: {
        tool: tool,
        assignedTo: user
      }
    });
  } catch (error) {
    console.error('Error in quick tool assignment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/quick-actions/schedule-maintenance
// @desc    Quick maintenance scheduling
// @access  Private (Manager/Admin only)
router.post('/schedule-maintenance', [
  auth,
  body('toolName').trim().notEmpty().withMessage('Tool name is required'),
  body('maintenanceType').isIn(['preventive', 'corrective', 'emergency', 'inspection'])
    .withMessage('Invalid maintenance type'),
  body('scheduledDate').isISO8601().toDate().withMessage('Scheduled date is required'),
  body('estimatedDuration').isNumeric().withMessage('Estimated duration must be a number')
    .isFloat({ min: 0.5 }).withMessage('Duration must be at least 0.5 hours'),
  body('description').trim().notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    // Check if user has permission (Manager/Admin only)
    if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only managers and admins can schedule maintenance.'
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

    const { toolName, maintenanceType, scheduledDate, estimatedDuration, description, assignTo } = req.body;

    // Find tool by name (partial match)
    const tool = await Tool.findOne({ 
      name: new RegExp(toolName, 'i')
    });
    
    if (!tool) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tool not found with this name' 
      });
    }

    // Create maintenance task
    const maintenanceTask = new Maintenance({
      tool: tool._id,
      maintenanceType,
      scheduledDate,
      estimatedDuration,
      description,
      scheduledBy: req.user.id,
      assignedTo: assignTo || null
    });

    await maintenanceTask.save();
    await maintenanceTask.populate(['tool', 'scheduledBy', 'assignedTo']);

    // Broadcast real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('quick-maintenance-scheduled', {
        message: `Quick maintenance scheduled for "${tool.name}"`,
        maintenance: maintenanceTask,
        scheduledBy: req.user,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Maintenance scheduled successfully via quick action',
      data: maintenanceTask
    });
  } catch (error) {
    console.error('Error in quick maintenance scheduling:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/quick-actions/dashboard-stats
// @desc    Get quick dashboard statistics
// @access  Private
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const stats = await Promise.all([
      // User stats
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      
      // Tool stats
      Tool.countDocuments({ status: 'Available' }),
      Tool.countDocuments({ status: 'In Use' }),
      Tool.countDocuments({ status: 'Maintenance' }),
      Tool.countDocuments({ status: 'Damaged' }),
      
      // Maintenance stats
      Maintenance.countDocuments({ status: 'scheduled' }),
      Maintenance.countDocuments({ status: 'overdue' }),
      Maintenance.countDocuments({ status: 'in-progress' }),
      
      // Tool request stats
      ToolRequest.countDocuments({ status: 'pending' }),
      ToolRequest.countDocuments({ status: 'approved' }),
      
      // Recent activities
      Tool.find({ assignedDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        .populate('assignedTo', 'firstName lastName employeeId')
        .sort({ assignedDate: -1 })
        .limit(5),
      
      // Overdue tools (expected return date passed)
      Tool.find({ 
        expectedReturnDate: { $lt: new Date() },
        status: 'In Use'
      }).populate('assignedTo', 'firstName lastName employeeId')
    ]);

    const quickStats = {
      users: {
        active: stats[0],
        inactive: stats[1],
        total: stats[0] + stats[1]
      },
      tools: {
        available: stats[2],
        inUse: stats[3],
        maintenance: stats[4],
        damaged: stats[5],
        total: stats[2] + stats[3] + stats[4] + stats[5]
      },
      maintenance: {
        scheduled: stats[6],
        overdue: stats[7],
        inProgress: stats[8]
      },
      requests: {
        pending: stats[9],
        approved: stats[10]
      },
      recentAssignments: stats[11],
      overdueTools: stats[12]
    };

    res.json({
      success: true,
      data: quickStats
    });
  } catch (error) {
    console.error('Error fetching quick dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/quick-actions/return-tool
// @desc    Quick tool return
// @access  Private
router.post('/return-tool', [
  auth,
  body('toolName').trim().notEmpty().withMessage('Tool name is required'),
  body('condition').optional().isIn(['Excellent', 'Good', 'Fair', 'Poor'])
    .withMessage('Invalid condition'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const { toolName, condition, notes } = req.body;

    // Find tool by name that is currently in use
    let tool;
    
    // If user is not admin/manager, only allow returning their own tools
    if (req.user.role === 'Employee') {
      tool = await Tool.findOne({ 
        name: new RegExp(toolName, 'i'),
        status: 'In Use',
        assignedTo: req.user.id
      }).populate('assignedTo', 'firstName lastName employeeId');
    } else {
      tool = await Tool.findOne({ 
        name: new RegExp(toolName, 'i'),
        status: 'In Use'
      }).populate('assignedTo', 'firstName lastName employeeId');
    }
    
    if (!tool) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tool not found or not currently in use by you' 
      });
    }

    const previousAssignee = tool.assignedTo;

    // Return the tool
    tool.status = 'Available';
    tool.assignedTo = null;
    tool.assignedDate = null;
    tool.expectedReturnDate = null;
    
    if (condition) {
      tool.condition = condition;
    }
    
    if (notes) {
      tool.notes = tool.notes ? `${tool.notes}\n[Return Notes: ${notes}]` : `[Return Notes: ${notes}]`;
    }

    await tool.save();

    // Broadcast real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('quick-tool-returned', {
        message: `Tool "${tool.name}" returned by ${previousAssignee.firstName} ${previousAssignee.lastName}`,
        tool: tool,
        returnedBy: req.user,
        previousAssignee: previousAssignee,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Tool returned successfully',
      data: tool
    });
  } catch (error) {
    console.error('Error in quick tool return:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/quick-actions/search
// @desc    Quick search across all entities
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    // Search across different entities
    const [users, tools, maintenance] = await Promise.all([
      // Users
      User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { employeeId: searchRegex }
        ]
      }).select('-password').limit(10),

      // Tools
      Tool.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { brand: searchRegex },
          { model: searchRegex },
          { serialNumber: searchRegex }
        ]
      }).populate('assignedTo', 'firstName lastName employeeId').limit(10),

      // Maintenance
      Maintenance.find({
        description: searchRegex
      }).populate('tool', 'name').populate('scheduledBy', 'firstName lastName').limit(10)
    ]);

    const results = {
      users: users.map(user => ({
        id: user._id,
        type: 'user',
        title: `${user.firstName} ${user.lastName}`,
        subtitle: `${user.employeeId} - ${user.role}`,
        data: user
      })),
      tools: tools.map(tool => ({
        id: tool._id,
        type: 'tool',
        title: tool.name,
        subtitle: `${tool.category} - ${tool.status}`,
        data: tool
      })),
      maintenance: maintenance.map(maint => ({
        id: maint._id,
        type: 'maintenance',
        title: `${maint.maintenanceType} maintenance`,
        subtitle: maint.tool ? maint.tool.name : 'Unknown tool',
        data: maint
      }))
    };

    const totalResults = results.users.length + results.tools.length + results.maintenance.length;

    res.json({
      success: true,
      query: q,
      totalResults,
      data: results
    });
  } catch (error) {
    console.error('Error in quick search:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
