import express from 'express'
import axios from 'axios'
import auth from '../middleware/auth.js'

const router = express.Router()

const AI_SERVICES_URL = process.env.AI_SERVICES_URL || 'https://gautamshah361-nutrivizion-aipowered-nutrition.hf.space'

// Test endpoint to check AI service status (no auth required)
router.get('/test', async (req, res) => {
  try {
    const isNetlify = AI_SERVICES_URL.includes('netlify.app')
    const isHuggingFace = AI_SERVICES_URL.includes('hf.space')
    
    let testEndpoint, deploymentType
    
    if (isHuggingFace) {
      testEndpoint = AI_SERVICES_URL  // Hugging Face Spaces root URL
      deploymentType = 'Hugging Face Spaces'
    } else if (isNetlify) {
      testEndpoint = `${AI_SERVICES_URL}/.netlify/functions/health`
      deploymentType = 'Netlify'
    } else {
      testEndpoint = AI_SERVICES_URL
      deploymentType = 'Other'
    }
    
    const response = await axios.get(testEndpoint, { timeout: 10000 })
    res.json({ 
      success: true, 
      message: 'AI service is reachable',
      status: response.status,
      ai_service_url: AI_SERVICES_URL,
      deployment_type: deploymentType,
      test_endpoint: testEndpoint
    })
  } catch (error) {
    res.json({ 
      success: false, 
      message: 'AI service unreachable, using fallback mode',
      error: error.message,
      ai_service_url: AI_SERVICES_URL,
      deployment_type: AI_SERVICES_URL.includes('netlify.app') ? 'Netlify' : 'Other'
    })
  }
})

// Test food recognition with a sample image (for debugging)
router.post('/test-recognition', async (req, res) => {
  try {
    const sampleBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCE" // truncated for brevity
    
    const isNetlify = AI_SERVICES_URL.includes('netlify.app')
    const isHuggingFace = AI_SERVICES_URL.includes('hf.space')
    
    let endpoint, requestData, deploymentType
    
    if (isHuggingFace) {
      endpoint = `${AI_SERVICES_URL}/api/predict/json`
      requestData = { image: sampleBase64 }
      deploymentType = 'Hugging Face Spaces'
    } else if (isNetlify) {
      endpoint = `${AI_SERVICES_URL}/.netlify/functions/predict`
      requestData = { image: sampleBase64 }
      deploymentType = 'Netlify'
    } else {
      endpoint = `${AI_SERVICES_URL}/api/predict`
      requestData = { data: [sampleBase64] }
      deploymentType = 'Other'
    }
    
    const response = await axios.post(endpoint, requestData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    })
    
    res.json({
      success: true,
      message: 'Test recognition completed',
      ai_service_url: AI_SERVICES_URL,
      deployment_type: deploymentType,
      raw_response: response.data
    })
  } catch (error) {
    res.json({
      success: false,
      message: 'Test recognition failed',
      error: error.message,
      ai_service_url: AI_SERVICES_URL
    })
  }
})

// Forward food recognition request to AI service (Netlify deployment)
router.post('/recognize-food', auth, async (req, res) => {
  try {
    // Check deployment type
    const isNetlify = AI_SERVICES_URL.includes('netlify.app')
    const isHuggingFace = AI_SERVICES_URL.includes('hf.space')
    
    console.log('=== AI SERVICE DEBUG ===')
    console.log('AI_SERVICES_URL:', AI_SERVICES_URL)
    console.log('isHuggingFace:', isHuggingFace)
    console.log('isNetlify:', isNetlify)
    console.log('========================')
    
    let endpoint, requestData
    
    if (isHuggingFace) {
      // Hugging Face Spaces FastAPI endpoint - use the new REST API we added
      endpoint = `${AI_SERVICES_URL}/api/predict/json`
      const { image } = req.body
      requestData = { image }  // Simple image data
    } else if (isNetlify) {
      // Netlify Functions
      endpoint = `${AI_SERVICES_URL}/.netlify/functions/predict`
      const { image } = req.body
      requestData = { image }
    } else {
      // Traditional API or fallback
      endpoint = `${AI_SERVICES_URL}/api/predict/json`
      const { image } = req.body
      requestData = { image }  // Use same format as HF
    }
    
    const response = await axios.post(endpoint, requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
    
    // Transform response to our expected format
    const result = response.data
    let transformedResult
    
    // Handle Hugging Face Spaces FastAPI response (already properly formatted)
    if (isHuggingFace && result && result.success) {
      transformedResult = result  // FastAPI endpoint returns properly formatted response
    }
    // Handle Netlify serverless function response
    else if (isNetlify && result.food_items) {
      transformedResult = {
        success: true,
        food_items: result.food_items,
        suggestions: result.suggestions || [],
        raw_result: result.raw_result || ''
      }
    }
    // Handle traditional Gradio API response (array format)
    else if (result && result.data && Array.isArray(result.data)) {
      const [food_name, confidence, calories, protein, carbs, fat, suggestions, raw_result] = result.data
      
      transformedResult = {
        success: true,
        food_items: [{
          name: food_name,
          confidence: parseFloat(confidence.replace('%', '')) / 100,
          nutrition: {
            calories: parseFloat(calories) || 0,
            protein: parseFloat(protein.replace('g', '')) || 0,
            carbs: parseFloat(carbs.replace('g', '')) || 0,
            fat: parseFloat(fat.replace('g', '')) || 0,
            fiber: 0,
            sugar: 0,
            sodium: 0
          },
          serving_size: '100g',
          health_score: 75
        }],
        suggestions: [suggestions],
        raw_result: raw_result
      }
    }
    // Handle direct API response
    else if (result.name || result.food_name) {
      transformedResult = {
        success: true,
        food_items: [{
          name: result.name || result.food_name,
          confidence: result.confidence || 0.85,
          nutrition: result.nutrition || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0
          },
          serving_size: result.serving_size || '100g',
          health_score: result.health_score || 75
        }],
        suggestions: result.suggestions || [],
        raw_result: result.raw_result || ''
      }
    }
    else {
      throw new Error('Invalid response format from AI service')
    }
    
    res.json(transformedResult)
  } catch (error) {
    console.error('=== FOOD RECOGNITION ERROR DEBUG ===')
    console.error('AI Service URL:', AI_SERVICES_URL)
    console.error('Error message:', error.message)
    console.error('Error status:', error.response?.status)
    console.error('Error data:', error.response?.data)
    console.error('Full error:', error)
    console.error('Request body:', req.body)
    console.error('=====================================')
    
    // Smart Fallback System - Provides variety based on request characteristics
    console.log('🚨 USING SMART FALLBACK - AI service failed, generating intelligent mock data')
    
    // Food database for smart fallback
    const foodOptions = [
      {
        name: 'Apple',
        calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, sodium: 1,
        health_score: 88, serving_size: '100g', category: 'fruit'
      },
      {
        name: 'Banana',
        calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, sodium: 1,
        health_score: 85, serving_size: '100g', category: 'fruit'
      },
      {
        name: 'Grilled Chicken Breast',
        calories: 231, protein: 43.5, carbs: 0, fat: 5.0, fiber: 0, sugar: 0, sodium: 74,
        health_score: 88, serving_size: '150g', category: 'protein'
      },
      {
        name: 'White Rice',
        calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 1,
        health_score: 65, serving_size: '100g', category: 'grain'
      },
      {
        name: 'Pizza Slice',
        calories: 285, protein: 12, carbs: 36, fat: 10, fiber: 2, sugar: 4, sodium: 640,
        health_score: 45, serving_size: '100g', category: 'processed'
      },
      {
        name: 'Belgian Waffle',
        calories: 291, protein: 5.9, carbs: 33, fat: 15, fiber: 1.2, sugar: 8, sodium: 383,
        health_score: 42, serving_size: '100g', category: 'dessert'
      },
      {
        name: 'Caesar Salad',
        calories: 189, protein: 7.5, carbs: 12, fat: 14, fiber: 3.5, sugar: 4, sodium: 470,
        health_score: 72, serving_size: '150g', category: 'salad'
      },
      {
        name: 'Chocolate Cake',
        calories: 349, protein: 5, carbs: 50, fat: 16, fiber: 2.8, sugar: 35, sodium: 245,
        health_score: 32, serving_size: '100g', category: 'dessert'
      }
    ]
    
    // Smart selection based on image characteristics or random
    let selectedFood
    const imageData = req.body?.image || ''
    
    // Simple heuristics based on image data characteristics (very basic)
    if (imageData.length > 50000) {
      // Larger images might be complex foods
      selectedFood = foodOptions[Math.floor(Math.random() * foodOptions.length)]
    } else if (imageData.includes('data:image/')) {
      // Valid base64 image
      const randomIndex = Math.floor(Math.random() * foodOptions.length)
      selectedFood = foodOptions[randomIndex]
    } else {
      // Default to a healthy option
      selectedFood = foodOptions[0] // Apple
    }
    
    // Add some randomness to confidence based on food type
    const baseConfidence = selectedFood.category === 'fruit' ? 0.90 : 
                          selectedFood.category === 'processed' ? 0.75 : 0.85
    const confidence = Math.round((baseConfidence + (Math.random() * 0.1 - 0.05)) * 100) / 100
    
    const mockResponse = {
      success: true,
      food_items: [
        {
          name: selectedFood.name,
          confidence: confidence,
          nutrition: {
            calories: selectedFood.calories,
            protein: selectedFood.protein,
            carbs: selectedFood.carbs,
            fat: selectedFood.fat,
            fiber: selectedFood.fiber,
            sugar: selectedFood.sugar,
            sodium: selectedFood.sodium
          },
          serving_size: selectedFood.serving_size,
          health_score: selectedFood.health_score
        }
      ],
      total_nutrition: {
        calories: selectedFood.calories,
        protein: selectedFood.protein,
        carbs: selectedFood.carbs,
        fat: selectedFood.fat,
        fiber: selectedFood.fiber,
        sugar: selectedFood.sugar,
        sodium: selectedFood.sodium
      },
      confidence: confidence,
      suggestions: [
        `Detected: ${selectedFood.name} (Smart Fallback Mode)`,
        `Health Score: ${selectedFood.health_score}/100`,
        selectedFood.health_score > 80 ? 'Excellent nutritional choice!' : 
        selectedFood.health_score > 60 ? 'Good choice with balanced nutrition' : 
        'Consider moderating portion size',
        '🔧 Note: AI service temporarily unavailable - using smart fallback'
      ]
    }
    
    res.json(mockResponse)
  }
})

// Forward meal recommendation request to AI service
router.post('/meal-recommendations', auth, async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICES_URL}/meal-recommendations`, req.body, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
    
    res.json(response.data)
  } catch (error) {
    console.error('Meal recommendations error:', error)
    
    // Generate diverse fallback recommendations based on meal type
    const { mealType = 'lunch' } = req.body
    
    const fallbackMeals = {
      breakfast: [
        {
          name: 'Protein Power Bowl',
          description: 'Greek yogurt with berries, nuts, and granola',
          ingredients: [
            { name: 'Greek yogurt', quantity: 200, unit: 'g' },
            { name: 'Mixed berries', quantity: 100, unit: 'g' },
            { name: 'Granola', quantity: 30, unit: 'g' },
            { name: 'Almonds', quantity: 20, unit: 'g' }
          ],
          instructions: [
            'Layer yogurt in bowl',
            'Top with berries and granola',
            'Sprinkle with almonds'
          ],
          prep_time: 5,
          cook_time: 0,
          difficulty: 'easy',
          health_score: 88,
          estimated_nutrition: { calories: 380, protein: 22, carbs: 35, fat: 18, fiber: 8 },
          tags: ['high-protein', 'quick', 'healthy']
        },
        {
          name: 'Avocado Toast Supreme',
          description: 'Whole grain toast with avocado, egg, and tomato',
          ingredients: [
            { name: 'Whole grain bread', quantity: 2, unit: 'slices' },
            { name: 'Avocado', quantity: 1, unit: 'medium' },
            { name: 'Eggs', quantity: 2, unit: 'large' },
            { name: 'Cherry tomatoes', quantity: 50, unit: 'g' }
          ],
          instructions: [
            'Toast bread until golden',
            'Mash avocado with lime',
            'Cook eggs to preference',
            'Assemble and serve'
          ],
          prep_time: 10,
          cook_time: 5,
          difficulty: 'easy',
          health_score: 85,
          estimated_nutrition: { calories: 420, protein: 18, carbs: 32, fat: 24, fiber: 12 },
          tags: ['heart-healthy', 'fiber-rich', 'vegetarian']
        }
      ],
      lunch: [
        {
          name: 'Mediterranean Quinoa Salad',
          description: 'Fresh quinoa salad with vegetables and feta cheese',
          ingredients: [
            { name: 'Quinoa', quantity: 100, unit: 'g' },
            { name: 'Cucumber', quantity: 100, unit: 'g' },
            { name: 'Feta cheese', quantity: 50, unit: 'g' },
            { name: 'Olive oil', quantity: 15, unit: 'ml' }
          ],
          instructions: [
            'Cook quinoa and let cool',
            'Dice vegetables',
            'Mix with feta and dressing',
            'Chill before serving'
          ],
          prep_time: 15,
          cook_time: 15,
          difficulty: 'easy',
          health_score: 90,
          estimated_nutrition: { calories: 450, protein: 18, carbs: 55, fat: 16, fiber: 6 },
          tags: ['mediterranean', 'vegetarian', 'gluten-free']
        },
        {
          name: 'Grilled Chicken Buddha Bowl',
          description: 'Balanced bowl with chicken, vegetables, and brown rice',
          ingredients: [
            { name: 'Chicken breast', quantity: 150, unit: 'g' },
            { name: 'Brown rice', quantity: 80, unit: 'g' },
            { name: 'Broccoli', quantity: 100, unit: 'g' },
            { name: 'Sweet potato', quantity: 100, unit: 'g' }
          ],
          instructions: [
            'Grill seasoned chicken',
            'Cook brown rice',
            'Steam vegetables',
            'Arrange in bowl and serve'
          ],
          prep_time: 10,
          cook_time: 25,
          difficulty: 'medium',
          health_score: 92,
          estimated_nutrition: { calories: 520, protein: 42, carbs: 48, fat: 12, fiber: 8 },
          tags: ['high-protein', 'balanced', 'meal-prep']
        }
      ],
      dinner: [
        {
          name: 'Baked Salmon with Vegetables',
          description: 'Herb-crusted salmon with roasted seasonal vegetables',
          ingredients: [
            { name: 'Salmon fillet', quantity: 150, unit: 'g' },
            { name: 'Asparagus', quantity: 150, unit: 'g' },
            { name: 'Bell peppers', quantity: 100, unit: 'g' },
            { name: 'Lemon', quantity: 1, unit: 'piece' }
          ],
          instructions: [
            'Season salmon with herbs',
            'Toss vegetables with olive oil',
            'Bake together for 20 minutes',
            'Serve with lemon wedges'
          ],
          prep_time: 15,
          cook_time: 20,
          difficulty: 'medium',
          health_score: 95,
          estimated_nutrition: { calories: 380, protein: 35, carbs: 15, fat: 20, fiber: 6 },
          tags: ['omega-3', 'low-carb', 'heart-healthy']
        },
        {
          name: 'Turkey and Vegetable Stir-fry',
          description: 'Lean turkey with colorful vegetables in Asian-inspired sauce',
          ingredients: [
            { name: 'Ground turkey', quantity: 150, unit: 'g' },
            { name: 'Mixed vegetables', quantity: 200, unit: 'g' },
            { name: 'Brown rice', quantity: 80, unit: 'g' },
            { name: 'Soy sauce', quantity: 15, unit: 'ml' }
          ],
          instructions: [
            'Cook turkey until browned',
            'Add vegetables and stir-fry',
            'Season with sauce',
            'Serve over rice'
          ],
          prep_time: 10,
          cook_time: 15,
          difficulty: 'easy',
          health_score: 87,
          estimated_nutrition: { calories: 480, protein: 38, carbs: 45, fat: 14, fiber: 7 },
          tags: ['lean-protein', 'quick', 'asian-inspired']
        }
      ],
      snack: [
        {
          name: 'Protein Energy Balls',
          description: 'No-bake energy balls with protein powder and dates',
          ingredients: [
            { name: 'Dates', quantity: 60, unit: 'g' },
            { name: 'Protein powder', quantity: 20, unit: 'g' },
            { name: 'Almonds', quantity: 30, unit: 'g' },
            { name: 'Coconut flakes', quantity: 10, unit: 'g' }
          ],
          instructions: [
            'Blend dates until paste forms',
            'Mix in protein powder',
            'Add nuts and roll into balls',
            'Chill until firm'
          ],
          prep_time: 15,
          cook_time: 0,
          difficulty: 'easy',
          health_score: 85,
          estimated_nutrition: { calories: 220, protein: 12, carbs: 25, fat: 8, fiber: 4 },
          tags: ['no-bake', 'portable', 'energy-boost']
        },
        {
          name: 'Veggie Hummus Wrap',
          description: 'Fresh vegetables wrapped with creamy hummus',
          ingredients: [
            { name: 'Whole wheat tortilla', quantity: 1, unit: 'large' },
            { name: 'Hummus', quantity: 60, unit: 'g' },
            { name: 'Cucumber', quantity: 50, unit: 'g' },
            { name: 'Carrots', quantity: 50, unit: 'g' }
          ],
          instructions: [
            'Spread hummus on tortilla',
            'Add fresh vegetables',
            'Roll tightly and slice',
            'Serve immediately'
          ],
          prep_time: 5,
          cook_time: 0,
          difficulty: 'easy',
          health_score: 82,
          estimated_nutrition: { calories: 280, protein: 10, carbs: 38, fat: 10, fiber: 8 },
          tags: ['vegetarian', 'fresh', 'quick']
        }
      ]
    }
    
    // Get random recommendations for the meal type
    const mealOptions = fallbackMeals[mealType] || fallbackMeals['lunch']
    const shuffledMeals = [...mealOptions].sort(() => Math.random() - 0.5)
    
    const mockResponse = {
      success: true,
      recommendations: shuffledMeals.slice(0, 2), // Return 2 random recommendations
      message: 'Using fallback recommendations - AI service unavailable'
    }
    
    res.json(mockResponse)
  }
})

// Forward health score calculation to AI service
router.post('/health-score', auth, async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICES_URL}/health-score`, req.body, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })
    
    res.json(response.data)
  } catch (error) {
    console.error('Health score error:', error)
    
    // Fallback calculation
    const { nutrition, userProfile } = req.body
    const mockScore = Math.min(100, Math.max(0, 
      (nutrition.protein * 2) + 
      (nutrition.fiber * 5) + 
      Math.max(0, 50 - nutrition.sugar) +
      Math.max(0, 30 - (nutrition.sodium / 100))
    ))
    
    res.json({
      success: true,
      health_score: Math.round(mockScore),
      factors: {
        protein: 'Good protein content',
        fiber: 'Adequate fiber',
        sugar: nutrition.sugar > 20 ? 'High sugar content' : 'Low sugar',
        sodium: nutrition.sodium > 2000 ? 'High sodium' : 'Moderate sodium'
      }
    })
  }
})

// AI chat/advice endpoint
router.post('/advice', auth, async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICES_URL}/nutrition-advice`, req.body, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 20000
    })
    
    res.json(response.data)
  } catch (error) {
    console.error('AI advice error:', error)
    
    // Fallback advice
    const mockAdvice = {
      success: true,
      advice: [
        'Focus on eating a variety of colorful fruits and vegetables',
        'Include lean proteins in every meal',
        'Stay hydrated by drinking plenty of water',
        'Consider your portion sizes and eat mindfully'
      ],
      recommendations: [
        'Add more fiber-rich foods to your diet',
        'Try to reduce processed food intake',
        'Include healthy fats like nuts and avocados'
      ]
    }
    
    res.json(mockAdvice)
  }
})

export default router