const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const ToolRequest = require('../models/ToolRequest');
const Tool = require('../models/Tool');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET /api/tool-requests
// @desc    Get all tool requests with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, requestType, urgency, page = 1, limit = 10 } = req.query;
    const filter = {};

    // For non-admin/manager users, only show their own requests
    if (req.user.role === 'Employee') {
      filter.requestedBy = req.user.id;
    }

    // Build filter object
    if (status) filter.status = status;
    if (requestType) filter.requestType = requestType;
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
          path: 'tool',
          select: 'name category brand model serialNumber'
        },
        {
          path: 'reviewedBy',
          select: 'firstName lastName email'
        }
      ]
    };

    const requests = await ToolRequest.find(filter)
      .populate(options.populate)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const total = await ToolRequest.countDocuments(filter);

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
    console.error('Error fetching tool requests:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tool-requests/:id
// @desc    Get single tool request by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await ToolRequest.findById(req.params.id)
      .populate('requestedBy', 'firstName lastName email department employeeId')
      .populate('tool', 'name category brand model serialNumber location status')
      .populate('reviewedBy', 'firstName lastName email');

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
    console.error('Error fetching tool request:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/tool-requests
// @desc    Create a new tool request
// @access  Private
router.post('/', [
  auth,
  body('tool').isMongoId().withMessage('Valid tool ID is required'),
  body('requestType').isIn(['borrow', 'return', 'maintenance', 'replacement'])
    .withMessage('Valid request type is required'),
  body('reason').trim().notEmpty().withMessage('Reason is required')
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
  body('urgency').optional().isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid urgency level'),
  body('expectedDuration').optional().isInt({ min: 1 })
    .withMessage('Duration must be at least 1 day')
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

    const { tool, requestType, reason, urgency, expectedDuration, metadata } = req.body;

    // Check if tool exists
    const toolExists = await Tool.findById(tool);
    if (!toolExists) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    // Check if user already has a pending request for this tool
    const existingRequest = await ToolRequest.findOne({
      requestedBy: req.user.id,
      tool: tool,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this tool'
      });
    }

    // Get user details for metadata
    const user = await User.findById(req.user.id);

    const requestData = {
      requestedBy: req.user.id,
      tool,
      requestType,
      reason,
      urgency: urgency || 'medium',
      expectedDuration: requestType === 'borrow' ? expectedDuration : undefined,
      metadata: {
        department: user.department,
        ...metadata
      }
    };

    const toolRequest = new ToolRequest(requestData);
    await toolRequest.save();

    await toolRequest.populate([
      { path: 'requestedBy', select: 'firstName lastName email department' },
      { path: 'tool', select: 'name category brand model' }
    ]);

    // Broadcast real-time update via Socket.IO to managers and admins
    const io = req.app.get('io');
    if (io) {
      io.to('Manager').to('Admin').emit('request-created', {
        message: 'New tool request received',
        request: toolRequest,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Tool request created successfully',
      data: toolRequest
    });
  } catch (error) {
    console.error('Error creating tool request:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tool-requests/:id/review
// @desc    Review a tool request (approve/reject)
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

    const request = await ToolRequest.findById(req.params.id)
      .populate('tool')
      .populate('requestedBy');

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

    // If approved and it's a borrow request, update tool status
    if (status === 'approved' && request.requestType === 'borrow') {
      const tool = request.tool;
      if (tool.status !== 'Available') {
        return res.status(400).json({
          success: false,
          message: 'Tool is not available for assignment'
        });
      }

      tool.assignedTo = request.requestedBy._id;
      tool.assignedDate = new Date();
      tool.status = 'In Use';
      await tool.save();
    }

    await request.save();

    await request.populate([
      { path: 'reviewedBy', select: 'firstName lastName email' }
    ]);

    // Broadcast real-time update via Socket.IO to all users
    const io = req.app.get('io');
    if (io) {
      io.emit('request-reviewed', {
        message: `Tool request ${status}`,
        request: request,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: `Request ${status} successfully`,
      data: request
    });
  } catch (error) {
    console.error('Error reviewing tool request:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tool-requests/:id/cancel
// @desc    Cancel a pending request
// @access  Private
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const request = await ToolRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check if user can cancel this request
    if (request.requestedBy.toString() !== req.user.id && req.user.role !== 'Admin') {
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

    res.json({
      success: true,
      message: 'Request cancelled successfully',
      data: request
    });
  } catch (error) {
    console.error('Error cancelling tool request:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tool-requests/stats/dashboard
// @desc    Get request statistics for dashboard
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
      requestsByType,
      requestsByUrgency,
      recentRequests
    ] = await Promise.all([
      ToolRequest.countDocuments(),
      ToolRequest.countDocuments({ status: 'pending' }),
      ToolRequest.countDocuments({ status: 'approved' }),
      ToolRequest.countDocuments({ status: 'rejected' }),
      ToolRequest.aggregate([
        {
          $group: {
            _id: '$requestType',
            count: { $sum: 1 }
          }
        }
      ]),
      ToolRequest.aggregate([
        {
          $group: {
            _id: '$urgency',
            count: { $sum: 1 }
          }
        }
      ]),
      ToolRequest.find({ status: 'pending' })
        .populate('requestedBy', 'firstName lastName')
        .populate('tool', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
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
        requestsByType: requestsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        requestsByUrgency: requestsByUrgency.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentRequests
      }
    });
  } catch (error) {
    console.error('Error fetching request stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
