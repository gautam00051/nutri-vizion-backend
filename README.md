# 🚂 Nutri-Vision Backend - Railway Deployment

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

## 🌟 Overview

This is the backend API server for Nutri-Vision, a comprehensive AI-powered nutrition planning application. Built with Node.js, Express.js, and MongoDB, it provides robust APIs for meal planning, nutrition tracking, AI food recognition, and real-time communication features.

## 🏗️ Architecture

- **Framework**: Node.js + Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.IO + WebRTC signaling
- **Security**: Helmet, CORS, Rate limiting
- **Deployment**: Railway Platform

## 🚀 Quick Deploy to Railway

### Method 1: One-Click Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

### Method 2: Manual Deploy

1. **Connect Repository**
   ```bash
   # Fork/clone this repository
   git clone https://github.com/your-username/nutri-vision-backend.git
   cd nutri-vision-backend
   ```

2. **Railway Setup**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Initialize project
   railway init
   
   # Deploy
   railway up
   ```

3. **Environment Variables**
   Set these in Railway Dashboard → Environment Variables:
   ```env
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nutrivision
   JWT_SECRET=your-super-secure-secret-minimum-32-chars
   FRONTEND_URL=https://your-vercel-app.vercel.app
   NODE_ENV=production
   ```

## 📋 Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | ✅ | `mongodb+srv://...` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | ✅ | `super-secure-secret...` |
| `FRONTEND_URL` | Frontend URL for CORS | ✅ | `https://app.vercel.app` |
| `NODE_ENV` | Environment mode | ✅ | `production` |
| `PORT` | Server port | ❌ | `5000` (auto-set by Railway) |
| `AI_SERVICE_URL` | Hugging Face Spaces URL | ❌ | `https://space.hf.space` |
| `OLLAMA_URL` | Ollama service URL | ❌ | `http://ollama:11434` |

## 🛠️ API Endpoints

### Core APIs
- `GET /health` - Health check with database status
- `GET /` - API information and endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication

### Feature APIs
- `/api/user` - User profile management
- `/api/meals` - Meal planning and tracking
- `/api/nutrition` - Nutrition analysis
- `/api/ai` - AI food recognition
- `/api/appointments` - Nutritionist appointments
- `/api/stats` - Progress tracking

### Real-time Features
- `WebSocket /socket.io/` - Real-time notifications
- `WebSocket /ws/signaling/{roomId}/{userId}` - WebRTC video calls

## 🔐 Security Features

- **Rate Limiting**: 100 requests per 15 minutes
- **CORS Protection**: Configured for frontend domains
- **Helmet Security**: HTTP security headers
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Request validation middleware
- **File Upload Limits**: 10MB maximum file size

## 📊 Database Schema

### User Model
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  profile: {
    age: Number,
    height: Number,
    weight: Number,
    goals: [String]
  },
  createdAt: Date
}
```

### Meal Model
```javascript
{
  user: ObjectId,
  name: String,
  ingredients: [String],
  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  date: Date
}
```

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.railway .env
# Edit .env with your values

# Start development server
npm run dev

# Start production server
npm start
```

## 🚀 Production Deployment

### Railway Configuration Files

- `railway.json` - Railway deployment configuration
- `Dockerfile` - Container configuration
- `healthcheck.js` - Health monitoring
- `.env.railway` - Environment template

### Health Monitoring

The application includes comprehensive health checks:
- Database connection status
- Server uptime tracking
- Memory usage monitoring
- Response time metrics

Access health endpoint: `GET /health`

## 🔗 Integration Points

### Frontend Integration
- **CORS**: Configured for Vercel deployment
- **WebSocket**: Real-time features via Socket.IO
- **API**: RESTful endpoints for all features

### AI Service Integration
- **Food Recognition**: Connects to Hugging Face Spaces
- **Meal Recommendations**: Integrates with Ollama LLM
- **Nutrition Analysis**: Third-party nutrition APIs

### Database Integration
- **MongoDB Atlas**: Cloud database with connection pooling
- **Connection Management**: Auto-reconnection and heartbeat
- **Data Validation**: Mongoose schema validation

## 📈 Performance Features

- **Connection Pooling**: Optimized database connections
- **Response Compression**: Gzip compression enabled
- **Request Logging**: Morgan logging in development
- **Memory Management**: Efficient resource usage
- **Caching**: Strategic caching for better performance

## 🛡️ Error Handling

- **Global Error Handler**: Centralized error processing
- **Database Error Recovery**: Auto-reconnection logic
- **Request Validation**: Input sanitization
- **Logging**: Comprehensive error logging
- **Graceful Shutdown**: Clean process termination

## 📞 Support

For deployment issues or questions:
- Check Railway logs: `railway logs`
- Review health endpoint: `/health`
- Monitor database connection status
- Verify environment variables

## 🔄 Updates

To update your Railway deployment:
```bash
# Pull latest changes
git pull origin main

# Deploy to Railway
railway up
```

---

**🍛 Nutri-Vision Backend** - Powering intelligent nutrition planning with robust APIs and real-time features.