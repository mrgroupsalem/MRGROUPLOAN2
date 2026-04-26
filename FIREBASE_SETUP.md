# Firebase OTP Setup Guide

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name (e.g., "mr-groups-loan-management")
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Phone" provider
5. Add your domain to authorized domains

## 3. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" and select Web (</>) icon
4. Register app with a nickname
5. Copy the Firebase configuration object

## 4. Environment Variables

Add these to your `.env.local` file:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here

# Default Country Code (optional)
DEFAULT_COUNTRY_CODE=+91
```

## 5. Firebase Security Rules

Update your Firebase Authentication settings:

1. Go to Authentication > Settings
2. Add your domain to "Authorized domains"
3. For development, add `localhost` and your development domain

## 6. Testing

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Test OTP functionality on the new loan page

## 7. Production Deployment

1. Add your production domain to Firebase authorized domains
2. Update environment variables in your hosting platform
3. Test OTP functionality in production

## Troubleshooting

- Make sure all Firebase environment variables are set correctly
- Check that Phone authentication is enabled in Firebase Console
- Verify that your domain is added to authorized domains
- Check browser console for any Firebase errors
