# Vercel Deployment Guide for MR Groups Loan Management

## Prerequisites
1. Vercel account (sign up at [vercel.com](https://vercel.com))
2. GitHub account (to connect your repository)
3. All environment variables ready

## Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

## Step 2: Login to Vercel
```bash
vercel login
```

## Step 3: Deploy to Vercel
```bash
# For preview deployment
npm run deploy:preview

# For production deployment
npm run deploy
```

## Step 4: Set Environment Variables in Vercel Dashboard

After deployment, go to your Vercel dashboard and set these environment variables:

### Required Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://zhohpntqzrcsxihlscah.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpob2hwbnRxenJjc3hpaGxzY2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODc1NTIsImV4cCI6MjA3Mzk2MzU1Mn0.nJXHxhcQRnHTTAuMR5BM0qh9mqw-AHJOxxS_tB16nOw
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_SERVICE_SID=your_twilio_verify_service_sid
OTP_SIGNING_SECRET=your_random_secret_key_for_otp_tokens
DEFAULT_COUNTRY_CODE=+91
```

## Step 5: Redeploy After Setting Environment Variables
```bash
npm run deploy
```

## Alternative: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js
5. Set environment variables in the dashboard
6. Click "Deploy"

## Your Deployment URL
After successful deployment, you'll get a URL like:
- Preview: `https://your-project-name-git-branch-username.vercel.app`
- Production: `https://your-project-name.vercel.app`

## Troubleshooting

### Build Errors
- Ensure all dependencies are in `package.json`
- Check that all environment variables are set
- Verify TypeScript compilation passes locally

### Runtime Errors
- Check Vercel function logs in the dashboard
- Verify environment variables are correctly set
- Ensure Supabase and Twilio credentials are valid

### OTP Issues
- Verify Twilio credentials are correct
- Check if phone numbers are verified in Twilio (for trial accounts)
- Ensure `TWILIO_SERVICE_SID` is set if using Twilio Verify

## Support
If you encounter issues, check:
1. Vercel deployment logs
2. Browser console for client-side errors
3. Network tab for API call failures

