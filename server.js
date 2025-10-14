import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import url from 'url'

import connectDB from './config/database.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import mealRoutes from './routes/meals.js'
import nutritionRoutes from './routes/nutrition.js'
import aiRoutes from './routes/ai.js'
import appointmentRoutes from './routes/appointments.js'
import nutritionistAuthRoutes from './routes/nutritionistAuth.js'
import nutritionistDashboardRoutes from './routes/nutritionistDashboard.js'
import nutritionistDirectoryRoutes from './routes/nutritionistDirectory.js'
import chatRoutes from './routes/chat.js'
import adminAuthRoutes from './routes/adminAuth.js'
import adminDashboardRoutes from './routes/adminDashboard.js'
import adminPaymentsRoutes from './routes/adminPayments.js'
import adminNotificationsRoutes from './routes/adminNotifications.js'
import progressRoutes from './routes/progress.js'
import statsRoutes from './routes/stats.js'
import errorHandler from './middleware/errorHandler.js'
import WebRTCSignalingServer from './signaling/WebRTCSignalingServer.js'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 5000

// Trust proxy for Railway deployment
app.set('trust proxy', true)

// Connect to MongoDB
connectDB()

// Keep MongoDB connection alive with periodic ping
setInterval(async () => {
  try {
    // Simple ping to keep connection alive
    await import('mongoose').then(mongoose => {
      if (mongoose.default.connection.readyState === 1) {
        mongoose.default.connection.db.admin().ping()
      }
    })
  } catch (error) {
    // Ignore ping errors - they're just to keep connection alive
  }
}, 300000) // Ping every 5 minutes

// Initialize WebRTC Signaling Server
const signalingServer = new WebRTCSignalingServer()

// Create Socket.IO server
const io = new SocketIOServer(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      
      // Allow all Vercel deployments and localhost
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.FRONTEND_URL || 'http://localhost:3000'
      ];
      
      // Check if origin is from Vercel
      if (origin.includes('.vercel.app') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(null, false);
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  path: '/socket.io/'
})

// Security middleware
app.use(helmet())
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all Vercel deployments and localhost
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ];
    
    // Check if origin is from Vercel
    if (origin.includes('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Block other origins
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
})
app.use('/api/', limiter)

// Body parsing middleware
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  try {
    const mongoose = await import('mongoose')
    const dbStatus = mongoose.default.connection.readyState
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStates[dbStatus] || 'unknown',
        host: mongoose.default.connection.host || 'not connected',
        name: mongoose.default.connection.name || 'not connected'
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'error',
        error: error.message
      }
    })
  }
})

// Root endpoint - API Information
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🍛 Nutri-Vision API Server',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      health: '/health',
      auth: '/api/auth (POST /api/auth/register, /api/auth/login)',
      users: '/api/user',
      meals: '/api/meals',
      nutrition: '/api/nutrition',
      ai: '/api/ai',
      appointments: '/api/appointments',
      nutritionist: '/api/nutritionist',
      admin: '/api/admin',
      stats: '/api/stats'
    },
    frontend: process.env.FRONTEND_URL || 'http://localhost:3001',
    timestamp: new Date().toISOString()
  })
})

// Make Socket.IO available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/meals', mealRoutes)
app.use('/api/nutrition', nutritionRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/stats', statsRoutes)

// Nutritionist Routes
app.use('/api/nutritionist/auth', nutritionistAuthRoutes)
app.use('/api/nutritionist', nutritionistDashboardRoutes)
app.use('/api/nutritionists', nutritionistDirectoryRoutes)

// Chat Routes
app.use('/api/chat', chatRoutes)

// Admin Routes
app.use('/api/admin/auth', adminAuthRoutes)
app.use('/api/admin/dashboard', adminDashboardRoutes)
app.use('/api/admin/payments', adminPaymentsRoutes)
app.use('/api/admin/notifications', adminNotificationsRoutes)

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// API root endpoint for documentation
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Nutri-Vision Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      user: '/api/user/*',
      meals: '/api/meals/*',
      nutrition: '/api/nutrition/*',
      ai: '/api/ai/*',
      appointments: '/api/appointments/*',
      progress: '/api/progress/*',
      nutritionist: '/api/nutritionist/*',
      admin: '/api/admin/*',
      chat: '/api/chat/*'
    },
    ai_service: {
      status: 'Connected to Netlify',
      url: process.env.AI_SERVICES_URL || 'Not configured'
    },
    timestamp: new Date().toISOString()
  })
})

// Error handling middleware (must be last)
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

// Store call notification connections
const callConnections = new Map(); // userId -> Socket

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Socket.IO client connected:', socket.id)

  // Handle user joining for call notifications
  socket.on('join_call_notifications', (userId) => {
    console.log(`Call notification connection: ${userId}`)
    callConnections.set(userId, socket)
    socket.userId = userId
    socket.join(`user_${userId}`)
    
    socket.emit('call_notification_connected', { 
      message: 'Connected to call notification service',
      userId 
    })
  })

  // Handle user joining their personal room for targeted notifications
  socket.on('join_user_room', (userId) => {
    console.log(`User joining personal room: ${userId}`)
    socket.userId = userId
    socket.join(`user_${userId}`)
  })

  // Handle WebRTC signaling
  socket.on('join_webrtc_room', ({ roomId, userId }) => {
    console.log(`WebRTC connection: ${userId} joining room ${roomId}`)
    socket.join(`webrtc_${roomId}`)
    socket.userId = userId
    socket.roomId = roomId
    
    // Notify other users in the room
    socket.to(`webrtc_${roomId}`).emit('user_joined', { userId })
    
    socket.emit('webrtc_connected', { 
      message: 'Connected to WebRTC signaling',
      roomId,
      userId 
    })
  })

  // Handle WebRTC signaling messages
  socket.on('webrtc_signal', (data) => {
    socket.to(`webrtc_${socket.roomId}`).emit('webrtc_signal', {
      ...data,
      from: socket.userId
    })
  })

  // Handle call start notifications
  socket.on('start_call', ({ appointmentId, callType, recipientId, callerName }) => {
    console.log('Call start notification:', { appointmentId, callType, recipientId, callerName })
    
    // Send to specific recipient
    io.to(`user_${recipientId}`).emit('incoming_call', {
      appointmentId,
      callType,
      callerName,
      callerId: socket.userId
    })
    
    console.log(`Call notification sent to user_${recipientId}`)
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Socket.IO client disconnected:', socket.id)
    if (socket.userId) {
      callConnections.delete(socket.userId)
      console.log(`Call notification disconnected: ${socket.userId}`)
    }
  })
})

// Periodic cleanup of old rooms
setInterval(() => {
  signalingServer.cleanupOldRooms(24) // Clean rooms older than 24 hours
}, 60 * 60 * 1000) // Run every hour

// WebRTC stats endpoint
app.get('/api/webrtc/stats', (req, res) => {
  const stats = signalingServer.getAllRoomsStats()
  res.json({
    success: true,
    data: {
      totalRooms: stats.length,
      totalClients: stats.reduce((sum, room) => sum + room.clientCount, 0),
      rooms: stats
    }
  })
})

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`)
  console.log(`🔗 WebSocket server ready on ws://localhost:${PORT}/ws`)
  console.log(`📞 WebRTC signaling available at ws://localhost:${PORT}/ws/signaling/{roomId}/{userId}`)
})

export default app