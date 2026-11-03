'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export type UserRole = 'admin' | 'worker' | 'manager' | 'super_admin'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  department?: string
  lastLogin?: string
}

interface RoleContextType {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  isAdmin: () => boolean
  isWorker: () => boolean
  isManager: () => boolean
  isLoading: boolean
  refreshUser: () => Promise<void>
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncUserFromSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const u = session.user
        const role = (u.user_metadata?.role as UserRole) || 'admin'
        const authUser: AuthUser = {
          id: u.id,
          name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Admin',
          email: u.email || '',
          role,
          department: u.user_metadata?.department || 'Administration',
          lastLogin: u.last_sign_in_at,
        }
        setUser(authUser)
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error('Error synchronizing auth user:', err)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    syncUserFromSession()

    // Listen for Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const u = session.user
        const role = (u.user_metadata?.role as UserRole) || 'admin'
        setUser({
          id: u.id,
          name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Admin',
          email: u.email || '',
          role,
          department: u.user_metadata?.department || 'Administration',
          lastLogin: u.last_sign_in_at,
        })
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = (userData: AuthUser) => {
    setUser(userData)
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Sign out error:', err)
    } finally {
      setUser(null)
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    // Admin has full system access
    if (user.role === 'admin' || user.role === 'super_admin') {
      return true
    }

    const permissions: Record<string, string[]> = {
      worker: ['view_dashboard', 'manage_loans', 'manage_collections'],
      manager: ['view_dashboard', 'manage_loans', 'manage_customers', 'manage_collections', 'view_reports'],
    }

    return permissions[user.role]?.includes(permission) || false
  }

  const isAdmin = (): boolean => {
    return user?.role === 'admin' || user?.role === 'super_admin'
  }

  const isWorker = (): boolean => {
    return user?.role === 'worker'
  }

  const isManager = (): boolean => {
    return user?.role === 'manager'
  }

  return (
    <RoleContext.Provider
      value={{
        user,
        login,
        logout,
        hasPermission,
        isAdmin,
        isWorker,
        isManager,
        isLoading,
        refreshUser: syncUserFromSession,
      }}
    >
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}
