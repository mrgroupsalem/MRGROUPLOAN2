@echo off
echo ============================================
echo MR Groups - Vercel Redeployment Script
echo ============================================
echo.

echo Checking if you're logged in to Vercel...
vercel whoami
if %errorlevel% neq 0 (
    echo.
    echo ERROR: You are not logged in to Vercel
    echo Please run: vercel login
    pause
    exit /b 1
)

echo.
echo Current directory: %CD%
echo.

echo Ready to redeploy to Vercel Production...
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Deploying to Vercel Production...
vercel --prod --yes

echo.
echo ============================================
echo Deployment Complete!
echo ============================================
echo.
echo IMPORTANT: Make sure you've set the environment variables in Vercel Dashboard:
echo   1. Go to https://vercel.com/dashboard
echo   2. Select your project
echo   3. Go to Settings -^> Environment Variables
echo   4. Add NEXT_PUBLIC_SUPABASE_URL
echo   5. Add NEXT_PUBLIC_SUPABASE_ANON_KEY
echo.
pause

