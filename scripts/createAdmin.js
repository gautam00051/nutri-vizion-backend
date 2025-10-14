import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

// Load environment variables
dotenv.config();

const createAdminAccount = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@nutrivision.com' });
    
    if (existingAdmin) {
      console.log('Admin account already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Name:', existingAdmin.name);
      console.log('Role:', existingAdmin.role);
      console.log('Active:', existingAdmin.isActive);
      console.log('Created:', existingAdmin.createdAt);
      
      // Update password to known value
      existingAdmin.password = 'Admin@123456';
      await existingAdmin.save();
      console.log('\n✅ Admin password has been reset to: Admin@123456');
    } else {
      // Create new admin account
      const adminData = {
        name: 'Super Administrator',
        email: 'admin@nutrivision.com',
        password: 'Admin@123456',
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
        isActive: true,
        phone: '+1234567890'
      };

      const admin = new Admin(adminData);
      await admin.save();

      console.log('✅ Admin account created successfully!');
      console.log('\n📋 Admin Account Details:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Name: ${admin.name}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Password: Admin@123456`);
      console.log(`Role: ${admin.role}`);
      console.log(`Active: ${admin.isActive}`);
      console.log(`Phone: ${admin.phone}`);
      console.log(`Created: ${admin.createdAt}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    console.log('\n🔑 Login Credentials:');
    console.log('Email: admin@nutrivision.com');
    console.log('Password: Admin@123456');
    console.log('\n📍 Admin Login URL: http://localhost:3000/admin/login');

  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    
    if (error.code === 11000) {
      console.log('\n💡 Admin with this email already exists. Checking existing account...');
      try {
        const existingAdmin = await Admin.findOne({ email: 'admin@nutrivision.com' });
        if (existingAdmin) {
          console.log('\n📋 Existing Admin Account:');
          console.log(`Name: ${existingAdmin.name}`);
          console.log(`Email: ${existingAdmin.email}`);
          console.log(`Role: ${existingAdmin.role}`);
          console.log(`Active: ${existingAdmin.isActive}`);
          console.log('\n🔄 Resetting password to: Admin@123456');
          
          existingAdmin.password = 'Admin@123456';
          await existingAdmin.save();
          console.log('✅ Password reset successfully!');
        }
      } catch (findError) {
        console.error('Error finding existing admin:', findError.message);
      }
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Alternative admin accounts (you can uncomment to create multiple admins)
const createMultipleAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminAccounts = [
      {
        name: 'Super Administrator',
        email: 'admin@nutrivision.com',
        password: 'Admin@123456',
        role: 'super_admin'
      },
      {
        name: 'System Administrator',
        email: 'system@nutrivision.com', 
        password: 'System@123456',
        role: 'admin'
      },
      {
        name: 'Content Moderator',
        email: 'moderator@nutrivision.com',
        password: 'Moderator@123456', 
        role: 'moderator',
        permissions: ['manage_patients', 'manage_verifications', 'send_notifications']
      }
    ];

    for (const adminData of adminAccounts) {
      const existing = await Admin.findOne({ email: adminData.email });
      
      if (!existing) {
        const admin = new Admin({
          ...adminData,
          isActive: true,
          permissions: adminData.permissions || [
            'manage_nutritionists',
            'manage_patients', 
            'manage_appointments',
            'manage_payments',
            'manage_verifications',
            'send_notifications',
            'view_analytics',
            'manage_settings'
          ]
        });
        
        await admin.save();
        console.log(`✅ Created admin: ${admin.email}`);
      } else {
        console.log(`⚠️ Admin exists: ${adminData.email}`);
      }
    }

    console.log('\n🔑 Admin Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    adminAccounts.forEach(admin => {
      console.log(`${admin.name}:`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Password: ${admin.password}`);
      console.log(`  Role: ${admin.role}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error creating admin accounts:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
console.log('🚀 Starting Admin Account Creation...\n');

// Check command line argument
const args = process.argv.slice(2);
if (args.includes('--multiple')) {
  createMultipleAdmins();
} else {
  createAdminAccount();
}