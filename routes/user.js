import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import auth from '../middleware/auth.js'

const router = express.Router()

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json(user)
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    console.log('Profile update request body:', JSON.stringify(req.body, null, 2))
    
    const { name, email, profile } = req.body
    
    // Handle both nested and flat profile structures
    const profileData = profile || {}
    const {
      age,
      gender,
      height,
      weight,
      activityLevel,
      goals,
      healthConditions,
      medications
    } = profileData

    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Update basic info
    if (name) user.name = name
    if (email) user.email = email

    // Ensure profile object exists
    if (!user.profile) {
      user.profile = {}
    }

    // Update profile
    if (age) user.profile.age = age
    if (gender) user.profile.gender = gender
    if (height) user.profile.height = height
    if (weight) user.profile.weight = weight
    if (activityLevel) user.profile.activityLevel = activityLevel
    if (goals) user.profile.goals = goals
    if (healthConditions) user.profile.healthConditions = healthConditions
    if (medications) user.profile.medications = medications

    // Recalculate BMR and TDEE if methods exist
    if (typeof user.calculateBMR === 'function') {
      user.calculateBMR()
    }
    if (typeof user.calculateTDEE === 'function') {
      user.calculateTDEE()
    }

    await user.save()

    res.json({ 
      message: 'Profile updated successfully', 
      user: await User.findById(user._id).select('-password')
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.preferences = { ...user.preferences, ...req.body }
    await user.save()

    res.json({ 
      message: 'Preferences updated successfully', 
      preferences: user.preferences 
    })
  } catch (error) {
    console.error('Update preferences error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update goals
router.put('/goals', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.goals = { ...user.goals, ...req.body }
    await user.save()

    res.json({ 
      message: 'Goals updated successfully', 
      goals: user.goals 
    })
  } catch (error) {
    console.error('Update goals error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get user stats
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const stats = {
      bmr: user.bmr,
      tdee: user.tdee,
      bmi: user.profile.height && user.profile.weight ? 
        (user.profile.weight / Math.pow(user.profile.height / 100, 2)).toFixed(1) : null,
      targetWeight: user.goals.targetWeight,
      weeklyWeightChangeGoal: user.goals.weeklyWeightChangeGoal,
      dailyCalorieGoal: user.goals.dailyCalorieGoal || user.tdee
    }

    res.json(stats)
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Upload profile picture
router.post('/upload-avatar', auth, async (req, res) => {
  try {
    // This would handle file upload with multer
    // For now, just return success
    res.json({ message: 'Avatar upload not implemented yet' })
  } catch (error) {
    console.error('Upload avatar error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router