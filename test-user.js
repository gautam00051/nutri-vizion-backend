// Test script to register a user and check MongoDB
import fetch from 'node-fetch'
import mongoose from 'mongoose'

const MONGODB_URI = 'mongodb://localhost:27017'
const DATABASE_NAME = 'nutri-vision'

async function testUserRegistration() {
  try {
    console.log('Testing user registration...')
    
    // Test user data
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    }
    
    // Register user via API
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ User registration successful:', result)
    } else {
      const error = await response.text()
      console.log('❌ User registration failed:', error)
    }
    
    // Check MongoDB directly
    console.log('\nChecking MongoDB directly...')
    await mongoose.connect(MONGODB_URI)
    
    const db = mongoose.connection.db
    const users = await db.collection('users').find({}).toArray()
    
    console.log(`Found ${users.length} users in database:`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. Name: ${user.name}, Email: ${user.email}`)
    })
    
    await mongoose.disconnect()
    
  } catch (error) {
    console.error('Error during test:', error)
  }
}

testUserRegistration()