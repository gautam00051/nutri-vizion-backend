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

// @desc    Get payment analytics and transactions
// @route   GET /api/admin/payments/overview
// @access  Private (Admin)
router.get('/overview', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, period = '30' } = req.query;
    
    // Calculate date range
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));
      dateQuery = {
        createdAt: { $gte: daysAgo }
      };
    }

    // Get completed appointments (as proxy for payments)
    const completedAppointments = await Appointment.find({
      ...dateQuery,
      status: 'completed'
    }).populate('nutritionist', 'name email');

    // Mock payment calculation (implement based on your payment model)
    const appointmentFee = 1500; // ₹1500 per appointment
    const platformCommission = 0.15; // 15% commission

    const totalRevenue = completedAppointments.length * appointmentFee;
    const platformEarnings = totalRevenue * platformCommission;
    const nutritionistEarnings = totalRevenue - platformEarnings;

    // Group by nutritionist for payout calculation
    const nutritionistPayouts = {};
    completedAppointments.forEach(appointment => {
      const nutritionistId = appointment.nutritionist._id.toString();
      const nutritionistName = appointment.nutritionist.name;
      
      if (!nutritionistPayouts[nutritionistId]) {
        nutritionistPayouts[nutritionistId] = {
          nutritionist: {
            id: nutritionistId,
            name: nutritionistName,
            email: appointment.nutritionist.email
          },
          appointments: 0,
          grossEarnings: 0,
          platformFee: 0,
          netEarnings: 0
        };
      }
      
      nutritionistPayouts[nutritionistId].appointments += 1;
      nutritionistPayouts[nutritionistId].grossEarnings += appointmentFee;
      nutritionistPayouts[nutritionistId].platformFee += appointmentFee * platformCommission;
      nutritionistPayouts[nutritionistId].netEarnings += appointmentFee * (1 - platformCommission);
    });

    // Mock transaction history
    const transactions = completedAppointments.map((appointment, index) => ({
      id: `TXN-${Date.now()}-${index}`,
      type: 'appointment_payment',
      amount: appointmentFee,
      commission: appointmentFee * platformCommission,
      date: appointment.createdAt,
      status: 'completed',
      patient: appointment.patient,
      nutritionist: appointment.nutritionist,
      appointmentId: appointment._id
    }));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          platformEarnings,
          nutritionistEarnings,
          totalTransactions: completedAppointments.length,
          averageTransactionValue: completedAppointments.length > 0 ? totalRevenue / completedAppointments.length : 0
        },
        nutritionistPayouts: Object.values(nutritionistPayouts),
        recentTransactions: transactions.slice(0, 10),
        totalTransactions: transactions.length
      }
    });

  } catch (error) {
    console.error('Get payment overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get detailed transactions
// @route   GET /api/admin/payments/transactions
// @access  Private (Admin)
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, startDate, endDate } = req.query;
    
    // Build date query
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Get appointments as transactions
    let appointmentQuery = { ...dateQuery };
    if (status && status !== 'all') {
      appointmentQuery.status = status;
    }

    const appointments = await Appointment.find(appointmentQuery)
      .populate('nutritionist', 'name email')
      .populate('patient', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(appointmentQuery);

    // Convert appointments to transaction format
    const appointmentFee = 100;
    const platformCommission = 0.15;

    const transactions = appointments.map((appointment, index) => ({
      id: `TXN-${appointment._id}`,
      type: 'appointment_payment',
      amount: appointmentFee,
      commission: appointmentFee * platformCommission,
      netAmount: appointmentFee * (1 - platformCommission),
      date: appointment.createdAt,
      status: appointment.status === 'completed' ? 'completed' : 'pending',
      patient: {
        id: appointment.patient._id,
        name: appointment.patient.name,
        email: appointment.patient.email
      },
      nutritionist: {
        id: appointment.nutritionist._id,
        name: appointment.nutritionist.name,
        email: appointment.nutritionist.email
      },
      appointmentId: appointment._id,
      appointmentDate: appointment.date
    }));

    res.status(200).json({
      success: true,
      data: {
        transactions,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Generate payment report
// @route   GET /api/admin/payments/report
// @access  Private (Admin)
router.get('/report', adminAuth, async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;
    
    // Calculate date range
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateQuery = {
        createdAt: { $gte: thirtyDaysAgo }
      };
    }

    // Get completed appointments
    const completedAppointments = await Appointment.find({
      ...dateQuery,
      status: 'completed'
    }).populate('nutritionist', 'name email').populate('patient', 'name email');

    const appointmentFee = 100;
    const platformCommission = 0.15;

    // Generate report data
    const reportData = {
      period: {
        startDate: startDate || dateQuery.createdAt.$gte,
        endDate: endDate || new Date()
      },
      summary: {
        totalAppointments: completedAppointments.length,
        totalRevenue: completedAppointments.length * appointmentFee,
        platformEarnings: completedAppointments.length * appointmentFee * platformCommission,
        nutritionistEarnings: completedAppointments.length * appointmentFee * (1 - platformCommission)
      },
      transactions: completedAppointments.map(appointment => ({
        transactionId: `TXN-${appointment._id}`,
        date: appointment.createdAt,
        appointmentDate: appointment.date,
        patient: appointment.patient.name,
        nutritionist: appointment.nutritionist.name,
        amount: appointmentFee,
        commission: appointmentFee * platformCommission,
        netAmount: appointmentFee * (1 - platformCommission)
      }))
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = ['Transaction ID', 'Date', 'Appointment Date', 'Patient', 'Nutritionist', 'Amount', 'Commission', 'Net Amount'];
      const csvRows = reportData.transactions.map(t => [
        t.transactionId,
        t.date.toISOString(),
        t.appointmentDate.toISOString(),
        t.patient,
        t.nutritionist,
        t.amount,
        t.commission,
        t.netAmount
      ]);

      const csvContent = [csvHeaders, ...csvRows].map(row => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=payment-report.csv');
      res.send(csvContent);
    } else {
      res.status(200).json({
        success: true,
        data: reportData
      });
    }

  } catch (error) {
    console.error('Generate payment report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Process payout to nutritionist
// @route   POST /api/admin/payments/payout
// @access  Private (Admin)
router.post('/payout', adminAuth, async (req, res) => {
  try {
    const { nutritionistId, amount, paymentMethod = 'bank_transfer' } = req.body;

    if (!nutritionistId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Nutritionist ID and amount are required'
      });
    }

    const nutritionist = await Nutritionist.findById(nutritionistId);
    
    if (!nutritionist) {
      return res.status(404).json({
        success: false,
        message: 'Nutritionist not found'
      });
    }

    // Mock payout processing (implement with actual payment gateway)
    const payout = {
      id: `PAYOUT-${Date.now()}`,
      nutritionistId,
      nutritionist: {
        name: nutritionist.name,
        email: nutritionist.email
      },
      amount,
      paymentMethod,
      status: 'processed',
      processedBy: req.admin._id,
      processedAt: new Date(),
      transactionId: `TXN-PAYOUT-${Date.now()}`
    };

    // In a real app, you would:
    // 1. Process payment through payment gateway
    // 2. Save payout record to database
    // 3. Update nutritionist's balance
    // 4. Send notification to nutritionist

    res.status(200).json({
      success: true,
      message: 'Payout processed successfully',
      payout
    });

  } catch (error) {
    console.error('Process payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;