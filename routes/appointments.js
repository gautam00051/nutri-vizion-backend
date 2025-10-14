import express from 'express'
import { body, validationResult } from 'express-validator'
import Appointment from '../models/Appointment.js'
import User from '../models/User.js'
import Nutritionist from '../models/Nutritionist.js'
import Chat from '../models/Chat.js'
import auth from '../middleware/auth.js'

const router = express.Router()

// @route   POST /api/appointments/book
// @desc    Book an appointment with a nutritionist
// @access  Private (Patient only)
router.post('/book', [
  auth,
  body('nutritionistId').isMongoId().withMessage('Valid nutritionist ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('time').notEmpty().withMessage('Time is required'),
  body('sessionType').isIn(['video', 'chat', 'phone']).withMessage('Valid session type is required'),
  body('reason').isLength({ min: 10 }).withMessage('Reason must be at least 10 characters'),
  body('duration').optional().isNumeric().withMessage('Duration must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { nutritionistId, date, time, sessionType, reason, duration, notes } = req.body
    const patientId = req.user.id

    // Validate nutritionist exists and is active
    const nutritionist = await Nutritionist.findById(nutritionistId)
    if (!nutritionist || !nutritionist.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Nutritionist not found or inactive'
      })
    }

    // Check if nutritionist is available at the requested time
    const appointmentDate = new Date(date)
    const existingAppointment = await Appointment.findOne({
      nutritionistId,
      date: appointmentDate,
      time,
      status: { $in: ['scheduled', 'in-progress'] },
      approvalStatus: { $in: ['pending', 'approved'] }
    })

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Nutritionist is not available at this time'
      })
    }

    // Create new appointment
    const appointment = new Appointment({
      nutritionistId,
      patientId,
      date: appointmentDate,
      time,
      duration: duration || 60,
      sessionType,
      reason,
      fee: nutritionist.consultationRate || 1000,
      notes: {
        patient: notes || ''
      },
      approvalStatus: 'pending'
    })

    await appointment.save()

    // Populate appointment with user details
    await appointment.populate([
      { path: 'patientId', select: 'name email' },
      { path: 'nutritionistId', select: 'name email phone professional' }
    ])

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully. Waiting for nutritionist approval.',
      appointment
    })
  } catch (error) {
    console.error('Appointment booking error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during appointment booking'
    })
  }
})

// @route   GET /api/appointments/patient
// @desc    Get patient's appointments
// @access  Private (Patient only)
router.get('/patient', auth, async (req, res) => {
  try {
    const { status, approvalStatus, page = 1, limit = 10 } = req.query
    const patientId = req.user.id

    const query = { patientId }
    if (status) query.status = status
    if (approvalStatus) query.approvalStatus = approvalStatus

    const appointments = await Appointment.find(query)
      .populate('nutritionistId', 'name email phone professional profilePicture')
      .populate('patientId', 'name email phone profilePicture')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

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
    console.error('Get patient appointments error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointments'
    })
  }
})

// @route   GET /api/appointments/nutritionist
// @desc    Get nutritionist's appointments
// @access  Private (Nutritionist only)
router.get('/nutritionist', auth, async (req, res) => {
  try {
    const { status, approvalStatus, page = 1, limit = 10 } = req.query
    const nutritionistId = req.user.id

    const query = { nutritionistId }
    if (status) query.status = status
    if (approvalStatus) query.approvalStatus = approvalStatus

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email phone profilePicture')
      .populate('nutritionistId', 'name email phone professional profilePicture')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

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
    console.error('Get nutritionist appointments error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointments'
    })
  }
})

// @route   PUT /api/appointments/:id/approve
// @desc    Approve an appointment
// @access  Private (Nutritionist only)
router.put('/:id/approve', auth, async (req, res) => {
  try {
    const { id } = req.params
    const nutritionistId = req.user.id

    const appointment = await Appointment.findOne({
      _id: id,
      nutritionistId,
      approvalStatus: 'pending'
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or already processed'
      })
    }

    // Approve appointment
    appointment.approvalStatus = 'approved'
    appointment.communicationEnabled = true
    appointment.approvedAt = new Date()
    
    // Create a chat session for communication
    const chat = new Chat({
      participants: [
        {
          user: appointment.patientId,
          userType: 'User',
          lastRead: new Date()
        },
        {
          user: appointment.nutritionistId,
          userType: 'Nutritionist',
          lastRead: new Date()
        }
      ],
      appointmentId: appointment._id,
      status: 'active'
    })

    await chat.save()
    appointment.chatSessionId = chat._id
    await appointment.save()

    // Populate appointment details for response
    await appointment.populate([
      { path: 'patientId', select: 'name email' },
      { path: 'nutritionistId', select: 'name email' }
    ])

    // Emit QR payment request to specific patient via Socket.IO
    if (req.io && appointment.patientId) {
      console.log('Emitting QR payment request to patient:', appointment.patientId._id)
      // Emit to patient's personal room only
      req.io.to(`user_${appointment.patientId._id}`).emit('qr_payment_request', {
        appointmentId: appointment._id.toString(),
        nutritionistName: appointment.nutritionistId.name,
        amount: 1000 // Fixed consultation fee for all nutritionists
      })
    }

    res.json({
      success: true,
      message: 'Appointment approved successfully. Communication enabled.',
      appointment,
      chatSessionId: chat._id
    })
  } catch (error) {
    console.error('Appointment approval error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during appointment approval'
    })
  }
})

// @route   PUT /api/appointments/:id/reject
// @desc    Reject an appointment
// @access  Private (Nutritionist only)
router.put('/:id/reject', [
  auth,
  body('reason').isLength({ min: 5 }).withMessage('Rejection reason must be at least 5 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { id } = req.params
    const { reason } = req.body
    const nutritionistId = req.user.id

    const appointment = await Appointment.findOne({
      _id: id,
      nutritionistId,
      approvalStatus: 'pending'
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or already processed'
      })
    }

    appointment.approvalStatus = 'rejected'
    appointment.rejectionReason = reason
    await appointment.save()

    await appointment.populate([
      { path: 'patientId', select: 'name email' },
      { path: 'nutritionistId', select: 'name email' }
    ])

    res.json({
      success: true,
      message: 'Appointment rejected',
      appointment
    })
  } catch (error) {
    console.error('Appointment rejection error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during appointment rejection'
    })
  }
})

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status
// @access  Private (Patient or Nutritionist)
router.put('/:id/status', [
  auth,
  body('status').isIn(['scheduled', 'in-progress', 'completed', 'cancelled', 'missed']).withMessage('Valid status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { id } = req.params
    const { status, notes } = req.body
    const userId = req.user.id

    const appointment = await Appointment.findOne({
      _id: id,
      $or: [
        { patientId: userId },
        { nutritionistId: userId }
      ]
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      })
    }

    appointment.status = status
    
    // Add notes based on user type
    if (notes) {
      if (appointment.patientId.toString() === userId) {
        appointment.notes.patient = notes
      } else if (appointment.nutritionistId.toString() === userId) {
        appointment.notes.nutritionist = notes
      }
    }

    await appointment.save()

    res.json({
      success: true,
      message: `Appointment status updated to ${status}`,
      appointment
    })
  } catch (error) {
    console.error('Appointment status update error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during status update'
    })
  }
})

// @route   POST /api/appointments/:id/call/start
// @desc    Start a voice/video call
// @access  Private (Patient or Nutritionist with approved appointment)
router.post('/:id/call/start', [
  auth,
  body('callType').isIn(['voice', 'video']).withMessage('Valid call type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { id } = req.params
    const { callType } = req.body
    const userId = req.user.id

    const appointment = await Appointment.findOne({
      _id: id,
      $or: [
        { patientId: userId },
        { nutritionistId: userId }
      ],
      approvalStatus: 'approved',
      communicationEnabled: true
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or communication not enabled'
      })
    }

    // Create call session
    const callSession = {
      type: callType,
      startTime: new Date(),
      participants: [{
        userId,
        userType: appointment.patientId.toString() === userId ? 'User' : 'Nutritionist',
        joinedAt: new Date()
      }]
    }

    appointment.callHistory.push(callSession)
    await appointment.save()

    // Generate meeting link for video calls (you can integrate with services like Zoom, WebRTC, etc.)
    const meetingLink = callType === 'video' ? 
      `${process.env.FRONTEND_URL}/meeting/${appointment._id}` : null

    res.json({
      success: true,
      message: `${callType} call started`,
      callSession: {
        appointmentId: appointment._id,
        type: callType,
        meetingLink,
        startTime: callSession.startTime
      }
    })
  } catch (error) {
    console.error('Call start error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during call start'
    })
  }
})

// @route   PUT /api/appointments/:id/call/end
// @desc    End a voice/video call
// @access  Private (Patient or Nutritionist)
router.put('/:id/call/end', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { quality, duration } = req.body
    const userId = req.user.id

    const appointment = await Appointment.findOne({
      _id: id,
      $or: [
        { patientId: userId },
        { nutritionistId: userId }
      ]
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      })
    }

    // Find the active call session
    const activeCallIndex = appointment.callHistory.findIndex(call => 
      !call.endTime && call.participants.some(p => p.userId.toString() === userId)
    )

    if (activeCallIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'No active call found'
      })
    }

    // End the call
    appointment.callHistory[activeCallIndex].endTime = new Date()
    appointment.callHistory[activeCallIndex].duration = duration || 0
    appointment.callHistory[activeCallIndex].quality = quality || 'good'

    // Update participant left time
    const participant = appointment.callHistory[activeCallIndex].participants.find(p => 
      p.userId.toString() === userId
    )
    if (participant) {
      participant.leftAt = new Date()
    }

    await appointment.save()

    res.json({
      success: true,
      message: 'Call ended successfully',
      callSession: appointment.callHistory[activeCallIndex]
    })
  } catch (error) {
    console.error('Call end error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during call end'
    })
  }
})

// @route   GET /api/appointments/:id/details
// @desc    Get appointment details with communication status
// @access  Private (Patient or Nutritionist)
router.get('/:id/details', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const appointment = await Appointment.findOne({
      _id: id,
      $or: [
        { patientId: userId },
        { nutritionistId: userId }
      ]
    })
    .populate('patientId', 'name email profile')
    .populate('nutritionistId', 'name email phone professional profilePicture')
    .populate('chatSessionId')

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      })
    }

    res.json({
      success: true,
      appointment,
      communicationOptions: {
        chatEnabled: appointment.communicationEnabled && appointment.chatSessionId,
        callEnabled: appointment.communicationEnabled && appointment.approvalStatus === 'approved',
        videoEnabled: appointment.communicationEnabled && appointment.approvalStatus === 'approved'
      }
    })
  } catch (error) {
    console.error('Get appointment details error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointment details'
    })
  }
})

export default router