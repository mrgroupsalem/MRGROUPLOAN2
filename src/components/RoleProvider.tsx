'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'admin' | 'worker' | 'manager'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department?: string
}

interface RoleContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  hasPermission: (permission: string) => boolean
  isAdmin: () => boolean
  isWorker: () => boolean
  isManager: () => boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Load user from localStorage on mount
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Error loading user:', error)
      }
    } else {
      // Default to admin for demo purposes
      const defaultUser: User = {
        id: '1',
        name: 'Admin User',
        email: 'admin@company.com',
        role: 'admin',
        department: 'Management'
      }
      setUser(defaultUser)
      localStorage.setItem('currentUser', JSON.stringify(defaultUser))
    }
  }, [])

  const login = (user: User) => {
    setUser(user)
    localStorage.setItem('currentUser', JSON.stringify(user))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('currentUser')
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false

    const permissions: Record<UserRole, string[]> = {
      admin: [
        'view_dashboard',
        'manage_loans',
        'manage_customers',
        'manage_collections',
        'manage_workers',
        'manage_batches',
        'view_reports',
        'manage_settings',
        'export_data'
      ],
      manager: [
        'view_dashboard',
        'manage_loans',
        'manage_customers',
        'manage_collections',
        'view_workers',
        'manage_batches',
        'view_reports',
        'export_data'
      ],
      worker: [
        'view_dashboard',
        'view_loans',
        'view_customers',
        'manage_collections',
        'view_own_customers'
      ]
    }

    return permissions[user.role]?.includes(permission) || false
  }

  const isAdmin = () => user?.role === 'admin'
  const isWorker = () => user?.role === 'worker'
  const isManager = () => user?.role === 'manager'

  return (
    <RoleContext.Provider value={{
      user,
      login,
      logout,
      hasPermission,
      isAdmin,
      isWorker,
      isManager
    }}>
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
