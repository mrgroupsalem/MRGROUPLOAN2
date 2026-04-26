'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loan, Customer, Employee, Collection, DashboardStats } from '@/types'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { 
  Download, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Filter,
  Search,
  BarChart3,
  PieChart,
  Activity,
  CreditCard,
  UserCheck,
  Briefcase,
  Clock,
  X,
  IndianRupee,
  IndianRupeeIcon
} from 'lucide-react'

interface ReportsProps {
  onBack: () => void
}

export default function Reports({ onBack }: ReportsProps) {
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<'overview' | 'loans' | 'collections' | 'customers' | 'employees'>('overview')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'all'>('month')
  
  // Report data
  const [stats, setStats] = useState<DashboardStats>({} as DashboardStats)
  const [loans, setLoans] = useState<Loan[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  
  // Chart data
  const [loanTrendData, setLoanTrendData] = useState<any[]>([])
  const [collectionTrendData, setCollectionTrendData] = useState<any[]>([])
  const [batchWiseData, setBatchWiseData] = useState<any[]>([])
  const [purposeWiseData, setPurposeWiseData] = useState<any[]>([])
  
  // Hover state for tooltips
  const [hoveredLoanItem, setHoveredLoanItem] = useState<number | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [workerFilter, setWorkerFilter] = useState<string>('all')

  // Load all data
  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadStats(),
        loadLoans(),
        loadCollections(),
        loadCustomers(),
        loadEmployees()
      ])
    } catch (error) {
     console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
     const { data: loansData } = await supabase.from('loans').select('*')
     const { data: collectionsData } = await supabase.from('collections').select('*')
      
     const activeLoans = loansData?.filter(l => l.status === 'active').length || 0
     const closedLoans = loansData?.filter(l => l.status === 'closed').length || 0
     const pendingLoans = loansData?.filter(l => l.status === 'pending').length || 0
     const totalAmount = loansData?.reduce((sum, l) => sum + Number(l.amount), 0) || 0
     const todayCollection = collectionsData?.filter(c => {
       const today = new Date().toISOString().split('T')[0]
        return c.collection_date === today
      }).reduce((sum, c) => sum + Number(c.amount_collected), 0) || 0

      setStats({
        newLoans: pendingLoans,
        activeLoans,
        closedLoans,
        openLoanApplications: pendingLoans,
        newLoanApplications: pendingLoans,
        totalSanctionedAmount: totalAmount,
        applicantsWithUnpaidShortfall: 0,
        totalShortfallAmount: 0,
        todayCollection,
        totalDisbursed: totalAmount,
        activeSecurities: activeLoans,
        totalWriteOff: 0,
        totalRepayment: collectionsData?.reduce((sum, c) => sum + Number(c.amount_collected), 0) || 0
      })
    } catch (error) {
     console.error('Error loading stats:', error)
    }
  }

  const loadLoans = async () => {
    try {
     const { data } = await supabase.from('loans').select(`
        *,
        customer:customers(name, phone, customer_id_display),
        team_leader:employees(name)
      `)
      setLoans(data || [])
      
      // Generate loan trend data
      generateLoanTrendData(data || [])
      generateBatchWiseData(data || [])
      generatePurposeWiseData(data || [])
    } catch (error) {
     console.error('Error loading loans:', error)
    }
  }

  const loadCollections = async () => {
    try {
     const { data } = await supabase.from('collections').select(`
        *,
        loan:loans(customer_id),
        customer:customers(name, phone),
        worker:employees(name)
      `)
      setCollections(data || [])
      generateCollectionTrendData(data || [])
    } catch (error) {
     console.error('Error loading collections:', error)
    }
  }

  const loadCustomers = async () => {
    try {
     const { data } = await supabase.from('customers').select('*')
      setCustomers(data || [])
    } catch (error) {
     console.error('Error loading customers:', error)
    }
  }

  const loadEmployees = async () => {
    try {
     const { data } = await supabase.from('employees').select('*')
      setEmployees(data || [])
    } catch (error) {
     console.error('Error loading employees:', error)
    }
  }

  const generateLoanTrendData = (loans: Loan[]) => {
   const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
   const trendData: any[] = []
    
    for (let i = 5; i >= 0; i--) {
     const date = new Date()
      date.setMonth(date.getMonth() - i)
     const monthKey = `${months[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`
      
     const monthLoans = loans.filter(l => {
       const loanDate = new Date(l.created_at)
        return loanDate.getMonth() === date.getMonth() && loanDate.getFullYear() === date.getFullYear()
      })
      
      trendData.push({
        month: monthKey,
        loans: monthLoans.length,
        amount: monthLoans.reduce((sum, l) => sum + Number(l.amount), 0),
        creationDates: monthLoans.map(l => new Date(l.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }))
      })
    }
    
    setLoanTrendData(trendData)
  }

  const generateCollectionTrendData = (collections: Collection[]) => {
   const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
   const trendData: any[] = []
    
    for (let i = 6; i >= 0; i--) {
     const date = new Date()
      date.setDate(date.getDate() - i)
     const dateStr = date.toISOString().split('T')[0]
      
     const dayCollections = collections.filter(c => c.collection_date === dateStr)
     const totalCollected = dayCollections.reduce((sum, c) => sum + Number(c.amount_collected), 0)
      
      trendData.push({
        date: `${days[date.getDay()]}, ${date.getDate()}/${date.getMonth() +1}`,
        amount: totalCollected,
       count: dayCollections.length
      })
    }
    
    setCollectionTrendData(trendData)
  }

  const generateBatchWiseData = (loans: Loan[]) => {
   const batches = ['tuesday', 'thursday', 'friday']
   const batchData = batches.map(day => {
     const batchLoans = loans.filter(l => l.weekly_batch === day)
      return {
        day: day.charAt(0).toUpperCase() + day.slice(1),
        loans: batchLoans.length,
        amount: batchLoans.reduce((sum, l) => sum + Number(l.amount), 0)
      }
    })
    setBatchWiseData(batchData)
  }

  const generatePurposeWiseData = (loans: Loan[]) => {
   const purposes: Record<string, number> = {}
    loans.forEach(l => {
     const purpose = l.loan_purpose || 'Other'
      purposes[purpose] = (purposes[purpose] || 0) + Number(l.amount)
    })
    
   const data = Object.entries(purposes).map(([purpose, amount]) => ({
      purpose,
      amount,
      percentage: ((amount / loans.reduce((sum, l) => sum + Number(l.amount), 0)) * 100).toFixed(1)
    }))
    
    setPurposeWiseData(data)
  }

  const exportReport = (type: string) => {
    alert(`Exporting ${type} report...`)
    // Implementation for CSV/PDF export
  }

  const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

 return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
           onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="today">Today</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </select>
          <button
           onClick={() => exportReport(selectedReport)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'loans', label: 'Loans', icon: FileText },
          { id: 'collections', label: 'Collections', icon: DollarSign },
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'employees', label: 'Team', icon: UserCheck }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
           onClick={() => setSelectedReport(id as any)}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
              selectedReport === id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Overview Report */}
      {selectedReport === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Active Loans"
              value={stats.activeLoans}
              icon={TrendingUp}
             color="bg-blue-100 text-blue-600"
              subtext={`${formatNumber(stats.totalSanctionedAmount)} Total Amount`}
            />
            <StatCard
              title="Today's Collection"
              value={formatNumber(stats.todayCollection)}
              icon={IndianRupee}
             color="bg-green-100 text-green-600"
              subtext="Collected today"
            />
            <StatCard
              title="Pending Applications"
              value={stats.newLoanApplications}
              icon={Clock}
             color="bg-yellow-100 text-yellow-600"
              subtext="Awaiting approval"
            />
            <StatCard
              title="Total Repayment"
              value={formatNumber(stats.totalRepayment)}
              icon={CheckCircle}
             color="bg-purple-100 text-purple-600"
              subtext="Total collected"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loan Trend */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Loan Disbursement Trend
              </h3>
              <div className="space-y-3">
                {loanTrendData.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between relative"
                    onMouseEnter={() => setHoveredLoanItem(idx)}
                    onMouseLeave={() => setHoveredLoanItem(null)}
                  >
                    <span className="text-sm text-gray-600">{item.month}</span>
                    <div className="flex items-center space-x-4 flex-1 mx-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-200 hover:bg-blue-700"
                          style={{ width: `${(item.loans / Math.max(...loanTrendData.map(d => d.loans))) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">{item.loans} loans</span>
                    
                    {/* Tooltip */}
                    {hoveredLoanItem === idx && (
                      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10 whitespace-nowrap">
                        <div className="font-semibold mb-2">{item.month}</div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span>📊 {formatNumber(item.loans)} loans</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <IndianRupeeIcon className="w-3 h-3" />
                          <span>{formatNumber(item.amount)}</span>
                        </div>
                        {item.creationDates && item.creationDates.length > 0 && (
                          <div className="border-t border-gray-600 pt-2 mt-2">
                            <div className="font-medium text-gray-300 mb-1">Creation Dates:</div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {item.creationDates.map((date: string, dateIdx: number) => (
                                <div key={dateIdx} className="text-gray-200">
                                  📅 {date}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="absolute left-1/2 transform -translate-x-1/2 top-full -mt-1">
                          <div className="border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Collection Trend */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <IndianRupeeIcon className="w-5 h-5 mr-2" />
                Collection Trend (Last 7 Days)
              </h3>
              <div className="space-y-3">
                {collectionTrendData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{item.date}</span>
                    <div className="flex items-center space-x-4">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(item.amount / Math.max(...collectionTrendData.map(d => d.amount))) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-20 text-right">{formatCurrency(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Batch-wise Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Batch-wise Distribution
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {batchWiseData.map((batch, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{batch.day}</h4>
                    <Activity className="w-5 h-5 text-primary-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{batch.loans}</p>
                  <p className="text-sm text-gray-600">Active Loans</p>
                  <p className="text-sm font-medium text-primary-600 mt-2">
                    {formatCurrency(batch.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Purpose-wise Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Loan Purpose Distribution
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {purposeWiseData.map((item, idx) => (
                <div key={idx} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">{item.purpose}</p>
                  <p className="text-xl font-bold text-gray-900">{item.percentage}%</p>
                  <p className="text-xs text-gray-500 mt-1">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loans Report */}
      {selectedReport === 'loans' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Detailed Loans Report</h3>
              <div className="flex items-center space-x-3">
                <input
                 type="text"
                  placeholder="Search by customer name..."
                  value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <select
                  value={statusFilter}
                 onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team Leader</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loans
                  .filter(loan => {
                   const matchesSearch = loan.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        loan.customer?.phone?.includes(searchTerm)
                   const matchesStatus = statusFilter === 'all' || loan.status === statusFilter
                    return matchesSearch && matchesStatus
                  })
                  .map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {loan.customer?.customer_id_display || loan.customer_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{loan.customer?.name}</div>
                          <div className="text-sm text-gray-500">{loan.customer?.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(Number(loan.amount))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          loan.status === 'active' ? 'bg-green-100 text-green-800' :
                          loan.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(loan.start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(loan.end_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {loan.team_leader?.name || 'N/A'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collections Report */}
      {selectedReport === 'collections' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Collection Report</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatCard
                title="Total Collected"
                value={formatCurrency(stats.totalRepayment)}
                icon={IndianRupeeIcon}
               color="bg-green-100 text-green-600"
              />
              <StatCard
                title="Today's Collection"
                value={formatCurrency(stats.todayCollection)}
                icon={CheckCircle}
               color="bg-blue-100 text-blue-600"
              />
              <StatCard
                title="Total Transactions"
                value={collections.length}
                icon={Activity}
               color="bg-purple-100 text-purple-600"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collected By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {collections.slice(0, 50).map((collection) => (
                    <tr key={collection.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(collection.collection_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{collection.customer?.name}</div>
                        <div className="text-sm text-gray-500">{collection.customer?.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(Number(collection.amount_collected))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {collection.worker?.name || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customers Report */}
      {selectedReport === 'customers' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Customer Report</h3>
              <input
               type="text"
                placeholder="Search customers..."
                value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <StatCard
                title="Total Customers"
                value={customers.length}
                icon={Users}
               color="bg-blue-100 text-blue-600"
              />
              <StatCard
                title="Active Borrowers"
                value={loans.filter(l => l.status === 'active').length}
                icon={CreditCard}
               color="bg-green-100 text-green-600"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers
                    .filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.customer_id_display || customer.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {customer.phone}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {customer.address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(customer.created_at)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Employees Report */}
      {selectedReport === 'employees' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Team Members Report</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <StatCard
                title="Total Team Members"
                value={employees.length}
                icon={UserCheck}
               color="bg-purple-100 text-purple-600"
              />
              <StatCard
                title="Team Leaders"
                value={employees.filter(e => e.designation === 'Team Leader').length}
                icon={Briefcase}
               color="bg-blue-100 text-blue-600"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {employee.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {employee.designation}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {employee.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {employee.email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
