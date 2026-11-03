'use client'

import { formatCurrency } from '@/lib/utils'
import { Wallet, PlusCircle, RefreshCw, Clock } from 'lucide-react'
import { Collection, Loan } from '@/types'

interface ActivityFeedProps {
  collections: Collection[]
  loans: Loan[]
  onViewLoans?: () => void
  onViewCollections?: () => void
}

interface ActivityItem {
  id: string
  title: string
  description: string
  amount?: number
  time: string
  type: 'payment' | 'loan' | 'renewal'
  badge: string
}

export default function ActivityFeed({
  collections,
  loans,
  onViewLoans,
  onViewCollections,
}: ActivityFeedProps) {
  // Combine recent collections and recent loans into a unified activity timeline
  const activities: ActivityItem[] = []

  // Recent 5 collections
  collections.slice(0, 5).forEach((c) => {
    activities.push({
      id: `col-${c.id}`,
      title: 'EMI Collected',
      description: `Loan ${c.loan_id ? c.loan_id.slice(0, 8) : ''} · ${c.status || 'completed'}`,
      amount: Number(c.amount_collected) || 0,
      time: c.collection_date || c.created_at || 'Recently',
      type: 'payment',
      badge: 'Collection',
    })
  })

  // Recent 5 loans
  loans.slice(0, 5).forEach((l) => {
    activities.push({
      id: `loan-${l.id}`,
      title: 'New Loan Disbursed',
      description: `${l.customer?.name || l.customer_id} · ${l.weekly_batch || 'tuesday'} batch`,
      amount: Number(l.amount) || 0,
      time: l.created_at ? l.created_at.split('T')[0] : 'Recently',
      type: 'loan',
      badge: 'Origination',
    })
  })

  // Sort activities by date descending
  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const displayActivities = activities.slice(0, 7)

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Recent Financial Activity</h3>
          <p className="text-xs text-slate-500 mt-0.5">Live transactions and originations</p>
        </div>
        <div className="flex items-center gap-2">
          {onViewCollections && (
            <button
              onClick={onViewCollections}
              className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
            >
              Collections →
            </button>
          )}
        </div>
      </div>

      {displayActivities.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">No recent activity recorded.</div>
      ) : (
        <div className="space-y-4">
          {displayActivities.map((act) => (
            <div key={act.id} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    act.type === 'payment'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  {act.type === 'payment' ? (
                    <Wallet className="w-4 h-4" />
                  ) : (
                    <PlusCircle className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{act.title}</p>
                  <p className="text-[11px] text-slate-500">{act.description}</p>
                </div>
              </div>

              <div className="text-right">
                {act.amount !== undefined && (
                  <p
                    className={`font-extrabold ${
                      act.type === 'payment' ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {act.type === 'payment' ? '+' : ''}
                    {formatCurrency(act.amount)}
                  </p>
                )}
                <span className="text-[10px] text-slate-400">{act.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

