// Simple server connectivity test
import axios from 'axios';

async function quickTest() {
    try {
        console.log('Testing server connectivity...');
        
        // Test basic connectivity
        const response = await axios.get('http://localhost:5001');
        console.log('✅ Server is responding');
        
        // Test auth endpoint
        const authTest = await axios.post('http://localhost:5001/api/auth/login', {
            email: 'test@test.com',
            password: 'test',
            userType: 'patient'
        }).catch(err => {
            if (err.response?.status === 400 || err.response?.status === 401) {
                console.log('✅ Auth endpoint is working (expected auth failure)');
                return { status: 'ok' };
            }
            throw err;
        });
        
        console.log('🎉 Backend is ready for testing!');
        
    } catch (error) {
        console.error('❌ Server test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Server might not be running. Start it with: node server.js');
        }
    }
}

quickTest();