import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Nutritionist from '../models/Nutritionist.js'

dotenv.config()

const checkNutritionist = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB Atlas')

    // Find your nutritionist account
    const navin = await Nutritionist.findOne({ email: 'navin115@gmail.com' })
    
    if (navin) {
      console.log('✅ Found Navin nutritionist:')
      console.log(`- Name: ${navin.name}`)
      console.log(`- Email: ${navin.email}`)
      console.log(`- Verified: ${navin.isVerified}`)
      console.log(`- Active: ${navin.isActive}`)
      console.log(`- ID: ${navin._id}`)
    } else {
      console.log('❌ Navin nutritionist not found')
    }

    // Get total count of nutritionists
    const total = await Nutritionist.countDocuments()
    console.log(`📊 Total nutritionists in database: ${total}`)

    // Get verified and active nutritionists (what shows in directory)
    const verified = await Nutritionist.countDocuments({ isVerified: true, isActive: true })
    console.log(`✅ Verified & active nutritionists: ${verified}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.connection.close()
    console.log('Database connection closed')
  }
}

checkNutritionist()