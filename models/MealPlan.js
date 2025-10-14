import mongoose from 'mongoose'

const mealPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  meals: [{
    date: {
      type: Date,
      required: true
    },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      required: true
    },
    recipe: {
      name: String,
      description: String,
      instructions: [String],
      prepTime: Number, // in minutes
      cookTime: Number, // in minutes
      servings: Number,
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
      }
    },
    ingredients: [{
      name: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      unit: {
        type: String,
        required: true
      },
      edamamId: String,
      nutritionPer100g: {
        calories: Number,
        protein: Number,
        carbs: Number,
        fat: Number,
        fiber: Number
      }
    }],
    totalNutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      fiber: { type: Number, default: 0 },
      sugar: { type: Number, default: 0 },
      sodium: { type: Number, default: 0 }
    },
    healthScore: Number,
    tags: [String], // e.g., ['vegetarian', 'gluten-free', 'high-protein']
    imageUrl: String
  }],
  goals: {
    dailyCalories: Number,
    proteinPercentage: Number,
    carbsPercentage: Number,
    fatPercentage: Number
  },
  preferences: {
    dietaryRestrictions: [String],
    allergies: [String],
    cuisineTypes: [String]
  },
  generatedBy: {
    type: String,
    enum: ['ai', 'manual', 'template'],
    default: 'manual'
  },
  aiPrompt: String, // Store the AI prompt used for generation
  isActive: {
    type: Boolean,
    default: true
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    }
  }]
}, {
  timestamps: true
})

// Add compound index for efficient querying
mealPlanSchema.index({ user: 1, startDate: 1, endDate: 1 })
mealPlanSchema.index({ user: 1, isActive: 1 })

const MealPlan = mongoose.model('MealPlan', mealPlanSchema)

export default MealPlan