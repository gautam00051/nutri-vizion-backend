// Check nutritionist IDs and appointments mapping
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkNutritionistMapping() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const db = mongoose.connection.db;
        
        // Get all nutritionists
        const nutritionists = await db.collection('nutritionists').find({}).toArray();
        console.log('\n--- All Nutritionists ---');
        nutritionists.forEach(nut => {
            console.log(`${nut.name} (${nut.email}) - ID: ${nut._id}`);
        });
        
        // Get all appointments and their nutritionist assignments
        const appointments = await db.collection('appointments').find({}).toArray();
        console.log('\n--- All Appointments ---');
        appointments.forEach(apt => {
            console.log(`Appointment ${apt._id}:`);
            console.log(`  Patient ID: ${apt.patientId}`);
            console.log(`  Nutritionist ID: ${apt.nutritionistId}`);
            console.log(`  Status: ${apt.approvalStatus} | Communication: ${apt.communicationEnabled}`);
            console.log('  ---');
        });
        
        // Find which nutritionist should see the appointments
        console.log('\n--- Mapping Check ---');
        for (const apt of appointments) {
            const nutritionist = nutritionists.find(n => n._id.toString() === apt.nutritionistId.toString());
            if (nutritionist) {
                console.log(`Appointment ${apt._id} belongs to: ${nutritionist.name} (${nutritionist.email})`);
            } else {
                console.log(`Appointment ${apt._id} has no matching nutritionist!`);
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

checkNutritionistMapping();