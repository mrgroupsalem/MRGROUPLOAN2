# OTP Verification Setup Guide

This guide will help you set up OTP verification using Twilio for your MR Groups loan management application.

## Prerequisites

1. A Twilio account (sign up at [twilio.com](https://www.twilio.com))
2. A verified phone number for sending SMS
3. Access to your project's environment variables

## Step 1: Twilio Account Setup

### 1.1 Create Twilio Account
1. Go to [twilio.com](https://www.twilio.com) and sign up
2. Verify your email and phone number
3. Complete the account verification process

### 1.2 Get Twilio Credentials
1. Log into your Twilio Console
2. Go to the Dashboard
3. Copy your **Account SID** and **Auth Token**
4. Note down your **Phone Number** (you'll get one free number)

## Step 2: Twilio Verify Service (Recommended)

### 2.1 Create Verify Service
1. In Twilio Console, go to **Verify** → **Services**
2. Click **Create Service**
3. Give it a name like "MR Groups OTP Service"
4. Copy the **Service SID** (starts with VA...)

### 2.2 Configure Service
1. Set verification code length to **6 digits**
2. Set expiry time to **5 minutes**
3. Enable SMS channel
4. Save the configuration

## Step 3: Environment Configuration

### 3.1 Create .env.local File
Create a file named `.env.local` in your project root with the following content:

```env
# Supabase Configuration (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://zhohpntqzrcsxihlscah.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpob2hwbnRxenJjc3hpaGxzY2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODc1NTIsImV4cCI6MjA3Mzk2MzU1Mn0.nJXHxhcQRnHTTAuMR5BM0qh9mqw-AHJOxxS_tB16nOw

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_SERVICE_SID=your_verify_service_sid_here
OTP_SIGNING_SECRET=your_random_secret_key_here
DEFAULT_COUNTRY_CODE=+91
```

### 3.2 Replace Placeholder Values

Replace the following values with your actual Twilio credentials:

- `your_account_sid_here` → Your Twilio Account SID
- `your_auth_token_here` → Your Twilio Auth Token  
- `your_twilio_phone_number` → Your Twilio phone number (e.g., +1234567890)
- `your_verify_service_sid_here` → Your Verify Service SID (starts with VA...)
- `your_random_secret_key_here` → Generate a random 32+ character string

### 3.3 Generate OTP Signing Secret

Generate a random secret key for OTP token signing:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

## Step 4: Testing the Setup

### 4.1 Start Development Server
```bash
npm run dev
```

### 4.2 Test OTP Flow
1. Go to your application dashboard
2. Click "New Loan Application"
3. Fill in the form with a valid mobile number
4. Click "Verify & Submit"
5. Check if you receive an OTP SMS
6. Enter the OTP to complete verification

### 4.3 Troubleshooting

**If OTP is not being sent:**
1. Check your Twilio account balance
2. Verify phone number format (should include country code)
3. Check Twilio Console for error logs
4. Ensure environment variables are correctly set

**If OTP verification fails:**
1. Check if OTP_SIGNING_SECRET is set
2. Verify TWILIO_SERVICE_SID is correct
3. Check browser console for errors

## Step 5: Production Deployment

### 5.1 Vercel Deployment
1. Add environment variables in Vercel dashboard
2. Deploy your application
3. Test OTP functionality in production

### 5.2 Environment Variables for Production
Make sure to add all Twilio environment variables to your production environment:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_SERVICE_SID`
- `OTP_SIGNING_SECRET`
- `DEFAULT_COUNTRY_CODE`

## Step 6: Security Considerations

### 6.1 Rate Limiting
- Twilio has built-in rate limiting
- Consider implementing additional rate limiting in your application
- Monitor usage to avoid unexpected charges

### 6.2 Phone Number Validation
- Validate phone numbers before sending OTP
- Implement proper error handling
- Log failed attempts for monitoring

### 6.3 Cost Management
- Monitor Twilio usage and costs
- Set up billing alerts
- Consider implementing OTP expiry and cleanup

## Step 7: Features Implemented

✅ **OTP Generation**: 6-digit random numeric code
✅ **SMS Sending**: Via Twilio SMS API
✅ **OTP Verification**: Secure verification process
✅ **Resend Functionality**: With 30-second cooldown timer
✅ **Expiry Handling**: 5-minute OTP expiry
✅ **Error Handling**: Comprehensive error messages
✅ **Success Flow**: Complete loan creation after verification
✅ **UI/UX**: Modern, responsive design

## Step 8: API Endpoints

### Send OTP
- **Endpoint**: `POST /api/otp/send`
- **Body**: `{ "phone": "9876543210" }`
- **Response**: `{ "success": true, "method": "verify" }`

### Verify OTP
- **Endpoint**: `POST /api/otp/verify`
- **Body**: `{ "phone": "9876543210", "code": "123456" }`
- **Response**: `{ "success": true }`

## Step 9: Pages Created

1. **`/new-loan`** - Loan application form with OTP integration
2. **`/verify-otp`** - OTP verification page
3. **`/loan-success`** - Success page after loan creation

## Support

If you encounter any issues:

1. Check Twilio Console for detailed logs
2. Verify all environment variables are set correctly
3. Test with a known working phone number
4. Check browser console for client-side errors
5. Review server logs for API errors

For Twilio-specific issues, refer to [Twilio Documentation](https://www.twilio.com/docs) or contact Twilio Support.
