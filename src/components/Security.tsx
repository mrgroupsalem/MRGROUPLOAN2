'use client'

import { useState, useEffect } from 'react'
import { Lock, Key, User, Save, CheckCircle, AlertCircle, Eye, EyeOff, LogOut } from 'lucide-react'

interface SecurityProps {
  onBack: () => void
}

export default function Security({ onBack }: SecurityProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [userName, setUserName] = useState('Admin')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)

  // Load user info
  useEffect(() => {
   try {
     const settings = localStorage.getItem('mrgroups_settings')
      if (settings) {
       const parsed = JSON.parse(settings)
        setUserName(parsed.user_name || 'Admin')
      }
      
     const profile = localStorage.getItem('mrgroups_profile')
      if (profile) {
       const parsedProfile = JSON.parse(profile)
        setUserAvatar(parsedProfile.avatar)
      }
    } catch(e) {
     console.log('Could not load user info')
    }
  }, [])

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  // Handle changing password
  const handleChangePassword = async () => {
   const storedPassword = localStorage.getItem('mrgroups_password')
    
    if (!currentPassword) {
      showMessage('Please enter current password', 'error')
      return
    }

    if (currentPassword !== storedPassword) {
      showMessage('Current password is incorrect', 'error')
      return
    }

    if (!newPassword) {
      showMessage('Please enter new password', 'error')
      return
    }

    if (newPassword.length < 4) {
      showMessage('New password must be at least 4 characters', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showMessage('✗ Passwords do not match! Please retype both fields.', 'error')
      return
    }

    setSaving(true)
   try {
      localStorage.setItem('mrgroups_password', newPassword)
      showMessage('✓ Password changed successfully!', 'success')
      
      // Clear fields
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch(error: any) {
      showMessage('✗ Error changing password: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Handle logout - requires re-authentication
  const handleLogout = () => {
    localStorage.removeItem('mrgroups_authenticated')
    showMessage('Logged out successfully. You will need to login again.', 'success')
    // Reload page to trigger auth gateway
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

 return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
           onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
              {userAvatar ? (
                <img src={userAvatar} alt="User" className="w-12 h-12 object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
              <p className="text-sm text-gray-600">{userName}</p>
            </div>
          </div>
        </div>
        
        <button
         onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Security Card */}
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Lock className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>🔒 Update your password</strong>
              <br />
              Make sure to remember your new password. You'll need it next time you login.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
               onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter current password"
              />
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
               onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter new password"
              />
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
               onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Confirm new password"
              />
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showPassword"
             checked={showPassword}
             onChange={(e) => setShowPassword(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="showPassword" className="text-sm text-gray-700">
              Show passwords
            </label>
          </div>

          <button
           onClick={handleChangePassword}
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Save className="inline-block w-5 h-5 mr-2" />
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg flex items-center ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
