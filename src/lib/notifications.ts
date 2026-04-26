import emailjs from '@emailjs/browser'

// EmailJS Configuration
const EMAILJS_CONFIG = {
  serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
  templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '',
  publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || ''
}

export interface NotificationEmail {
  toEmail: string
  subject: string
  message: string
  type: 'general' | 'collection_reminder' | 'loan_alert' | 'batch_reminder' | 'test'
}

/**
 * Send browser/device notification
 */
export function sendBrowserNotification(title: string, options: NotificationOptions) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, options)
    console.log('📱 Browser notification sent:', title)
    return true
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    // Request permission
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, options)
        console.log('📱 Browser notification sent (after permission):', title)
        return true
      }
    })
  } else {
    console.warn('🚫 Browser notifications not supported or denied')
    return false
  }
  return false
}

/**
 * Send email notification using EmailJS
 */
export async function sendNotificationEmail(email: NotificationEmail): Promise<boolean> {
  try {
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) {
      console.warn('⚠️ EmailJS not configured - Using demo mode')
      console.log('📧 Email would be sent to:', email.toEmail)
      console.log('📝 Subject:', email.subject)
      console.log('📝 Message:', email.message)
      
      // Show browser notification as fallback
      sendBrowserNotification('📧 Email Notification (Demo Mode)', {
        body: `Would send to: ${email.toEmail}\nSubject: ${email.subject}`,
        icon: '🏦'
      })
      
      return true
    }
    
    console.log('\n📧 EMAIL CONFIGURATION VERIFIED:')
    console.log('   Service ID:', EMAILJS_CONFIG.serviceId)
    console.log('   Template ID:', EMAILJS_CONFIG.templateId)
    console.log('   Public Key:', EMAILJS_CONFIG.publicKey.substring(0, 15) + '...')
    
    console.log('\n📋 PREPARING EMAIL:')
    console.log('   To Email:', email.toEmail)
    console.log('   From Email:', 'selvakumarsanthosh007@gmail.com')
    console.log('   Subject:', email.subject)
    console.log('   Type:', email.type)

    const templateParams = {
      to_email: email.toEmail,
    from_email: 'selvakumarsanthosh007@gmail.com',
      subject: email.subject,
      message: email.message,
      notification_type: email.type,
      sent_at: new Date().toLocaleString()
    }
    
    console.log('\n📋 TEMPLATE PARAMETERS:')
    console.log('   to_email:', templateParams.to_email)
    console.log('  from_email:', templateParams.from_email)
    console.log('   subject:', templateParams.subject)
    console.log('   message preview:', templateParams.message.substring(0, 50) + '...')

    await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    )

    console.log('\n✅ SUCCESS! Email sent to:', email.toEmail)
    console.log('   Check Gmail inbox for:', email.toEmail)
    
    // Also send browser notification
    sendBrowserNotification('📧 Email Sent', {
      body: `Email sent to ${email.toEmail}`,
      icon: '✅'
    })
    
    return true
  } catch(error: any) {
    console.error('\n❌ FAILED TO SEND EMAIL:', error)
    
    if (error.status === 401) {
      console.error('   ❌ Invalid EmailJS credentials. Check.env.local')
    } else if (error.status === 402) {
      console.error('   ❌ EmailJS payment required or limit exceeded')
    } else if (error.text) {
      console.error('   ❌ EmailJS Error:', error.text)
    } else if (error.message) {
      console.error('   ❌ Error Message:', error.message)
    }
    
    return false
  }
}

/**
 * Send BOTH email and browser notification
 */
export async function sendDualNotification(email: NotificationEmail): Promise<boolean> {
  const emailSent = await sendNotificationEmail(email)
  
  // Create browser notification icon based on type
  const icons = {
    general: '📧',
    collection_reminder: '📋',
    loan_alert: '💰',
    batch_reminder: '📅',
    test: '🧪'
  }
  
  const icon = icons[email.type] || '📧'
  
  // Send browser notification with more details
  sendBrowserNotification(`${icon} ${email.subject}`, {
    body: email.message.substring(0, 100) + (email.message.length > 100 ? '...' : ''),
    icon: icon,
    badge: '🏦',
    tag: email.type, // Group similar notifications
    requireInteraction: false,
    silent: false
  })
  
  return emailSent
}

/**
 * Send test email
 */
export async function sendTestEmail(toEmail: string): Promise<boolean> {
  return sendDualNotification({
    toEmail,
    subject: '🧪 Test Email from MR Groups',
    message: `This is a test email from MR Groups Loan Management System.\n\nIf you received this email, it means your notification settings are working correctly!\n\nBest regards,\nMR Groups Team`,
    type: 'test'
  })
}

/**
 * Send collection reminder email and browser notification
 */
export async function sendCollectionReminderEmail(
  toEmail: string,
  customerName: string,
  amount: number,
  dueDate: string
): Promise<boolean> {
  const dayOfWeek = new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long' })
  
  return sendDualNotification({
    toEmail,
    subject: `📋 Collection Reminder - ${customerName} (${dayOfWeek})`,
    message: `Dear Team,\n\nThis is a reminder about the upcoming collection:\n\nCustomer: ${customerName}\nAmount: ₹${amount}\nDue Date: ${dueDate} (${dayOfWeek})\n\nToday is ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}. Please follow up with the customer accordingly.\n\nBest regards,\nMR Groups Team`,
    type: 'collection_reminder'
  })
}

/**
 * Send loan alert email and browser notification
 */
export async function sendLoanAlertEmail(
  toEmail: string,
  customerName: string,
  loanAmount: number,
  status: string
): Promise<boolean> {
  return sendDualNotification({
    toEmail,
    subject: `💰 Loan Alert - ${customerName} - ${status}`,
    message: `Dear Team,\n\nA loan status update:\n\nCustomer: ${customerName}\nLoan Amount: ₹${loanAmount}\nCurrent Status: ${status}\n\nPlease review and take necessary action.\n\nBest regards,\nMR Groups Team`,
    type: 'loan_alert'
  })
}

/**
 * Send batch collection reminder email and browser notification
 */
export async function sendBatchReminderEmail(
  toEmail: string,
  batchName: string,
  collectionDate: string,
  totalAmount: number
): Promise<boolean> {
  const dayOfWeek = new Date(collectionDate).toLocaleDateString('en-US', { weekday: 'long' })
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  
  return sendDualNotification({
    toEmail,
    subject: `📅 Batch Collection Reminder - ${batchName} (${dayOfWeek})`,
    message: `Dear Team,\n\nUpcoming batch collection reminder:\n\nBatch: ${batchName}\nCollection Date: ${collectionDate} (${dayOfWeek})\nExpected Total: ₹${totalAmount}\n\nToday is ${today}. Please prepare for the collection day.\n\nBest regards,\nMR Groups Team`,
    type: 'batch_reminder'
  })
}

/**
 * Send general notification email and browser notification
 */
export async function sendGeneralNotificationEmail(
  toEmail: string,
  subject: string,
  message: string
): Promise<boolean> {
  return sendDualNotification({
    toEmail,
    subject,
    message,
    type: 'general'
  })
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('❌ Browser does not support notifications')
    return false
  }
  
  if (Notification.permission === 'granted') {
    console.log('✅ Notification permission already granted')
    return true
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  
  return false
}
