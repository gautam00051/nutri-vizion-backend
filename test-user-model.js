// Test user creation directly with the User model
import mongoose from 'mongoose'
import User from './models/User.js'

const testUserCreation = async () => {
  try {
    console.log('Testing user creation...')
    
    await mongoose.connect('mongodb://localhost:27017/nutri-vision', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    
    console.log('✅ MongoDB Connected')
    
    // Create a test user
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    }
    
    // Check if user exists first
    const existingUser = await User.findOne({ email: userData.email })
    if (existingUser) {
      console.log('User already exists, deleting...')
      await User.deleteOne({ email: userData.email })
    }
    
    const user = new User(userData)
    const savedUser = await user.save()
    
    console.log('✅ User created successfully:', {
      id: savedUser._id,
      name: savedUser.name,
      email: savedUser.email
    })
    
    // Verify user exists in database
    const users = await User.find({})
    console.log(`✅ Total users in database: ${users.length}`)
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Name: ${user.name}, Email: ${user.email}`)
    })
    
    await mongoose.disconnect()
    console.log('✅ MongoDB disconnected')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testUserCreation()