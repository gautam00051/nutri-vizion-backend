// Simple curl-based test
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testEndpoints() {
    try {
        console.log('🧪 Testing Appointment System Endpoints...\n');
        
        // Test 1: Login Patient
        console.log('1. Testing patient login...');
        const patientLoginCmd = `curl -X POST http://localhost:5001/api/auth/login -H "Content-Type: application/json" -d "{\\"email\\":\\"patient@test.com\\",\\"password\\":\\"password123\\",\\"userType\\":\\"patient\\"}" --silent`;
        const patientResult = await execAsync(patientLoginCmd);
        console.log('Patient login response:', patientResult.stdout);
        
        // Test 2: Login Nutritionist  
        console.log('\n2. Testing nutritionist login...');
        const nutritionistLoginCmd = `curl -X POST http://localhost:5001/api/nutritionist/auth/login -H "Content-Type: application/json" -d "{\\"email\\":\\"nutritionist@test.com\\",\\"password\\":\\"password123\\",\\"userType\\":\\"nutritionist\\"}" --silent`;
        const nutritionistResult = await execAsync(nutritionistLoginCmd);
        console.log('Nutritionist login response:', nutritionistResult.stdout);
        
        // Extract tokens (simplified)
        let patientToken = '';
        let nutritionistToken = '';
        
        try {
            const patientData = JSON.parse(patientResult.stdout);
            patientToken = patientData.token;
            console.log('✅ Patient token extracted');
        } catch (e) {
            console.log('❌ Failed to extract patient token');
            return;
        }
        
        try {
            const nutritionistData = JSON.parse(nutritionistResult.stdout);
            nutritionistToken = nutritionistData.token;
            console.log('✅ Nutritionist token extracted');
        } catch (e) {
            console.log('❌ Failed to extract nutritionist token');
            return;
        }
        
        // Test 3: Get Nutritionists
        console.log('\n3. Testing get nutritionists...');
        const getNutritionistsCmd = `curl -X GET http://localhost:5001/api/nutritionists -H "Authorization: Bearer ${patientToken}" --silent`;
        const nutritionistsResult = await execAsync(getNutritionistsCmd);
        console.log('Nutritionists response:', nutritionistsResult.stdout);
        
        console.log('\n🎉 Basic endpoint tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testEndpoints();