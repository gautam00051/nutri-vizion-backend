import express from 'express'
import MealLog from '../models/MealLog.js'
import MealPlan from '../models/MealPlan.js'
import auth from '../middleware/auth.js'

const router = express.Router()

// Get meal logs
router.get('/logs', auth, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query
    
    const query = { userId: req.user.id }
    
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = new Date(startDate)
      if (endDate) query.date.$lte = new Date(endDate)
    }

    const logs = await MealLog.find(query)
      .sort({ date: -1, timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await MealLog.countDocuments(query)

    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    })
  } catch (error) {
    console.error('Get meal logs error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create meal log
router.post('/logs', auth, async (req, res) => {
  try {
    const mealLog = new MealLog({
      ...req.body,
      userId: req.user.id
    })

    await mealLog.save()
    res.status(201).json(mealLog)
  } catch (error) {
    console.error('Create meal log error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update meal log
router.put('/logs/:id', auth, async (req, res) => {
  try {
    const mealLog = await MealLog.findOne({
      _id: req.params.id,
      userId: req.user.id
    })

    if (!mealLog) {
      return res.status(404).json({ message: 'Meal log not found' })
    }

    Object.assign(mealLog, req.body)
    await mealLog.save()

    res.json(mealLog)
  } catch (error) {
    console.error('Update meal log error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete meal log
router.delete('/logs/:id', auth, async (req, res) => {
  try {
    const mealLog = await MealLog.findOne({
      _id: req.params.id,
      userId: req.user.id
    })

    if (!mealLog) {
      return res.status(404).json({ message: 'Meal log not found' })
    }

    await mealLog.deleteOne()
    res.json({ message: 'Meal log deleted successfully' })
  } catch (error) {
    console.error('Delete meal log error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get meal plans
router.get('/plans', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    
    const query = { userId: req.user.id }
    
    if (startDate || endDate) {
      const dateQuery = {}
      if (startDate) dateQuery.$gte = new Date(startDate)
      if (endDate) dateQuery.$lte = new Date(endDate)
      
      query.$or = [
        { startDate: dateQuery },
        { endDate: dateQuery },
        {
          startDate: { $lte: new Date(endDate || new Date()) },
          endDate: { $gte: new Date(startDate || new Date()) }
        }
      ]
    }

    const plans = await MealPlan.find(query).sort({ createdAt: -1 })
    res.json(plans)
  } catch (error) {
    console.error('Get meal plans error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create meal plan
router.post('/plans', auth, async (req, res) => {
  try {
    const mealPlan = new MealPlan({
      ...req.body,
      userId: req.user.id
    })

    await mealPlan.save()
    res.status(201).json(mealPlan)
  } catch (error) {
    console.error('Create meal plan error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update meal plan
router.put('/plans/:id', auth, async (req, res) => {
  try {
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.user.id
    })

    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' })
    }

    Object.assign(mealPlan, req.body)
    await mealPlan.save()

    res.json(mealPlan)
  } catch (error) {
    console.error('Update meal plan error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete meal plan
router.delete('/plans/:id', auth, async (req, res) => {
  try {
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.user.id
    })

    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' })
    }

    await mealPlan.deleteOne()
    res.json({ message: 'Meal plan deleted successfully' })
  } catch (error) {
    console.error('Delete meal plan error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get nutrition summary
router.get('/nutrition-summary', auth, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query
    
    const startOfDay = new Date(date)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const logs = await MealLog.find({
      userId: req.user.id,
      date: { $gte: startOfDay, $lte: endOfDay }
    })

    const summary = logs.reduce((acc, log) => {
      acc.calories += log.totalNutrition.calories || 0
      acc.protein += log.totalNutrition.protein || 0
      acc.carbs += log.totalNutrition.carbs || 0
      acc.fat += log.totalNutrition.fat || 0
      acc.fiber += log.totalNutrition.fiber || 0
      acc.sugar += log.totalNutrition.sugar || 0
      acc.sodium += log.totalNutrition.sodium || 0
      return acc
    }, {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    })

    res.json({ date, summary, mealsLogged: logs.length })
  } catch (error) {
    console.error('Get nutrition summary error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router