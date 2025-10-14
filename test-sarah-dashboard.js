// Test Dr. Sarah Johnson's dashboard specifically
import axios from 'axios';

async function testSarahJohnsonDashboard() {
    try {
        console.log('🧪 Testing Dr. Sarah Johnson Dashboard...\n');
        
        // Login as Dr. Sarah Johnson 
        const loginResponse = await axios.post('http://localhost:5001/api/nutritionist/auth/login', {
            email: 'sarah.johnson@example.com',
            password: 'password123'  // This might not work, let's see
        });
        
        console.log('Login attempt for Dr. Sarah Johnson...');
        console.log('Response:', loginResponse.data);
        
    } catch (error) {
        console.log('❌ Dr. Sarah Johnson login failed:', error.response?.data || error.message);
        console.log('This is expected since she likely doesn\'t have a password set');
        
        // Let's try with a user that has a password
        try {
            console.log('\n🧪 Testing Test Nutritionist instead...');
            const testLogin = await axios.post('http://localhost:5001/api/nutritionist/auth/login', {
                email: 'nutritionist@test.com',
                password: 'password123'
            });
            
            const token = testLogin.data.token;
            console.log('✅ Test Nutritionist logged in');
            
            // Test dashboard
            const dashboardResponse = await axios.get('http://localhost:5001/api/nutritionist/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('\n📊 Dashboard Data:');
            console.log('Success:', dashboardResponse.data.success);
            console.log('Today\'s Appointments:', dashboardResponse.data.todaysAppointments?.length || 0);
            
            if (dashboardResponse.data.todaysAppointments) {
                dashboardResponse.data.todaysAppointments.forEach((apt, index) => {
                    console.log(`\n${index + 1}. ${apt.patientId?.name || 'Unknown'}`);
                    console.log(`   Email: ${apt.patientId?.email || 'Unknown'}`);
                    console.log(`   Time: ${apt.time} on ${new Date(apt.date).toLocaleDateString()}`);
                    console.log(`   Status: ${apt.approvalStatus}`);
                    console.log(`   Communication: ${apt.communicationEnabled}`);
                    console.log(`   Reason: ${apt.reason}`);
                });
            }
            
        } catch (innerError) {
            console.error('❌ Dashboard test failed:', innerError.response?.data || innerError.message);
        }
    }
}

testSarahJohnsonDashboard();