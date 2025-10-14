// Debug nutritionist data
import mongoose from 'mongoose';
import Nutritionist from './models/Nutritionist.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugNutritionists() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const nutritionists = await Nutritionist.find({});
        console.log('Found nutritionists:', nutritionists.length);
        
        for (const nutritionist of nutritionists) {
            console.log('---');
            console.log('ID:', nutritionist._id);
            console.log('Name:', nutritionist.name);
            console.log('Email:', nutritionist.email);
            console.log('IsActive:', nutritionist.isActive);
            console.log('Has Password:', !!nutritionist.password);
        }
        
        // Test creating a new nutritionist
        const testEmail = 'nutritionist@test.com';
        const existing = await Nutritionist.findOne({ email: testEmail });
        
        if (existing) {
            console.log('\nTesting password for existing nutritionist...');
            const isMatch = await existing.comparePassword('password123');
            console.log('Password match:', isMatch);
        } else {
            console.log('\nNo test nutritionist found, creating one...');
            const newNutritionist = new Nutritionist({
                name: 'Test Nutritionist',
                firstName: 'Test',
                lastName: 'Nutritionist',
                username: 'testnutritionist',
                email: testEmail,
                password: 'password123',
                phone: '+1234567890',
                location: {
                    city: 'Test City',
                    country: 'Test Country'
                },
                professional: {
                    specialization: 'Weight Management',
                    experience: 5,
                    education: 'Test Education',
                    certifications: ['Test Cert'],
                    qualification: 'Masters in Nutrition'
                }
            });
            
            await newNutritionist.save();
            console.log('Test nutritionist created successfully');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

debugNutritionists();