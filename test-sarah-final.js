// Test Dr. Sarah Johnson's dashboard
import axios from 'axios';

async function testSarahDashboard() {
    try {
        // Login as Dr. Sarah Johnson
        const loginResponse = await axios.post('http://localhost:5001/api/nutritionist/auth/login', {
            email: 'sarah.johnson@example.com',
            password: 'password123'
        });
        
        const token = loginResponse.data.token;
        const nutritionistId = loginResponse.data.nutritionist.id;
        console.log('✅ Dr. Sarah Johnson logged in');
        console.log('Nutritionist ID:', nutritionistId);
        
        // Test dashboard API
        const dashboardResponse = await axios.get('http://localhost:5001/api/nutritionist/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('\n📊 Dashboard Response:');
        console.log('Success:', dashboardResponse.data.success);
        console.log('Today\'s Appointments:', dashboardResponse.data.todaysAppointments?.length || 0);
        
        if (dashboardResponse.data.todaysAppointments && dashboardResponse.data.todaysAppointments.length > 0) {
            console.log('\n📅 Appointments for Dr. Sarah Johnson:');
            dashboardResponse.data.todaysAppointments.forEach((apt, index) => {
                console.log(`${index + 1}. Patient: ${apt.patientId?.name || 'Unknown'}`);
                console.log(`   Email: ${apt.patientId?.email || 'Unknown'}`);
                console.log(`   Time: ${apt.time} on ${new Date(apt.date).toLocaleDateString()}`);
                console.log(`   Status: ${apt.approvalStatus}`);
                console.log(`   Communication: ${apt.communicationEnabled}`);
                console.log(`   Reason: ${apt.reason}`);
            });
        } else {
            console.log('\n❌ No appointments found for Dr. Sarah Johnson');
            console.log('Expected to find appointment 68ddbb1657eb43b876d01964');
        }
        
        // Check the full response structure
        console.log('\n🔍 Full dashboard response:');
        console.log(JSON.stringify(dashboardResponse.data, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testSarahDashboard();