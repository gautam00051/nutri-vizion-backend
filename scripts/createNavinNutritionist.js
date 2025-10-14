import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import Nutritionist from '../models/Nutritionist.js'

dotenv.config()

const createNavinNutritionist = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB Atlas')

    // Check if navin115@gmail.com already exists
    const existing = await Nutritionist.findOne({ email: 'navin115@gmail.com' })
    if (existing) {
      console.log('✅ Navin nutritionist already exists')
      return
    }

    // Create Navin's nutritionist account
    const hashedPassword = await bcrypt.hash('password123', 12)
    
    const navinNutritionist = new Nutritionist({
      name: 'Navin Shah',
      firstName: 'Navin',
      lastName: 'Shah',
      username: 'navin.shah',
      email: 'navin115@gmail.com',
      password: hashedPassword,
      phone: '+1-555-0199',
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India'
      },
      professional: {
        qualification: 'MS in Nutrition and Dietetics',
        certification: 'Registered Dietitian Nutritionist (RDN)',
        license: 'IN-RDN-2023-009',
        specializations: ['Weight Management', 'Sports Nutrition', 'General Nutrition'],
        experience: 3,
        consultationFee: 1000,
        bio: 'Passionate about helping clients achieve their health goals through personalized nutrition plans and lifestyle changes.'
      },
      bio: 'Experienced nutritionist specializing in weight management and sports nutrition.',
      consultationRate: 1000,
      yearsOfExperience: 3,
      rating: 4.7,
      reviewCount: 25,
      isVerified: true,
      isActive: true,
      isFeatured: false
    })

    await navinNutritionist.save()
    
    console.log('✅ Successfully created Navin nutritionist account:')
    console.log(`- Name: ${navinNutritionist.name}`)
    console.log(`- Email: ${navinNutritionist.email}`)
    console.log(`- ID: ${navinNutritionist._id}`)
    console.log(`- Verified: ${navinNutritionist.isVerified}`)
    console.log(`- Active: ${navinNutritionist.isActive}`)

  } catch (error) {
    console.error('❌ Error creating Navin nutritionist:', error)
  } finally {
    await mongoose.connection.close()
    console.log('Database connection closed')
  }
}

createNavinNutritionist()