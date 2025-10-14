// Check appointments in database
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkAppointments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // Get appointments collection directly
        const db = mongoose.connection.db;
        const appointments = await db.collection('appointments').find({}).toArray();
        
        console.log('Total appointments found:', appointments.length);
        
        appointments.forEach((apt, index) => {
            console.log(`\n--- Appointment ${index + 1} ---`);
            console.log('ID:', apt._id);
            console.log('Patient ID:', apt.patientId);
            console.log('Nutritionist ID:', apt.nutritionistId);
            console.log('Status:', apt.status);
            console.log('Approval Status:', apt.approvalStatus);
            console.log('Date:', apt.date);
            console.log('Time:', apt.time);
            console.log('Session Type:', apt.sessionType);
            console.log('Communication Enabled:', apt.communicationEnabled);
            console.log('Reason:', apt.reason);
        });
        
        // Also check users
        const users = await db.collection('users').find({}).toArray();
        console.log('\n--- Users found:', users.length, '---');
        users.forEach(user => {
            console.log(`${user.name} (${user.email})`);
        });
        
        // Check nutritionists
        const nutritionists = await db.collection('nutritionists').find({}).toArray();
        console.log('\n--- Nutritionists found:', nutritionists.length, '---');
        nutritionists.forEach(nut => {
            console.log(`${nut.name} (${nut.email})`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

checkAppointments();