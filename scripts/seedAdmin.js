import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import Admin from '../models/Admin.js'

dotenv.config()

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB Atlas')

    // Clear existing admins
    await Admin.deleteMany({})
    console.log('Cleared existing admins')

    // Create default admin
    const adminData = {
      name: 'Super Admin',
      email: 'admin@nutrivision.com',
      password: 'admin123',
      role: 'super_admin',
      permissions: [
        'manage_nutritionists',
        'manage_patients', 
        'manage_appointments',
        'manage_payments',
        'manage_verifications',
        'send_notifications',
        'view_analytics',
        'manage_settings'
      ],
      isActive: true
    }

    const admin = new Admin(adminData)
    await admin.save()
    
    console.log('✅ Successfully created admin account:')
    console.log(`- Email: ${admin.email}`)
    console.log(`- Password: admin123`)
    console.log(`- Role: ${admin.role}`)
    console.log(`- ID: ${admin._id}`)

  } catch (error) {
    console.error('❌ Error seeding admin:', error)
  } finally {
    await mongoose.connection.close()
    console.log('Database connection closed')
  }
}

// Run the seed function
seedAdmin()