# 🎯 Quick Start Guide: Email Notifications

## Goal
Send email notifications to your Gmail/contact email when notification settings are saved.

## What You'll Get
✅ Automatic confirmation emails when saving notification preferences  
✅ Ability to send test emails to verify configuration  
✅ Future: Collection reminders, loan alerts, batch notifications  

---

## Step-by-Step Setup (5 Minutes)

### Step 1: Set Your Contact Email (30 seconds)

1. Open your MR Groups app
2. Go to **Settings** → **General** tab
3. Enter your Gmail address in **Contact Email** field
   - Example: `yourname@gmail.com`
4. Click **"Save Settings"**

![General Settings](https://via.placeholder.com/600x200?text=Settings+%E2%86%92+General+%E2%86%92+Enter+Contact+Email)

---

### Step 2: Enable EmailJS (3 minutes)

#### A. Create Free Account
1. Visit [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click **"Sign Up Free"**
3. Use Google/GitHub or create account with email
4. Verify your email

#### B. Add Email Service
1. Click **"Add New Service"**
2. Select **Gmail** (or your email provider)
3. Connect your Gmail account
4. Copy the **Service ID** (e.g., `service_abc123`)

#### C. Create Email Template
1. Click **"Email Templates"** → **"Create New Template"**
2. Paste this HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; }
    .footer { background: #333; color: white; padding: 15px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏦 MR Groups</h1>
    </div>
    <div class="content">
      <h2>{{subject}}</h2>
      <p>{{message}}</p>
      <p><small>Sent: {{sent_at}}</small></p>
    </div>
    <div class="footer">
      <p>MR Groups Loan Management System</p>
    </div>
  </div>
</body>
</html>
```

3. Set these fields:
   - **To Email**: `{{to_email}}`
   - **Subject**: `{{subject}}`
   - **Variables**: Add `to_email`, `subject`, `message`, `notification_type`, `sent_at`
4. Save and copy the **Template ID** (e.g., `template_xyz789`)

#### D. Get Public Key
1. Click your name → **Account**
2. Scroll to **API Keys**
3. Copy the **Public Key** (e.g., `user_abc123xyz`)

---

### Step 3: Configure Environment Variables (1 minute)

1. Open `.env.local` file in your project
2. Replace these lines:

```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id_here
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id_here
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key_here
```

3. With your actual values:

```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_abc123
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xyz789
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=user_abc123xyz
```

4. Save the file
5. **Restart your dev server**: 
   - Press `Ctrl+C` in terminal
   - Run `npm run dev` again

---

### Step 4: Test It! (30 seconds)

1. Go to **Settings** → **Notifications** tab
2. Make sure **"Email Notifications"** toggle is ON
3. Scroll to the blue box at bottom
4. Click **"Send Test Email"** button
5. Check your Gmail inbox!

![Test Email Button](https://via.placeholder.com/600x150?text=Notifications+%E2%86%92+Test+Email+Configuration+%E2%86%92+Send+Test+Email)

---

## How It Works

### When You Save Notification Settings:

```
User clicks "Save Preferences"
        ↓
App saves settings to localStorage
        ↓
Checks if email notifications are ON
        ↓
Checks if contact email exists
        ↓
Sends confirmation email via EmailJS
        ↓
Shows success message: "✓ Notification preferences saved! Confirmation email sent to yourname@gmail.com"
```

### Email Flow Diagram:

```
┌─────────────┐
│   Settings  │
│   Page      │
└──────┬──────┘
       │ User saves preferences
       ▼
┌─────────────┐
│  Settings   │
│  Component  │
└──────┬──────┘
       │ Calls sendTestEmail()
       ▼
┌─────────────┐
│notifications│
│  .ts        │
└──────┬──────┘
       │ Uses emailjs.send()
       ▼
┌─────────────┐
│  EmailJS    │
│   Server    │
└──────┬──────┘
       │ Sends via your Gmail
       ▼
┌─────────────┐
│   Gmail     │
│   Inbox     │
└─────────────┘
```

---

## Features Location Map

```
Settings Page
├── General Tab
│   └── Contact Email field ← This email receives notifications
│
└── Notifications Tab
    ├── Email Notifications toggle ← Must be ON to send emails
    ├── SMS Notifications toggle (future)
    ├── Push Notifications toggle (future)
    │
    └── Test Email Configuration (blue box at bottom)
        └── Send Test Email button ← Click to test
```

---

## Testing Checklist

Before going to production:

- [ ] Contact email set in General Settings
- [ ] EmailJS account created
- [ ] Email service connected
- [ ] Email template created with all variables
- [ ] Environment variables configured
- [ ] Dev server restarted
- [ ] Test email sent successfully
- [ ] Email received in inbox
- [ ] Email displays correctly (not in spam)

---

## Common Issues & Quick Fixes

### Issue: Button says "Sending..." but nothing happens

**Fix**: Check browser console (F12) for errors
- If "EmailJS not configured": Update `.env.local` and restart server
- If network error: Check internet connection

### Issue: Email not received

**Fix**:
1. Wait 2-3 minutes (emails can be delayed)
2. Check spam/junk folder
3. Verify contact email is correct
4. Check EmailJS dashboard → Logs

### Issue: Test email button is grayed out

**Fix**: 
- Make sure you entered a contact email in General Settings
- Verify email format has @ symbol
- Save General Settings first

---

## Production Checklist

When deploying to Vercel:

1. ✅ Add environment variables to Vercel
2. ✅ Test with real email after deployment
3. ✅ Monitor EmailJS usage (free tier: 200/month)
4. ✅ Consider upgrading plan if needed

---

## Next Steps

After setup, you can:

1. **Receive automatic confirmations** every time you change notification settings
2. **Send test emails** anytime to verify system health
3. **Integrate automated notifications** for:
   - Collection reminders (coming soon)
   - Loan status alerts (coming soon)
   - Batch collection reminders (coming soon)

---

## Support Resources

- **Full Setup Guide**: `EMAILJS_SETUP.md`
- **Implementation Details**: `EMAIL_NOTIFICATIONS_SUMMARY.md`
- **EmailJS Docs**: https://www.emailjs.com/docs/
- **EmailJS Pricing**: https://www.emailjs.com/pricing/

---

**Need Help?**

1. Read the detailed guide: `EMAILJS_SETUP.md`
2. Check browser console for errors
3. Review EmailJS dashboard logs
4. Verify all configuration steps completed

---

**Status**: ✅ Ready to Use  
**Setup Time**: ~5 minutes  
**Cost**: FREE (200 emails/month)
