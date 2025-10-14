import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const initializeAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (existingAdmin) {
      console.log('Admin account already exists:', existingAdmin.email);
      console.log('Admin ID:', existingAdmin._id);
      return;
    }

    // Create new admin account
    const adminData = {
      name: 'Super Admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
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
    };

    const admin = new Admin(adminData);
    await admin.save();

    console.log('✅ Admin account created successfully!');
    console.log('Email:', admin.email);
    console.log('Admin ID:', admin._id);
    console.log('Role:', admin.role);
    console.log('Permissions:', admin.permissions);
    
  } catch (error) {
    console.error('❌ Error initializing admin:', error.message);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the initialization
initializeAdmin();