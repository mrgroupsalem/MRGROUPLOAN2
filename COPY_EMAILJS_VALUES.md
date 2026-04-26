# 📋 COPY THESE VALUES FROM EMAILJS

## WHERE TO FIND YOUR CREDENTIALS IN EMAILJS DASHBOARD

---

## 1️⃣ SERVICE ID

**Location**: EmailJS Dashboard → Email Services

**What you'll see:**
```
┌─────────────────────────────────────┐
│ Your Email Services                 │
├─────────────────────────────────────┤
│ service_gmail_8h3k9j2l4m5n         │ ← COPY THIS
│   Gmail                            │
│   Connected ✓                      │
└─────────────────────────────────────┘
```

**How to get it:**
1. Login to https://dashboard.emailjs.com/
2. Click "Email Services" in left menu
3. Find your Gmail service
4. Click the copy icon next to Service ID
5. Paste into `.env.local`

**In .env.local:**
```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_gmail_8h3k9j2l4m5n
```

---

## 2️⃣ TEMPLATE ID

**Location**: EmailJS Dashboard → Email Templates

**What you'll see:**
```
┌─────────────────────────────────────┐
│ Your Email Templates                │
├─────────────────────────────────────┤
│ template_notification_5m6n7p8q     │ ← COPY THIS
│ MR Groups Main Template            │
│ Last modified: 2 minutes ago       │
└─────────────────────────────────────┘
```

**How to get it:**
1. Click "Email Templates" in left menu
2. Find your template
3. Click the copy icon next to Template ID
4. Paste into `.env.local`

**In .env.local:**
```env
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_notification_5m6n7p8q
```

---

## 3️⃣ PUBLIC KEY

**Location**: EmailJS Dashboard → Account → API Keys

**What you'll see:**
```
┌─────────────────────────────────────┐
│ API Keys                            │
├─────────────────────────────────────┤
│ Public Key:                         │
│ user_abcdef123456789xyz           │ ← COPY THIS
│                                     │
│ Private Key:                        │
│ (hidden)                            │
└─────────────────────────────────────┘
```

**How to get it:**
1. Click your profile name → "Account"
2. Scroll to "API Keys" section
3. Click copy icon next to Public Key
4. Paste into `.env.local`

**In .env.local:**
```env
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=user_abcdef123456789xyz
```

---

## ✅ FINAL .env.local FILE

After copying all three values, your file should look like:

```env
# Created by Vercel CLI
VERCEL_OIDC_TOKEN="eyJhbGciOi..."
NEXT_PUBLIC_SUPABASE_URL=https://hrarjtvxeuuubclbkevz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# EmailJS Configuration for Email Notifications
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_gmail_8h3k9j2l4m5n
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_notification_5m6n7p8q
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=user_abcdef123456789xyz
```

⚠️ **YOUR VALUES WILL BE DIFFERENT** - use your actual credentials!

---

## 🔄 AFTER UPDATING.env.local

**CRITICAL**: You MUST restart the development server!

```bash
# Stop server (press Ctrl+C)
# Then start again
npm run dev
```

---

## 🎯 VERIFICATION

After restarting server and testing:

### Check Browser Console (F12):

**✅ SUCCESS - Real Email Sent:**
```
✓ Email notification sent successfully: yourname@gmail.com
```

**❌ STILL DEMO MODE:**
```
⚠️ EmailJS not configured - Using demo mode
📧 Email would be sent to: yourname@gmail.com
```

If still in demo mode:
- Check that all 3 values are updated in `.env.local`
- Verify no typos in the values
- Make sure you restarted the server
- Check that file was saved

---

## 📸 VISUAL GUIDE

### Step-by-Step Screenshot Locations:

1. **Service ID**: 
   - URL: https://dashboard.emailjs.com/admin/services
   - Look for your Gmail service
   - Copy the ID

2. **Template ID**:
   - URL: https://dashboard.emailjs.com/admin/templates
   - Look for "MR Groups Main Template"
   - Copy the ID

3. **Public Key**:
   - URL: https://dashboard.emailjs.com/admin/account
   - Scroll to "API Keys"
   - Copy the Public Key

---

## 💡 PRO TIPS

1. **No Spaces**: When copying, ensure no leading/trailing spaces
2. **Case Sensitive**: Keep exact capitalization
3. **Save File**: Press Ctrl+S after updating `.env.local`
4. **Restart Required**: Server won't recognize changes until restarted
5. **Check Logs**: If fails, check EmailJS logs dashboard

---

## 🔍 COMMON MISTAKES

❌ **Wrong:**
```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID= your_service_id  # Space at start
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=Your_Template_ID # Wrong case
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY="user_abc123"     # Quotes around it
```

✅ **Correct:**
```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_abc123
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xyz789
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=user_abc123xyz
```

---

**Once all three are set correctly and server is restarted, emails will work!** 🎉
