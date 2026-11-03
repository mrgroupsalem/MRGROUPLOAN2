'use client'

import { useState } from 'react'
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  Calendar, 
  FileText, 
  Settings,
  Menu,
  X,
  Wallet,
  UserCheck,
  Database,
  CheckCircle2,
  AlertTriangle,
  Shield,
  LogOut
} from 'lucide-react'
import { useRole } from './RoleProvider'

interface NavigationProps {
  currentView: string
  onViewChange: (view: string) => void
}

export default function Navigation({ currentView, onViewChange }: NavigationProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { hasPermission, user, logout } = useRole()

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, view: 'dashboard', permission: 'view_dashboard' },
    { name: 'Loans', icon: CreditCard, view: 'loans', permission: 'manage_loans' },
    
    { name: 'Customers', icon: Users, view: 'customers', permission: 'manage_customers' },
    { name: 'Collections', icon: Wallet, view: 'collections', permission: 'manage_collections' },
    { name: 'Workers', icon: UserCheck, view: 'workers', permission: 'manage_workers' },
    { name: 'Batches', icon: Calendar, view: 'batches', permission: 'manage_batches' },
    { name: 'Closed Loans', icon: CheckCircle2, view: 'closed-loans', permission: 'manage_loans' },
    { name: 'Emergency Loan', icon: AlertTriangle, view: 'emergency-loan', permission: 'manage_loans' },
    { name: 'Reports', icon: FileText, view: 'reports', permission: 'view_reports' },
    { name: 'Database Test', icon: Database, view: 'connection-test', permission: 'view_dashboard' },
    { name: 'Settings', icon: Settings, view: 'settings', permission: 'manage_settings' },
    { name: 'Security', icon: Shield, view: 'security', permission: 'manage_settings' },
  ].filter(item => hasPermission(item.permission))

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">MR</span>
          </div>
          <span className="ml-2 text-lg font-semibold text-gray-900">MR Groups</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-white shadow-2xl lg:shadow-none lg:border-r lg:border-gray-200 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col`}>
        <div className="flex-none flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">MR</span>
            </div>
            <span className="ml-2 text-xl font-semibold text-gray-900 truncate">MR Groups</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 -mr-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none flex-shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto mt-4 px-4 pb-4 custom-scrollbar">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.view
              
              return (
                <li key={item.name}>
                  <button
                    onClick={() => {
                      onViewChange(item.view)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User info & Sign Out at bottom */}
        <div className="flex-none p-3 border-t border-gray-200 bg-gray-50/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center overflow-hidden min-w-0 pr-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-xs shadow-sm">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="ml-2.5 overflow-hidden">
                <p className="text-xs font-semibold text-gray-900 truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[11px] text-gray-500 truncate" title={user?.email || 'admin@mrgroups.com'}>
                  {user?.email || 'admin@mrgroups.com'}
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              type="button"
              title="Secure Sign Out"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  )
}
