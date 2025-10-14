import express from 'express'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import Nutritionist from '../models/Nutritionist.js'
import auth from '../middleware/auth.js'

const router = express.Router()

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id, userType: 'nutritionist' }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  })
}

// @route   POST /api/nutritionist/auth/register
// @desc    Register nutritionist
// @access  Public
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),  
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .isMobilePhone()
    .withMessage('Please enter a valid phone number'),
  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('location.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  body('professional.qualification')
    .trim()
    .notEmpty()
    .withMessage('Highest qualification is required'),
  body('professional.experience')
    .isNumeric()
    .withMessage('Experience must be a number'),
  body('professional.specializations')
    .isArray({ min: 1 })
    .withMessage('At least one specialization is required')
], async (req, res) => {
  try {
    console.log('🔥 Nutritionist registration request received')
    console.log('Request body:', JSON.stringify(req.body, null, 2))
    
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array())
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const {
      name,
      firstName,
      lastName,
      username,
      email,
      password,
      phone,
      location,
      professional,
      agreements
    } = req.body

    // Check agreements
    if (!agreements?.terms || !agreements?.privacy) {
      return res.status(400).json({
        success: false,
        message: 'You must agree to the terms and privacy policy'
      })
    }

    // Check if nutritionist already exists
    const existingNutritionist = await Nutritionist.findOne({ email })
    if (existingNutritionist) {
      return res.status(400).json({
        success: false,
        message: 'Nutritionist already exists with this email'
      })
    }

    // Create new nutritionist
    const nutritionist = new Nutritionist({
      name,
      firstName,
      lastName,
      username,
      email,
      password,
      phone,
      location,
      professional: {
        ...professional,
        experience: parseInt(professional.experience)
      },
      isVerified: true,  // Auto-verify new nutritionists
      isActive: true,    // Auto-activate new nutritionists
      rating: 4.5,       // Default rating
      reviewCount: 0     // Start with 0 reviews
    })

    await nutritionist.save()
    console.log('✅ Nutritionist saved successfully')

    // Generate token
    const token = generateToken(nutritionist._id)
    console.log('🎫 Token generated successfully')

    res.status(201).json({
      success: true,
      message: 'Nutritionist registered successfully. Account pending verification.',
      token,
      nutritionist: {
        id: nutritionist._id,
        name: nutritionist.name,
        email: nutritionist.email,
        phone: nutritionist.phone,
        location: nutritionist.location,
        professional: nutritionist.professional,
        isVerified: nutritionist.isVerified,
        verificationStatus: nutritionist.verificationStatus
      }
    })
  } catch (error) {
    console.error('❌ Nutritionist registration error:', error.message)
    console.error('Full error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    })
  }
})

// @route   POST /api/nutritionist/auth/login
// @desc    Login nutritionist
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { email, password } = req.body

    // Find nutritionist and include password for comparison
    const nutritionist = await Nutritionist.findOne({ email }).select('+password')
    if (!nutritionist) {
      return res.status(401).json({
        success: false,
        message: 'No nutritionist account found with this email. Please register first.'
      })
    }

    // Check if account is active
    if (!nutritionist.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      })
    }

    // Check if account is approved by admin
    if (!nutritionist.isApproved) {
      if (nutritionist.isRejected) {
        return res.status(401).json({
          success: false,
          message: 'Your account application has been rejected. Please contact support for more information.'
        })
      }
      return res.status(401).json({
        success: false,
        message: 'Your account is pending admin approval. You will be notified once approved.'
      })
    }

    // Compare password
    const isPasswordMatch = await nutritionist.comparePassword(password)
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.'
      })
    }

    // Update last login
    nutritionist.lastLogin = new Date()
    await nutritionist.save()

    // Generate token
    const token = generateToken(nutritionist._id)

    res.json({
      success: true,
      message: 'Login successful',
      token,
      nutritionist: {
        id: nutritionist._id,
        name: nutritionist.name,
        email: nutritionist.email,
        phone: nutritionist.phone,
        location: nutritionist.location,
        professional: nutritionist.professional,
        isVerified: nutritionist.isVerified,
        verificationStatus: nutritionist.verificationStatus,
        stats: nutritionist.stats,
        lastLogin: nutritionist.lastLogin
      }
    })
  } catch (error) {
    console.error('Nutritionist login error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    })
  }
})

// @route   GET /api/nutritionist/auth/verify
// @desc    Verify JWT token and get nutritionist data
// @access  Private
router.get('/verify', auth, async (req, res) => {
  try {
    // Check if user is nutritionist
    if (req.user.constructor.modelName !== 'Nutritionist') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Nutritionist only.'
      })
    }

    const nutritionist = await Nutritionist.findById(req.user.id)
    
    if (!nutritionist || !nutritionist.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Nutritionist not found or inactive'
      })
    }

    res.json({
      success: true,
      nutritionist: {
        id: nutritionist._id,
        name: nutritionist.name,
        email: nutritionist.email,
        phone: nutritionist.phone,
        location: nutritionist.location,
        professional: nutritionist.professional,
        isVerified: nutritionist.isVerified,
        verificationStatus: nutritionist.verificationStatus,
        stats: nutritionist.stats,
        availability: nutritionist.availability,
        settings: nutritionist.settings,
        lastLogin: nutritionist.lastLogin
      }
    })
  } catch (error) {
    console.error('Nutritionist token verification error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during token verification'
    })
  }
})

// @route   POST /api/nutritionist/auth/logout
// @desc    Logout nutritionist (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  })
})

export default router