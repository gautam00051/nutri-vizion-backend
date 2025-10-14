# 🚀 GitHub Repository Setup & Railway Deployment Script

## Step 1: Create GitHub Repository

1. **Go to GitHub.com** and create a new repository:
   - Repository name: `nutri-vision-backend`
   - Description: `🍛 Nutri-Vision Backend API - AI-powered nutrition planning with real-time features`
   - Visibility: Public (recommended) or Private
   - **DON'T** initialize with README, .gitignore, or license (we already have these)

## Step 2: Connect Local Repository to GitHub

Run these commands in PowerShell from the backend directory:

```powershell
# Add GitHub remote
git remote add origin https://github.com/gautamshah01/nutri-vision-backend.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Railway

### Option A: Direct Railway Deployment from GitHub

1. **Install Railway CLI:**
   ```powershell
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```powershell
   railway login
   ```

3. **Create Railway Project from GitHub:**
   ```powershell
   railway init
   # Choose: "Deploy from GitHub repo"
   # Select: gautamshah01/nutri-vision-backend
   ```

4. **Set Environment Variables in Railway Dashboard:**
   - Go to Railway Dashboard → Your Project → Variables
   - Add these variables:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nutrivision
   JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
   FRONTEND_URL=https://nutrivizion-hl1g6rbso-gautam-shahs-projects-53ab7122.vercel.app
   NODE_ENV=production
   ```

5. **Deploy:**
   ```powershell
   railway up
   ```

### Option B: Quick Railway Deployment (Current Directory)

If you prefer to deploy directly from current directory:

```powershell
# Initialize Railway project
railway init

# Set environment variables
railway variables set MONGODB_URI "mongodb+srv://username:password@cluster.mongodb.net/nutrivision"
railway variables set JWT_SECRET "your-super-secure-jwt-secret-minimum-32-characters"
railway variables set FRONTEND_URL "https://nutrivizion-hl1g6rbso-gautam-shahs-projects-53ab7122.vercel.app"
railway variables set NODE_ENV "production"

# Deploy
railway up
```

## Step 4: Verify Deployment

1. **Get Railway URL:**
   ```powershell
   railway status
   ```

2. **Test Health Endpoint:**
   ```powershell
   # Replace with your Railway URL
   curl https://your-app.railway.app/health
   ```

3. **Test API Root:**
   ```powershell
   curl https://your-app.railway.app/
   ```

## Step 5: Update Frontend with Railway API URL

1. **Go to Vercel Dashboard:**
   - Project: nutrivizion
   - Settings → Environment Variables

2. **Update API URL:**
   ```env
   VITE_API_URL=https://your-railway-app.railway.app
   ```

3. **Redeploy Frontend:**
   ```powershell
   cd "../frontend"
   vercel --prod
   ```

## 📋 Environment Variables Checklist

### Required for Railway:
- [ ] `MONGODB_URI` - MongoDB Atlas connection string
- [ ] `JWT_SECRET` - Secure JWT secret (32+ characters)
- [ ] `FRONTEND_URL` - Your Vercel frontend URL
- [ ] `NODE_ENV=production`

### Optional but Recommended:
- [ ] `AI_SERVICE_URL` - Your Hugging Face Space URL
- [ ] `OLLAMA_URL` - Ollama service URL (if deploying separately)
- [ ] `EMAIL_FROM` - Email notifications
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email config

## 🔍 Troubleshooting

### Common Issues:

1. **Repository Creation Failed:**
   - Ensure repository name is unique
   - Check GitHub permissions

2. **Railway Deployment Failed:**
   - Verify environment variables are set
   - Check Railway logs: `railway logs`
   - Ensure MongoDB URI is correct

3. **CORS Errors:**
   - Verify `FRONTEND_URL` matches your Vercel URL exactly
   - Check Railway logs for CORS-related errors

4. **Database Connection:**
   - Verify MongoDB Atlas network access (0.0.0.0/0)
   - Check MongoDB URI format
   - Test connection with health endpoint

## 🎉 Success Indicators

- [ ] GitHub repository created and pushed
- [ ] Railway deployment successful
- [ ] Health endpoint returns 200 OK
- [ ] Database connection established
- [ ] Frontend can connect to Railway API
- [ ] All API endpoints accessible

---

**Next Steps:** Once deployed, test the full integration flow from frontend → Railway backend → MongoDB → AI services!