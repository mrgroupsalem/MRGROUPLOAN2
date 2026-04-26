'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRole, RoleProvider } from '@/components/RoleProvider'

function TestCustomerFilteringContent() {
  const { user } = useRole()
  const [myCustomers, setMyCustomers] = useState<any[]>([])
  const [allCustomers, setAllCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomers()
  }, [user])

  const fetchCustomers = async () => {
    setLoading(true)
    
    try {
      // Fetch all customers (for comparison)
      const { data: allData } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      
      setAllCustomers(allData || [])

      // Fetch customers created by current user
      if (user?.id) {
        const { data: myData } = await supabase
          .from('customers')
          .select('*')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
        
        setMyCustomers(myData || [])
      } else {
        setMyCustomers([])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Customer Filtering Test</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Current User</h2>
        <p><strong>ID:</strong> {user?.id}</p>
        <p><strong>Name:</strong> {user?.name}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* My Customers Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-green-700">
            My Customers ({myCustomers.length})
          </h2>
          {myCustomers.length === 0 ? (
            <p className="text-gray-500">No customers created by you yet.</p>
          ) : (
            <div className="space-y-3">
              {myCustomers.map((customer) => (
                <div key={customer.id} className="border border-green-200 rounded p-3">
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-gray-600">Phone: {customer.phone}</p>
                  <p className="text-sm text-gray-600">Created: {new Date(customer.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Customers Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-700">
            All Customers ({allCustomers.length})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {allCustomers.map((customer) => (
              <div 
                key={customer.id} 
                className={`border rounded p-3 ${
                  customer.created_by === user?.id 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200'
                }`}
              >
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-gray-600">Phone: {customer.phone}</p>
                <p className="text-sm text-gray-600">
                  Created by: {customer.created_by === user?.id ? 'You' : customer.created_by || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500">ID: {customer.id}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold mb-2">How it works:</h3>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>New customers will be tagged with your user ID when created</li>
          <li>The loan page will only show customers you created</li>
          <li>This prevents users from seeing other users' customers</li>
          <li>Existing customers have been assigned to the admin user</li>
        </ul>
      </div>
    </div>
  )
}

export default function TestCustomerFiltering() {
  return (
    <RoleProvider>
      <TestCustomerFilteringContent />
    </RoleProvider>
  )
}