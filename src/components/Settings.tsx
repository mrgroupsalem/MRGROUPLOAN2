'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Eye,
  EyeOff,
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Database, 
  Shield, 
  CreditCard,
  Users,
  FileText,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Edit,
  Key,
  Lock,
  Mail,
  Phone,
  Building,
  Globe,
  Image,
  Smile,
  Camera,
  Send
} from 'lucide-react'

interface SettingsProps {
  onBack: () => void
}

// Avatar Picker Modal Component
function AvatarPickerModal({ onClose, onSelect }: { onClose: () => void, onSelect: (dataUrl: string) => void }) {
 const defaultAvatars = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '🦸', '🦹', '😎', '🤓', '🧐', '👨‍🎓', '👩‍🎓']
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
     alert('✗ Please select an image file')
      return
    }
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
     alert('✗ Image size must be less than 2MB')
      return
    }
    
  const reader = new FileReader()
    reader.onload = (event) => {
     if (event.target?.result) {
      // Pass the image data URL back to parent
    onSelect(event.target.result as string)
     }
    }
    reader.onerror = () => {
     alert('✗ Error reading file')
    }
    reader.readAsDataURL(file)
  }
  
 return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Choose Avatar</h3>
         <button onClick={onClose} type="button" className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
       <div className="grid grid-cols-5 gap-3 mb-6">
         {defaultAvatars.map((emoji) => (
           <button
             key={emoji}
       onClick={() => onSelect(`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`)}
       type="button"
             className="w-14 h-14 text-3xl hover:bg-gray-100 rounded-lg transition-all hover:scale-110"
           >
             {emoji}
           </button>
         ))}
       </div>
        
       <div className="border-t border-gray-200 pt-4">
         <label className="block text-sm font-medium text-gray-700 mb-2">Or upload your photo</label>
        <div className="relative">
          <input
       type="file"
             accept="image/*"
       onChange={handleFileUpload}
           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="w-full px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors">
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              <Image className="w-5 h-5" />
              <span className="text-sm">Click to browse or drag and drop</span>
            </div>
            <p className="text-xs text-center text-gray-400 mt-1">JPG, PNG or GIF. Max size 2MB.</p>
          </div>
        </div>
       </div>
      </div>
    </div>
  )
}

export default function Settings({ onBack }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'notifications' | 'database' | 'security'>('general')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // General settings
  const [companyName, setCompanyName] = useState('MR Groups')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address, setAddress] = useState('')
  const [website, setWebsite] = useState('')
  
  // Profile settings
  const [userName, setUserName] = useState('Admin User')
  const [userEmail, setUserEmail] = useState('admin@mrgroups.com')
  const [userPhone, setUserPhone] = useState('')
  const [designation, setDesignation] = useState('Administrator')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [collectionReminders, setCollectionReminders] = useState(true)
  const [loanAlerts, setLoanAlerts] = useState(true)
  const [batchReminders, setBatchReminders] = useState(true)
  const [notificationsChanged, setNotificationsChanged] = useState(false)
  
  // Database settings
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [lastSync, setLastSync] = useState<string>('')
  const [totalRecords, setTotalRecords] = useState({
    customers: 0,
    loans: 0,
   collections: 0,
    employees: 0
  })
  
  // Security settings
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('')
  const [passwordChangeError, setPasswordChangeError] = useState('')
  const [lastPasswordChangeDate, setLastPasswordChangeDate] = useState<string>('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState('30')

  useEffect(() => {
    loadSettings()
    checkDatabaseConnection()
  }, [])

  const loadSettings = async () => {
    try {
      // Load settings from localStorage
  const saved = localStorage.getItem('mrgroups_settings')
      if (saved) {
   const data = JSON.parse(saved)
       setCompanyName(data.company_name || 'MR Groups')
       setContactEmail(data.contact_email || '')
       setContactPhone(data.contact_phone || '')
       setAddress(data.address || '')
       setWebsite(data.website || '')
       setEmailNotifications(data.email_notifications ?? true)
       setSmsNotifications(data.sms_notifications ?? false)
       setPushNotifications(data.push_notifications ?? true)
       setCollectionReminders(data.collection_reminders ?? true)
       setLoanAlerts(data.loan_alerts ?? true)
       setBatchReminders(data.batch_reminders ?? true)
      } else {
        // Set default notification preferences
        setEmailNotifications(true)
        setSmsNotifications(false)
        setPushNotifications(true)
        setCollectionReminders(true)
        setLoanAlerts(true)
        setBatchReminders(true)
      }
      
      // Load profile including avatar from localStorage
  const savedProfile = localStorage.getItem('mrgroups_profile')
      if (savedProfile) {
   const profile = JSON.parse(savedProfile)
       setUserName(profile.name || 'Admin User')
       setUserEmail(profile.email || 'admin@mrgroups.com')
       setUserPhone(profile.phone || '')
       setDesignation(profile.designation || 'Administrator')
      setAvatar(profile.avatar || null)
       
    console.log('✓ Settings loaded from localStorage')
    console.log('🖼️ Avatar loaded:', profile.avatar ? 
       (profile.avatar.startsWith('data:image/svg') ? 'Emoji avatar' : 'Image avatar') : 'No avatar')
    console.log('📊 Profile data:', {
       name: profile.name,
       email: profile.email,
       hasAvatar: !!profile.avatar
     })
      } else {
   console.log('⚠️ No saved profile in localStorage - using defaults')
      }
    } catch (error) {
  console.error('✗ Error loading settings:', error)
    }
  }

  const checkDatabaseConnection = async () => {
    setDbStatus('checking')
    try {
     const { data, error } = await supabase.from('customers').select('count').limit(1)
      
      if (error) {
        setDbStatus('disconnected')
      } else {
        setDbStatus('connected')
        setLastSync(new Date().toLocaleString())
        
        // Get record counts
       const [customers, loans, collections, employees] = await Promise.all([
          supabase.from('customers').select('*', { count: 'exact', head: true }),
          supabase.from('loans').select('*', { count: 'exact', head: true }),
          supabase.from('collections').select('*', { count: 'exact', head: true }),
          supabase.from('employees').select('*', { count: 'exact', head: true })
        ])
        
        setTotalRecords({
          customers: customers.count || 0,
          loans: loans.count || 0,
         collections: collections.count || 0,
          employees: employees.count || 0
        })
      }
    } catch (error) {
      setDbStatus('disconnected')
    }
  }

  const handleSaveGeneral = async () => {
    setSaving(true)
    try {
      // Save to localStorage
      localStorage.setItem('mrgroups_settings', JSON.stringify({
       company_name: companyName,
       contact_email: contactEmail,
       contact_phone: contactPhone,
        address: address,
        website: website,
        email_notifications: emailNotifications,
        sms_notifications: smsNotifications,
        push_notifications: pushNotifications,
       collection_reminders: collectionReminders,
        loan_alerts: loanAlerts,
        batch_reminders: batchReminders
      }))
      
      // Send welcome email if contact email is provided and email notifications are enabled
      if (contactEmail && emailNotifications) {
        try {
          console.log('📧 Sending welcome email to:', contactEmail)
          
          // Check if EmailJS is configured
          const isEmailJSConfigured = 
            process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID && 
            process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID !== 'your_service_id_here' &&
            process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID && 
            process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID !== 'your_template_id_here' &&
            process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY && 
            process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY !== 'your_public_key_here'
          
          if (isEmailJSConfigured) {
            // Import send function dynamically
            const { sendGeneralNotificationEmail } = await import('@/lib/notifications')
            
            await sendGeneralNotificationEmail(
              contactEmail,
              '✓ Contact Email Updated - MR Groups',
              `Dear ${userName},\n\nYour contact email has been successfully updated in MR Groups Loan Management System.\n\nEmail Address: ${contactEmail}\nUpdated: ${new Date().toLocaleString()}\n\nThis email confirms that your notification settings are active. You will receive important notifications at this email address.\n\nBest regards,\nMR Groups Team`
            )
            
            showMessage('✓ General settings saved! Confirmation email sent to ' + contactEmail, 'success')
          } else {
            showMessage('✓ General settings saved! (Email notifications configured but EmailJS not active)', 'success')
            console.log('📧 Email would be sent to:', contactEmail)
          }
        } catch (emailError: any) {
          console.error('Email send error:', emailError)
          // Don't fail the save operation, just log the error
          showMessage('✓ General settings saved! (Email notification failed, but settings saved)', 'success')
        }
      } else {
        showMessage('✓ General settings saved successfully!', 'success')
      }
    } catch (error: any) {
      showMessage('✗ Error saving settings: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    setSaving(true)
    try {
      // Get existing settings
      const existing = JSON.parse(localStorage.getItem('mrgroups_settings') || '{}')
        
      // Update notification settings
      localStorage.setItem('mrgroups_settings', JSON.stringify({
        ...existing,
        email_notifications: emailNotifications,
        sms_notifications: smsNotifications,
        push_notifications: pushNotifications,
        collection_reminders: collectionReminders,
        loan_alerts: loanAlerts,
        batch_reminders: batchReminders
      }))
        
      showMessage('✓ Notification preferences saved successfully!', 'success')
      setNotificationsChanged(false)
    } catch (error: any) {
      showMessage('✗ Error saving notification preferences: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      // Save profile to localStorage
   const profile = {
        name: userName,
        email: userEmail,
        phone: userPhone,
        designation: designation,
        avatar: avatar
      }
      
      // Debug logging
  console.log('💾 Saving profile:', {
       hasAvatar: !!avatar,
       avatarType: avatar ? (avatar.startsWith('data:image/svg') ? 'emoji' : 'image') : 'none'
     })
      
      localStorage.setItem('mrgroups_profile', JSON.stringify(profile))
      
      // Verify it was saved
  const verify = localStorage.getItem('mrgroups_profile')
    if (verify) {
     console.log('✓ Profile saved and verified in localStorage!')
    } else {
     console.error('✗ Failed to save profile!')
    }
      
      showMessage('✓ Profile updated successfully!', 'success')
    } catch (error: any) {
      showMessage('✗ Error updating profile: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordChangeError('')
    setPasswordChangeSuccess('')

    if (!currentPassword) {
      setPasswordChangeError('Please enter your current password.')
      return
    }

    if (!newPassword || newPassword.length < 12) {
      setPasswordChangeError('New password must be at least 12 characters and meet enterprise security standards.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New password and confirmation password do not match.')
      return
    }

    if (currentPassword === newPassword) {
      setPasswordChangeError('New password cannot be identical to your current password.')
      return
    }

    setSaving(true)
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession()
      const email = session?.user?.email || 'admin@mrgroups.com'

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setPasswordChangeSuccess('Your password has been changed successfully.')
        setLastPasswordChangeDate(new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }))
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        showMessage('✓ Password changed successfully!', 'success')
      } else {
        setPasswordChangeError(data.error || 'Failed to update password. Please check your credentials.')
        showMessage('✗ ' + (data.error || 'Failed to update password'), 'error')
      }
    } catch (err: any) {
      setPasswordChangeError('Network or server error while updating password.')
      showMessage('✗ Error changing password: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
  setSaving(true)
    try {
      showMessage('⏳ Exporting data...', 'success')
      
      // Fetch all data from Supabase
    const [customers, loans, collections, employees] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('loans').select('*, customer:customers(*), team_leader:employees(*)'),
        supabase.from('collections').select('*, loan:loans(*), worker:employees(*)'),
        supabase.from('employees').select('*')
      ])
      
      // Check for errors
      if (customers.error) throw new Error('Failed to export customers')
      if (loans.error) throw new Error('Failed to export loans')
      if (collections.error) throw new Error('Failed to export collections')
      if (employees.error) throw new Error('Failed to export employees')
      
      // Create comprehensive export object
    const exportData = {
        export_date: new Date().toISOString(),
        version: '1.0',
        data: {
          customers: customers.data || [],
          loans: loans.data || [],
        collections: collections.data || [],
          employees: employees.data || []
        },
        statistics: {
          total_customers: (customers.data || []).length,
          total_loans: (loans.data || []).length,
          total_collections: (collections.data || []).length,
          total_employees: (employees.data || []).length
        }
      }
      
      // Convert to JSON and create blob
    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
      
      // Create download link
    const link = document.createElement('a')
      link.href = url
      link.download = `mrgroups-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      showMessage(`✓ Data exported successfully! (${exportData.statistics.total_customers} customers, ${exportData.statistics.total_loans} loans)`, 'success')
    } catch (error: any) {
    console.error('Export error:', error)
      showMessage('✗ Error exporting data: ' + error.message, 'error')
    } finally {
    setSaving(false)
    }
  }

  const handleImportData = async () => {
  setSaving(true)
    try {
      // Create file input
    const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      
      input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
       
       if (!file) {
       setSaving(false)
        return
       }
       
       // Validate file
       if (!file.name.endsWith('.json')) {
        showMessage('✗ Please select a valid JSON file', 'error')
       setSaving(false)
        return
       }
       
       showMessage('⏳ Importing data...', 'success')
       
       // Read file
     const reader= new FileReader()
       reader.onload = async (event) => {
         try {
         const content = event.target?.result as string
         const importData = JSON.parse(content)
          
          // Validate import data structure
          if (!importData.data || !importData.data.customers || !importData.data.loans) {
           showMessage('✗ Invalid backup file format', 'error')
          setSaving(false)
           return
          }
          
          // Confirm import
        const confirmed = window.confirm(
            `⚠️ IMPORT DATA\n\nThis will import:\n• ${importData.statistics?.total_customers || 0} customers\n• ${importData.statistics?.total_loans || 0} loans\n• ${importData.statistics?.total_collections || 0} collections\n• ${importData.statistics?.total_employees || 0} employees\n\nClick OK to continue or Cancel to abort.`
          )
          
          if (!confirmed) {
          setSaving(false)
           return
          }
          
          // Import customers
         if (importData.data.customers.length > 0) {
          const { error } = await supabase
             .from('customers')
            .upsert(importData.data.customers)
           
           if (error) throw new Error('Failed to import customers: ' + error.message)
         }
          
          // Import employees
         if (importData.data.employees.length > 0) {
          const { error } = await supabase
             .from('employees')
            .upsert(importData.data.employees)
           
           if (error) throw new Error('Failed to import employees: ' + error.message)
         }
          
          // Import loans (without relations to avoid conflicts)
         if (importData.data.loans.length > 0) {
           // Strip out relational data
         const loansToImport = importData.data.loans.map((loan: any) => {
           const { customer: _customer, team_leader: _team_leader, ...rest } = loan
           return rest
         })
           
          const { error } = await supabase
             .from('loans')
            .upsert(loansToImport)
           
           if (error) throw new Error('Failed to import loans: ' + error.message)
         }
          
          // Import collections
         if (importData.data.collections.length > 0) {
           // Strip out relational data
         const collectionsToImport = importData.data.collections.map((collection: any) => {
           const { loan: _loan, worker: _worker, ...rest } = collection
           return rest
         })
           
          const { error } = await supabase
             .from('collections')
            .upsert(collectionsToImport)
           
           if (error) throw new Error('Failed to import collections: ' + error.message)
         }
          
         showMessage(`✓ Data imported successfully! Refresh the page to see changes.`, 'success')
         
         // Auto-refresh after successful import
       setTimeout(() => {
          window.location.reload()
        }, 2000)
         
       } catch (parseError: any) {
        console.error('Import error:', parseError)
         showMessage('✗ Error importing data: ' + parseError.message, 'error')
       } finally {
       setSaving(false)
       }
     }
     
     reader.readAsText(file)
   }
   
   input.click()
   } catch (error: any) {
   console.error('Import error:', error)
    showMessage('✗ Error importing data: ' + error.message, 'error')
   setSaving(false)
   }
  }

  const showMessage = (text: string, type: 'success' | 'error') => {
   setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  // Avatar upload handler
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
     showMessage('✗ Please select an image file', 'error')
      return
    }
    
    if (file.size > 2 * 1024 * 1024) {
     showMessage('✗ Image size must be less than 2MB', 'error')
      return
    }
    
  const reader = new FileReader()
    reader.onload = (event) => {
     if (event.target?.result) {
      setAvatar(event.target.result as string)
       showMessage('✓ Avatar selected! Click "Update Profile" to save', 'success')
       setShowAvatarPicker(false)
     }
    }
    reader.readAsDataURL(file)
  }

  const selectDefaultAvatar = (dataUrl: string) => {
   setAvatar(dataUrl)
   setShowAvatarPicker(false)
   showMessage('✓ Avatar selected! Click "Update Profile" to save', 'success')
  }

  const SettingToggle = ({ label, description, enabled, onToggle }: any) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      <button
       onClick={onToggle}
       type="button"
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          enabled ? 'bg-primary-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )

 return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <div className="flex items-center space-x-3">
            <SettingsIcon className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 animate-slide-in ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Settings Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'general', label: 'General', icon: SettingsIcon },
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'database', label: 'Database', icon: Database },
          { id: 'security', label: 'Security', icon: Shield }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
           onClick={() => setActiveTab(id as any)}
           type="button"
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === id
                ? 'border-primary-600 text-primary-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-semibold mb-4">General Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
               type="text"
                value={companyName}
               onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
              <input
               type="email"
                value={contactEmail}
               onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
              <input
               type="tel"
                value={contactPhone}
               onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
              <input
               type="url"
                value={website}
               onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <textarea
              value={address}
             onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
             onClick={handleSaveGeneral}
              disabled={saving}
             type="button"
              className={`btn-primary flex items-center space-x-2 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
          
          <div className="flex items-center space-x-6 mb-6">
            <div className="relative group" key={avatar ? 'has-avatar' : 'no-avatar'}>
              {avatar ? (
               avatar.startsWith('data:image/svg') ? (
                <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
                  <span className="text-6xl select-none">{avatar.split('>')[1]?.split('<')[0] || '👤'}</span>
                </div>
               ) : (
                // WhatsApp DP Style Container - Perfect Circle with Image
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl ring-2 ring-gray-100 hover:ring-4 hover:ring-primary-200 transition-all">
                  <img 
                   src={avatar} 
                   alt="Avatar" 
                   key={`avatar-img-${Date.now()}`} 
                   className="absolute inset-0 w-full h-full object-cover"
                   style={{ objectFit: 'cover', objectPosition: 'center top' }}
               onError={(e) => {
                console.error('Failed to load avatar image');
                 }}
                  />
                </div>
               )
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center border-4 border-white shadow-xl">
                  <User className="w-16 h-16 text-primary-600" />
                </div>
              )}
            </div>
            <div>
              <button 
        onClick={() => {
         console.log('Opening avatar picker');
          setShowAvatarPicker(true);
        }}
      type="button"
                className="btn-primary flex items-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Change Avatar</span>
              </button>
              <p className="text-sm text-gray-500 mt-2">JPG, PNG or GIF. Max size 2MB.</p>
              {avatar && (
               <button
        onClick={() => {
         console.log('Removing avatar');
          setAvatar(null);
          showMessage('✓ Avatar removed', 'success')
        }}
      type="button"
                 className="text-sm text-red-600 hover:text-red-700 mt-2"
               >
                 Remove Avatar
               </button>
              )}
            </div>
          </div>

          {/* Avatar Picker Modal */}
          {showAvatarPicker && (
            <AvatarPickerModal 
            onClose={() => setShowAvatarPicker(false)}
            onSelect={selectDefaultAvatar}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
               type="text"
                value={userName}
               onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
               type="email"
                value={userEmail}
               onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
               type="tel"
                value={userPhone}
               onChange={(e) => setUserPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
              <input
               type="text"
                value={designation}
               onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
             onClick={handleSaveProfile}
              disabled={saving}
             type="button"
              className={`btn-primary flex items-center space-x-2 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Update Profile'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
          
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Communication Channels</h3>
            <SettingToggle
              label="Email Notifications"
              description="Receive notifications via email"
              enabled={emailNotifications}
             onToggle={() => { setEmailNotifications(!emailNotifications); setNotificationsChanged(true); }}
            />
            <SettingToggle
              label="SMS Notifications"
              description="Receive notifications via SMS"
              enabled={smsNotifications}
             onToggle={() => { setSmsNotifications(!smsNotifications); setNotificationsChanged(true); }}
            />
            <SettingToggle
              label="Push Notifications"
              description="Receive browser push notifications"
              enabled={pushNotifications}
             onToggle={() => { setPushNotifications(!pushNotifications); setNotificationsChanged(true); }}
            />
          </div>

          <div className="space-y-4 pt-6 border-t border-gray-200">
            <h3 className="font-medium text-gray-900">Alert Types</h3>
            <SettingToggle
              label="Collection Reminders"
              description="Get reminded about pending collections"
              enabled={collectionReminders}
             onToggle={() => { setCollectionReminders(!collectionReminders); setNotificationsChanged(true); }}
            />
            <SettingToggle
              label="Loan Alerts"
              description="Notifications for new loans and status changes"
              enabled={loanAlerts}
             onToggle={() => { setLoanAlerts(!loanAlerts); setNotificationsChanged(true); }}
            />
            <SettingToggle
              label="Batch Collection Reminders"
              description="Reminders for upcoming batch collection days"
              enabled={batchReminders}
             onToggle={() => { setBatchReminders(!batchReminders); setNotificationsChanged(true); }}
            />
          </div>

          <div className="pt-4 space-y-3">
            <div className="flex gap-3 flex-wrap">
              <button
               onClick={handleSaveNotifications}
                disabled={saving || !notificationsChanged}
               type="button"
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  saving || !notificationsChanged
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg'
                } ${saving ? 'opacity-50' : ''}`}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : notificationsChanged ? (
                  <Save className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>
                  {saving ? 'Saving...' : notificationsChanged ? 'Save Preferences' : 'No Unsaved Changes'}
                </span>
              </button>
              
              {notificationsChanged && (
                <button
                 onClick={() => {
                    // Reset to defaults
                    setEmailNotifications(true)
                    setSmsNotifications(false)
                    setPushNotifications(true)
                    setCollectionReminders(true)
                    setLoanAlerts(true)
                    setBatchReminders(true)
                    setNotificationsChanged(false)
                    showMessage('✓ Changes reset to defaults', 'success')
                  }}
                  disabled={saving}
                 type="button"
                  className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                  <span>Reset to Defaults</span>
                </button>
              )}
            </div>
            
            {notificationsChanged && (
              <p className="text-sm text-orange-600 mt-2 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>You have unsaved changes</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Database Settings */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-semibold mb-4">Database & Data Management</h2>
          
          {/* Connection Status */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Connection Status</h3>
              <button
               onClick={checkDatabaseConnection}
                disabled={dbStatus === 'checking'}
               type="button"
                className="flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${dbStatus === 'checking' ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              {dbStatus === 'connected' ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-green-800 font-medium">Connected to Supabase</span>
                </>
              ) : dbStatus === 'disconnected' ? (
                <>
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <span className="text-red-800 font-medium">Disconnected</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-6 h-6 text-yellow-600 animate-spin" />
                  <span className="text-yellow-800 font-medium">Checking connection...</span>
                </>
              )}
            </div>
            
            {lastSync && (
              <p className="text-sm text-gray-600 mt-2">Last synced: {lastSync}</p>
            )}
          </div>

          {/* Database Statistics */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Database Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Customers"
                value={totalRecords.customers}
                icon={Users}
               color="bg-blue-100 text-blue-600"
              />
              <StatCard
                title="Loans"
                value={totalRecords.loans}
                icon={FileText}
               color="bg-green-100 text-green-600"
              />
              <StatCard
                title="Collections"
                value={totalRecords.collections}
                icon={CreditCard}
               color="bg-purple-100 text-purple-600"
              />
              <StatCard
                title="Employees"
                value={totalRecords.employees}
                icon={Building}
               color="bg-orange-100 text-orange-600"
              />
            </div>
          </div>

          {/* Data Management */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Data Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
               onClick={handleExportData}
                disabled={saving}
               type="button"
                className={`flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Download className="w-5 h-5" />
                <span>Export All Data</span>
              </button>
              <button
               onClick={handleImportData}
                disabled={saving}
               type="button"
                className={`flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className="w-5 h-5" />
                <span>Import Data</span>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              ⚠️ Import/Export operations can take several minutes depending on data size.
            </p>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-xl font-semibold text-gray-900">Security & Authentication</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage enterprise access credentials, session policies, and account security.
            </p>
          </div>

          {/* Change Password Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary-600" />
                  Change Administrator Password
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update your authentication password without resetting your session.
                </p>
              </div>
              {lastPasswordChangeDate && (
                <span className="text-xs font-medium text-slate-500 bg-white border px-2.5 py-1 rounded-full">
                  Last changed: {lastPasswordChangeDate}
                </span>
              )}
            </div>

            {/* Notifications */}
            {passwordChangeSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{passwordChangeSuccess}</span>
              </div>
            )}
            {passwordChangeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{passwordChangeError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    placeholder="Min 12 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Requires 12+ chars, uppercase, lowercase, number & symbol.</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleChangePassword}
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                type="button"
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs py-2 px-4"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{saving ? 'Verifying & Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
            <SettingToggle
              label="Enable 2FA"
              description="Add an extra layer of security to your account"
              enabled={twoFactorEnabled}
             onToggle={() => setTwoFactorEnabled(!twoFactorEnabled)}
            />
            {!twoFactorEnabled && (
              <p className="text-sm text-gray-500 mt-2">
                🔒 Enable 2FA to require a verification code when logging in
              </p>
            )}
          </div>

          {/* Session Management */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Session Management</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Auto Logout After (minutes)</label>
              <select
                value={sessionTimeout}
               onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="0">Never</option>
              </select>
              <p className="text-sm text-gray-500 mt-2">
                Automatically log out after period of inactivity
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
