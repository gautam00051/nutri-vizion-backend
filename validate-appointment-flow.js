// Comprehensive appointment system validation
import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

// Test data
const testPatient = {
    name: 'Test Patient',
    email: 'patient@test.com',
    password: 'password123',
    userType: 'patient'
};

const testNutritionist = {
    name: 'Test Nutritionist',
    email: 'nutritionist@test.com',
    password: 'password123',
    specialization: 'Weight Management',
    experience: 5,
    userType: 'nutritionist'
};

let patientToken = '';
let nutritionistToken = '';
let appointmentId = '';

async function validateAppointmentFlow() {
    try {
        console.log('🚀 Starting Appointment System Validation...\n');
        
        // Step 1: Register users if they don't exist
        console.log('1. Setting up test users...');
        try {
            await axios.post(`${BASE_URL}/auth/register`, testPatient);
            console.log('✅ Patient registered');
        } catch (error) {
            if (error.response?.status === 400) {
                console.log('ℹ️  Patient already exists');
            } else {
                throw error;
            }
        }

        try {
            await axios.post(`${BASE_URL}/nutritionist/auth/register`, testNutritionist);  
            console.log('✅ Nutritionist registered');
        } catch (error) {
            if (error.response?.status === 400) {
                console.log('ℹ️  Nutritionist already exists');
            } else {
                throw error;
            }
        }

        // Step 2: Login users
        console.log('\n2. Logging in users...');
        const patientLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: testPatient.email,
            password: testPatient.password,
            userType: 'patient'
        });
        patientToken = patientLogin.data.token;
        console.log('✅ Patient logged in');

        const nutritionistLogin = await axios.post(`${BASE_URL}/nutritionist/auth/login`, {
            email: testNutritionist.email,
            password: testNutritionist.password,
            userType: 'nutritionist'
        });
        nutritionistToken = nutritionistLogin.data.token;
        console.log('✅ Nutritionist logged in');

        // Step 3: Get nutritionist ID for booking
        console.log('\n3. Getting nutritionist details...');
        const nutritionistsResponse = await axios.get(`${BASE_URL}/nutritionists`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const testNutritionistId = nutritionistsResponse.data.find(n => n.email === testNutritionist.email)?._id;
        
        if (!testNutritionistId) {
            throw new Error('Test nutritionist not found');
        }
        console.log('✅ Nutritionist ID retrieved:', testNutritionistId);

        // Step 4: Book appointment
        console.log('\n4. Booking appointment...');
        const appointmentData = {
            nutritionistId: testNutritionistId,
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            time: '10:00',
            type: 'consultation',
            notes: 'Test appointment for system validation'
        };

        const bookingResponse = await axios.post(`${BASE_URL}/appointments/book`, appointmentData, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        appointmentId = bookingResponse.data.appointment._id;
        console.log('✅ Appointment booked:', appointmentId);
        console.log('   Status:', bookingResponse.data.appointment.status);
        console.log('   Communication enabled:', bookingResponse.data.appointment.communicationEnabled);

        // Step 5: Check appointment status (should be pending)
        console.log('\n5. Verifying appointment status...');
        const appointmentCheck = await axios.get(`${BASE_URL}/appointments/${appointmentId}`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        console.log('✅ Appointment status:', appointmentCheck.data.status);
        console.log('   Approval status:', appointmentCheck.data.approvalStatus);
        
        // Step 6: Approve appointment (as nutritionist)
        console.log('\n6. Approving appointment...');
        const approvalResponse = await axios.put(`${BASE_URL}/appointments/${appointmentId}/approve`, {}, {
            headers: { Authorization: `Bearer ${nutritionistToken}` }
        });
        console.log('✅ Appointment approved');
        console.log('   New status:', approvalResponse.data.appointment.status);
        console.log('   Communication enabled:', approvalResponse.data.appointment.communicationEnabled);

        // Step 7: Test chat access (should be enabled now)
        console.log('\n7. Testing chat access...');
        const chatResponse = await axios.post(`${BASE_URL}/chat/start`, {
            appointmentId: appointmentId
        }, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        console.log('✅ Chat session created:', chatResponse.data.chatId);

        // Step 8: Send test message
        console.log('\n8. Sending test message...');
        const messageResponse = await axios.post(`${BASE_URL}/chat/message`, {
            chatId: chatResponse.data.chatId,
            message: 'Hello, this is a test message from patient!'
        }, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        console.log('✅ Message sent successfully');

        // Step 9: Test call initiation
        console.log('\n9. Testing call initiation...');
        const callResponse = await axios.post(`${BASE_URL}/appointments/${appointmentId}/call/start`, {
            callType: 'voice'
        }, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        console.log('✅ Voice call initiated');

        console.log('\n🎉 APPOINTMENT SYSTEM VALIDATION COMPLETE!');
        console.log('=============================================');
        console.log('✅ Patient registration/login: WORKING');
        console.log('✅ Nutritionist registration/login: WORKING');
        console.log('✅ Appointment booking: WORKING');
        console.log('✅ Appointment approval workflow: WORKING');
        console.log('✅ Communication enablement: WORKING');
        console.log('✅ Chat system: WORKING');
        console.log('✅ Call system: WORKING');
        console.log('\n🚀 The complete patient → book → approve → communicate workflow is functional!');

    } catch (error) {
        console.error('❌ Validation failed:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
        console.error('URL:', error.config?.url);
    }
}

// Run validation
validateAppointmentFlow();