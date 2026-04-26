'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Lock, Key, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

interface AuthGatewayProps {
  children: ReactNode
}

export default function AuthGateway({ children }: AuthGatewayProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [userName, setUserName] = useState('Admin')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Check authentication on mount
  useEffect(() => {
   const checkAuth = () => {
     const authStatus = localStorage.getItem('mrgroups_authenticated')
     const storedPassword = localStorage.getItem('mrgroups_password')
      
      setHasPassword(!!storedPassword)
      
      if (authStatus === 'true' && storedPassword) {
        setIsAuthenticated(true)
      }
      
      // Load user info
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
      
      setLoading(false)
    }
    
   checkAuth()
  }, [])

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  // Handle creating password for first time
  const handleCreatePassword = () => {
    if (!newPassword) {
      showMessage('Please enter a password', 'error')
      return
    }

    if (newPassword.length < 4) {
      showMessage('Password must be at least 4 characters', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showMessage('✗ Passwords do not match! Please retyped both fields.', 'error')
      return
    }

    // Store password
    localStorage.setItem('mrgroups_password', newPassword)
    localStorage.setItem('mrgroups_authenticated', 'true')
    
    showMessage('✓ Password created successfully! You can now access the application.', 'success')
    setIsAuthenticated(true)
    setHasPassword(true)
    
    // Clear fields
    setNewPassword('')
    setConfirmPassword('')
  }

  // Handle login with existing password
  const handleLogin = () => {
   const storedPassword = localStorage.getItem('mrgroups_password')
    
    if (!password) {
      showMessage('Please enter your password', 'error')
      return
    }

    if (password === storedPassword) {
      localStorage.setItem('mrgroups_authenticated', 'true')
      setIsAuthenticated(true)
      showMessage('✓ Login successful! Welcome back.', 'success')
    } else {
      showMessage('✗ Incorrect password. Please try again.', 'error')
      setPassword('')
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // If authenticated, show the actual app
  if (isAuthenticated) {
    return <>{children}</>
  }

  // Show login/create password screen
 return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header with Avatar */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-4xl font-bold mb-4 shadow-lg mx-auto">
              {userAvatar ? (
                <img src={userAvatar} alt="User" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {hasPassword ? 'Welcome Back!' : 'Setup Security'}
            </h2>
            <p className="text-gray-600">
              {hasPassword 
                ? `Enter your password to access MR Groups, ${userName}`
                : 'Create a password to protect your account'
              }
            </p>
          </div>

          {!hasPassword ? (
            // First time - Create Password
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>🔒 Create a secure password</strong>
                  <br />
                  You'll need this password every time you access the application.
                </p>
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
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter password (min 4 characters)"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                   onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Re-enter password"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showCreatePassword"
                 checked={showPassword}
                 onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="showCreatePassword" className="text-sm text-gray-700">
                  Show passwords
                </label>
              </div>

              <button
               onClick={handleCreatePassword}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
              >
                <Lock className="inline-block w-5 h-5 mr-2" />
                Create Password & Continue
              </button>
            </div>
          ) : (
            // Existing user - Login
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                  />
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <button
                    type="button"
                   onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
               onClick={handleLogin}
                disabled={!password}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
              >
                <Lock className="inline-block w-5 h-5 mr-2" />
                Unlock & Enter Application
              </button>
            </div>
          )}

          {/* Message Display */}
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

        {/* Footer */}
        <p className="text-center text-white/60 mt-6 text-sm">
          MR Groups Loan Management System
        </p>
      </div>
    </div>
  )
}
