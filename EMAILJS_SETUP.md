# 📧 EmailJS Setup Guide for MR Groups Notifications

This guide will help you configure email notifications in the MR Groups Loan Management System.

## Overview

The application now supports sending email notifications to the contact email address specified in **Settings → General**. Emails are sent for:

- ✅ Notification preference changes (confirmation emails)
- ✅ Test emails to verify configuration
- 🔄 Collection reminders (future feature)
- 🔄 Loan alerts (future feature)
- 🔄 Batch collection reminders (future feature)

## Prerequisites

You need an EmailJS account to send emails. EmailJS offers a **free tier** with 200 emails/month.

## Step-by-Step Setup

### 1. Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click **"Sign Up Free"**
3. Create your account (you can use Google, GitHub, or email)
4. Verify your email address

### 2. Add Email Service

1. After logging in, click **"Add New Service"**
2. Choose your email provider:
   - **Gmail** (recommended for testing)
   - Outlook
   - Office 365
   - Or any other SMTP service
3. Follow the connection steps for your provider
4. Name your service (e.g., "MR Groups Notifications")
5. Click **"Create Service"**

### 3. Get Service ID

1. After creating the service, you'll see it in your dashboard
2. Copy the **Service ID** (looks like `service_xxxxxxx`)
3. This is your `NEXT_PUBLIC_EMAILJS_SERVICE_ID`

### 4. Create Email Template

1. Click **"Email Templates"** in the left menu
2. Click **"Create New Template"**
3. Choose your email service from the dropdown
4. Fill in the template details:

#### Template Settings:

**Subject:**
```
{{subject}}
```

**Message Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; }
    .footer { background: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .badge { display: inline-block; background: #4F46E5; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏦 MR Groups</h1>
      <p>Loan Management System</p>
    </div>
    
    <div class="content">
      <span class="badge">{{notification_type}}</span>
      <h2>{{subject}}</h2>
      
      <div style="white-space: pre-line;">
        {{message}}
      </div>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        <strong>Sent:</strong> {{sent_at}}<br>
        <strong>To:</strong> {{to_email}}
      </p>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from MR Groups Loan Management System.</p>
      <p>&copy; {{year}} MR Groups. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

**To Email:**
```
{{to_email}}
```

5. Click **"Save"**
6. Give your template a name (e.g., "MR Groups Notification")
7. Copy the **Template ID** (looks like `template_xxxxxxx`)
8. This is your `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`

### 5. Get Public Key

1. Click on your account name in the top right
2. Select **"Account"**
3. Scroll down to **"API Keys"** section
4. Copy the **Public Key**
5. This is your `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`

### 6. Configure Environment Variables

1. Open the `.env.local` file in your project root
2. Replace the placeholder values with your actual EmailJS credentials:

```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_xxxxxxx
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xxxxxxx
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=user_xxxxxxxxxxxx
```

3. Save the file
4. **Restart your development server** (Ctrl+C, then `npm run dev`)

### 7. Test Email Configuration

1. Start the application and navigate to **Settings → Notifications**
2. Make sure you have set a **Contact Email** in **Settings → General**
3. Enable **"Email Notifications"** toggle
4. Click **"Save Preferences"**
5. You should receive a confirmation email at the contact email address
6. Click **"Send Test Email"** button to verify everything works

## Troubleshooting

### Issue: "EmailJS not configured" warning in console

**Solution:** 
- Make sure all three environment variables are set in `.env.local`
- Restart your development server after making changes
- Check that there are no typos in the variable names

### Issue: Email not received

**Solutions:**
1. Check your spam/junk folder
2. Verify the contact email address is correct
3. Ensure EmailJS service is properly connected to your email account
4. Check EmailJS dashboard for delivery logs
5. Verify you haven't exceeded the free tier limit (200 emails/month)

### Issue: "Failed to send test email" error

**Solutions:**
1. Verify all EmailJS credentials are correct
2. Check browser console for detailed error messages
3. Ensure your EmailJS template has all required variables:
   - `{{to_email}}`
   - `{{subject}}`
   - `{{message}}`
   - `{{notification_type}}`
   - `{{sent_at}}`

## Usage in Code

### Sending Test Email

```typescript
import { sendTestEmail } from '@/lib/notifications'

const success = await sendTestEmail('user@example.com')
```

### Sending Collection Reminder

```typescript
import { sendCollectionReminderEmail } from '@/lib/notifications'

await sendCollectionReminderEmail(
  'manager@mrgroups.com',
  'John Doe',
  5000,
  '2024-01-15'
)
```

### Sending Loan Alert

```typescript
import { sendLoanAlertEmail } from '@/lib/notifications'

await sendLoanAlertEmail(
  'manager@mrgroups.com',
  'Jane Smith',
  50000,
  'Approved'
)
```

## Production Deployment

When deploying to Vercel or production:

1. Add the EmailJS environment variables to your Vercel project:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all three `NEXT_PUBLIC_EMAILJS_*` variables
   - Deploy again for changes to take effect

2. Or use the Vercel CLI:
   ```bash
   vercel env add NEXT_PUBLIC_EMAILJS_SERVICE_ID
   vercel env add NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
   vercel env add NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
   ```

## EmailJS Pricing

- **Free Tier**: 200 emails/month (sufficient for testing and small teams)
- **Email Basic**: $15/month (10,000 emails)
- **Email Pro**: $39/month (50,000 emails)

For more details, visit: https://www.emailjs.com/pricing/

## Support

If you encounter issues:
1. Check EmailJS documentation: https://www.emailjs.com/docs/
2. Review browser console for errors
3. Check EmailJS dashboard logs
4. Contact EmailJS support if needed

---

**Last Updated:** January 2025  
**Version:** 1.0
