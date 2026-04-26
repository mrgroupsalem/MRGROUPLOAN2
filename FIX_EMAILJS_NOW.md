# 📝 EmailJS Configuration - Copy & Paste Guide

## CURRENT STATUS: ⚠️ DEMO MODE ACTIVE

Your app will NOT send real emails until you configure EmailJS credentials.

---

## 🔧 WHAT YOU NEED TO DO RIGHT NOW:

### Step 1: Open .env.local File

Location: `C:\Users\SANDY\Documents\MR Groups\.env.local`

Current content (lines 9-11):
```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id_here
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id_here
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key_here
```

---

### Step 2: Sign Up for EmailJS (FREE - 2 minutes)

1. Go to: **https://www.emailjs.com/**
2. Click **"Sign Up Free"**
3. Choose one:
   - Continue with Google (recommended)
   - Continue with GitHub
   - Sign up with email

---

### Step 3: Create Email Service (1 minute)

1. After login, click **"Add New Service"**
2. Select **"Gmail"**
3. Click **"Connect"**
4. Login to your Gmail account when prompted
5. Click **"Create Service"**
6. You'll see something like: `service_abc1234567`
7. **COPY THIS VALUE** ← This is your SERVICE ID

Example:
```
Service ID: service_gmail_8h3k9j2l4m5n
```

---

### Step 4: Create Email Template (2 minutes)

1. Click **"Email Templates"** → **"Create New Template"**
2. In the HTML editor, paste this:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .badge { display: inline-block; background: #4F46E5; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
    .footer { background: #333; color: #aaa; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏦 MR Groups</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Loan Management System</p>
    </div>
    <div class="content">
      <span class="badge">{{notification_type}}</span>
      <h2 style="color: #333; margin-top: 0;">{{subject}}</h2>
      <div style="line-height: 1.8; color: #555; white-space: pre-line;">
        {{message}}
      </div>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px;">
        <strong>Sent:</strong> {{sent_at}}<br>
        <strong>To:</strong> {{to_email}}
      </div>
    </div>
    <div class="footer">
      <p>This is an automated notification from MR Groups Loan Management System.</p>
      <p>&copy; 2025 MR Groups. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

3. In **"To Email"** field, enter: `{{to_email}}`
4. In **"Subject"** field, enter: `{{subject}}`
5. Click **"Save"** button
6. Name it: "MR Groups Notification"
7. You'll see something like: `template_xyz7890123`
8. **COPY THIS VALUE** ← This is your TEMPLATE ID

Example:
```
Template ID: template_notification_9k8j7h6g
```

---

### Step 5: Get Public Key (30 seconds)

1. Click your **name/profile** in top-right corner
2. Select **"Account"**
3. Scroll down to **"API Keys"** section
4. You'll see **"Public Key"**
5. **COPY THIS VALUE** ← This is your PUBLIC KEY

Example:
```
Public Key: user_abcdef123456789
```

---

### Step 6: Update .env.local File

Open `.env.local` and replace lines 9-11 with YOUR actual values:

```env
# EmailJS Configuration for Email Notifications
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_gmail_8h3k9j2l4m5n
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_notification_9k8j7h6g
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=user_abcdef123456789
```

⚠️ **IMPORTANT**: Replace the example values above with YOUR actual values!

---

### Step 7: Restart Development Server (REQUIRED!)

In your terminal where `npm run dev` is running:

1. Press **Ctrl+C** to stop
2. Run again: `npm run dev`
3. Wait for: "✓ Ready in X.Xs"

---

### Step 8: Test It! 🎯

1. Open browser: http://localhost:3001
2. Go to **Settings** → **General** tab
3. Enter your Gmail in **"Contact Email"**
4. Click **"Save Settings"**
5. Go to **Notifications** tab
6. Make sure **"Email Notifications"** is ON (toggle should be blue)
7. Scroll to bottom blue box
8. Click **"Send Test Email"**
9. Check your Gmail inbox!

You should receive an email within 1-2 minutes! ✉️

---

## ✅ SUCCESS CHECKLIST

After setup, verify:

- [ ] Browser console (F12) shows: `✓ Email notification sent successfully: your@email.com`
- [ ] NO "Demo Mode" warning in console
- [ ] Email received in Gmail inbox
- [ ] Email subject: "🧪 Test Email from MR Groups"
- [ ] Email has nice formatting with purple header

---

## ❌ STILL GETTING ERROR?

### Quick Debug:

1. **Check .env.local has real values** (not placeholders):
   ```bash
   # Should NOT see:
   NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id_here
   
   # Should see something like:
   NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_gmail_8h3k9j2l4m5n
   ```

2. **Verify server restarted** after updating `.env.local`

3. **Check EmailJS dashboard logs**:
   - Login to EmailJS
   - Click "Logs"
   - See if email was sent or failed

4. **Check spam folder** in Gmail

---

## 💰 COST

- **FREE**: 200 emails/month (plenty for testing!)
- No credit card required
- No time limit on free tier

---

## 🆘 NEED HELP?

If still stuck:

1. Read: **EMAILJS_TROUBLESHOOTING.md** (detailed troubleshooting)
2. Or read: **EMAILJS_SETUP.md** (step-by-step with more details)
3. Check EmailJS logs: https://dashboard.emailjs.com/logs
4. Contact EmailJS support: support@emailjs.com

---

## 📞 EXAMPLE VALUES (for reference)

Your values will look similar but DIFFERENT:

```env
# EXAMPLE - DO NOT COPY THESE EXACT VALUES
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_gmail_1234567
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_custom_7654321
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=user_abcdefghijklmnop
```

Each account has UNIQUE IDs - use YOUR own values!

---

**Time Required**: 5-7 minutes total  
**Cost**: FREE  
**Difficulty**: Easy (just copy-paste)  

**YOU CAN DO THIS!** 🚀
