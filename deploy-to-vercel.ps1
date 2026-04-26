# MR Groups - Vercel Deployment Script
# This script will help you deploy your project to Vercel

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "MR Groups - Vercel Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
Write-Host "Checking Vercel CLI..." -ForegroundColor Yellow
try {
    $vercelVersion = vercel --version 2>&1
    Write-Host "✓ Vercel CLI found: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
}

Write-Host ""
Write-Host "Checking authentication..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Not logged in to Vercel" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please authenticate with Vercel:" -ForegroundColor Yellow
    Write-Host "1. Run: vercel login" -ForegroundColor White
    Write-Host "2. Follow the browser prompts to authenticate" -ForegroundColor White
    Write-Host "3. Then run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Starting login process..." -ForegroundColor Yellow
    vercel login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Login failed. Please try again manually." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ Authenticated as: $whoami" -ForegroundColor Green
}

Write-Host ""
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Gray
Write-Host ""

# Check if project is linked
if (Test-Path ".vercel\project.json") {
    Write-Host "✓ Project is already linked to Vercel" -ForegroundColor Green
    $projectInfo = Get-Content ".vercel\project.json" | ConvertFrom-Json
    Write-Host "  Project: $($projectInfo.projectId)" -ForegroundColor Gray
} else {
    Write-Host "Linking project to Vercel..." -ForegroundColor Yellow
    Write-Host "You will be prompted to:" -ForegroundColor White
    Write-Host "  1. Select or create a Vercel project" -ForegroundColor White
    Write-Host "  2. Confirm project settings" -ForegroundColor White
    Write-Host ""
    vercel link --yes
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to link project" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "IMPORTANT: Environment Variables" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Before deploying, make sure you've set these environment variables in Vercel Dashboard:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Required Variables:" -ForegroundColor White
Write-Host "  1. NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Cyan
Write-Host "  2. NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Cyan
Write-Host "  3. SUPABASE_SERVICE_ROLE_KEY (for API routes)" -ForegroundColor Cyan
Write-Host ""
Write-Host "To set them:" -ForegroundColor White
Write-Host "  1. Go to: https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host "  2. Select your project" -ForegroundColor Gray
Write-Host "  3. Go to Settings → Environment Variables" -ForegroundColor Gray
Write-Host "  4. Add each variable for Production, Preview, and Development" -ForegroundColor Gray
Write-Host ""
$continue = Read-Host "Have you set the environment variables? (y/N)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host ""
    Write-Host "Please set the environment variables first, then run this script again." -ForegroundColor Yellow
    Write-Host "Opening Vercel Dashboard..." -ForegroundColor Yellow
    Start-Process "https://vercel.com/dashboard"
    exit 0
}

Write-Host ""
Write-Host "Deploying to Vercel Production..." -ForegroundColor Yellow
Write-Host ""

# Deploy to production
vercel --prod --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "✓ Deployment Successful!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your application should be live shortly!" -ForegroundColor White
    Write-Host "Check the deployment status in Vercel Dashboard" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "✗ Deployment Failed" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above and try again." -ForegroundColor Yellow
    exit 1
}
