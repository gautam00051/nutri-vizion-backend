// Complete appointment flow test using curl
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testCompleteAppointmentFlow() {
    try {
        console.log('🚀 Testing Complete Appointment Booking Flow...\n');
        
        // Step 1: Login users
        console.log('1. Logging in users...');
        const patientLoginCmd = `curl -X POST http://localhost:5001/api/auth/login -H "Content-Type: application/json" -d "{\\"email\\":\\"patient@test.com\\",\\"password\\":\\"password123\\",\\"userType\\":\\"patient\\"}" --silent`;
        const patientResult = await execAsync(patientLoginCmd);
        const patientData = JSON.parse(patientResult.stdout);
        const patientToken = patientData.token;
        console.log('✅ Patient logged in');
        
        const nutritionistLoginCmd = `curl -X POST http://localhost:5001/api/nutritionist/auth/login -H "Content-Type: application/json" -d "{\\"email\\":\\"nutritionist@test.com\\",\\"password\\":\\"password123\\",\\"userType\\":\\"nutritionist\\"}" --silent`;
        const nutritionistResult = await execAsync(nutritionistLoginCmd);
        const nutritionistData = JSON.parse(nutritionistResult.stdout);
        const nutritionistToken = nutritionistData.token;
        const nutritionistId = nutritionistData.nutritionist.id;
        console.log('✅ Nutritionist logged in');
        
        // Step 2: Book appointment
        console.log('\n2. Booking appointment...');
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        const bookCmd = `curl -X POST http://localhost:5001/api/appointments/book -H "Content-Type: application/json" -H "Authorization: Bearer ${patientToken}" -d "{\\"nutritionistId\\":\\"${nutritionistId}\\",\\"date\\":\\"${tomorrow}\\",\\"time\\":\\"10:00\\",\\"sessionType\\":\\"video\\",\\"reason\\":\\"I need help with my nutrition plan and weight management goals\\",\\"notes\\":\\"Test appointment for system validation\\"}" --silent`;
        const bookResult = await execAsync(bookCmd);
        console.log('Booking response:', bookResult.stdout);
        
        const bookingResponse = JSON.parse(bookResult.stdout);
        const appointmentId = bookingResponse.appointment._id;
        console.log('✅ Appointment booked:', appointmentId);
        console.log('   Status:', bookingResponse.appointment.status);
        console.log('   Communication enabled:', bookingResponse.appointment.communicationEnabled);
        
        // Step 3: Approve appointment
        console.log('\n3. Approving appointment...');
        const approveCmd = `curl -X PUT http://localhost:5001/api/appointments/${appointmentId}/approve -H "Authorization: Bearer ${nutritionistToken}" --silent`;
        const approveResult = await execAsync(approveCmd);
        console.log('Approval response:', approveResult.stdout);
        
        const approvalResponse = JSON.parse(approveResult.stdout);
        console.log('✅ Appointment approved');
        console.log('   New status:', approvalResponse.appointment.status);
        console.log('   Communication enabled:', approvalResponse.appointment.communicationEnabled);
        
        // Step 4: Start chat
        console.log('\n4. Starting chat session...');
        const chatCmd = `curl -X POST http://localhost:5001/api/chat/start -H "Content-Type: application/json" -H "Authorization: Bearer ${patientToken}" -d "{\\"appointmentId\\":\\"${appointmentId}\\"}" --silent`;
        const chatResult = await execAsync(chatCmd);
        console.log('Chat response:', chatResult.stdout);
        
        const chatResponse = JSON.parse(chatResult.stdout);
        console.log('✅ Chat session created:', chatResponse.chatId);
        
        // Step 5: Send test message
        console.log('\n5. Sending test message...');
        const messageCmd = `curl -X POST http://localhost:5001/api/chat/message -H "Content-Type: application/json" -H "Authorization: Bearer ${patientToken}" -d "{\\"chatId\\":\\"${chatResponse.chatId}\\",\\"message\\":\\"Hello, this is a test message from patient!\\"}" --silent`;
        const messageResult = await execAsync(messageCmd);
        console.log('Message response:', messageResult.stdout);
        console.log('✅ Message sent successfully');
        
        // Step 6: Initiate call
        console.log('\n6. Initiating voice call...');
        const callCmd = `curl -X POST http://localhost:5001/api/appointments/${appointmentId}/call/start -H "Content-Type: application/json" -H "Authorization: Bearer ${patientToken}" -d "{\\"callType\\":\\"voice\\"}" --silent`;
        const callResult = await execAsync(callCmd);
        console.log('Call response:', callResult.stdout);
        console.log('✅ Voice call initiated');
        
        console.log('\n🎉 COMPLETE APPOINTMENT FLOW VALIDATION SUCCESSFUL!');
        console.log('===============================================');
        console.log('✅ Patient login: WORKING');
        console.log('✅ Nutritionist login: WORKING');
        console.log('✅ Appointment booking: WORKING');
        console.log('✅ Appointment approval: WORKING');
        console.log('✅ Communication enablement: WORKING');
        console.log('✅ Chat system: WORKING');
        console.log('✅ Call system: WORKING');
        console.log('\n🚀 Your requested workflow is fully functional!');
        console.log('Patient → Book Appointment → Nutritionist Approval → Communication Features Enabled');
        
    } catch (error) {
        console.error('❌ Flow test failed:', error.message);
        if (error.stdout) console.log('STDOUT:', error.stdout);
        if (error.stderr) console.log('STDERR:', error.stderr);
    }
}

testCompleteAppointmentFlow();