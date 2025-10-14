import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const nutritionistSchema = new mongoose.Schema({
  // Personal Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  location: {
    city: {
      type: String,
      required: [true, 'City is required']
    },
    country: {
      type: String,
      required: [true, 'Country is required']
    }
  },

  // Professional Information
  professional: {
    qualification: {
      type: String,
      required: [true, 'Highest qualification is required']
    },
    certification: {
      type: String,
      trim: true
    },
    license: {
      type: String,
      trim: true
    },
    experience: {
      type: Number,
      required: [true, 'Years of experience is required'],
      min: [0, 'Experience cannot be negative']
    },
    specializations: [{
      type: String,
      enum: [
        'Weight Management',
        'Sports Nutrition',
        'Clinical Nutrition',
        'Pediatric Nutrition',
        'Geriatric Nutrition',
        'Diabetes Management',
        'Heart Disease',
        'Eating Disorders',
        'Vegetarian/Vegan Nutrition',
        'Food Allergies',
        'Digestive Health',
        'Women\'s Health',
        'Men\'s Health',
        'Mental Health Nutrition',
        'Cancer Nutrition',
        'Kidney Disease',
        'General Nutrition'
      ]
    }],
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    consultationFee: {
      type: Number,
      default: 0,
      min: [0, 'Fee cannot be negative']
    }
  },

  // Documents
  documents: {
    certificate: {
      filename: String,
      path: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    },
    license: {
      filename: String,
      path: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    }
  },

  // Availability
  availability: {
    monday: { start: String, end: String, available: { type: Boolean, default: false } },
    tuesday: { start: String, end: String, available: { type: Boolean, default: false } },
    wednesday: { start: String, end: String, available: { type: Boolean, default: false } },
    thursday: { start: String, end: String, available: { type: Boolean, default: false } },
    friday: { start: String, end: String, available: { type: Boolean, default: false } },
    saturday: { start: String, end: String, available: { type: Boolean, default: false } },
    sunday: { start: String, end: String, available: { type: Boolean, default: false } }
  },

  // Profile
  profilePicture: {
    type: String,
    default: ''
  },
  
  // Rating and Reviews
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  
  // Additional Profile Info
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  consultationRate: {
    type: Number,
    default: 50,
    min: [0, 'Rate cannot be negative']
  },
  yearsOfExperience: {
    type: Number,
    default: 0,
    min: [0, 'Experience cannot be negative']
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  // Statistics
  stats: {
    totalPatients: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    completedSessions: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },

  // Payment Info
  paymentInfo: {
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    paypalEmail: String,
    preferredMethod: {
      type: String,
      enum: ['bank', 'paypal', 'wallet'],
      default: 'bank'
    }
  },

  // Settings
  settings: {
    notifications: {
      appointments: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false }
    },
    privacy: {
      profileVisible: { type: Boolean, default: true },
      showExperience: { type: Boolean, default: true },
      showRating: { type: Boolean, default: true }
    }
  },

  // Admin Approval Fields
  isApproved: {
    type: Boolean,
    default: false
  },
  isRejected: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },

  // Timestamps
  lastLogin: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Hash password before saving
nutritionistSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
nutritionistSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    throw error
  }
}

// Update timestamps
nutritionistSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

// Virtual for full name
nutritionistSchema.virtual('fullName').get(function() {
  return this.name
})

// Virtual for experience label
nutritionistSchema.virtual('experienceLabel').get(function() {
  const years = this.professional.experience
  if (years === 0) return 'New'
  if (years === 1) return '1 year'
  return `${years} years`
})

const Nutritionist = mongoose.model('Nutritionist', nutritionistSchema)

export default Nutritionist