# Complete Vercel Deployment Guide for MR Groups Loan Management

## Prerequisites
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com) if you don't have one)
- ✅ Node.js and npm installed
- ✅ Project dependencies installed (`npm install`)

## Step 1: Install Vercel CLI (if not already installed)

```powershell
npm install -g vercel
```

## Step 2: Authenticate with Vercel

Run the following command and follow the browser prompts:

```powershell
vercel login
```

This will:
1. Open your browser
2. Ask you to log in to Vercel (or create an account)
3. Authorize the CLI

## Step 3: Deploy Using the Script

Run the PowerShell deployment script:

```powershell
.\deploy-to-vercel.ps1
```

OR manually deploy:

```powershell
# Link project (first time only)
vercel link

# Deploy to production
vercel --prod --yes
```

## Step 4: Set Environment Variables in Vercel Dashboard

**CRITICAL:** Your application will not work without these environment variables!

### Required Environment Variables:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: `https://hrarjtvxeuuubclbkevz.supabase.co`
   - Apply to: ✅ Production, ✅ Preview, ✅ Development

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyYXJqdHZ4ZXV1dWJjbGJrZXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMTg4NjAsImV4cCI6MjA4MzY5NDg2MH0.rIWnH90iZ_F-hmJok3UixdJCSdzCBkJh7ysU1U36wXE`
   - Apply to: ✅ Production, ✅ Preview, ✅ Development

3. **SUPABASE_SERVICE_ROLE_KEY** (Required for API routes)
   - Value: Your Supabase Service Role Key (get it from Supabase Dashboard → Settings → API)
   - Apply to: ✅ Production, ✅ Preview, ✅ Development
   - ⚠️ **IMPORTANT:** This is a secret key. Never commit it to git!

### How to Set Environment Variables:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **mr-groups-loan-management**
3. Go to **Settings** → **Environment Variables**
4. Click **Add New** for each variable
5. Enter the Key and Value
6. Check all three environments (Production, Preview, Development)
7. Click **Save**
8. **Redeploy** your project after adding variables

## Step 5: Redeploy After Setting Environment Variables

After setting environment variables, you must redeploy:

**Option A: Via Dashboard**
1. Go to **Deployments** tab
2. Click the **three dots** (...) on the latest deployment
3. Click **Redeploy**

**Option B: Via Command Line**
```powershell
vercel --prod --yes
```

## Step 6: Verify Deployment

1. Check the deployment status in Vercel Dashboard
2. Visit your production URL (provided after deployment)
3. Test the application functionality

## Troubleshooting

### Build Errors

- **Module not found errors**: Make sure all dependencies are in `package.json`
- **TypeScript errors**: Run `npm run build` locally first to check for errors
- **Environment variable errors**: Ensure all required variables are set in Vercel

### Runtime Errors

- **404 errors**: Usually means environment variables are missing
- **Database connection errors**: Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- **API route errors**: Check that `SUPABASE_SERVICE_ROLE_KEY` is set

### Common Issues

1. **"Server not configured" error**
   - Solution: Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables

2. **"Module not found: Can't resolve 'xlsx'"**
   - Solution: Already fixed! The `xlsx` package is now in dependencies

3. **Deployment succeeds but app shows 404**
   - Solution: Set environment variables and redeploy

## Quick Deployment Checklist

- [ ] Vercel CLI installed
- [ ] Logged in to Vercel (`vercel login`)
- [ ] Project linked to Vercel (`vercel link`)
- [ ] Environment variables set in Vercel Dashboard
- [ ] Deployed to production (`vercel --prod`)
- [ ] Verified deployment works

## Your Deployment URLs

After successful deployment, you'll get:
- **Production**: `https://mr-groups-loan-management.vercel.app` (or custom domain)
- **Preview**: `https://mr-groups-loan-management-git-<branch>-<username>.vercel.app`

## Next Steps

1. Set up a custom domain (optional) in Vercel Dashboard → Settings → Domains
2. Configure automatic deployments from Git (optional) in Vercel Dashboard → Settings → Git
3. Monitor your deployment in Vercel Dashboard → Deployments

## Support

If you encounter issues:
1. Check the Vercel deployment logs in the Dashboard
2. Check the build logs for errors
3. Verify all environment variables are set correctly
4. Try redeploying after fixing issues
