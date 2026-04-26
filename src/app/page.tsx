'use client'

import { useState } from 'react'
import { RoleProvider } from '@/components/RoleProvider'
import AuthGateway from '@/components/AuthGateway'
import Navigation from '@/components/Navigation'
import Dashboard from '@/components/Dashboard'
import LoanManagement from '@/components/LoanManagement'
import CustomerManagement from '@/components/CustomerManagement'
import Collections from '@/components/Collections'
import ClosedLoans from '@/components/ClosedLoans'
import EmergencyLoan from '@/components/EmergencyLoan'
import Workers from '@/components/Workers'
import BatchManagement from '@/components/BatchManagement'
import Reports from '@/components/Reports'
import Settings from '@/components/Settings'
import Security from '@/components/Security'
import SupabaseConnectionTest from '@/components/SupabaseConnectionTest'

export default function Home() {
  const [currentView, setCurrentView] = useState('dashboard')

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />
      case 'loans':
        return <LoanManagement onBack={() => setCurrentView('dashboard')} />
      case 'closed-loans':
        return <ClosedLoans onBack={() => setCurrentView('dashboard')} />
      case 'emergency-loan':
        return <EmergencyLoan onBack={() => setCurrentView('dashboard')} />
      case 'customers':
        return <CustomerManagement onBack={() => setCurrentView('dashboard')} />
      case 'collections':
        return <Collections onBack={() => setCurrentView('dashboard')} />
      case 'workers':
        return <Workers onBack={() => setCurrentView('dashboard')} />
      case 'batches':
        return <BatchManagement onBack={() => setCurrentView('dashboard')} />
      case 'connection-test':
        return (
          <div className="p-3">
            <div className="flex items-center space-x-4 mb-6">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Database Connection Test</h1>
            </div>
            <SupabaseConnectionTest />
          </div>
        )
     case 'reports':
        return <Reports onBack={() => setCurrentView('dashboard')} />
     case 'settings':
        return <Settings onBack={() => setCurrentView('dashboard')} />
     case 'security':
        return <Security onBack={() => setCurrentView('dashboard')} />

      default:
        return <Dashboard />
    }
  }

  return (
    <RoleProvider>
      <AuthGateway>
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
          <Navigation currentView={currentView} onViewChange={setCurrentView} />
          <main className="flex-1 pt-16 lg:pt-0 lg:ml-[240px] bg-gray-50 min-h-screen w-full">
            {renderCurrentView()}
          </main>
        </div>
      </AuthGateway>
    </RoleProvider>
  )
}
