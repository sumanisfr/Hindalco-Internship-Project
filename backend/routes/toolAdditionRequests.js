const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const ToolAdditionRequest = require('../models/ToolAdditionRequest');
const Tool = require('../models/Tool');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET /api/tool-addition-requests
// @desc    Get all tool addition requests with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, urgency, page = 1, limit = 10 } = req.query;
    const filter = {};

    // For non-admin/manager users, only show their own requests
    if (req.user.role === 'Employee') {
      filter.requestedBy = req.user.id;
    }

    // Build filter object
    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        {
          path: 'requestedBy',
          select: 'firstName lastName email department employeeId'
        },
        {
          path: 'reviewedBy',
          select: 'firstName lastName email'
        },
        {
          path: 'createdToolId',
          select: 'name serialNumber'
        }
      ]
    };

    const requests = await ToolAdditionRequest.find(filter)
      .populate(options.populate)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const total = await ToolAdditionRequest.countDocuments(filter);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tool addition requests:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tool-addition-requests/:id
// @desc    Get single tool addition request by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await ToolAdditionRequest.findById(req.params.id)
      .populate('requestedBy', 'firstName lastName email department employeeId')
      .populate('reviewedBy', 'firstName lastName email')
      .populate('createdToolId', 'name serialNumber category status');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check if user has permission to view this request
    if (req.user.role === 'Employee' && request.requestedBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own requests.'
      });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    console.error('Error fetching tool addition request:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/tool-addition-requests
// @desc    Create a new tool addition request
// @access  Private
router.post('/', [
  auth,
  body('toolData.name').trim().notEmpty().withMessage('Tool name is required'),
  body('toolData.category').isIn(['Hand Tools', 'Power Tools', 'Measuring Tools', 'Safety Equipment', 'Other'])
    .withMessage('Valid tool category is required'),
  body('toolData.location').trim().notEmpty().withMessage('Tool location is required'),
  body('reason').trim().notEmpty().withMessage('Reason for tool addition is required')
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
  body('urgency').optional().isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid urgency level'),
  body('expectedReturnDate').optional().isISO8601().withMessage('Expected return date must be a valid date')
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

    const {
      toolData,
      reason,
      urgency,
      expectedReturnDate
    } = req.body;

    // Get user details for metadata
    const user = await User.findById(req.user.id);

    // Check for duplicate tool requests (same name, category)
    const existingRequest = await ToolAdditionRequest.findOne({
      requestedBy: req.user.id,
      'toolData.name': toolData.name,
      'toolData.category': toolData.category,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending or approved request for a similar tool'
      });
    }

    const requestData = {
      requestedBy: req.user.id,
      toolData,
      reason,
      urgency: urgency || 'medium',
      expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : undefined,
      metadata: {
        department: user.department
      }
    };

    const toolAdditionRequest = new ToolAdditionRequest(requestData);
    await toolAdditionRequest.save();

    await toolAdditionRequest.populate([
      { path: 'requestedBy', select: 'firstName lastName email department' }
    ]);

    // Broadcast real-time update via Socket.IO to managers and admins
    const io = req.app.get('io');
    if (io) {
      io.to('Manager').to('Admin').emit('tool-addition-request-created', {
        message: 'New tool addition request received',
        request: toolAdditionRequest,
        timestamp: new Date(),
        type: 'tool_addition_request'
      });

      // Also send notification to all connected clients for real-time updates
      io.emit('notification', {
        title: 'New Tool Addition Request',
        message: `${user.firstName} ${user.lastName} requested to add ${toolData.name}`,
        type: 'info',
        timestamp: new Date(),
        data: {
          requestId: toolAdditionRequest._id,
          toolName: toolData.name,
          requester: `${user.firstName} ${user.lastName}`,
          urgency: urgency || 'medium'
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Tool addition request created successfully',
      data: toolAdditionRequest
    });
  } catch (error) {
    console.error('Error creating tool addition request:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tool-addition-requests/:id/review
// @desc    Review a tool addition request (approve/reject)
// @access  Private (Manager/Admin only)
router.put('/:id/review', [
  auth,
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('reviewComments').optional().trim().isLength({ max: 500 })
    .withMessage('Review comments cannot exceed 500 characters')
], async (req, res) => {
  try {
    // Check if user has permission to review requests
    if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only managers and admins can review requests.'
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

    const { status, reviewComments } = req.body;

    const request = await ToolAdditionRequest.findById(req.params.id)
      .populate('requestedBy', 'firstName lastName email department');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request has already been reviewed'
      });
    }

    // Update request status
    request.status = status;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.reviewComments = reviewComments;

    let createdTool = null;

    // If approved, create the actual tool in the inventory
    if (status === 'approved') {
      try {
        const toolData = {
          ...request.toolData,
          createdBy: req.user.id,
          status: 'Available'
        };

        // Generate a serial number if not provided
        if (!toolData.serialNumber || toolData.serialNumber.trim() === '') {
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          toolData.serialNumber = `${toolData.category.replace(/\s+/g, '').substring(0, 3).toUpperCase()}-${timestamp}-${random}`;
        }

        createdTool = new Tool(toolData);
        await createdTool.save();

        // Link the created tool to the request
        request.createdToolId = createdTool._id;

        console.log('Tool created successfully:', createdTool.name);
      } catch (toolError) {
        console.error('Error creating tool:', toolError);
        
        // Handle duplicate serial number error
        if (toolError.code === 11000) {
          return res.status(400).json({
            success: false,
            message: 'Tool with this serial number already exists. Please update the serial number.'
          });
        }
        
        return res.status(500).json({
          success: false,
          message: 'Request approved but failed to create tool in inventory. Please create manually.'
        });
      }
    }

    await request.save();

    await request.populate([
      { path: 'reviewedBy', select: 'firstName lastName email' }
    ]);

    // Broadcast real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Notify the requester specifically
      io.emit('tool-addition-request-reviewed', {
        message: `Tool addition request ${status}`,
        request: request,
        timestamp: new Date(),
        type: 'tool_addition_review',
        targetUserId: request.requestedBy._id.toString()
      });

      // Send notification to requester
      io.emit('notification', {
        title: `Tool Addition Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Your request for ${request.toolData.name} has been ${status}`,
        type: status === 'approved' ? 'success' : 'warning',
        timestamp: new Date(),
        targetUserId: request.requestedBy._id.toString(),
        data: {
          requestId: request._id,
          toolName: request.toolData.name,
          status: status,
          reviewComments: reviewComments,
          createdToolId: createdTool?._id
        }
      });

      // If tool was created, notify about new tool in inventory
      if (createdTool) {
        io.emit('tool-created', {
          message: 'New tool added to inventory',
          tool: createdTool,
          timestamp: new Date(),
          type: 'tool_created'
        });
      }
    }

    res.json({
      success: true,
      message: `Request ${status} successfully${createdTool ? ' and tool added to inventory' : ''}`,
      data: {
        request: request,
        createdTool: createdTool
      }
    });
  } catch (error) {
    console.error('Error reviewing tool addition request:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tool-addition-requests/:id/cancel
// @desc    Cancel a pending tool addition request
// @access  Private
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const request = await ToolAdditionRequest.findById(req.params.id)
      .populate('requestedBy', 'firstName lastName email');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check if user can cancel this request
    if (request.requestedBy._id.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only cancel your own requests.'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be cancelled'
      });
    }

    request.status = 'cancelled';
    await request.save();

    // Broadcast real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('Manager').to('Admin').emit('tool-addition-request-cancelled', {
        message: 'Tool addition request cancelled',
        request: request,
        timestamp: new Date(),
        type: 'tool_addition_cancel'
      });
    }

    res.json({
      success: true,
      message: 'Request cancelled successfully',
      data: request
    });
  } catch (error) {
    console.error('Error cancelling tool addition request:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tool-addition-requests/stats/dashboard
// @desc    Get tool addition request statistics for dashboard
// @access  Private (Manager/Admin only)
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
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      requestsByUrgency,
      requestsByCategory,
      recentRequests,
      requestsByMonth
    ] = await Promise.all([
      ToolAdditionRequest.countDocuments(),
      ToolAdditionRequest.countDocuments({ status: 'pending' }),
      ToolAdditionRequest.countDocuments({ status: 'approved' }),
      ToolAdditionRequest.countDocuments({ status: 'rejected' }),
      ToolAdditionRequest.aggregate([
        {
          $group: {
            _id: '$urgency',
            count: { $sum: 1 }
          }
        }
      ]),
      ToolAdditionRequest.aggregate([
        {
          $group: {
            _id: '$toolData.category',
            count: { $sum: 1 }
          }
        }
      ]),
      ToolAdditionRequest.find({ status: 'pending' })
        .populate('requestedBy', 'firstName lastName department')
        .sort({ createdAt: -1 })
        .limit(5),
      ToolAdditionRequest.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 6 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          total: totalRequests,
          pending: pendingRequests,
          approved: approvedRequests,
          rejected: rejectedRequests
        },
        requestsByUrgency: requestsByUrgency.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        requestsByCategory: requestsByCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentRequests,
        requestsByMonth
      }
    });
  } catch (error) {
    console.error('Error fetching tool addition request stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


module.exports = router;
