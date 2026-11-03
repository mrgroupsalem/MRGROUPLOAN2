'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  ArrowLeft,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { validatePasswordStrength } from '@/lib/security'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Status & Feedback
  const [isVerifyingSession, setIsVerifyingSession] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Password Strength feedback
  const [strengthFeedback, setStrengthFeedback] = useState<{ score: number; errors: string[] }>({
    score: 0,
    errors: [],
  })

  // 1. Detect and establish the recovery session
  useEffect(() => {
    let mounted = true

    const checkRecoverySession = async () => {
      try {
        // If Supabase redirected with a PKCE code in query params (?code=...)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          const code = urlParams.get('code')
          const errorParam = urlParams.get('error')
          const errorDescription = urlParams.get('error_description')

          if (errorParam || errorDescription) {
            if (mounted) {
              setErrorMessage(errorDescription || 'The password reset link is invalid or has expired.')
              setIsVerifyingSession(false)
              setHasValidSession(false)
            }
            return
          }

          if (code) {
            // Exchange authorization code for a session
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) {
              console.error('exchangeCodeForSession error:', error)
              if (mounted) {
                setErrorMessage(error.message || 'The password recovery link has expired or is invalid. Please request a new one.')
                setIsVerifyingSession(false)
                setHasValidSession(false)
              }
              return
            }
            if (data?.session && mounted) {
              setHasValidSession(true)
              setUserEmail(data.session.user.email || null)
              setIsVerifyingSession(false)
              return
            }
          }
        }

        // Check if there is already an active session (e.g. from hash fragment or stored recovery token)
        const { data: { session } } = await supabase.auth.getSession()
        if (session && mounted) {
          setHasValidSession(true)
          setUserEmail(session.user.email || null)
          setIsVerifyingSession(false)
          return
        }

        // Listen for auth state change (PASSWORD_RECOVERY event)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            setHasValidSession(true)
            setUserEmail(session?.user?.email || null)
            setIsVerifyingSession(false)
          }
        })

        // If after 3.5 seconds no session is detected, mark as invalid/expired
        setTimeout(() => {
          if (mounted && isVerifyingSession) {
            supabase.auth.getSession().then(({ data: { session: s } }) => {
              if (mounted) {
                if (s) {
                  setHasValidSession(true)
                  setUserEmail(s.user.email || null)
                } else {
                  setHasValidSession(false)
                  setErrorMessage('No valid password recovery session found. The link may have expired or already been used.')
                }
                setIsVerifyingSession(false)
              }
            })
          }
        }, 3500)

        return () => {
          subscription.unsubscribe()
        }
      } catch (err: any) {
        console.error('Session verification error:', err)
        if (mounted) {
          setErrorMessage('Unable to verify recovery link. Please try again or request a new reset email.')
          setIsVerifyingSession(false)
        }
      }
    }

    checkRecoverySession()

    return () => {
      mounted = false
    }
  }, [])

  // 2. Watch password input for real-time strength validation
  useEffect(() => {
    if (newPassword) {
      const res = validatePasswordStrength(newPassword)
      setStrengthFeedback({ score: res.score, errors: res.errors })
    } else {
      setStrengthFeedback({ score: 0, errors: [] })
    }
  }, [newPassword])

  // 3. Handle password submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!hasValidSession) {
      setErrorMessage('Your password recovery session has expired. Please request a new reset link.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.')
      return
    }

    const strength = validatePasswordStrength(newPassword)
    if (!strength.valid) {
      setErrorMessage(strength.errors[0] || 'Password does not meet enterprise security requirements.')
      return
    }

    setSubmitting(true)

    try {
      // Update password through Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        setErrorMessage(updateError.message || 'Failed to update password. Please try again.')
        setSubmitting(false)
        return
      }

      setSuccessMessage('Password updated successfully! Redirecting to login...')
      setNewPassword('')
      setConfirmPassword('')

      // Redirect after 2.5 seconds
      setTimeout(() => {
        router.push('/')
      }, 2500)
    } catch (err: any) {
      console.error('Password update error:', err)
      setErrorMessage('An unexpected error occurred while updating your password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo */}
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          MR GROUPS
        </h2>
        <p className="mt-1 text-center text-xs text-indigo-300/80 tracking-widest uppercase font-semibold">
          Secure Password Recovery
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-2xl rounded-2xl py-8 px-6 sm:px-10">
          {/* VERIFYING SESSION STATE */}
          {isVerifyingSession && (
            <div className="py-8 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-300 font-medium">
                Validating security recovery token...
              </p>
            </div>
          )}

          {/* INVALID OR EXPIRED RECOVERY LINK */}
          {!isVerifyingSession && !hasValidSession && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-950/60 border border-red-700/50 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Invalid or Expired Link</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {errorMessage || 'This password reset link has expired, has already been used, or is invalid.'}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Link
                  href="/"
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-lg shadow-indigo-600/30 text-center"
                >
                  Request a New Reset Link
                </Link>
                <Link
                  href="/"
                  className="w-full text-xs text-slate-400 hover:text-white transition-colors text-center"
                >
                  ← Return to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* VALID RECOVERY SESSION: PASSWORD RESET FORM */}
          {!isVerifyingSession && hasValidSession && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center pb-1">
                <div className="mx-auto w-10 h-10 rounded-full bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center mb-2">
                  <KeyRound className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-base font-semibold text-white">Set New Administrator Password</h3>
                {userEmail && (
                  <p className="text-xs text-indigo-300 mt-1">
                    Account: <span className="font-mono">{userEmail}</span>
                  </p>
                )}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="rounded-lg bg-red-950/50 border border-red-800/80 p-3 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-200 leading-relaxed">{errorMessage}</p>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="rounded-lg bg-emerald-950/50 border border-emerald-800/80 p-3 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-200 leading-relaxed">{successMessage}</p>
                </div>
              )}

              {/* New Password Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  New Password *
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
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
                  <div className="mt-2 space-y-1.5">
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full transition-all duration-300 ${
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
                    {strengthFeedback.errors.length > 0 ? (
                      <p className="text-[11px] text-amber-400 leading-tight">
                        {strengthFeedback.errors[0]}
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-400 font-medium">
                        ✓ Strong enterprise password
                      </p>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Must be 12+ characters with uppercase, lowercase, numbers, and special characters.
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !newPassword || newPassword !== confirmPassword || !strengthFeedback.errors.length === false}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

          {/* Footer TLS notice */}
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

