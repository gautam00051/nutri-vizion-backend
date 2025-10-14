import express from 'express'
import Nutritionist from '../models/Nutritionist.js'
import Appointment from '../models/Appointment.js'
import Chat from '../models/Chat.js'
import User from '../models/User.js'
import auth from '../middleware/auth.js'

const router = express.Router()

// Middleware to check if user is nutritionist
const nutritionistOnly = async (req, res, next) => {
  try {
    const nutritionist = await Nutritionist.findById(req.user.id)
    if (!nutritionist) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Nutritionist only.'
      })
    }
    req.nutritionist = nutritionist
    next()
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
}

// @route   GET /api/nutritionist/dashboard
// @desc    Get nutritionist dashboard data
// @access  Private (Nutritionist only)
router.get('/dashboard', auth, nutritionistOnly, async (req, res) => {
  try {
    const nutritionistId = req.nutritionist._id
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))
    
    // Get today's appointments
    const todaysAppointments = await Appointment.find({
      nutritionistId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
    .populate('patientId', 'name email')
    .sort({ time: 1 })

    // Get recent chats with unread messages
    const recentChats = await Chat.find({
      'participants.user': nutritionistId,
      'participants.userType': 'Nutritionist',
      status: 'active'
    })
    .populate('participants.user', 'name email')
    .sort({ updatedAt: -1 })
    .limit(10)

    // Calculate unread messages count
    const unreadMessagesCount = recentChats.reduce((total, chat) => {
      const nutritionistParticipant = chat.participants.find(
        p => p.user._id.toString() === nutritionistId.toString()
      )
      if (nutritionistParticipant) {
        const unreadInChat = chat.messages.filter(
          msg => msg.timestamp > nutritionistParticipant.lastRead && 
                 msg.sender.toString() !== nutritionistId.toString()
        ).length
        return total + unreadInChat
      }
      return total
    }, 0)

    // Get earnings data
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthlyEarnings = await Appointment.aggregate([
      {
        $match: {
          nutritionistId,
          status: 'completed',
          paymentStatus: 'paid',
          date: { $gte: thisMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$fee' },
          count: { $sum: 1 }
        }
      }
    ])

    // Get pending payouts
    const pendingPayouts = await Appointment.aggregate([
      {
        $match: {
          nutritionistId,
          status: 'completed',
          paymentStatus: 'paid' // Paid by patient but not yet paid to nutritionist
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$fee' }
        }
      }
    ])

    // Get upcoming appointments (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    const upcomingAppointments = await Appointment.find({
      nutritionistId,
      date: {
        $gte: today,
        $lte: nextWeek
      },
      status: 'scheduled'
    })
    .populate('patientId', 'name email')
    .sort({ date: 1, time: 1 })
    .limit(5)

    // Get patient records count
    const totalPatients = await Appointment.distinct('patientId', {
      nutritionistId,
      status: 'completed'
    })

    res.json({
      success: true,
      dashboard: {
        todaysAppointments: todaysAppointments.map(apt => ({
          id: apt._id,
          patient: apt.patientId,
          time: apt.time,
          duration: apt.duration,
          sessionType: apt.sessionType,
          status: apt.status,
          reason: apt.reason,
          meetingLink: apt.meetingLink
        })),
        
        recentMessages: recentChats.slice(0, 5).map(chat => ({
          id: chat._id,
          patient: chat.participants.find(p => p.userType === 'User'),
          lastMessage: chat.lastMessage,
          unreadCount: chat.messages.filter(
            msg => msg.timestamp > chat.participants.find(
              p => p.user._id.toString() === nutritionistId.toString()
            )?.lastRead &&
            msg.sender.toString() !== nutritionistId.toString()
          ).length
        })),
        
        earnings: {
          thisMonth: monthlyEarnings[0]?.total || 0,
          allTime: req.nutritionist.stats.totalEarnings,
          pendingPayout: pendingPayouts[0]?.total || 0,
          completedSessions: monthlyEarnings[0]?.count || 0
        },
        
        upcomingAppointments: upcomingAppointments.map(apt => ({
          id: apt._id,
          patient: apt.patientId,
          date: apt.date,
          time: apt.time,
          sessionType: apt.sessionType
        })),
        
        stats: {
          totalPatients: totalPatients.length,
          unreadMessages: unreadMessagesCount,
          todaysAppointments: todaysAppointments.length,
          upcomingThisWeek: upcomingAppointments.length
        }
      }
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

// @route   GET /api/nutritionist/appointments
// @desc    Get nutritionist appointments
// @access  Private (Nutritionist only)
router.get('/appointments', auth, nutritionistOnly, async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query
    const nutritionistId = req.nutritionist._id
    
    const query = { nutritionistId }
    
    if (status) {
      query.status = status
    }
    
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = new Date(startDate)
      if (endDate) query.date.$lte = new Date(endDate)
    }
    
    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email phone profile')
      .sort({ date: -1, time: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
    
    const total = await Appointment.countDocuments(query)
    
    res.json({
      success: true,
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get appointments error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

// @route   PUT /api/nutritionist/appointments/:id
// @desc    Update appointment
// @access  Private (Nutritionist only)
router.put('/appointments/:id', auth, nutritionistOnly, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      nutritionistId: req.nutritionist._id
    })
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      })
    }
    
    const allowedUpdates = ['status', 'notes.nutritionist', 'meetingLink']
    const updates = {}
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'notes.nutritionist') {
          updates['notes.nutritionist'] = req.body[key]
        } else {
          updates[key] = req.body[key]
        }
      }
    })
    
    Object.assign(appointment, updates)
    await appointment.save()
    
    res.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment
    })
  } catch (error) {
    console.error('Update appointment error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

// @route   GET /api/nutritionist/profile
// @desc    Get nutritionist profile
// @access  Private (Nutritionist only)
router.get('/profile', auth, nutritionistOnly, async (req, res) => {
  try {
    res.json({
      success: true,
      profile: req.nutritionist
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

// @route   PUT /api/nutritionist/profile
// @desc    Update nutritionist profile
// @access  Private (Nutritionist only)
router.put('/profile', auth, nutritionistOnly, async (req, res) => {
  try {
    const {
      name,
      phone,
      location,
      professional,
      availability,
      paymentInfo,
      settings
    } = req.body
    
    const nutritionist = req.nutritionist
    
    // Update allowed fields
    if (name) nutritionist.name = name
    if (phone) nutritionist.phone = phone
    if (location) nutritionist.location = { ...nutritionist.location, ...location }
    if (professional) nutritionist.professional = { ...nutritionist.professional, ...professional }
    if (availability) nutritionist.availability = { ...nutritionist.availability, ...availability }
    if (paymentInfo) nutritionist.paymentInfo = { ...nutritionist.paymentInfo, ...paymentInfo }
    if (settings) nutritionist.settings = { ...nutritionist.settings, ...settings }
    
    await nutritionist.save()
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: nutritionist
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

// @route   GET /api/nutritionist/earnings
// @desc    Get earnings and payment history
// @access  Private (Nutritionist only)
router.get('/earnings', auth, nutritionistOnly, async (req, res) => {
  try {
    const nutritionistId = req.nutritionist._id
    const { startDate, endDate } = req.query
    
    const matchQuery = {
      nutritionistId,
      status: 'completed',
      paymentStatus: 'paid'
    }
    
    if (startDate || endDate) {
      matchQuery.date = {}
      if (startDate) matchQuery.date.$gte = new Date(startDate)
      if (endDate) matchQuery.date.$lte = new Date(endDate)
    }
    
    // Get earnings by month
    const monthlyEarnings = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$fee' },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ])
    
    // Get payment history
    const paymentHistory = await Appointment.find(matchQuery)
      .populate('patientId', 'name email')
      .select('date fee paymentStatus paymentId patientId sessionType')
      .sort({ date: -1 })
      .limit(50)
    
    res.json({
      success: true,
      earnings: {
        monthlyBreakdown: monthlyEarnings,
        paymentHistory,
        summary: {
          totalEarnings: req.nutritionist.stats.totalEarnings,
          completedSessions: req.nutritionist.stats.completedSessions
        }
      }
    })
  } catch (error) {
    console.error('Get earnings error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

// @route   PUT /api/nutritionist/profile
// @desc    Update nutritionist profile
// @access  Private (Nutritionist only)
router.put('/profile', auth, nutritionistOnly, async (req, res) => {
  try {
    const { name, email, specialization, experience, education, bio } = req.body
    
    const nutritionist = await Nutritionist.findById(req.nutritionist._id)
    if (!nutritionist) {
      return res.status(404).json({
        success: false,
        message: 'Nutritionist not found'
      })
    }

    // Update basic info
    if (name) nutritionist.name = name
    if (email) nutritionist.email = email
    if (specialization) nutritionist.specialization = specialization
    if (experience !== undefined) nutritionist.experience = experience
    if (education) nutritionist.education = education
    if (bio) nutritionist.bio = bio

    await nutritionist.save()

    res.json({
      success: true,
      message: 'Profile updated successfully',
      nutritionist: await Nutritionist.findById(nutritionist._id).select('-password')
    })
  } catch (error) {
    console.error('Update nutritionist profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

export default router