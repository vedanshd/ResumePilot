# Vercel Deployment Guide

## Prerequisites
1. GitHub repository created and code pushed
2. Vercel account connected to your GitHub

## Deployment Steps

### 1. Import Project to Vercel
1. Go to [vercel.com](https://vercel.com) and log in
2. Click "New Project"
3. Import your `vedanshd/ResumePilot` repository
4. Vercel will auto-detect the framework (Vite)

### 2. Configure Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `./` (leave as default)
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `client/dist`

### 3. Environment Variables
Add these environment variables in Vercel dashboard:

```
GEMINI_API_KEY=your_gemini_api_key_here
SCRAPINGDOG_API_KEY=your_scrapingdog_api_key_here
```

### 4. Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Your app will be live at `https://resume-pilot-xxx.vercel.app`

## Important Notes

- The app is configured as a **static frontend** for Vercel
- API routes are handled by serverless functions
- Database (SQLite) will need to be replaced with a cloud database for production
- Consider using Vercel Postgres or Supabase for the database

## Post-Deployment Steps

1. Test all features on the live site
2. Update any hardcoded URLs to use the Vercel domain
3. Set up custom domain if desired
4. Monitor performance and logs in Vercel dashboard

## Troubleshooting

- Check Vercel function logs for API issues
- Ensure all environment variables are set correctly
- Verify build logs if deployment fails
- Test locally with `npm run build` before deploying