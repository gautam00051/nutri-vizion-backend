import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Admin Schema
const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    default: 'Super Admin'
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    default: 'super_admin',
    enum: ['super_admin', 'admin', 'moderator']
  },
  permissions: [{
    type: String,
    enum: [
      'manage_nutritionists',
      'manage_patients', 
      'manage_appointments',
      'manage_payments',
      'manage_verifications',
      'send_notifications',
      'view_analytics',
      'manage_settings'
    ]
  }],
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);

// Admin accounts to create
const adminAccounts = [
  {
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
    phone: '+1234567890'
  },
  {
    name: 'System Administrator',
    email: 'system@nutrivision.com',
    password: 'System@123456',
    role: 'admin',
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
    phone: '+1234567891'
  },
  {
    name: 'Content Moderator',
    email: 'moderator@nutrivision.com',
    password: 'Moderator@123456',
    role: 'moderator',
    permissions: [
      'manage_patients',
      'manage_verifications',
      'send_notifications'
    ],
    phone: '+1234567892'
  },
  {
    name: 'Analytics Manager',
    email: 'analytics@nutrivision.com',
    password: 'Analytics@123456',
    role: 'admin',
    permissions: [
      'view_analytics',
      'manage_settings'
    ],
    phone: '+1234567893'
  }
];

async function createAdminAccounts() {
  try {
    console.log('🚀 Connecting to MongoDB Atlas...\n');
    
    // Connect to MongoDB Atlas using your connection string
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB Atlas successfully!\n');
    console.log('🏗️ Creating admin accounts...\n');
    
    const results = [];
    
    for (const adminData of adminAccounts) {
      try {
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: adminData.email });
        
        if (existingAdmin) {
          console.log(`⚠️  Admin already exists: ${adminData.email}`);
          
          // Update password and other details
          existingAdmin.name = adminData.name;
          existingAdmin.password = adminData.password;
          existingAdmin.role = adminData.role;
          existingAdmin.permissions = adminData.permissions;
          existingAdmin.phone = adminData.phone;
          existingAdmin.isActive = true;
          
          await existingAdmin.save();
          console.log(`🔄 Updated existing admin: ${adminData.email}\n`);
          
          results.push({
            email: adminData.email,
            status: 'updated',
            admin: existingAdmin
          });
        } else {
          // Create new admin
          const newAdmin = new Admin({
            name: adminData.name,
            email: adminData.email,
            password: adminData.password,
            role: adminData.role,
            permissions: adminData.permissions,
            phone: adminData.phone,
            isActive: true
          });
          
          await newAdmin.save();
          console.log(`✅ Created new admin: ${adminData.email}`);
          console.log(`   Name: ${newAdmin.name}`);
          console.log(`   Role: ${newAdmin.role}`);
          console.log(`   Phone: ${newAdmin.phone}`);
          console.log(`   Created: ${newAdmin.createdAt}\n`);
          
          results.push({
            email: adminData.email,
            status: 'created',
            admin: newAdmin
          });
        }
      } catch (error) {
        console.error(`❌ Error processing admin ${adminData.email}:`, error.message);
        results.push({
          email: adminData.email,
          status: 'error',
          error: error.message
        });
      }
    }
    
    // Summary
    console.log('\n🎉 ADMIN CREATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const created = results.filter(r => r.status === 'created');
    const updated = results.filter(r => r.status === 'updated');
    const errors = results.filter(r => r.status === 'error');
    
    console.log(`✅ Created: ${created.length} accounts`);
    console.log(`🔄 Updated: ${updated.length} accounts`);
    console.log(`❌ Errors: ${errors.length} accounts`);
    
    console.log('\n🔑 LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    adminAccounts.forEach(admin => {
      const result = results.find(r => r.email === admin.email);
      const status = result?.status === 'error' ? '❌' : '✅';
      
      console.log(`${status} ${admin.name}:`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${admin.password}`);
      console.log(`   Role: ${admin.role}`);
      console.log('');
    });
    
    // Verify all admins in database
    console.log('🔍 VERIFICATION - All Admins in Database:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const allAdmins = await Admin.find({});
    console.log(`Total admins in database: ${allAdmins.length}\n`);
    
    allAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.isActive}`);
      console.log(`   Created: ${admin.createdAt}`);
      console.log(`   Permissions: ${admin.permissions.join(', ')}`);
      console.log('');
    });
    
    console.log('🌐 FRONTEND ACCESS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Navigate to: http://localhost:3000/login');
    console.log('2. Select: "Admin" radio button');
    console.log('3. Use primary credentials:');
    console.log('   Email: admin@nutrivision.com');
    console.log('   Password: Admin@123456');
    console.log('4. Access admin dashboard at: /admin/dashboard');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Connection Issue Solutions:');
      console.log('1. Check your internet connection');
      console.log('2. Verify MongoDB Atlas cluster is running');
      console.log('3. Check if your IP is whitelisted in MongoDB Atlas');
      console.log('4. Verify the MONGODB_URI in your .env file');
    }
    
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from MongoDB Atlas');
    }
    process.exit(0);
  }
}

// Test admin login function
async function testAdminLogin(email, password) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin) {
      console.log(`❌ Admin not found: ${email}`);
      return false;
    }
    
    const isMatch = await admin.comparePassword(password);
    
    if (isMatch) {
      console.log(`✅ Login test successful for: ${email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.isActive}`);
      return true;
    } else {
      console.log(`❌ Password incorrect for: ${email}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Login test error:', error);
    return false;
  }
}

// Run the script
console.log('🔐 NUTRI-VISION ADMIN ACCOUNT CREATOR');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📅 Date:', new Date().toLocaleString());
console.log('🗄️  Database:', process.env.MONGODB_URI?.split('@')[1]?.split('/')[0] || 'MongoDB Atlas');
console.log('');

// Check if we should run tests
const args = process.argv.slice(2);
if (args.includes('--test')) {
  // Test login for primary admin
  console.log('🧪 Running login tests...\n');
  mongoose.connect(process.env.MONGODB_URI).then(async () => {
    await testAdminLogin('admin@nutrivision.com', 'Admin@123456');
    await mongoose.disconnect();
    process.exit(0);
  });
} else {
  // Create admin accounts
  createAdminAccounts();
}