import express from 'express'
import auth from '../middleware/auth.js'
import MealPlan from '../models/MealPlan.js'
import User from '../models/User.js'

const router = express.Router()

// @route   GET /api/progress/overview
// @desc    Get user progress overview
// @access  Private
router.get('/overview', auth, async (req, res) => {
  try {
    const userId = req.user.id
    const { timeRange = 'week' } = req.query

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }

    // Get user data
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Get meal plans in date range
    const mealPlans = await MealPlan.find({
      userId,
      startDate: { $gte: startDate, $lte: endDate }
    }).sort({ startDate: 1 })

    // Calculate daily nutrition data
    const dailyData = {}
    mealPlans.forEach(plan => {
      const dateKey = plan.startDate.toISOString().split('T')[0]
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          mealsLogged: 0
        }
      }

      plan.meals.forEach(meal => {
        if (meal.totalNutrition) {
          dailyData[dateKey].calories += meal.totalNutrition.calories || 0
          dailyData[dateKey].protein += meal.totalNutrition.protein || 0
          dailyData[dateKey].carbs += meal.totalNutrition.carbs || 0
          dailyData[dateKey].fat += meal.totalNutrition.fat || 0
          dailyData[dateKey].fiber += meal.totalNutrition.fiber || 0
          dailyData[dateKey].mealsLogged += 1
        }
      })
    })

    // Convert to array and sort by date
    const nutritionTrends = Object.values(dailyData).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    )

    // Calculate macro distribution (average over the period)
    const totalNutrition = nutritionTrends.reduce((acc, day) => ({
      protein: acc.protein + day.protein,
      carbs: acc.carbs + day.carbs,  
      fat: acc.fat + day.fat
    }), { protein: 0, carbs: 0, fat: 0 })

    const totalMacros = totalNutrition.protein + totalNutrition.carbs + totalNutrition.fat
    const macroDistribution = totalMacros > 0 ? {
      protein: Math.round((totalNutrition.protein * 4 / (totalMacros * 4)) * 100), // 4 cal/g
      carbs: Math.round((totalNutrition.carbs * 4 / (totalMacros * 4)) * 100),     // 4 cal/g  
      fat: Math.round((totalNutrition.fat * 9 / (totalMacros * 4)) * 100)          // 9 cal/g
    } : { protein: 25, carbs: 45, fat: 30 }

    // Calculate achievements
    const achievements = []
    const consecutiveDays = calculateConsecutiveDays(nutritionTrends)
    const avgCalories = nutritionTrends.length > 0 
      ? nutritionTrends.reduce((sum, day) => sum + day.calories, 0) / nutritionTrends.length 
      : 0

    // Week streak achievement
    if (consecutiveDays >= 7) {
      achievements.push({
        id: 1,
        title: 'Week Streak',
        description: `Logged meals for ${consecutiveDays} consecutive days`,
        earned: true,
        date: new Date().toISOString().split('T')[0]
      })
    }

    // Calorie goal achievement
    const targetCalories = user.profile?.goals?.targetCalories || 2000
    const calorieAccuracy = avgCalories > 0 
      ? Math.max(0, 100 - Math.abs(avgCalories - targetCalories) / targetCalories * 100)
      : 0
    
    achievements.push({
      id: 3,
      title: 'Calorie Balance',
      description: 'Staying within calorie goal',
      earned: calorieAccuracy >= 80,
      progress: Math.round(calorieAccuracy)
    })

    // Generate insights
    const insights = generateInsights(nutritionTrends, user, macroDistribution)

    // Weight progress (if user has logged weight data)
    const weightProgress = user.profile?.weightHistory || []

    res.json({
      success: true,
      data: {
        weightProgress,
        calorieIntake: nutritionTrends.map(day => ({
          date: day.date,
          calories: Math.round(day.calories),
          goal: targetCalories
        })),
        macroDistribution,
        achievements,
        insights,
        // Additional stats for dashboard
        currentWeight: user.profile?.weight || null,
        avgDailyCalories: Math.round(avgCalories),
        mealsLogged: nutritionTrends.reduce((sum, day) => sum + day.mealsLogged, 0),
        achievementCount: achievements.filter(a => a.earned).length,
        newAchievements: achievements.filter(a => a.earned && 
          new Date(a.date || new Date()).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
        ).length,
        goalProgress: {
          weightLoss: user.profile?.goals?.weightGoal ? 
            Math.min(100, Math.max(0, Math.round(
              ((user.profile?.weight || 0) - (user.profile?.goals?.weightGoal || 0)) / 
              Math.max(1, (user.profile?.initialWeight || user.profile?.weight || 70) - (user.profile?.goals?.weightGoal || 60)) * 100
            ))) : 70,
          dailyCalorie: Math.round(calorieAccuracy),
          proteinTarget: macroDistribution.protein >= 20 ? 
            Math.min(100, Math.round(macroDistribution.protein / 25 * 100)) : 
            Math.round(macroDistribution.protein / 20 * 100),
          exerciseGoal: user.profile?.exerciseGoal ? 
            Math.min(100, Math.round((user.profile?.exerciseCompleted || 0) / user.profile.exerciseGoal * 100)) : 60
        },
        summary: {
          totalMealsLogged: nutritionTrends.reduce((sum, day) => sum + day.mealsLogged, 0),
          avgDailyCalories: Math.round(avgCalories),
          consecutiveDays,
          calorieAccuracy: Math.round(calorieAccuracy)
        }
      }
    })

  } catch (error) {
    console.error('Progress overview error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'
    })
  }
})

// Helper function to calculate consecutive days
function calculateConsecutiveDays(nutritionTrends) {
  if (nutritionTrends.length === 0) return 0
  
  let consecutive = 0
  let current = 0
  
  for (let i = nutritionTrends.length - 1; i >= 0; i--) {
    if (nutritionTrends[i].mealsLogged > 0) {
      current++
    } else {
      break
    }
  }
  
  return current
}

// Helper function to generate insights
function generateInsights(nutritionTrends, user, macroDistribution) {
  const insights = []
  
  if (nutritionTrends.length === 0) {
    insights.push('Start logging your meals to see personalized insights!')
    return insights
  }

  const avgCalories = nutritionTrends.reduce((sum, day) => sum + day.calories, 0) / nutritionTrends.length
  const targetCalories = user.profile?.goals?.targetCalories || 2000
  
  // Calorie insight
  const caloriediff = avgCalories - targetCalories
  if (Math.abs(caloriediff) <= 50) {
    insights.push('Great job maintaining your calorie goals!')
  } else if (caloriediff > 50) {
    insights.push(`You're averaging ${Math.round(caloriediff)} calories above your target. Consider smaller portions or lighter snacks.`)
  } else {
    insights.push(`You're averaging ${Math.round(Math.abs(caloriediff))} calories below your target. Make sure you're eating enough to fuel your body.`)
  }

  // Macro insights
  if (macroDistribution.protein < 20) {
    insights.push('Consider increasing protein intake with lean meats, fish, eggs, or plant-based proteins.')
  } else if (macroDistribution.protein > 30) {
    insights.push('Your protein intake is excellent! Keep up the good work.')
  }

  // Consistency insight
  const daysWithLogs = nutritionTrends.filter(day => day.mealsLogged > 0).length
  const consistencyRate = (daysWithLogs / nutritionTrends.length) * 100
  
  if (consistencyRate >= 80) {
    insights.push('Excellent consistency with meal logging - this helps track your progress!')
  } else if (consistencyRate >= 50) {
    insights.push('Good meal logging habit! Try to log meals more consistently for better insights.')
  } else {
    insights.push('Consistent meal logging will help you better understand your nutrition patterns.')
  }

  return insights
}

// @route   POST /api/progress/weight
// @desc    Log weight entry
// @access  Private
router.post('/weight', auth, async (req, res) => {
  try {
    const userId = req.user.id
    const { weight, date } = req.body

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Initialize weightHistory if it doesn't exist
    if (!user.profile.weightHistory) {
      user.profile.weightHistory = []
    }

    // Add or update weight entry
    const weightEntry = {
      weight: parseFloat(weight),
      date: new Date(date),
      recordedAt: new Date()
    }

    // Check if entry for this date already exists
    const existingIndex = user.profile.weightHistory.findIndex(
      entry => entry.date.toISOString().split('T')[0] === new Date(date).toISOString().split('T')[0]
    )

    if (existingIndex >= 0) {
      user.profile.weightHistory[existingIndex] = weightEntry
    } else {
      user.profile.weightHistory.push(weightEntry)
    }

    // Sort by date
    user.profile.weightHistory.sort((a, b) => new Date(a.date) - new Date(b.date))

    // Keep only last 365 entries
    if (user.profile.weightHistory.length > 365) {
      user.profile.weightHistory = user.profile.weightHistory.slice(-365)
    }

    await user.save()

    res.json({
      success: true,
      message: 'Weight logged successfully',
      data: {
        weight: weightEntry.weight,
        date: weightEntry.date
      }
    })

  } catch (error) {
    console.error('Weight logging error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error'  
    })
  }
})

export default router