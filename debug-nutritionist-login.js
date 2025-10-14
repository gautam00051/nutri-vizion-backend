import mongoose from 'mongoose'
import Nutritionist from './models/Nutritionist.js'

const debugLogin = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/nutri-vision')
    console.log('Connected to MongoDB')

    // Get all nutritionists with passwords
    const nutritionists = await Nutritionist.find().select('+password')
    
    console.log(`Found ${nutritionists.length} nutritionists`)
    
    // Test common passwords for each nutritionist
    const testPasswords = ['password123', 'Password123', 'nutri123', 'test123', 'admin123', '123456']
    
    for (const nutritionist of nutritionists) {
      console.log(`\n📋 Testing ${nutritionist.name} (${nutritionist.email}):`)
      console.log('- isActive:', nutritionist.isActive)
      
      for (const testPassword of testPasswords) {
        try {
          const isMatch = await nutritionist.comparePassword(testPassword)
          if (isMatch) {
            console.log(`🔐 Password "${testPassword}": ✅ MATCH`)
          }
        } catch (error) {
          console.log(`🔐 Password "${testPassword}": ❗ ERROR -`, error.message)
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

debugLogin()