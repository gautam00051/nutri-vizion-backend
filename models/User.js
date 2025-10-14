import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  profile: {
    age: {
      type: Number,
      min: [13, 'Age must be at least 13'],
      max: [120, 'Age must be less than 120']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    height: {
      type: Number, // in cm
      min: [100, 'Height must be at least 100cm'],
      max: [300, 'Height must be less than 300cm']
    },
    weight: {
      type: Number, // in kg
      min: [30, 'Weight must be at least 30kg'],
      max: [500, 'Weight must be less than 500kg']
    },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'],
      default: 'moderately_active'
    }
  },
  preferences: {
    dietaryRestrictions: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'low_carb', 'keto', 'paleo']
    }],
    allergies: [String],
    cuisinePreferences: [String],
    mealsPerDay: {
      type: Number,
      default: 3,
      min: 1,
      max: 6
    },
    caloriesTolerance: {
      type: Number,
      default: 50 // +/- calories tolerance
    }
  },
  goals: {
    weightGoal: {
      type: String,
      enum: ['lose', 'maintain', 'gain'],
      default: 'maintain'
    },
    targetWeight: Number,
    targetCalories: {
      type: Number,
      default: 2000
    },
    targetProtein: {
      type: Number,
      default: 150 // in grams
    },
    targetCarbs: {
      type: Number,
      default: 250 // in grams
    },
    targetFat: {
      type: Number,
      default: 70 // in grams
    },
    targetFiber: {
      type: Number,
      default: 25 // in grams
    },
    weeklyWeightLossGoal: {
      type: Number,
      default: 0.5 // kg per week
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'patient'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next()
  }

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
userSchema.methods.calculateBMR = function() {
  const { age, gender, height, weight } = this.profile

  if (!age || !height || !weight || !gender) {
    return null
  }

  let bmr
  if (gender === 'male') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161
  }

  return Math.round(bmr)
}

// Calculate TDEE (Total Daily Energy Expenditure)
userSchema.methods.calculateTDEE = function() {
  const bmr = this.calculateBMR()
  if (!bmr) return null

  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9
  }

  const multiplier = activityMultipliers[this.profile.activityLevel] || 1.55
  return Math.round(bmr * multiplier)
}

// Get recommended daily calories based on goals
userSchema.methods.getRecommendedCalories = function() {
  const tdee = this.calculateTDEE()
  if (!tdee) return this.goals.targetCalories

  const { weightGoal, weeklyWeightLossGoal } = this.goals

  switch (weightGoal) {
    case 'lose':
      // 1 kg fat = ~7700 calories, so for weekly loss, daily deficit = (weekly_goal * 7700) / 7
      const dailyDeficit = (weeklyWeightLossGoal * 7700) / 7
      return Math.max(1200, Math.round(tdee - dailyDeficit)) // Minimum 1200 calories
    case 'gain':
      const dailySurplus = (weeklyWeightLossGoal * 7700) / 7
      return Math.round(tdee + dailySurplus)
    default:
      return tdee
  }
}

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject()
  delete userObject.password
  return userObject
}

const User = mongoose.model('User', userSchema)

export default User