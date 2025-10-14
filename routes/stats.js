import express from 'express';
import User from '../models/User.js';
import MealLog from '../models/MealLog.js';
import Nutritionist from '../models/Nutritionist.js';
import Appointment from '../models/Appointment.js';

const router = express.Router();

/**
 * @route GET /api/stats/overview
 * @desc Get platform statistics for homepage
 * @access Public
 */
router.get('/overview', async (req, res) => {
  try {
    // Get total registered users
    const totalUsers = await User.countDocuments({ isActive: true });

    // Get total meals tracked
    const mealsTracked = await MealLog.countDocuments();

    // Get appointments completed (as a proxy for goals achieved)
    const goalsAchieved = await Appointment.countDocuments({ status: 'completed' });

    // Get active nutritionists
    const nutritionistsActive = await Nutritionist.countDocuments({ 
      isVerified: true, 
      isActive: true 
    });

    const stats = {
      totalUsers: totalUsers || 0,
      mealsTracked: mealsTracked || 0,
      goalsAchieved: goalsAchieved || 0,
      nutritionistsActive: nutritionistsActive || 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching platform statistics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/stats/user/:userId
 * @desc Get individual user statistics
 * @access Private
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's meal count
    const userMeals = await MealLog.countDocuments({ userId: userId });

    // Get user's appointments
    const userAppointments = await Appointment.countDocuments({ patientId: userId });
    const completedAppointments = await Appointment.countDocuments({ 
      patientId: userId, 
      status: 'completed' 
    });

    // Get user's streak (consecutive days of logging)
    const recentMeals = await MealLog.find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(30);

    let currentStreak = 0;
    const today = new Date();
    const mealDates = new Set();

    recentMeals.forEach(meal => {
      const mealDate = new Date(meal.createdAt).toDateString();
      mealDates.add(mealDate);
    });

    // Calculate streak
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      
      if (mealDates.has(checkDate.toDateString())) {
        currentStreak++;
      } else {
        break;
      }
    }

    const userStats = {
      mealsLogged: userMeals || 0,
      totalAppointments: userAppointments || 0,
      completedAppointments: completedAppointments || 0,
      currentStreak: currentStreak,
      completionRate: userAppointments > 0 ? Math.round((completedAppointments / userAppointments) * 100) : 0
    };

    res.json({
      success: true,
      data: userStats
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: error.message
    });
  }
});

export default router;