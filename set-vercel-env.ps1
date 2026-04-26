# Set Environment Variables in Vercel
# This script sets the required environment variables for your Vercel project

$VERCEL_TOKEN = "your_vercel_token_here"
$PROJECT_NAME = "mr-groups"
$TEAM_ID = "selvakumarsanthosh007-1196s-projects"

# Environment variables to set
$envVars = @{
    "NEXT_PUBLIC_SUPABASE_URL" = "https://hrarjtvxeuuubclbkevz.supabase.co"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyYXJqdHZ4ZXV1dWJjbGJrZXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMTg4NjAsImV4cCI6MjA4MzY5NDg2MH0.rIWnH90iZ_F-hmJok3UixdJCSdzCBkJh7ysU1U36wXE"
}

Write-Host "Setting environment variables for Vercel project: $PROJECT_NAME" -ForegroundColor Cyan
Write-Host ""

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    Write-Host "Setting $key..." -ForegroundColor Yellow
    
    # Set for Production, Preview, and Development
    $body = @{
        key = $key
        value = $value
        type = "encrypted"
        target = @("production", "preview", "development")
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$PROJECT_NAME/env" `
            -Method POST `
            -Headers @{
                "Authorization" = "Bearer $VERCEL_TOKEN"
                "Content-Type" = "application/json"
            } `
            -Body $body
        
        Write-Host "✓ Successfully set $key" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to set $key : $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "IMPORTANT: SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need to manually add SUPABASE_SERVICE_ROLE_KEY:" -ForegroundColor Yellow
Write-Host "1. Go to: https://vercel.com/selvakumarsanthosh007-1196s-projects/mr-groups/settings/environment-variables" -ForegroundColor White
Write-Host "2. Add SUPABASE_SERVICE_ROLE_KEY (get it from Supabase Dashboard)" -ForegroundColor White
Write-Host "3. Apply to: Production, Preview, Development" -ForegroundColor White
Write-Host "4. Redeploy the project" -ForegroundColor White
Write-Host ""
Write-Host "After setting SUPABASE_SERVICE_ROLE_KEY, redeploy:" -ForegroundColor Yellow
Write-Host "  vercel --prod --yes" -ForegroundColor White
Write-Host ""
