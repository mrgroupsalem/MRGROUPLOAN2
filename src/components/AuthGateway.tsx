'use client'

import { useState, useEffect, ReactNode } from 'react'
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  KeyRound,
  ShieldAlert,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/components/RoleProvider'
import { validatePasswordStrength } from '@/lib/security'

interface AuthGatewayProps {
  children: ReactNode
}

type AuthView = 'login' | 'forgot_password' | 'verify_email' | 'reset_password'

export default function AuthGateway({ children }: AuthGatewayProps) {
  const { user, isLoading: roleLoading, refreshUser, logout } = useRole()
  const [currentView, setCurrentView] = useState<AuthView>('login')

  // Form Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Status & Feedback
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Password Strength feedback
  const [strengthFeedback, setStrengthFeedback] = useState<{ score: number; errors: string[] }>({
    score: 0,
    errors: [],
  })

  // Watch password changes for strength meter
  useEffect(() => {
    if (newPassword) {
      const res = validatePasswordStrength(newPassword)
      setStrengthFeedback({ score: res.score, errors: res.errors })
    } else {
      setStrengthFeedback({ score: 0, errors: [] })
    }
  }, [newPassword])

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [resendCooldown])

  // Check URL parameters (e.g. Supabase recovery links / verification callbacks)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
        setCurrentView('reset_password')
      }
    }
  }, [])

  // 1. Handle Admin Login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter both your admin email address and password.')
      return
    }

    setLoading(true)

    try {
      // Direct Supabase Auth SignIn
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (authErr) {
        // Also call server API for security audit logging
        fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        }).catch(() => {})

        if (authErr.message.toLowerCase().includes('email not confirmed')) {
          setCurrentView('verify_email')
          setErrorMsg('Your email address has not been verified yet.')
        } else {
          setErrorMsg(authErr.message || 'Invalid credentials or unauthorized user.')
        }
        setLoading(false)
        return
      }

      const signedInUser = authData.user
      if (!signedInUser) {
        setErrorMsg('Authentication failed. No user record returned.')
        setLoading(false)
        return
      }

      // Check email confirmation
      if (!signedInUser.email_confirmed_at) {
        setCurrentView('verify_email')
        setErrorMsg('Email verification required before accessing the system.')
        setLoading(false)
        return
      }

      // Log successful login to backend security monitor
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      }).catch(() => {})

      setSuccessMsg('Authentication successful. Loading system...')
      await refreshUser()
    } catch (err: any) {
      console.error('Login error:', err)
      setErrorMsg('An unexpected error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  // 2. Handle Resend Verification Email
  const handleResendVerification = async () => {
    if (resendCooldown > 0) return
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg(data.message)
        setResendCooldown(60) // 60s cooldown
      } else {
        setErrorMsg(data.error || 'Failed to resend verification email.')
      }
    } catch {
      setErrorMsg('Network error while requesting verification email.')
    } finally {
      setLoading(false)
    }
  }

  // 3. Handle Forgot Password
  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setErrorMsg('Please enter your registered admin email address.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })
      const data = await res.json()
      setSuccessMsg(data.message || 'If an authorized account exists, instructions have been sent.')
      setResendCooldown(60)
    } catch {
      setErrorMsg('Failed to process password recovery request.')
    } finally {
      setLoading(false)
    }
  }

  // 4. Handle Password Reset Confirmation
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (newPassword !== confirmPassword) {
      setErrorMsg('Password confirmation does not match.')
      return
    }

    const strength = validatePasswordStrength(newPassword)
    if (!strength.valid) {
      setErrorMsg(strength.errors[0] || 'Password does not meet enterprise policy.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        setErrorMsg(error.message || 'Failed to update password.')
      } else {
        setSuccessMsg('Password updated successfully! You may now log in.')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => {
          setCurrentView('login')
          setSuccessMsg('')
        }, 2000)
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred while updating your password.')
    } finally {
      setLoading(false)
    }
  }

  // If user is authenticated and verified, render the protected application
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-300 font-medium text-sm tracking-wide">
            Verifying Enterprise Security Credentials...
          </p>
        </div>
      </div>
    )
  }

  if (user) {
    return <>{children}</>
  }

  // Enterprise Premium Login & Security UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Enterprise Brand Logo */}
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          MR GROUPS
        </h2>
        <p className="mt-1 text-center text-xs text-indigo-300/80 tracking-widest uppercase font-semibold">
          Loan Management Enterprise Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-2xl rounded-2xl py-8 px-6 sm:px-10">
          {/* Notifications */}
          {errorMsg && (
            <div className="mb-5 rounded-lg bg-red-950/50 border border-red-800/80 p-3.5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-200 leading-relaxed font-medium">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 rounded-lg bg-emerald-950/50 border border-emerald-800/80 p-3.5 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-200 leading-relaxed font-medium">{successMsg}</p>
            </div>
          )}

          {/* VIEW: LOGIN */}
          {currentView === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Admin Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@mrgroups.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('')
                      setSuccessMsg('')
                      setCurrentView('forgot_password')
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-xs text-slate-400">Remember session securely</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {currentView === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="text-center pb-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center mb-2">
                  <KeyRound className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-base font-semibold text-white">Reset Admin Password</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your registered administrator email address to receive password recovery instructions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@mrgroups.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || resendCooldown > 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Sending Instructions...' : resendCooldown > 0 ? `Wait ${resendCooldown}s` : 'Send Recovery Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg('')
                  setSuccessMsg('')
                  setCurrentView('login')
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors"
              >
                ← Return to Sign In
              </button>
            </form>
          )}

          {/* VIEW: EMAIL VERIFICATION NOTICE */}
          {currentView === 'verify_email' && (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-900/40 border border-amber-700/50 flex items-center justify-center mb-2">
                <ShieldAlert className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Email Verification Required</h3>
                <p className="text-xs text-slate-400 mt-1">
                  A verification email has been dispatched to{' '}
                  <span className="text-indigo-300 font-medium">{email || 'your registered address'}</span>. Please confirm your email address before accessing the administrative console.
                </p>
              </div>

              <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 text-left">
                <p className="font-semibold text-slate-300 mb-1">Next steps:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Open the verification email sent by Supabase.</li>
                  <li>Click the confirmation link.</li>
                  <li>Return here and sign in.</li>
                </ol>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading || resendCooldown > 0}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-all disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Resend Available in ${resendCooldown}s` : 'Resend Verification Email'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('')
                    setSuccessMsg('')
                    setCurrentView('login')
                  }}
                  className="w-full text-xs text-indigo-400 hover:text-indigo-300 pt-2"
                >
                  ← Back to Login
                </button>
              </div>
            </div>
          )}

          {/* VIEW: RESET PASSWORD */}
          {currentView === 'reset_password' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-center pb-2">
                <h3 className="text-base font-semibold text-white">Create New Password</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Set a new, enterprise-grade password adhering to the security policy.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 12 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full transition-all ${
                          strengthFeedback.score <= 1
                            ? 'w-1/4 bg-red-500'
                            : strengthFeedback.score === 2
                            ? 'w-2/4 bg-amber-500'
                            : strengthFeedback.score === 3
                            ? 'w-3/4 bg-blue-500'
                            : 'w-full bg-emerald-500'
                        }`}
                      />
                    </div>
                    {strengthFeedback.errors.length > 0 && (
                      <p className="text-[11px] text-amber-400">{strengthFeedback.errors[0]}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || newPassword !== confirmPassword}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          )}

          {/* Security Notice */}
          <div className="mt-6 border-t border-slate-800/80 pt-4 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>TLS 256-bit encrypted</span>
            </span>
            <span>Enterprise Admin Portal</span>
          </div>
        </div>
      </div>
    </div>
  )
}
