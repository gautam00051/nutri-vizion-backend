import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Connect directly to MongoDB
const MONGODB_URI = 'mongodb+srv://gautamshah361_db_user:Gautam55shah123@cluster0.jtoutdu.mongodb.net/nutri-vision?retryWrites=true&w=majority';

// Nutritionist Schema
const nutritionistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  location: {
    city: String,
    state: String,
    country: String,
    address: String
  },
  professional: {
    qualification: String,
    university: String,
    experience: Number,
    specializations: [String],
    licenseNumber: String,
    bio: String
  },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: true },
  rating: { type: Number, default: 4.5 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

// Hash password before saving
nutritionistSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const Nutritionist = mongoose.model('Nutritionist', nutritionistSchema);

async function createNavinNutritionist() {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB Atlas');

    // Check if nutritionist already exists
    const existingNutritionist = await Nutritionist.findOne({ email: 'navin115@gmail.com' });
    if (existingNutritionist) {
      console.log('⚠️  Nutritionist navin115@gmail.com already exists');
      console.log('📧 Email:', existingNutritionist.email);
      console.log('👤 Name:', existingNutritionist.name);
      console.log('✅ Verified:', existingNutritionist.isVerified);
      console.log('🟢 Active:', existingNutritionist.isActive);
      return;
    }

    // Create navin nutritionist
    const navinNutritionist = new Nutritionist({
      name: 'Navin Kumar',
      firstName: 'Navin',
      lastName: 'Kumar',
      username: 'navin115',
      email: 'navin115@gmail.com',
      password: 'Navin123!', // Will be hashed by the pre-save hook
      phone: '+919876543210',
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        address: '123 Health Street, Mumbai'
      },
      professional: {
        qualification: 'MSc Nutrition & Dietetics',
        university: 'Mumbai University',
        experience: 5,
        specializations: [
          'Weight Management',
          'Sports Nutrition',
          'Clinical Nutrition',
          'Diabetes Management'
        ],
        licenseNumber: 'NUT-MH-2019-001',
        bio: 'Experienced nutritionist specializing in weight management and sports nutrition. Helped over 500 clients achieve their health goals through personalized meal plans and lifestyle coaching.'
      },
      isActive: true,
      isVerified: true,
      rating: 4.7,
      reviewCount: 23
    });

    await navinNutritionist.save();
    console.log('🎉 Navin nutritionist created successfully!');
    console.log('📧 Email: navin115@gmail.com');
    console.log('🔑 Password: Navin123!');
    console.log('✅ Account is verified and active');
    console.log('⭐ Rating: 4.7/5 (23 reviews)');
    
  } catch (error) {
    console.error('❌ Error creating navin nutritionist:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

createNavinNutritionist();