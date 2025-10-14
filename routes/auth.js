import express from 'express'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'
import Admin from '../models/Admin.js'
import MealPlan from '../models/MealPlan.js'
import MealLog from '../models/MealLog.js'
import Chat from '../models/Chat.js' 
import Appointment from '../models/Appointment.js'
import auth from '../middleware/auth.js'

const router = express.Router()

// Generate JWT token
const generateToken = (id, role = 'patient') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  })
}

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
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

    const { name, email, password, profile } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      })
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      profile: profile || {}
    })

    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        preferences: user.preferences,
        goals: user.goals
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    })
  }
})

// @route   POST /api/auth/create-admin
// @desc    Create admin account (one-time setup)
// @access  Public (should be secured in production)
router.post('/create-admin', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Admin password must be at least 8 characters'),
  body('adminKey')
    .equals(process.env.ADMIN_CREATION_KEY || 'create-admin-2024')
    .withMessage('Invalid admin creation key')
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

    const { name, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists with this email'
      })
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' })
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin account already exists. Only one admin allowed.'
      })
    }

    // Create admin user
    const adminUser = new User({
      name,
      email,
      password,
      role: 'admin',
      profile: {
        age: 30,
        gender: 'other',
        height: 170,
        weight: 70,
        activityLevel: 'moderately_active'
      },
      goals: {
        weightGoal: 'maintain',
        targetCalories: 2000,
        targetProtein: 150,
        targetCarbs: 250,
        targetFat: 70
      }
    })

    await adminUser.save()

    // Generate JWT token
    const token = generateToken(adminUser._id)

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      token,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        profile: adminUser.profile,
        preferences: adminUser.preferences,
        goals: adminUser.goals
      }
    })
  } catch (error) {
    console.error('Admin creation error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during admin creation'
    })
  }
})

// @route   POST /api/auth/login
// @desc    Login user
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

    // Find user and include password for comparison
    let user = await User.findOne({ email }).select('+password')
    
    // If user not found, check admin collection
    if (!user) {
      const admin = await Admin.findOne({ email }).select('+password')
      
      if (admin) {
        // Check if admin is active
        if (!admin.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Admin account is deactivated'
          })
        }

        // Compare password for admin
        const isPasswordMatch = await admin.comparePassword(password)
        if (!isPasswordMatch) {
          return res.status(401).json({
            success: false,
            message: 'Incorrect password. Please try again.'
          })
        }

        // Update last login for admin
        admin.lastLogin = new Date()
        await admin.save()

        // Generate token for admin
        const token = generateToken(admin._id, admin.role)

        return res.status(200).json({
          success: true,
          message: 'Admin login successful',
          token,
          user: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            permissions: admin.permissions,
            lastLogin: admin.lastLogin
          }
        })
      }
      
      return res.status(401).json({
        success: false,
        message: 'No account found with this email. Please register first.'
      })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      })
    }

    // Compare password
    const isPasswordMatch = await user.comparePassword(password)
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.'
      })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
        preferences: user.preferences,
        goals: user.goals,
        lastLogin: user.lastLogin
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    })
  }
})

// @route   GET /api/auth/verify
// @desc    Verify JWT token and get user data
// @access  Private
router.get('/verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      })
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
        preferences: user.preferences,
        goals: user.goals,
        lastLogin: user.lastLogin
      }
    })
  } catch (error) {
    console.error('Token verification error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during token verification'
    })
  }
})

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  })
})

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email'
      })
    }

    const { email } = req.body
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      })
    }

    // TODO: Implement email service for password reset
    // For now, just return success message
    res.json({
      success: true,
      message: 'Password reset instructions sent to your email'
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

// @route   DELETE /api/auth/delete-account
// @desc    Delete user account permanently
// @access  Private
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const userId = req.user.id

    // Find the user first to get email for logging
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    console.log(`Starting account deletion process for user: ${user.email}`)
    
    // Delete all related data
    const deletePromises = [
      // Delete meal plans
      MealPlan.deleteMany({ userId }),
      // Delete meal logs  
      MealLog.deleteMany({ userId }),
      // Delete chats where user is participant
      Chat.deleteMany({ 
        $or: [
          { 'participants.userId': userId },
          { patientId: userId }
        ]
      }),
      // Delete appointments
      Appointment.deleteMany({
        $or: [
          { patientId: userId },
          { nutritionistId: userId }
        ]
      })
    ]

    // Execute all deletions in parallel
    await Promise.all(deletePromises)
    
    // Finally, delete the user account
    await User.findByIdAndDelete(userId)
    
    console.log(`Account and all related data deleted for user: ${user.email}`)
    
    res.json({
      success: true,
      message: 'Account and all associated data deleted successfully'
    })
  } catch (error) {
    console.error('Delete account error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error while deleting account'
    })
  }
})

export default router