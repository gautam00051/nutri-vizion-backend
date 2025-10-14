import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Nutritionist from '../models/Nutritionist.js';

const router = express.Router();

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Access denied - Admin only'
      });
    }

    const admin = await Admin.findById(decoded.id);
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found or inactive'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

// Mock notification storage (in a real app, use a database)
let notifications = [];
let notificationId = 1;

// @desc    Send broadcast notification
// @route   POST /api/admin/notifications/broadcast
// @access  Private (Admin)
router.post('/broadcast', adminAuth, async (req, res) => {
  try {
    const { 
      title, 
      message, 
      targetAudience, // 'all', 'patients', 'nutritionists', 'specific'
      specificUsers = [], // array of user IDs for specific targeting
      priority = 'normal', // 'low', 'normal', 'high', 'urgent'
      type = 'general' // 'general', 'maintenance', 'promotion', 'system'
    } = req.body;

    if (!title || !message || !targetAudience) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, and target audience are required'
      });
    }

    // Determine recipients
    let recipients = [];
    let recipientCount = 0;

    switch (targetAudience) {
      case 'all':
        const allUsers = await User.find({ isActive: true });
        const allNutritionists = await Nutritionist.find({ isActive: true });
        recipients = [...allUsers, ...allNutritionists];
        recipientCount = allUsers.length + allNutritionists.length;
        break;
      
      case 'patients':
        const patients = await User.find({ isActive: true });
        recipients = patients;
        recipientCount = patients.length;
        break;
      
      case 'nutritionists':
        const nutritionists = await Nutritionist.find({ isActive: true });
        recipients = nutritionists;
        recipientCount = nutritionists.length;
        break;
      
      case 'specific':
        if (specificUsers.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Specific users must be provided for targeted notifications'
          });
        }
        const specificPatients = await User.find({ _id: { $in: specificUsers }, isActive: true });
        const specificNutritionists = await Nutritionist.find({ _id: { $in: specificUsers }, isActive: true });
        recipients = [...specificPatients, ...specificNutritionists];
        recipientCount = recipients.length;
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid target audience'
        });
    }

    // Create notification record
    const notification = {
      id: notificationId++,
      title,
      message,
      targetAudience,
      specificUsers: targetAudience === 'specific' ? specificUsers : [],
      priority,
      type,
      recipientCount,
      sentBy: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email
      },
      sentAt: new Date(),
      status: 'sent',
      deliveryStats: {
        sent: recipientCount,
        delivered: 0, // Would be updated by delivery service
        failed: 0,
        opened: 0
      }
    };

    // Store notification (in a real app, save to database)
    notifications.unshift(notification);

    // In a real app, you would:
    // 1. Send push notifications via Firebase/OneSignal
    // 2. Send email notifications
    // 3. Save in-app notifications to database
    // 4. Update delivery status asynchronously

    // Mock delivery simulation
    setTimeout(() => {
      const notif = notifications.find(n => n.id === notification.id);
      if (notif) {
        notif.deliveryStats.delivered = Math.floor(recipientCount * 0.95); // 95% delivery rate
        notif.deliveryStats.failed = recipientCount - notif.deliveryStats.delivered;
      }
    }, 2000);

    res.status(200).json({
      success: true,
      message: `Notification sent to ${recipientCount} recipients`,
      notification
    });

  } catch (error) {
    console.error('Send broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get notification history
// @route   GET /api/admin/notifications/history
// @access  Private (Admin)
router.get('/history', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, priority } = req.query;

    // Filter notifications
    let filteredNotifications = notifications;

    if (type && type !== 'all') {
      filteredNotifications = filteredNotifications.filter(n => n.type === type);
    }

    if (priority && priority !== 'all') {
      filteredNotifications = filteredNotifications.filter(n => n.priority === priority);
    }

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        totalPages: Math.ceil(filteredNotifications.length / limit),
        currentPage: parseInt(page),
        total: filteredNotifications.length
      }
    });

  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get notification templates
// @route   GET /api/admin/notifications/templates
// @access  Private (Admin)
router.get('/templates', adminAuth, async (req, res) => {
  try {
    const templates = [
      {
        id: 1,
        name: 'Maintenance Notice',
        type: 'maintenance',
        priority: 'high',
        title: 'Scheduled Maintenance',
        message: 'We will be performing scheduled maintenance on {date} from {start_time} to {end_time}. The platform will be temporarily unavailable during this time.',
        variables: ['date', 'start_time', 'end_time']
      },
      {
        id: 2,
        name: 'Welcome Message',
        type: 'general',
        priority: 'normal',
        title: 'Welcome to NutriVision!',
        message: 'Welcome to NutriVision! We\'re excited to help you on your nutrition journey. Get started by booking your first consultation.',
        variables: []
      },
      {
        id: 3,
        name: 'Appointment Reminder',
        type: 'general',
        priority: 'normal',
        title: 'Appointment Reminder',
        message: 'Don\'t forget about your upcoming appointment with {nutritionist_name} on {date} at {time}.',
        variables: ['nutritionist_name', 'date', 'time']
      },
      {
        id: 4,
        name: 'Payment Issue',
        type: 'system',
        priority: 'high',
        title: 'Payment Processing Issue',
        message: 'We encountered an issue processing your payment. Please update your payment method to continue using our services.',
        variables: []
      },
      {
        id: 5,
        name: 'New Feature Announcement',
        type: 'promotion',
        priority: 'normal',
        title: 'New Feature: {feature_name}',
        message: 'We\'re excited to announce our new feature: {feature_name}! {feature_description}',
        variables: ['feature_name', 'feature_description']
      }
    ];

    res.status(200).json({
      success: true,
      data: { templates }
    });

  } catch (error) {
    console.error('Get notification templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Send notification using template
// @route   POST /api/admin/notifications/template
// @access  Private (Admin)
router.post('/template', adminAuth, async (req, res) => {
  try {
    const { 
      templateId, 
      variables = {}, 
      targetAudience, 
      specificUsers = [] 
    } = req.body;

    if (!templateId || !targetAudience) {
      return res.status(400).json({
        success: false,
        message: 'Template ID and target audience are required'
      });
    }

    // Get template (in a real app, fetch from database)
    const templates = [
      {
        id: 1,
        name: 'Maintenance Notice',
        type: 'maintenance',
        priority: 'high',
        title: 'Scheduled Maintenance',
        message: 'We will be performing scheduled maintenance on {date} from {start_time} to {end_time}. The platform will be temporarily unavailable during this time.',
        variables: ['date', 'start_time', 'end_time']
      },
      // ... other templates
    ];

    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Replace variables in template
    let title = template.title;
    let message = template.message;

    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      title = title.replace(new RegExp(placeholder, 'g'), variables[key]);
      message = message.replace(new RegExp(placeholder, 'g'), variables[key]);
    });

    // Use the broadcast endpoint logic
    const broadcastData = {
      title,
      message,
      targetAudience,
      specificUsers,
      priority: template.priority,
      type: template.type
    };

    // Reuse broadcast logic (in a real app, extract to a service)
    let recipients = [];
    let recipientCount = 0;

    switch (targetAudience) {
      case 'all':
        const allUsers = await User.find({ isActive: true });
        const allNutritionists = await Nutritionist.find({ isActive: true });
        recipients = [...allUsers, ...allNutritionists];
        recipientCount = allUsers.length + allNutritionists.length;
        break;
      
      case 'patients':
        const patients = await User.find({ isActive: true });
        recipients = patients;
        recipientCount = patients.length;
        break;
      
      case 'nutritionists':
        const nutritionists = await Nutritionist.find({ isActive: true });
        recipients = nutritionists;
        recipientCount = nutritionists.length;
        break;
      
      case 'specific':
        const specificPatients = await User.find({ _id: { $in: specificUsers }, isActive: true });
        const specificNutritionists = await Nutritionist.find({ _id: { $in: specificUsers }, isActive: true });
        recipients = [...specificPatients, ...specificNutritionists];
        recipientCount = recipients.length;
        break;
    }

    const notification = {
      id: notificationId++,
      title,
      message,
      targetAudience,
      specificUsers: targetAudience === 'specific' ? specificUsers : [],
      priority: template.priority,
      type: template.type,
      recipientCount,
      templateUsed: template.name,
      sentBy: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email
      },
      sentAt: new Date(),
      status: 'sent',
      deliveryStats: {
        sent: recipientCount,
        delivered: 0,
        failed: 0,
        opened: 0
      }
    };

    notifications.unshift(notification);

    res.status(200).json({
      success: true,
      message: `Template notification sent to ${recipientCount} recipients`,
      notification
    });

  } catch (error) {
    console.error('Send template notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get system alerts
// @route   GET /api/admin/notifications/alerts
// @access  Private (Admin)
router.get('/alerts', adminAuth, async (req, res) => {
  try {
    // Mock system alerts (in a real app, these would come from monitoring systems)
    const alerts = [
      {
        id: 1,
        type: 'error',
        severity: 'high',
        title: 'Database Connection Issues',
        message: 'Multiple database connection timeouts detected in the last 10 minutes',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        status: 'resolved',
        affectedServices: ['API', 'Dashboard'],
        resolvedAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      },
      {
        id: 2,
        type: 'warning',
        severity: 'medium',
        title: 'High Memory Usage',
        message: 'Server memory usage is at 85%. Consider scaling up.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        status: 'active',
        affectedServices: ['API'],
        resolvedAt: null
      },
      {
        id: 3,
        type: 'info',
        severity: 'low',
        title: 'Scheduled Backup Completed',
        message: 'Daily database backup completed successfully',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'resolved',
        affectedServices: [],
        resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 4,
        type: 'error',
        severity: 'urgent',
        title: 'Payment Gateway Down',
        message: 'Payment processing service is not responding',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        status: 'active',
        affectedServices: ['Payments', 'Appointments'],
        resolvedAt: null
      }
    ];

    // Filter by status if requested
    const { status } = req.query;
    let filteredAlerts = alerts;
    
    if (status && status !== 'all') {
      filteredAlerts = alerts.filter(alert => alert.status === status);
    }

    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => b.timestamp - a.timestamp);

    res.status(200).json({
      success: true,
      data: {
        alerts: filteredAlerts,
        summary: {
          total: alerts.length,
          active: alerts.filter(a => a.status === 'active').length,
          urgent: alerts.filter(a => a.severity === 'urgent' && a.status === 'active').length,
          resolved: alerts.filter(a => a.status === 'resolved').length
        }
      }
    });

  } catch (error) {
    console.error('Get system alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;