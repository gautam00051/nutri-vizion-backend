import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import Nutritionist from '../models/Nutritionist.js'

dotenv.config()

const seedNutritionists = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    // Clear existing nutritionists
    await Nutritionist.deleteMany({})
    console.log('Cleared existing nutritionists')

    // Sample nutritionists data
    const nutritionists = [
      {
        name: 'Dr. Sarah Johnson',
        firstName: 'Sarah',
        lastName: 'Johnson',
        username: 'sarah.johnson',
        email: 'sarah.johnson@example.com',
        password: await bcrypt.hash('password123', 10),
        phone: '+1-555-0101',
        location: {
          city: 'New York',
          country: 'USA'
        },
        professional: {
          qualification: 'PhD in Nutrition Science',
          certification: 'Registered Dietitian Nutritionist (RDN)',
          license: 'NY-RDN-2020-001',
          specializations: ['Weight Management', 'Diabetes Management', 'Heart Disease'],
          experience: 8,
          consultationFee: 1000
        },
        bio: 'Specialized in weight management and metabolic health with over 8 years of experience helping clients achieve their health goals.',
        consultationRate: 1000,
        yearsOfExperience: 8,
        rating: 4.8,
        reviewCount: 45,
        isVerified: true,
        isActive: true,
        isFeatured: true
      },
      {
        name: 'Dr. Michael Chen',
        firstName: 'Michael',
        lastName: 'Chen',
        username: 'michael.chen',
        email: 'michael.chen@example.com',
        password: await bcrypt.hash('password123', 10),
        phone: '+1-555-0102',
        location: {
          city: 'Los Angeles',
          country: 'USA'
        },
        professional: {
          qualification: 'MS in Clinical Nutrition',
          certification: 'Certified Nutrition Specialist (CNS)',
          license: 'CA-CNS-2019-002',
          specializations: ['Sports Nutrition', 'Vegetarian/Vegan Nutrition', 'Digestive Health'],
          experience: 6,
          consultationFee: 1000
        },
        bio: 'Expert in sports nutrition and plant-based diets, helping athletes and fitness enthusiasts optimize their performance.',
        consultationRate: 1000,
        yearsOfExperience: 6,
        rating: 4.9,
        reviewCount: 38,
        isVerified: true,
        isActive: true,
        isFeatured: true
      },
      {
        name: 'Dr. Emily Rodriguez',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        username: 'emily.rodriguez',
        email: 'emily.rodriguez@example.com',  
        password: await bcrypt.hash('password123', 10),
        phone: '+1-555-0103',
        location: {
          city: 'Miami',
          country: 'USA'
        },
        professional: {
          qualification: 'MS in Nutritional Sciences',
          certification: 'Registered Dietitian (RD)',
          license: 'FL-RD-2021-003',
          specializations: ['Pediatric Nutrition', 'Eating Disorders', 'Clinical Nutrition'],
          experience: 5,
          consultationFee: 1000
        },
        bio: 'Dedicated to helping children and families develop healthy eating habits and overcome nutritional challenges.',
        consultationRate: 1000,
        yearsOfExperience: 5,
        rating: 4.7,
        reviewCount: 32,
        isVerified: true,
        isActive: true,
        isFeatured: false
      },
      {
        name: 'Dr. David Thompson',
        firstName: 'David',
        lastName: 'Thompson',
        username: 'david.thompson',
        email: 'david.thompson@example.com',
        password: await bcrypt.hash('password123', 10),
        phone: '+1-555-0104',
        location: {
          city: 'Chicago',
          country: 'USA'
        },
        professional: {
          qualification: 'PhD in Food Science & Nutrition',
          certification: 'Board Certified Specialist in Sports Dietetics',
          license: 'IL-CSSD-2018-004',
          specializations: ['Geriatric Nutrition', 'Weight Management', 'Heart Disease'],
          experience: 12,
          consultationFee: 1000
        },
        bio: 'Senior nutritionist with extensive experience in geriatric care and chronic disease management.',
        consultationRate: 1000,
        yearsOfExperience: 12,
        rating: 4.6,
        reviewCount: 67,
        isVerified: true,
        isActive: true,
        isFeatured: true
      },
      {
        name: 'Dr. Jennifer Kim',
        firstName: 'Jennifer',
        lastName: 'Kim',
        username: 'jennifer.kim',
        email: 'jennifer.kim@example.com',
        password: await bcrypt.hash('password123', 10),
        phone: '+1-555-0105',
        location: {
          city: 'Seattle',
          country: 'USA'
        },
        professional: {
          qualification: 'MS in Nutrition and Dietetics',
          certification: 'Certified Diabetes Educator (CDE)',
          license: 'WA-CDE-2020-005',
          specializations: ['Diabetes Management', 'Clinical Nutrition', 'Weight Management'],
          experience: 7,
          consultationFee: 1000
        },
        bio: 'Specialized in diabetes management and helping patients achieve better blood sugar control through nutrition.',
        consultationRate: 1000,
        yearsOfExperience: 7,
        rating: 4.8,
        reviewCount: 41,
        isVerified: true,
        isActive: true,
        isFeatured: false
      }
    ]

    // Insert nutritionists
    const result = await Nutritionist.insertMany(nutritionists)
    console.log(`✅ Successfully seeded ${result.length} nutritionists`)

    // Display the created nutritionists
    result.forEach(nutritionist => {
      console.log(`- ${nutritionist.name} (${nutritionist.email})`)
    })

  } catch (error) {
    console.error('❌ Error seeding nutritionists:', error)
  } finally {
    await mongoose.connection.close()
    console.log('Database connection closed')
  }
}

// Run the seed function
seedNutritionists()