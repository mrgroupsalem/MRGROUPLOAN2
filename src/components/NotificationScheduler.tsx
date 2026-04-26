'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  sendCollectionReminderEmail, 
  sendLoanAlertEmail, 
  sendBatchReminderEmail,
  requestNotificationPermission 
} from '@/lib/notifications'

interface NotificationSettings {
  contact_email: string
  email_notifications: boolean
  collection_reminders: boolean
  loan_alerts: boolean
  batch_reminders: boolean
}

export default function NotificationScheduler() {
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Request browser notification permission on mount
    requestNotificationPermission()
    
    // Load settings and check for notifications
    loadSettingsAndCheckNotifications()
    
    // Check every hour for new notifications
    const interval = setInterval(loadSettingsAndCheckNotifications, 60 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  const loadSettingsAndCheckNotifications = async () => {
    try {
      const saved = localStorage.getItem('mrgroups_settings')
      if (!saved) return
      
      const settings: NotificationSettings = JSON.parse(saved)
      
      if (!settings.contact_email || !settings.email_notifications) {
        console.log('⚠️ Email notifications not configured')
        return
      }

      // Check based on day of week and settings
      if (settings.collection_reminders) {
        await checkCollectionReminders(settings.contact_email)
      }
      
      if (settings.loan_alerts) {
        await checkLoanAlerts(settings.contact_email)
      }
      
      if (settings.batch_reminders) {
        await checkBatchReminders(settings.contact_email)
      }
      
      setInitialized(true)
    } catch (error) {
      console.error('Error checking notifications:', error)
    }
  }

  const checkCollectionReminders = async (email: string) => {
    try {
      // Get collections due in next 3 days
      const today = new Date()
      const threeDaysLater= new Date(today)
      threeDaysLater.setDate(today.getDate() + 3)
      
      const { data: collections, error } = await supabase
        .from('collections')
        .select(`
          *,
          loan:loans (
            customer:customers(customer_name)
          )
        `)
        .gte('due_date', today.toISOString())
        .lte('due_date', threeDaysLater.toISOString())
        .eq('status', 'pending')
      
      if (error) throw error
      
      if (collections && collections.length > 0) {
        console.log(`📋 Found ${collections.length} collection reminders`)
        
        // Send reminder for each collection
        for (const collection of collections) {
          const customerName = collection.loan?.customer?.customer_name || 'Customer'
          const amount = collection.amount || 0
          const dueDate = new Date(collection.due_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
          
          await sendCollectionReminderEmail(email, customerName, amount, dueDate)
        }
      }
    } catch (error) {
      console.error('Error checking collection reminders:', error)
    }
  }

  const checkLoanAlerts = async (email: string) => {
    try {
      // Get loans created or updated today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data: loans, error } = await supabase
        .from('loans')
        .select(`
          *,
          customer:customers(customer_name)
        `)
        .gte('created_at', today.toISOString())
      
      if (error) throw error
      
      if (loans && loans.length > 0) {
        console.log(`💰 Found ${loans.length} loan alerts`)
        
        // Send alert for each new loan
        for (const loan of loans) {
          const customerName = loan.customer?.customer_name || 'Customer'
          const amount = loan.loan_amount || 0
          const status = loan.status || 'New'
          
          await sendLoanAlertEmail(email, customerName, amount, status)
        }
      }
    } catch (error) {
      console.error('Error checking loan alerts:', error)
    }
  }

  const checkBatchReminders = async (email: string) => {
    try {
      // Get batches with collection dates in next 7 days
      const today = new Date()
      const sevenDaysLater= new Date(today)
      sevenDaysLater.setDate(today.getDate() +7)
      
      const { data: batches, error } = await supabase
        .from('batches')
        .select('*')
        .gte('collection_date', today.toISOString())
        .lte('collection_date', sevenDaysLater.toISOString())
        .eq('status', 'active')
      
      if (error) throw error
      
      if (batches && batches.length > 0) {
        console.log(`📅 Found ${batches.length} batch reminders`)
        
        // Send reminder for each batch
        for (const batch of batches) {
          const batchName = batch.batch_name || 'Batch'
          const collectionDate = new Date(batch.collection_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
          const totalAmount = batch.total_amount || 0
          
          await sendBatchReminderEmail(email, batchName, collectionDate, totalAmount)
        }
      }
    } catch (error) {
      console.error('Error checking batch reminders:', error)
    }
  }

  // This component doesn't render anything visible
  return null
}
