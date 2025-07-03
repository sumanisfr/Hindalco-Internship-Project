const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Tool = require('../models/Tool');
const User = require('../models/User');
const ToolRequest = require('../models/ToolRequest');
const Maintenance = require('../models/Maintenance');
const fs = require('fs');
const path = require('path');

// @route   GET /api/reports/export/:type
// @desc    Export data to CSV/JSON
// @access  Private (Admin/Manager only)
router.get('/export/:type', auth, async (req, res) => {
  try {
    // Check if user has permission
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins and managers can export data.'
      });
    }

    const { type } = req.params;
    const { format = 'json' } = req.query;

    let data, filename;

    switch (type) {
      case 'tools':
        data = await Tool.find()
          .populate('assignedTo', 'firstName lastName email')
          .populate('createdBy', 'firstName lastName email');
        filename = `tools_export_${Date.now()}.${format}`;
        break;
      
      case 'users':
        data = await User.find().select('-password');
        filename = `users_export_${Date.now()}.${format}`;
        break;
      
      case 'requests':
        data = await ToolRequest.find()
          .populate('requestedBy', 'firstName lastName email')
          .populate('tool', 'name category')
          .populate('reviewedBy', 'firstName lastName email');
        filename = `requests_export_${Date.now()}.${format}`;
        break;
      
      case 'maintenance':
        data = await Maintenance.find()
          .populate('tool', 'name category serialNumber')
          .populate('scheduledBy', 'firstName lastName email')
          .populate('assignedTo', 'firstName lastName email');
        filename = `maintenance_export_${Date.now()}.${format}`;
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type. Valid types: tools, users, requests, maintenance'
        });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      // Convert to CSV format (simplified)
      const csvData = convertToCSV(data);
      res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        exportType: type,
        timestamp: new Date(),
        data: data
      });
    }

    // Broadcast export activity via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('Admin').to('Manager').emit('data-exported', {
        message: `${type} data exported`,
        exportedBy: req.user.id,
        timestamp: new Date()
      });
    }

  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/reports/backup
// @desc    Create system backup
// @access  Private (Admin only)
router.post('/backup', auth, async (req, res) => {
  try {
    // Check if user has permission
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can create backups.'
      });
    }

    // Create backup data
    const [tools, users, toolRequests, maintenance] = await Promise.all([
      Tool.find().populate('assignedTo', 'firstName lastName email'),
      User.find().select('-password'),
      ToolRequest.find()
        .populate('requestedBy', 'firstName lastName email')
        .populate('tool', 'name category'),
      Maintenance.find()
        .populate('tool', 'name category')
        .populate('scheduledBy', 'firstName lastName email')
    ]);

    const backupData = {
      timestamp: new Date(),
      version: '1.0',
      data: {
        tools,
        users,
        toolRequests,
        maintenance
      },
      metadata: {
        totalTools: tools.length,
        totalUsers: users.length,
        totalRequests: toolRequests.length,
        totalMaintenance: maintenance.length
      }
    };

    // In a real application, you would save this to a backup service
    // For now, we'll just return the backup data
    const filename = `system_backup_${Date.now()}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    
    res.json({
      success: true,
      message: 'System backup created successfully',
      backup: backupData
    });

    // Broadcast backup activity via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('Admin').emit('backup-created', {
        message: 'System backup created',
        createdBy: req.user.id,
        timestamp: new Date()
      });
    }

  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/reports/dashboard
// @desc    Get comprehensive dashboard statistics
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const [
      toolStats,
      userStats,
      requestStats,
      maintenanceStats,
      recentActivities
    ] = await Promise.all([
      getToolStatistics(),
      getUserStatistics(),
      getRequestStatistics(),
      getMaintenanceStatistics(),
      getRecentActivities()
    ]);

    res.json({
      success: true,
      data: {
        tools: toolStats,
        users: userStats,
        requests: requestStats,
        maintenance: maintenanceStats,
        recentActivities
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Helper functions
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    const obj = row.toObject ? row.toObject() : row;
    return headers.map(header => {
      const value = obj[header];
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value).replace(/"/g, '""');
      }
      return value !== null && value !== undefined ? `"${value}"` : '';
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

async function getToolStatistics() {
  const [total, available, inUse, maintenance, damaged] = await Promise.all([
    Tool.countDocuments(),
    Tool.countDocuments({ status: 'Available' }),
    Tool.countDocuments({ status: 'In Use' }),
    Tool.countDocuments({ status: 'Maintenance' }),
    Tool.countDocuments({ status: 'Damaged' })
  ]);

  return { total, available, inUse, maintenance, damaged };
}

async function getUserStatistics() {
  const [total, active, inactive, admins, managers, employees] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: false }),
    User.countDocuments({ role: 'Admin' }),
    User.countDocuments({ role: 'Manager' }),
    User.countDocuments({ role: 'Employee' })
  ]);

  return { total, active, inactive, admins, managers, employees };
}

async function getRequestStatistics() {
  const [total, pending, approved, rejected] = await Promise.all([
    ToolRequest.countDocuments(),
    ToolRequest.countDocuments({ status: 'pending' }),
    ToolRequest.countDocuments({ status: 'approved' }),
    ToolRequest.countDocuments({ status: 'rejected' })
  ]);

  return { total, pending, approved, rejected };
}

async function getMaintenanceStatistics() {
  const [total, scheduled, inProgress, completed, overdue] = await Promise.all([
    Maintenance.countDocuments(),
    Maintenance.countDocuments({ status: 'scheduled' }),
    Maintenance.countDocuments({ status: 'in-progress' }),
    Maintenance.countDocuments({ status: 'completed' }),
    Maintenance.countDocuments({ status: 'overdue' })
  ]);

  return { total, scheduled, inProgress, completed, overdue };
}

async function getRecentActivities() {
  const [recentRequests, recentMaintenance] = await Promise.all([
    ToolRequest.find()
      .populate('requestedBy', 'firstName lastName')
      .populate('tool', 'name')
      .sort({ createdAt: -1 })
      .limit(5),
    Maintenance.find()
      .populate('tool', 'name')
      .populate('scheduledBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)
  ]);

  return { recentRequests, recentMaintenance };
}

module.exports = router;
