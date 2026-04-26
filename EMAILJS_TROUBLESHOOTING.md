# 🔧 EmailJS Troubleshooting Guide

## Error: "✗ Failed to send test email. Please check EmailJS configuration."

This error means EmailJS is not configured or has invalid credentials. Here's how to fix it:

---

## ✅ Quick Fix (Works Immediately!)

Your application is now in **DEMO MODE**. It will:
- ✅ Show what email would be sent in browser console
- ✅ Display browser notifications (if enabled)
- ✅ Log email content for verification
- ❌ NOT send actual emails until EmailJS is configured

### To See Demo Mode Working:
1. Go to **Settings → Notifications**
2. Click **"Send Test Email"**
3. Open browser console (F12)
4. You'll see: `📧 DEMO MODE - Email would be sent to: your@email.com`

---

## 🚀 To Enable REAL Email Sending:

### Step 1: Get EmailJS Credentials (FREE)

1. **Sign Up**: Visit [https://www.emailjs.com/](https://www.emailjs.com/)
   - Click "Sign Up Free"
   - Use Google, GitHub, or email

2. **Add Email Service**:
   - Click "Add New Service"
   - Select **Gmail** (easiest for testing)
   - Connect your Gmail account
   - Click "Create Service"
   - **Copy the Service ID** (e.g., `service_abc123`)

3. **Create Email Template**:
   - Click "Email Templates" → "Create New Template"
   - Use this HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; }
    .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
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
      <p><small>Sent at: {{sent_at}}</small></p>
    </div>
    <div class="footer">
      <p>MR Groups Loan Management System</p>
    </div>
  </div>
</body>
</html>
```

   - Set **To Email**: `{{to_email}}`
   - Set **Subject**: `{{subject}}`
   - Add variables: `to_email`, `subject`, `message`, `notification_type`, `sent_at`
   - Click "Save"
   - **Copy the Template ID** (e.g., `template_xyz789`)

4. **Get Public Key**:
   - Click your name → "Account"
   - Scroll to "API Keys"
   - **Copy the Public Key** (e.g., `user_abc123xyz`)

---

### Step 2: Update .env.local File

Open `.env.local` and replace these lines:

```env
# OLD - Placeholders
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id_here
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id_here
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key_here
```

With your ACTUAL credentials:

```env
# NEW - Your real credentials
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_abc123
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xyz789
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=user_abc123xyz
```

**Example:**
```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_gmail_1234567
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_notification_7654321
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=user_abcdef123456
```

---

### Step 3: Restart Development Server

**IMPORTANT**: You MUST restart the server for environment variables to take effect!

1. In terminal, press `Ctrl+C` to stop the server
2. Run: `npm run dev`
3. Wait for "✓ Ready"

---

### Step 4: Test Email Sending

1. Go to **Settings → General**
   - Enter your Gmail address in "Contact Email"
   - Click "Save Settings"

2. Go to **Settings → Notifications**
   - Make sure "Email Notifications" toggle is ON
   - Scroll to blue "Test Email Configuration" box
   - Click **"Send Test Email"** button

3. Check your Gmail inbox!
   - You should receive an email with subject "🧪 Test Email from MR Groups"
   - If not received, check spam folder

---

## 🔍 Common Issues & Solutions

### Issue 1: Still Getting Configuration Error After Setup

**Checklist:**
- [ ] Did you replace ALL THREE placeholder values in `.env.local`?
- [ ] Did you restart the development server after updating `.env.local`?
- [ ] Are there any typos in the Service ID, Template ID, or Public Key?
- [ ] Did you save the `.env.local` file?

**Solution:**
```bash
# Stop server (Ctrl+C)
# Verify .env.local has correct values
cat .env.local | grep EMAILJS
# Restart server
npm run dev
```

---

### Issue 2: "Invalid Service ID" or "401 Unauthorized"

**Cause**: Wrong credentials

**Solution:**
1. Go to EmailJS dashboard
2. Verify Service ID in "Email Services"
3. Verify Template ID in "Email Templates"
4. Verify Public Key in "Account" → "API Keys"
5. Update `.env.local` with exact values
6. Restart server

---

### Issue 3: Email Not Received

**Checklist:**
- [ ] Check spam/junk folder
- [ ] Verify contact email is correct in General Settings
- [ ] Check EmailJS dashboard → "Logs" for delivery status
- [ ] Ensure you haven't exceeded free tier limit (200 emails/month)

**Solution:**
1. Login to EmailJS dashboard
2. Click "Logs" in left menu
3. Find your email attempt
4. Check status:
   - ✅ Sent = delivered successfully
   - ⚠️ Bounced = invalid email address
   - ❌ Failed = check error message

---

### Issue 4: Browser Shows "Demo Mode" Message

**Meaning**: EmailJS credentials are still placeholders

**Solution:**
1. Open `.env.local`
2. Verify all three values are NOT the default placeholders:
   - ❌ `your_service_id_here` → Should be like `service_abc123`
   - ❌ `your_template_id_here` → Should be like `template_xyz789`
   - ❌ `your_public_key_here` → Should be like `user_abc123`
3. Restart server

---

### Issue 5: Template Variables Error

**Error**: "Template variables are missing"

**Solution:**
1. In EmailJS, edit your template
2. Make sure these variables exist (click "Add Variable"):
   - `{{to_email}}`
   - `{{subject}}`
   - `{{message}}`
   - `{{notification_type}}`
   - `{{sent_at}}`
3. Save template
4. No need to restart server

---

## 🎯 Verification Steps

After setup, verify everything works:

### Console Check (F12):
When you click "Send Test Email", you should see:
```
✓ Email notification sent successfully: yourname@gmail.com
```

NOT:
```
⚠️ EmailJS not configured - Using demo mode
```

---

### Browser Notification:
If EmailJS is configured correctly, you won't see the demo browser notification anymore.

---

### Email Inbox:
You should receive an actual email within 1-2 minutes.

---

## 📊 EmailJS Dashboard Monitoring

### Check Usage:
1. Login to EmailJS
2. Click "Usage" in left menu
3. View:
   - Emails sent this month
   - Remaining on free tier (200)
   - Success rate

### Check Logs:
1. Click "Logs" in left menu
2. See all email attempts
3. Filter by status (sent, failed, bounced)
4. Click individual log for details

---

## 💡 Alternative: Use Different Email Service

If Gmail doesn't work, EmailJS also supports:
- Outlook/Hotmail
- Office 365
- Yahoo Mail
- Custom SMTP (any email provider)

Just select different service when creating in EmailJS.

---

## 🆘 Still Having Issues?

### Debug Checklist:

```
[ ] EmailJS account created
[ ] Email service added in EmailJS
[ ] Email template created with all variables
[ ] Service ID copied correctly to .env.local
[ ] Template ID copied correctly to .env.local
[ ] Public Key copied correctly to .env.local
[ ] .env.local file saved
[ ] Development server restarted
[ ] Contact email set in General Settings
[ ] Email notifications toggle is ON
[ ] Browser console shows no errors
[ ] EmailJS logs show successful send
```

### Get Help:

1. **Check Browser Console** (F12):
   - Look for red error messages
   - Share exact error text

2. **Check EmailJS Logs**:
   - Dashboard → Logs
   - Find failed attempt
   - Read error message

3. **Verify Environment Variables**:
   ```bash
   # In terminal, check if variables are loaded
   npm run dev -- --env
   ```

4. **Test with Simple Email**:
   - Try sending to different email address
   - Try with minimal template (just subject and body)

---

## 🎉 Success Indicators

You'll know it's working when:

✅ Button says "Sending..." then shows success message  
✅ Browser console shows "✓ Email notification sent successfully"  
✅ No "Demo Mode" warnings in console  
✅ Email received in inbox within 1-2 minutes  
✅ EmailJS Logs show green checkmark  

---

## 📞 Support Resources

- **EmailJS Docs**: https://www.emailjs.com/docs/
- **EmailJS Support**: support@emailjs.com
- **Setup Guide**: EMAILJS_SETUP.md (in your project)
- **Quick Start**: QUICK_START_EMAIL_NOTIFICATIONS.md

---

**Last Updated**: January 2025  
**Status**: ✅ Fixed - Demo mode active, ready for EmailJS configuration
