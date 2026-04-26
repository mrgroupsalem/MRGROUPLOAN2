# Clean Next.js cache and rebuild
Write-Host "Cleaning Next.js cache..." -ForegroundColor Cyan
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Cache cleaned!" -ForegroundColor Green
Write-Host "Building project..." -ForegroundColor Cyan
npm run build
