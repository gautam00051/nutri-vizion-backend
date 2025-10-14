import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // MongoDB Atlas optimizations for stable connection
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 30000, // Keep trying to send operations for 30 seconds
      socketTimeoutMS: 0, // Disable socket timeout (no automatic disconnection)
      connectTimeoutMS: 30000, // Connection timeout 30 seconds
      heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds to keep connection alive
      maxIdleTimeMS: 1800000, // Close connections after 30 minutes (30 * 60 * 1000) of inactivity
    })

    console.log(`📦 MongoDB Atlas Connected: ${conn.connection.host}`)
    console.log(`📊 Database: ${conn.connection.name}`)
    console.log(`⏱️  Connection will stay alive for 30 minutes of inactivity`)
    
    // Handle connection events with detailed logging
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message)
    })

    mongoose.connection.on('disconnected', () => {
      console.log('📦 MongoDB disconnected - attempting to reconnect...')
    })

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected successfully')
    })

    mongoose.connection.on('connecting', () => {
      console.log('🔄 MongoDB connecting...')
    })

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected')
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      console.log('📦 MongoDB connection closed through app termination')
      process.exit(0)
    })

  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message)
    
    // Provide specific error messages for common Atlas issues
    if (error.message.includes('authentication failed')) {
      console.error('🔑 Authentication Error: Check your MongoDB Atlas username and password')
    } else if (error.message.includes('network error')) {
      console.error('🌐 Network Error: Check your internet connection and MongoDB Atlas network access')
    } else if (error.message.includes('timeout')) {
      console.error('⏰ Timeout Error: MongoDB Atlas connection timed out')
    }
    
    console.log('⚠️  Server will continue running without database connection')
    console.log('📝 Please whitelist your IP in MongoDB Atlas and restart the server')
    
    // Don't exit - let server continue for local development
    // process.exit(1)
  }
}

export default connectDB