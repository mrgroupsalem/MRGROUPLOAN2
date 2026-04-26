'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function SupabaseConnectionTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing')
  const [errorMessage, setErrorMessage] = useState('')
  const [tablesStatus, setTablesStatus] = useState<Record<string, boolean>>({})
  const [tableErrors, setTableErrors] = useState<Record<string, string>>({})
  const [sampleData, setSampleData] = useState<any>({})

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      setConnectionStatus('testing')
      setErrorMessage('')

      // Test basic connection
      const { data, error } = await supabase
        .from('customers')
        .select('count')
        .limit(1)

      if (error) {
        throw error
      }

      setConnectionStatus('connected')
      
      // Test all tables
      await testAllTables()
      
      // Get sample data
      await getSampleData()

    } catch (error: any) {
      console.error('Connection test failed:', error)
      setConnectionStatus('error')
      setErrorMessage(error.message || 'Unknown error occurred')
    }
  }

  const testAllTables = async () => {
    const tables = ['customers', 'employees', 'loans', 'collections', 'repayments', 'batches', 'batch_customers']
    const status: Record<string, boolean> = {}
    const errors: Record<string, string> = {}

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        status[table] = !error
        if (error) {
          errors[table] = (error as any)?.message || 'Unknown error'
        }
      } catch (error: any) {
        status[table] = false
        errors[table] = error?.message || 'Unknown error'
      }
    }

    setTablesStatus(status)
    setTableErrors(errors)
  }

  const getSampleData = async () => {
    try {
      const [customersResult, employeesResult, loansResult, collectionsResult] = await Promise.all([
        supabase.from('customers').select('*').limit(3),
        supabase.from('employees').select('*').limit(3),
        supabase.from('loans').select('*').limit(3),
        supabase.from('collections').select('*').limit(3)
      ])

      setSampleData({
        customers: customersResult.data || [],
        employees: employeesResult.data || [],
        loans: loansResult.data || [],
        collections: collectionsResult.data || []
      })
    } catch (error) {
      console.error('Error fetching sample data:', error)
    }
  }

  const getStatusIcon = (status: 'testing' | 'connected' | 'error') => {
    switch (status) {
      case 'testing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getTableStatusIcon = (isWorking: boolean) => {
    return isWorking ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-red-500" />
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Supabase Connection Test</h2>
        <button
          onClick={testConnection}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Test Connection
        </button>
      </div>

      {/* Connection Status */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          {getStatusIcon(connectionStatus)}
          <span className="font-medium">
            {connectionStatus === 'testing' && 'Testing connection...'}
            {connectionStatus === 'connected' && 'Connected to Supabase'}
            {connectionStatus === 'error' && 'Connection failed'}
          </span>
        </div>
        
        {connectionStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">
              <strong>Error:</strong> {errorMessage}
            </p>
          </div>
        )}

        {connectionStatus === 'connected' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 text-sm">
              <strong>Success:</strong> Successfully connected to Supabase database
            </p>
          </div>
        )}
      </div>

      {/* Tables Status */}
      {connectionStatus === 'connected' && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Database Tables Status</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(tablesStatus).map(([table, isWorking]) => (
              <div key={table} className="flex items-start space-x-2 p-2 bg-gray-50 rounded">
                {getTableStatusIcon(isWorking)}
                <div>
                  <span className="text-sm font-medium capitalize">{table}</span>
                  {!isWorking && tableErrors[table] && (
                    <p className="text-xs text-red-600 mt-1">{tableErrors[table]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sample Data */}
      {connectionStatus === 'connected' && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Sample Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(sampleData).map(([table, data]: [string, any]) => (
              <div key={table} className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-gray-900 capitalize mb-2">{table}</h4>
                <p className="text-sm text-gray-600">
                  {Array.isArray(data) ? `${data.length} records` : 'No data'}
                </p>
                {Array.isArray(data) && data.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Sample: {JSON.stringify(data[0], null, 2).substring(0, 100)}...</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environment Variables Check */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-900 mb-2">Environment Variables</h3>
        <div className="text-sm text-yellow-800">
          <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}</p>
          <p><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}</p>
        </div>
        {(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && (
          <div className="mt-2 text-sm text-yellow-700">
            <p><strong>Note:</strong> Using fallback values. For production, create a <code>.env.local</code> file with your Supabase credentials.</p>
            <p className="mt-1">See <code>env-template.txt</code> for the exact content to use.</p>
          </div>
        )}
      </div>
    </div>
  )
}
