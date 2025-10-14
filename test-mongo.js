// Simple MongoDB connection test
import mongoose from 'mongoose'

const testConnection = async () => {
  try {
    console.log('Testing MongoDB connection...')
    
    await mongoose.connect('mongodb://localhost:27017/nutri-vision', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    
    console.log('✅ MongoDB Connected successfully')
    
    // Test creating a simple document
    const TestSchema = new mongoose.Schema({
      name: String,
      email: String,
      createdAt: { type: Date, default: Date.now }
    })
    
    const TestModel = mongoose.model('Test', TestSchema)
    
    const testDoc = new TestModel({
      name: 'Test User',
      email: 'test@example.com'
    })
    
    const saved = await testDoc.save()
    console.log('✅ Document saved:', saved)
    
    // Check if it exists
    const found = await TestModel.findOne({ email: 'test@example.com' })
    console.log('✅ Document found:', found)
    
    // Clean up
    await TestModel.deleteOne({ email: 'test@example.com' })
    console.log('✅ Test document deleted')
    
    await mongoose.disconnect()
    console.log('✅ MongoDB disconnected')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testConnection()