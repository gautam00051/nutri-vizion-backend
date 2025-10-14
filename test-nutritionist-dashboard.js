// Test nutritionist dashboard API
import axios from 'axios';

async function testNutritionistDashboard() {
    try {
        console.log('🧪 Testing Nutritionist Dashboard API...\n');
        
        // First login as nutritionist
        const loginResponse = await axios.post('http://localhost:5001/api/nutritionist/auth/login', {
            email: 'nutritionist@test.com',
            password: 'password123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Nutritionist logged in successfully');
        
        // Test dashboard endpoint
        const dashboardResponse = await axios.get('http://localhost:5001/api/nutritionist/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📊 Dashboard Response:');
        console.log('Success:', dashboardResponse.data.success);
        console.log('Appointments:', dashboardResponse.data.todaysAppointments?.length || 0);
        console.log('Earnings:', JSON.stringify(dashboardResponse.data.earnings, null, 2));
        console.log('Stats:', JSON.stringify(dashboardResponse.data.stats, null, 2));
        
        if (dashboardResponse.data.todaysAppointments) {
            console.log('\n📅 Today\'s Appointments:');
            dashboardResponse.data.todaysAppointments.forEach((apt, index) => {
                console.log(`${index + 1}. ${apt.patientId?.name || 'Unknown'} at ${apt.time}`);
                console.log(`   Status: ${apt.approvalStatus} | Communication: ${apt.communicationEnabled}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testNutritionistDashboard();