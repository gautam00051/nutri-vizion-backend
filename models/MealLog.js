import mongoose from 'mongoose'

const mealLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true
  },
  foods: [{
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
      required: true,
      default: 'g'
    },
    calories: {
      type: Number,
      required: true
    },
    macros: {
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      fiber: { type: Number, default: 0 },
      sugar: { type: Number, default: 0 },
      sodium: { type: Number, default: 0 }
    },
    edamamId: String, // For linking to Edamam database
    imageUrl: String
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
  healthScore: {
    type: Number,
    min: 0,
    max: 100
  },
  notes: String,
  imageUrl: String, // Uploaded meal image
  source: {
    type: String,
    enum: ['manual', 'camera', 'barcode', 'recipe'],
    default: 'manual'
  }
}, {
  timestamps: true
})

// Calculate total nutrition before saving
mealLogSchema.pre('save', function(next) {
  this.totalNutrition = this.foods.reduce((total, food) => {
    total.calories += food.calories || 0
    total.protein += food.macros.protein || 0
    total.carbs += food.macros.carbs || 0
    total.fat += food.macros.fat || 0
    total.fiber += food.macros.fiber || 0
    total.sugar += food.macros.sugar || 0
    total.sodium += food.macros.sodium || 0
    return total
  }, {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0
  })
  
  next()
})

// Add index for efficient querying
mealLogSchema.index({ user: 1, date: -1 })

const MealLog = mongoose.model('MealLog', mealLogSchema)

export default MealLog