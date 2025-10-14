import express from 'express'
import axios from 'axios'
import auth from '../middleware/auth.js'

const router = express.Router()

// Edamam API configuration
const EDAMAM_BASE_URL = process.env.EDAMAM_BASE_URL || 'https://api.edamam.com'
const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID
const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY

// Search food nutrition data
router.get('/search', auth, async (req, res) => {
  try {
    const { query, pageSize = 20 } = req.query

    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' })
    }

    if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
      // Return mock data if API credentials not available
      const mockResults = [
        {
          foodId: 'food_mock_1',
          label: 'Chicken Breast',
          nutrients: {
            ENERC_KCAL: 165,
            PROCNT: 31,
            FAT: 3.6,
            CHOCDF: 0,
            FIBTG: 0
          },
          category: 'Generic foods',
          categoryLabel: 'food'
        },
        {
          foodId: 'food_mock_2',
          label: 'Brown Rice',
          nutrients: {
            ENERC_KCAL: 112,
            PROCNT: 2.6,
            FAT: 0.9,
            CHOCDF: 23,
            FIBTG: 1.8
          },
          category: 'Generic foods',
          categoryLabel: 'food'
        }
      ]

      return res.json({
        text: query,
        parsed: [],
        hints: mockResults.slice(0, pageSize),
        _links: {}
      })
    }

    const response = await axios.get(`${EDAMAM_BASE_URL}/api/food-database/v2/parser`, {
      params: {
        app_id: EDAMAM_APP_ID,
        app_key: EDAMAM_APP_KEY,
        ingr: query,
        limit: pageSize
      },
      timeout: 10000
    })

    res.json(response.data)
  } catch (error) {
    console.error('Food search error:', error)
    res.status(500).json({ message: 'Failed to search food database' })
  }
})

// Get detailed nutrition info
router.post('/nutrition', auth, async (req, res) => {
  try {
    const { ingredients } = req.body

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ message: 'Ingredients array is required' })
    }

    if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
      // Return mock nutrition data
      const mockNutrition = {
        uri: 'mock_uri',
        calories: 250,
        totalWeight: 100,
        dietLabels: [],
        healthLabels: ['LOW_SUGAR'],
        cautions: [],
        totalNutrients: {
          ENERC_KCAL: { label: 'Energy', quantity: 250, unit: 'kcal' },
          PROCNT: { label: 'Protein', quantity: 20, unit: 'g' },
          FAT: { label: 'Fat', quantity: 8, unit: 'g' },
          CHOCDF: { label: 'Carbs', quantity: 30, unit: 'g' },
          FIBTG: { label: 'Fiber', quantity: 5, unit: 'g' }
        },
        totalDaily: {},
        ingredients: ingredients.map((ing, index) => ({
          text: ing.text || ing,
          parsed: [{
            quantity: ing.quantity || 100,
            measure: ing.measure || 'gram',
            food: ing.food || ing.text || ing,
            foodId: `mock_${index}`,
            weight: ing.weight || 100,
            retainedWeight: ing.weight || 100,
            nutrients: {
              ENERC_KCAL: 250,
              PROCNT: 20,
              FAT: 8,
              CHOCDF: 30,
              FIBTG: 5
            }
          }]
        }))
      }

      return res.json(mockNutrition)
    }

    const response = await axios.post(
      `${EDAMAM_BASE_URL}/api/nutrition-details`,
      { ingr: ingredients },
      {
        params: {
          app_id: EDAMAM_APP_ID,
          app_key: EDAMAM_APP_KEY
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    )

    res.json(response.data)
  } catch (error) {
    console.error('Nutrition analysis error:', error)
    if (error.response && error.response.status === 422) {
      res.status(422).json({ 
        message: 'Unable to parse ingredients', 
        details: error.response.data 
      })
    } else {
      res.status(500).json({ message: 'Failed to analyze nutrition' })
    }
  }
})

// Get food suggestions
router.get('/suggestions', auth, async (req, res) => {
  try {
    const { category = 'all' } = req.query

    // Mock food suggestions
    const suggestions = {
      all: [
        'chicken breast', 'brown rice', 'broccoli', 'salmon', 'quinoa',
        'avocado', 'sweet potato', 'spinach', 'eggs', 'almonds'
      ],
      protein: [
        'chicken breast', 'salmon', 'eggs', 'greek yogurt', 'tofu',
        'lean beef', 'turkey', 'cottage cheese', 'tuna', 'lentils'
      ],
      carbs: [
        'brown rice', 'quinoa', 'sweet potato', 'oats', 'whole wheat bread',
        'barley', 'buckwheat', 'wild rice', 'millet', 'amaranth'
      ],
      vegetables: [
        'broccoli', 'spinach', 'kale', 'bell peppers', 'carrots',
        'zucchini', 'cauliflower', 'brussels sprouts', 'asparagus', 'tomatoes'
      ],
      fruits: [
        'apple', 'banana', 'berries', 'orange', 'grapes',
        'mango', 'pineapple', 'watermelon', 'strawberries', 'kiwi'
      ]
    }

    res.json({
      category,
      suggestions: suggestions[category] || suggestions.all
    })
  } catch (error) {
    console.error('Get suggestions error:', error)
    res.status(500).json({ message: 'Failed to get suggestions' })
  }
})

// Calculate recipe nutrition
router.post('/recipe-nutrition', auth, async (req, res) => {
  try {
    const { recipe } = req.body

    if (!recipe || !recipe.ingredients) {
      return res.status(400).json({ message: 'Recipe with ingredients is required' })
    }

    // Mock recipe nutrition calculation
    const totalNutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    }

    // Simple mock calculation based on ingredient count
    const ingredientCount = recipe.ingredients.length
    totalNutrition.calories = ingredientCount * 50
    totalNutrition.protein = ingredientCount * 3
    totalNutrition.carbs = ingredientCount * 8
    totalNutrition.fat = ingredientCount * 2
    totalNutrition.fiber = ingredientCount * 1
    totalNutrition.sugar = ingredientCount * 2
    totalNutrition.sodium = ingredientCount * 100

    const servings = recipe.servings || 1
    const nutritionPerServing = {
      calories: Math.round(totalNutrition.calories / servings),
      protein: Math.round(totalNutrition.protein / servings),
      carbs: Math.round(totalNutrition.carbs / servings),
      fat: Math.round(totalNutrition.fat / servings),
      fiber: Math.round(totalNutrition.fiber / servings),
      sugar: Math.round(totalNutrition.sugar / servings),
      sodium: Math.round(totalNutrition.sodium / servings)
    }

    res.json({
      recipe: recipe.name || 'Custom Recipe',
      servings,
      totalNutrition,
      nutritionPerServing,
      ingredients: recipe.ingredients
    })
  } catch (error) {
    console.error('Recipe nutrition error:', error)
    res.status(500).json({ message: 'Failed to calculate recipe nutrition' })
  }
})

export default router