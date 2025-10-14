# 📦 Railway Deployment Guide for Nutri-Vision Backend

## 🚀 Pre-Deployment Checklist

### ✅ Prerequisites Complete
- [x] Backend code ready with all dependencies
- [x] MongoDB Atlas database configured
- [x] Frontend deployed on Vercel
- [x] Railway deployment files created

### 📋 Files Created for Railway
- `railway.json` - Railway deployment configuration
- `Dockerfile` - Container setup with security
- `healthcheck.js` - Health monitoring script
- `.env.railway` - Environment variables template
- `.gitignore` - Production-ready ignore rules
- `README.md` - Comprehensive deployment documentation

## 🎯 Step-by-Step Railway Deployment

### Step 1: Install Railway CLI
```powershell
# Install Railway CLI globally
npm install -g @railway/cli

# Verify installation
railway --version
```

### Step 2: Login to Railway
```powershell
# Login to Railway (opens browser)
railway login

# Verify login status
railway whoami
```

### Step 3: Initialize Railway Project
```powershell
# Navigate to backend directory
cd "C:\Users\navin\Downloads\Nutri-Vision\backend"

# Initialize Railway project
railway init

# Follow the prompts:
# - Create new project: Yes
# - Project name: nutri-vision-backend
# - Environment: production
```

### Step 4: Configure Environment Variables
```powershell
# Set critical environment variables
railway variables set MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/nutrivision"
railway variables set JWT_SECRET="your-super-secure-jwt-secret-minimum-32-characters"
railway variables set NODE_ENV="production"
railway variables set FRONTEND_URL="https://nutrivizion-hl1g6rbso-gautam-shahs-projects-53ab7122.vercel.app"

# Optional variables
railway variables set AI_SERVICE_URL="https://your-hf-space.hf.space"
railway variables set OLLAMA_URL="http://localhost:11434"
```

### Step 5: Deploy to Railway
```powershell
# Deploy the application
railway up

# Monitor deployment logs
railway logs

# Get deployment URL
railway status
```

### Step 6: Verify Deployment
```powershell
# Test health endpoint
curl https://your-railway-app.railway.app/health

# Test API root
curl https://your-railway-app.railway.app/
```

## 🔧 Environment Variables Setup

### Required Variables (Set in Railway Dashboard)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nutrivision?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-here-minimum-32-characters
FRONTEND_URL=https://nutrivizion-hl1g6rbso-gautam-shahs-projects-53ab7122.vercel.app
NODE_ENV=production
```

### Optional Variables
```env
AI_SERVICE_URL=https://your-hf-space.hf.space
OLLAMA_URL=http://ollama:11434
EMAIL_FROM=noreply@nutrivision.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🔗 Frontend Integration Update

### Update Frontend Environment Variables
After Railway deployment, update your Vercel frontend environment variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `VITE_API_URL` with your Railway URL:
   ```env
   VITE_API_URL=https://your-railway-app.railway.app
   ```
3. Redeploy frontend: `vercel --prod`

## 📊 Post-Deployment Testing

### Health Check
```bash
# Test health endpoint
curl https://your-railway-app.railway.app/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "database": {
    "status": "connected",
    "host": "cluster0-shard-00-00.mongodb.net",
    "name": "nutrivision"
  }
}
```

### API Endpoints
```bash
# Test API root
curl https://your-railway-app.railway.app/

# Test authentication
curl -X POST https://your-railway-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"testpass123"}'
```

### WebSocket Connection
```javascript
// Test Socket.IO connection from frontend
import io from 'socket.io-client';
const socket = io('https://your-railway-app.railway.app');

socket.on('connect', () => {
  console.log('Connected to Railway backend!');
});
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check MongoDB URI format
railway variables get MONGODB_URI

# Verify MongoDB Atlas network access
# Add 0.0.0.0/0 to IP whitelist in MongoDB Atlas
```

#### 2. CORS Errors
```bash
# Verify frontend URL is correct
railway variables get FRONTEND_URL

# Update CORS origins in server.js if needed
```

#### 3. Health Check Failing
```bash
# Check Railway logs
railway logs

# Verify health endpoint locally
node healthcheck.js
```

#### 4. Build Failures
```bash
# Check Node.js version compatibility
# Railway uses Node.js 18+ by default

# Verify package.json engines
"engines": {
  "node": ">=18.0.0",
  "npm": ">=8.0.0"
}
```

## 📈 Monitoring & Maintenance

### Railway Dashboard Monitoring
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Health**: Endpoint monitoring
- **Deployments**: Deployment history

### Custom Health Monitoring
```bash
# Set up health check monitoring
# The health endpoint provides:
# - Database connection status
# - Server uptime
# - Memory usage
# - Response time
```

### Scaling Configuration
```json
// In railway.json
{
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  }
}
```

## 🔄 Updates & Redeployment

### Automatic Deployments
Railway automatically deploys when you push to the connected Git repository.

### Manual Deployment
```bash
# From backend directory
railway up

# With specific environment
railway up --environment production
```

### Rollback
```bash
# View deployment history
railway deployments

# Rollback to specific deployment
railway rollback <deployment-id>
```

## 🎉 Success Checklist

- [ ] Railway CLI installed and authenticated
- [ ] Project initialized on Railway
- [ ] Environment variables configured
- [ ] Backend deployed successfully
- [ ] Health endpoint responding (200 OK)
- [ ] Database connection established
- [ ] Frontend updated with Railway API URL
- [ ] CORS working with Vercel frontend
- [ ] Socket.IO connections working
- [ ] WebRTC signaling operational

## 🔗 Next Steps

1. **Test Full Integration**: Ensure frontend → backend → database → AI service flow
2. **Set Up Monitoring**: Configure alerts for health failures
3. **Performance Optimization**: Monitor response times and optimize
4. **Security Review**: Verify all security headers and rate limiting
5. **Documentation**: Update API documentation with Railway URLs

---

🚂 **Railway Deployment Complete!** Your Nutri-Vision backend is now running in production with automatic scaling, health monitoring, and integrated logging.