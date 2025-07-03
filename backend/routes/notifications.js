const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET /api/notifications/test
// @desc    Test real-time notifications
// @access  Private
router.get('/test', auth, async (req, res) => {
  try {
    // Broadcast test notification via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('test-notification', {
        message: 'Test notification from backend',
        user: req.user.firstName + ' ' + req.user.lastName,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Test notification sent'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/notifications/broadcast
// @desc    Broadcast custom notification
// @access  Private (Admin/Manager only)
router.post('/broadcast', auth, async (req, res) => {
  try {
    // Check if user has permission (Admin/Manager only)
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins and managers can broadcast notifications.'
      });
    }

    const { message, type = 'info', targetRoles = ['All'] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Broadcast notification via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const notificationData = {
        id: Date.now(),
        message: message.trim(),
        type: type, // info, warning, error, success
        from: {
          name: req.user.firstName + ' ' + req.user.lastName,
          role: req.user.role
        },
        targetRoles: targetRoles,
        timestamp: new Date()
      };

      if (targetRoles.includes('All')) {
        io.emit('custom-notification', notificationData);
      } else {
        targetRoles.forEach(role => {
          io.to(role).emit('custom-notification', notificationData);
        });
      }
    }

    res.json({
      success: true,
      message: 'Notification broadcasted successfully'
    });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/notifications/system-status
// @desc    Get system status for dashboard
// @access  Private
router.get('/system-status', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const Tool = require('../models/Tool');
    const Maintenance = require('../models/Maintenance');
    const ToolRequest = require('../models/ToolRequest');

    // Get real-time system status
    const [
      totalUsers,
      activeUsers,
      totalTools,
      availableTools,
      toolsInUse,
      maintenanceTools,
      damagedTools,
      pendingRequests,
      overdueMaintenances,
      overdueTools
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Tool.countDocuments(),
      Tool.countDocuments({ status: 'Available' }),
      Tool.countDocuments({ status: 'In Use' }),
      Tool.countDocuments({ status: 'Maintenance' }),
      Tool.countDocuments({ status: 'Damaged' }),
      ToolRequest.countDocuments({ status: 'pending' }),
      Maintenance.countDocuments({ status: 'overdue' }),
      Tool.countDocuments({ 
        expectedReturnDate: { $lt: new Date() },
        status: 'In Use'
      })
    ]);

    const systemStatus = {
      timestamp: new Date(),
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers
      },
      tools: {
        total: totalTools,
        available: availableTools,
        inUse: toolsInUse,
        maintenance: maintenanceTools,
        damaged: damagedTools,
        overdue: overdueTools
      },
      requests: {
        pending: pendingRequests
      },
      maintenance: {
        overdue: overdueMaintenances
      },
      alerts: []
    };

    // Add system alerts based on conditions
    if (damagedTools > 0) {
      systemStatus.alerts.push({
        type: 'warning',
        message: `${damagedTools} tool(s) are damaged and need attention`,
        count: damagedTools
      });
    }

    if (overdueMaintenances > 0) {
      systemStatus.alerts.push({
        type: 'error',
        message: `${overdueMaintenances} maintenance task(s) are overdue`,
        count: overdueMaintenances
      });
    }

    if (overdueTools > 0) {
      systemStatus.alerts.push({
        type: 'warning',
        message: `${overdueTools} tool(s) are overdue for return`,
        count: overdueTools
      });
    }

    if (pendingRequests > 5) {
      systemStatus.alerts.push({
        type: 'info',
        message: `${pendingRequests} tool requests are pending approval`,
        count: pendingRequests
      });
    }

    res.json({
      success: true,
      data: systemStatus
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
