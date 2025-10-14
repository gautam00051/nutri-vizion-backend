import mongoose from 'mongoose';

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB connection...');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/nutri-vision', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully!');
    
    // List all databases
    const admin = mongoose.connection.db.admin();
    const databases = await admin.listDatabases();
    console.log('📋 Available databases:');
    databases.databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Check if nutri-vision database exists
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    if (collections.length > 0) {
      console.log('📦 Collections in nutri-vision database:');
      collections.forEach(collection => {
        console.log(`  - ${collection.name}`);
      });
      
      // Check users collection
      if (collections.find(c => c.name === 'users')) {
        const userCount = await db.collection('users').countDocuments();
        console.log(`👥 Users in database: ${userCount}`);
        
        // Show sample users
        const users = await db.collection('users').find({}).limit(5).toArray();
        console.log('📋 Sample users:');
        users.forEach(user => {
          console.log(`  - ${user.name || 'No name'} (${user.email || 'No email'}) - Created: ${user.createdAt || 'No date'}`);
        });
      } else {
        console.log('❌ No users collection found');
      }
    } else {
      console.log('📭 No collections found in nutri-vision database');
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 MongoDB server is not running. Please start MongoDB:');
      console.log('   - On Windows: Start MongoDB service');
      console.log('   - Or run: mongod');
    }
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  }
}

testConnection();