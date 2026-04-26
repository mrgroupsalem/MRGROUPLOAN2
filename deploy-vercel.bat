@echo off
echo ============================================
echo MR Groups - Vercel Deployment
echo ============================================
echo.

echo Step 1: Checking Vercel CLI...
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Vercel CLI not found. Installing...
    call npm install -g vercel
)

echo.
echo Step 2: Checking authentication...
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo NOT AUTHENTICATED
    echo.
    echo Please authenticate with Vercel:
    echo 1. A browser window will open
    echo 2. Log in to your Vercel account
    echo 3. Authorize the CLI
    echo.
    pause
    vercel login
    if %errorlevel% neq 0 (
        echo.
        echo Authentication failed. Please try again.
        pause
        exit /b 1
    )
)

echo.
echo Step 3: Linking project to Vercel...
if not exist ".vercel" (
    echo Project not linked. Linking now...
    vercel link --yes
    if %errorlevel% neq 0 (
        echo Failed to link project.
        pause
        exit /b 1
    )
) else (
    echo Project is already linked.
)

echo.
echo ============================================
echo IMPORTANT: Environment Variables
echo ============================================
echo.
echo Before deploying, make sure you've set these in Vercel Dashboard:
echo.
echo   1. NEXT_PUBLIC_SUPABASE_URL
echo   2. NEXT_PUBLIC_SUPABASE_ANON_KEY
echo   3. SUPABASE_SERVICE_ROLE_KEY
echo.
echo Go to: https://vercel.com/dashboard
echo Then: Settings -^> Environment Variables
echo.
set /p continue="Have you set the environment variables? (y/N): "
if /i not "%continue%"=="y" (
    echo.
    echo Please set the environment variables first!
    echo Opening Vercel Dashboard...
    start https://vercel.com/dashboard
    pause
    exit /b 0
)

echo.
echo Step 4: Deploying to Vercel Production...
echo.
vercel --prod --yes

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo Deployment Successful!
    echo ============================================
    echo.
    echo Your application should be live shortly!
    echo Check the deployment status in Vercel Dashboard.
) else (
    echo.
    echo ============================================
    echo Deployment Failed
    echo ============================================
    echo.
    echo Please check the error messages above.
)

echo.
pause
