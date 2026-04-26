@echo off
echo Setting up Vercel Environment Variables...
echo.

echo Setting Supabase variables...
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

echo.
echo Setting Twilio variables...
vercel env add TWILIO_ACCOUNT_SID production
vercel env add TWILIO_AUTH_TOKEN production
vercel env add TWILIO_PHONE_NUMBER production
vercel env add TWILIO_SERVICE_SID production
vercel env add OTP_SIGNING_SECRET production
vercel env add DEFAULT_COUNTRY_CODE production

echo.
echo Environment variables set! Now redeploying...
vercel --prod

echo.
echo Deployment complete! Your app is live at:
echo https://mr-groups-loan-management-qjgsex8f6.vercel.app
pause

