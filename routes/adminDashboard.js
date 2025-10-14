import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Nutritionist from '../models/Nutritionist.js';
import Appointment from '../models/Appointment.js';

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

// @desc    Get dashboard overview stats
// @route   GET /api/admin/dashboard/overview
// @access  Private (Admin)
router.get('/overview', adminAuth, async (req, res) => {
  try {
    // Get counts
    const totalPatients = await User.countDocuments();
    const totalNutritionists = await Nutritionist.countDocuments();
    const activeNutritionists = await Nutritionist.countDocuments({ isActive: true, isVerified: true });
    const pendingVerifications = await Nutritionist.countDocuments({ isVerified: false });
    const totalAppointments = await Appointment.countDocuments();
    const todayAppointments = await Appointment.countDocuments({
      date: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999)
      }
    });

    // Get recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const newPatientsThisWeek = await User.countDocuments({
      createdAt: { $gte: weekAgo }
    });

    const newNutritionistsThisWeek = await Nutritionist.countDocuments({
      createdAt: { $gte: weekAgo }
    });

    const appointmentsThisWeek = await Appointment.countDocuments({
      createdAt: { $gte: weekAgo }
    });

    // Calculate earnings (mock calculation - implement based on your payment model)
    const totalEarnings = totalAppointments * 800; // Assuming ₹800 per appointment commission
    const thisWeekEarnings = appointmentsThisWeek * 50;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalPatients,
          totalNutritionists,
          activeNutritionists,
          pendingVerifications,
          totalAppointments,
          todayAppointments,
          totalEarnings,
          thisWeekEarnings
        },
        weeklyActivity: {
          newPatients: newPatientsThisWeek,
          newNutritionists: newNutritionistsThisWeek,
          appointments: appointmentsThisWeek
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get all nutritionists with management options
// @route   GET /api/admin/dashboard/nutritionists
// @access  Private (Admin)
router.get('/nutritionists', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    // Build query
    let query = {};
    
    if (status && status !== 'all') {
      if (status === 'active') query.isActive = true;
      if (status === 'inactive') query.isActive = false;
      if (status === 'verified') query.isVerified = true;
      if (status === 'pending') query.isVerified = false;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.specialization': { $regex: search, $options: 'i' } }
      ];
    }

    const nutritionists = await Nutritionist.find(query)
      .select('-password')
      .populate('appointments', 'date status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Nutritionist.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        nutritionists,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });

  } catch (error) {
    console.error('Get nutritionists error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update nutritionist status (approve/reject/activate/deactivate)
// @route   PUT /api/admin/dashboard/nutritionists/:id/status
// @access  Private (Admin)
router.put('/nutritionists/:id/status', adminAuth, async (req, res) => {
  try {
    const { action, reason } = req.body; // action: 'approve', 'reject', 'activate', 'deactivate'
    
    const nutritionist = await Nutritionist.findById(req.params.id);
    
    if (!nutritionist) {
      return res.status(404).json({
        success: false,
        message: 'Nutritionist not found'
      });
    }

    switch (action) {
      case 'approve':
        nutritionist.isVerified = true;
        nutritionist.verificationStatus = 'approved';
        nutritionist.verificationDate = new Date();
        break;
      case 'reject':
        nutritionist.isVerified = false;
        nutritionist.verificationStatus = 'rejected';
        nutritionist.rejectionReason = reason;
        break;
      case 'activate':
        nutritionist.isActive = true;
        break;
      case 'deactivate':
        nutritionist.isActive = false;
        nutritionist.deactivationReason = reason;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    await nutritionist.save();

    res.status(200).json({
      success: true,
      message: `Nutritionist ${action}d successfully`,
      nutritionist
    });

  } catch (error) {
    console.error('Update nutritionist status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get all patients with management options
// @route   GET /api/admin/dashboard/patients
// @access  Private (Admin)
router.get('/patients', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    // Build query
    let query = {};
    
    if (status && status !== 'all') {
      if (status === 'active') query.isActive = true;
      if (status === 'banned') query.isActive = false;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const patients = await User.find(query)
      .select('-password')
      .populate('appointments', 'date status nutritionist')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        patients,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update patient status (activate/ban)
// @route   PUT /api/admin/dashboard/patients/:id/status
// @access  Private (Admin)
router.put('/patients/:id/status', adminAuth, async (req, res) => {
  try {
    const { action, reason } = req.body; // action: 'activate', 'ban'
    
    const patient = await User.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    switch (action) {
      case 'activate':
        patient.isActive = true;
        break;
      case 'ban':
        patient.isActive = false;
        patient.banReason = reason;
        patient.bannedAt = new Date();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    await patient.save();

    res.status(200).json({
      success: true,
      message: `Patient ${action}d successfully`,
      patient
    });

  } catch (error) {
    console.error('Update patient status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get all appointments with filters
// @route   GET /api/admin/dashboard/appointments
// @access  Private (Admin)
router.get('/appointments', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, date, nutritionist, patient } = req.query;
    
    // Build query
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (date) {
      const targetDate = new Date(date);
      query.date = {
        $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
        $lt: new Date(targetDate.setHours(23, 59, 59, 999))
      };
    }
    
    if (nutritionist) {
      query.nutritionist = nutritionist;
    }
    
    if (patient) {
      query.patient = patient;
    }

    const appointments = await Appointment.find(query)
      .populate('nutritionist', 'name email profile.specialization')
      .populate('patient', 'name email')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        appointments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update appointment status (cancel/reassign)
// @route   PUT /api/admin/dashboard/appointments/:id
// @access  Private (Admin)
router.put('/appointments/:id', adminAuth, async (req, res) => {
  try {
    const { action, newNutritionist, reason } = req.body;
    
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    switch (action) {
      case 'cancel':
        appointment.status = 'cancelled';
        appointment.cancellationReason = reason;
        appointment.cancelledBy = 'admin';
        break;
      case 'reassign':
        if (!newNutritionist) {
          return res.status(400).json({
            success: false,
            message: 'New nutritionist ID required for reassignment'
          });
        }
        appointment.nutritionist = newNutritionist;
        appointment.reassignedBy = 'admin';
        appointment.reassignmentReason = reason;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    await appointment.save();

    res.status(200).json({
      success: true,
      message: `Appointment ${action}d successfully`,
      appointment
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route GET /api/admin/dashboard/nutritionists/pending
 * @desc Get pending nutritionist applications
 * @access Private (Admin only)
 */
router.get('/nutritionists/pending', adminAuth, async (req, res) => {
  try {
    const pendingNutritionists = await Nutritionist.find({ 
      isApproved: { $ne: true }, 
      isRejected: { $ne: true } 
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      nutritionists: pendingNutritionists
    });

  } catch (error) {
    console.error('Get pending nutritionists error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route POST /api/admin/dashboard/nutritionists/:id/approve
 * @desc Approve a nutritionist application
 * @access Private (Admin only)
 */
router.post('/nutritionists/:id/approve', adminAuth, async (req, res) => {
  try {
    const nutritionist = await Nutritionist.findById(req.params.id);
    
    if (!nutritionist) {
      return res.status(404).json({
        success: false,
        message: 'Nutritionist not found'
      });
    }

    if (nutritionist.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Nutritionist already approved'
      });
    }

    nutritionist.isApproved = true;
    nutritionist.isVerified = true;
    nutritionist.isActive = true;
    nutritionist.approvedBy = req.admin._id;
    nutritionist.approvedAt = new Date();
    
    await nutritionist.save();

    res.status(200).json({
      success: true,
      message: 'Nutritionist approved successfully',
      nutritionist
    });

  } catch (error) {
    console.error('Approve nutritionist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route POST /api/admin/dashboard/nutritionists/:id/reject
 * @desc Reject a nutritionist application
 * @access Private (Admin only)
 */
router.post('/nutritionists/:id/reject', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const nutritionist = await Nutritionist.findById(req.params.id);
    
    if (!nutritionist) {
      return res.status(404).json({
        success: false,
        message: 'Nutritionist not found'
      });
    }

    if (nutritionist.isRejected) {
      return res.status(400).json({
        success: false,
        message: 'Nutritionist already rejected'
      });
    }

    nutritionist.isRejected = true;
    nutritionist.isActive = false;
    nutritionist.rejectedBy = req.admin._id;
    nutritionist.rejectedAt = new Date();
    nutritionist.rejectionReason = reason;
    
    await nutritionist.save();

    res.status(200).json({
      success: true,
      message: 'Nutritionist application rejected',
      nutritionist
    });

  } catch (error) {
    console.error('Reject nutritionist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;