# Quick Deploy to Vercel - Step by Step

## Option 1: Use the Batch Script (Easiest)

1. **Double-click** `deploy-vercel.bat`
2. Follow the prompts:
   - It will check if you're logged in
   - If not, it will open a browser for you to log in
   - It will link your project
   - It will deploy to production

## Option 2: Manual Deployment

### Step 1: Login to Vercel
```bash
vercel login
```
- A browser will open
- Log in to your Vercel account
- Authorize the CLI

### Step 2: Link Project (First Time Only)
```bash
vercel link
```
- Select "Create new project" or "Link to existing project"
- Follow the prompts

### Step 3: Set Environment Variables

**CRITICAL:** Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

Add these 3 variables:

1. **NEXT_PUBLIC_SUPABASE_URL**
   ```
   https://hrarjtvxeuuubclbkevz.supabase.co
   ```
   ✅ Check: Production, Preview, Development

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyYXJqdHZ4ZXV1dWJjbGJrZXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMTg4NjAsImV4cCI6MjA4MzY5NDg2MH0.rIWnH90iZ_F-hmJok3UixdJCSdzCBkJh7ysU1U36wXE
   ```
   ✅ Check: Production, Preview, Development

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Get this from your Supabase Dashboard → Settings → API → Service Role Key
   - ⚠️ This is a secret key - keep it safe!
   ✅ Check: Production, Preview, Development

### Step 4: Deploy
```bash
vercel --prod --yes
```

### Step 5: Redeploy (After Setting Environment Variables)
After adding environment variables, you MUST redeploy:
- Go to Vercel Dashboard → Deployments
- Click the three dots (...) on latest deployment
- Click "Redeploy"

OR run:
```bash
vercel --prod --yes
```

## That's It! 🎉

Your app will be live at: `https://your-project-name.vercel.app`

Check the deployment status in your Vercel Dashboard.
