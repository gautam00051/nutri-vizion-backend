import express from 'express'
import Nutritionist from '../models/Nutritionist.js'
import auth from '../middleware/auth.js'

const router = express.Router()

// Get all nutritionists (for appointment booking)
router.get('/', auth, async (req, res) => {
  try {
    const nutritionists = await Nutritionist.find({ 
      isActive: true,
      isApproved: true 
    })
      .select('_id name email professional location')
      .sort({ createdAt: -1 })

    res.json(nutritionists)
  } catch (error) {
    console.error('Error fetching nutritionists:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nutritionists',
      error: error.message
    })
  }
})

// Get all nutritionists for directory (public listing)
router.get('/directory', auth, async (req, res) => {
  try {
    const nutritionists = await Nutritionist.find({ 
      isActive: true,
      isVerified: true,
      isApproved: true 
    })
    .select('-password -email -phone') // Exclude sensitive information
    .sort({ rating: -1, createdAt: -1 })

    // Add some default values for display
    const formattedNutritionists = nutritionists.map(nutritionist => ({
      ...nutritionist.toObject(),
      rating: nutritionist.rating || 4.5,
      reviewCount: nutritionist.reviewCount || Math.floor(Math.random() * 50) + 10,
      location: nutritionist.location || 'Remote Available',
      availability: nutritionist.availability || 'Mon-Fri, 9AM-5PM'
    }))

    res.json({
      success: true,
      nutritionists: formattedNutritionists,
      count: formattedNutritionists.length
    })
  } catch (error) {
    console.error('Error fetching nutritionist directory:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nutritionists',
      error: error.message
    })
  }
})

// Get nutritionist profile by ID
router.get('/profile/:id', auth, async (req, res) => {
  try {
    const nutritionist = await Nutritionist.findById(req.params.id)
      .select('-password') // Exclude password but include contact info for verified requests

    if (!nutritionist) {
      return res.status(404).json({
        success: false,
        message: 'Nutritionist not found'
      })
    }

    if (!nutritionist.isVerified || !nutritionist.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Nutritionist profile is not available'
      })
    }

    res.json({
      success: true,
      nutritionist: {
        ...nutritionist.toObject(),
        rating: nutritionist.rating || 4.5,
        reviewCount: nutritionist.reviewCount || Math.floor(Math.random() * 50) + 10
      }
    })
  } catch (error) {
    console.error('Error fetching nutritionist profile:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nutritionist profile',
      error: error.message
    })
  }
})

// Search nutritionists
router.get('/search', auth, async (req, res) => {
  try {
    const { 
      q, 
      specialization, 
      minRating, 
      maxRate,
      location,
      sortBy = 'rating',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query

    // Build search query
    let searchQuery = { 
      isVerified: true, 
      isActive: true 
    }

    // Text search
    if (q) {
      searchQuery.$or = [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { specializations: { $in: [new RegExp(q, 'i')] } },
        { bio: { $regex: q, $options: 'i' } }
      ]
    }

    // Specialization filter
    if (specialization) {
      searchQuery.specializations = { $in: [specialization] }
    }

    // Rating filter
    if (minRating) {
      searchQuery.rating = { $gte: parseFloat(minRating) }
    }

    // Rate filter
    if (maxRate) {
      searchQuery.consultationRate = { $lte: parseFloat(maxRate) }
    }

    // Location filter
    if (location) {
      searchQuery.location = { $regex: location, $options: 'i' }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Sort options
    const sortOptions = {}
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1

    const nutritionists = await Nutritionist.find(searchQuery)
      .select('-password -email -phone')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Nutritionist.countDocuments(searchQuery)

    const formattedNutritionists = nutritionists.map(nutritionist => ({
      ...nutritionist.toObject(),
      rating: nutritionist.rating || 4.5,
      reviewCount: nutritionist.reviewCount || Math.floor(Math.random() * 50) + 10,
      location: nutritionist.location || 'Remote Available',
      availability: nutritionist.availability || 'Mon-Fri, 9AM-5PM'
    }))

    res.json({
      success: true,
      nutritionists: formattedNutritionists,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: formattedNutritionists.length,
        totalRecords: total
      }
    })
  } catch (error) {
    console.error('Error searching nutritionists:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to search nutritionists',
      error: error.message
    })
  }
})

// Get nutritionist availability
router.get('/availability/:id', auth, async (req, res) => {
  try {
    const nutritionist = await Nutritionist.findById(req.params.id)
      .select('availability workingHours timeZone isActive')

    if (!nutritionist) {
      return res.status(404).json({
        success: false,
        message: 'Nutritionist not found'
      })
    }

    if (!nutritionist.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Nutritionist is not available'
      })
    }

    res.json({
      success: true,
      availability: {
        schedule: nutritionist.availability || 'Mon-Fri, 9AM-5PM',
        workingHours: nutritionist.workingHours || {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' },
          saturday: { start: '10:00', end: '14:00' },
          sunday: { closed: true }
        },
        timeZone: nutritionist.timeZone || 'UTC'
      }
    })
  } catch (error) {
    console.error('Error fetching nutritionist availability:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability',
      error: error.message
    })
  }
})

// Get featured nutritionists
router.get('/featured', auth, async (req, res) => {
  try {
    const featuredNutritionists = await Nutritionist.find({
      isVerified: true,
      isActive: true,
      isFeatured: true
    })
    .select('-password -email -phone')
    .sort({ rating: -1 })
    .limit(6)

    const formattedNutritionists = featuredNutritionists.map(nutritionist => ({
      ...nutritionist.toObject(),
      rating: nutritionist.rating || 4.5,
      reviewCount: nutritionist.reviewCount || Math.floor(Math.random() * 50) + 10,
      location: nutritionist.location || 'Remote Available'
    }))

    res.json({
      success: true,
      nutritionists: formattedNutritionists,
      count: formattedNutritionists.length
    })
  } catch (error) {
    console.error('Error fetching featured nutritionists:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured nutritionists',
      error: error.message
    })
  }
})

export default router