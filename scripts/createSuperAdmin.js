import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'patient'], default: 'user' },
  profile: {
    age: Number,
    gender: String,
    height: Number,
    weight: Number,
    activityLevel: { type: String, default: 'moderately_active' }
  },
  goals: {
    weightGoal: { type: String, default: 'maintain' },
    targetCalories: { type: Number, default: 2000 },
    targetProtein: { type: Number, default: 150 },
    targetCarbs: { type: Number, default: 250 },
    targetFat: { type: Number, default: 70 }
  },
  preferences: {
    mealsPerDay: { type: Number, default: 3 },
    caloriesTolerance: { type: Number, default: 50 }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

const User = mongoose.model('User', UserSchema)

async function createSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    // Check if super admin already exists
    const existingAdmin = await User.findOne({ email: 'superadmin@nutrivision.com' })
    if (existingAdmin) {
      console.log('Super admin already exists')
      return
    }

    // Hash password
    const salt = await bcrypt.genSalt(12)
    const hashedPassword = await bcrypt.hash('SuperAdmin@2024', salt)

    // Create super admin
    const superAdmin = new User({
      name: 'Super Administrator',
      email: 'superadmin@nutrivision.com',
      password: hashedPassword,
      role: 'admin',
      profile: {
        age: 30,
        gender: 'other',
        height: 170,
        weight: 70,
        activityLevel: 'moderately_active'
      },
      goals: {
        weightGoal: 'maintain',
        targetCalories: 2000,
        targetProtein: 150,
        targetCarbs: 250,
        targetFat: 70
      }
    })

    await superAdmin.save()
    console.log('Super admin created successfully!')
    console.log('Email: superadmin@nutrivision.com')
    console.log('Password: SuperAdmin@2024')

  } catch (error) {
    console.error('Error creating super admin:', error)
  } finally {
    await mongoose.disconnect()
  }
}

createSuperAdmin()