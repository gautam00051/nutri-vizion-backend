import mongoose from 'mongoose'

const appointmentSchema = new mongoose.Schema({
  nutritionistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nutritionist',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Appointment Details
  date: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  time: {
    type: String,
    required: [true, 'Appointment time is required']
  },
  duration: {
    type: Number,
    default: 60, // minutes
    required: true
  },
  
  // Session Type
  sessionType: {
    type: String,
    enum: ['video', 'chat', 'phone'],
    required: [true, 'Session type is required']
  },
  
  // Approval Status
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedAt: Date,
  rejectionReason: String,
  
  // Status
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'missed'],
    default: 'scheduled'
  },
  
  // Payment
  fee: {
    type: Number,
    required: [true, 'Session fee is required']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String // Stripe/PayPal payment ID
  },
  
  // Session Details
  reason: {
    type: String,
    required: [true, 'Reason for consultation is required']
  },
  notes: {
    patient: String, // Patient's notes/concerns
    nutritionist: String // Nutritionist's session notes
  },
  
  // Documents/Files shared during session
  sharedFiles: [{
    filename: String,
    path: String,
    uploadedBy: {
      type: String,
      enum: ['patient', 'nutritionist']
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Follow-up
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  
  // Rating & Review
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    reviewDate: Date
  },
  
  // Meeting Links (for video sessions)
  meetingLink: String,
  meetingId: String,
  
  // Communication Features (enabled after approval)
  communicationEnabled: {
    type: Boolean,
    default: false
  },
  
  // Chat/Call Session
  chatSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  
  // Call/Video Call History
  callHistory: [{
    type: {
      type: String,
      enum: ['voice', 'video']
    },
    startTime: Date,
    endTime: Date,
    duration: Number, // in minutes
    quality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    },
    participants: [{
      userId: mongoose.Schema.Types.ObjectId,
      userType: {
        type: String,
        enum: ['User', 'Nutritionist']
      },
      joinedAt: Date,
      leftAt: Date
    }]
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Update timestamps and handle communication enabling
appointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  
  // Enable communication when appointment is approved
  if (this.isModified('approvalStatus') && this.approvalStatus === 'approved') {
    this.communicationEnabled = true
    this.approvedAt = new Date()
  }
  
  next()
})

const Appointment = mongoose.model('Appointment', appointmentSchema)

export default Appointment