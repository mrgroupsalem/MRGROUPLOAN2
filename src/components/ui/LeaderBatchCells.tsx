'use client'

import React from 'react'
import { User, Calendar } from 'lucide-react'

export interface LeaderInfo {
  id?: string
  name?: string
  phone?: string
}

interface LeaderCellProps {
  leader?: LeaderInfo | null
  className?: string
}

export function LeaderCell({ leader, className = '' }: LeaderCellProps) {
  if (!leader || !leader.name) {
    return <span className={`text-slate-400 font-mono text-xs ${className}`}>—</span>
  }

  // If leader name already contains the code (like "RANI 477" or "NANDINI DURAISAMY 475")
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs sm:text-sm">
        <User className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
        <span className="truncate max-w-[140px] sm:max-w-[180px]">{leader.name}</span>
      </div>
      {leader.id && (
        <span className="text-[10px] text-slate-400 font-mono pl-5 leading-tight">
          ID: {leader.id}
        </span>
      )}
    </div>
  )
}

interface BatchPillProps {
  batch?: 'tuesday' | 'thursday' | 'friday' | string | null
  className?: string
  size?: 'sm' | 'md'
}

export function BatchPill({ batch, className = '', size = 'md' }: BatchPillProps) {
  if (!batch || batch === '—') {
    return <span className={`text-slate-400 font-mono text-xs ${className}`}>—</span>
  }

  const normalized = String(batch).toLowerCase().trim()
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'

  switch (normalized) {
    case 'tuesday':
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 capitalize shadow-2xs ${padding} ${className}`}
        >
          <Calendar className="w-3 h-3 text-blue-500" />
          Tuesday
        </span>
      )
    case 'thursday':
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize shadow-2xs ${padding} ${className}`}
        >
          <Calendar className="w-3 h-3 text-emerald-500" />
          Thursday
        </span>
      )
    case 'friday':
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200 capitalize shadow-2xs ${padding} ${className}`}
        >
          <Calendar className="w-3 h-3 text-purple-500" />
          Friday
        </span>
      )
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200 capitalize ${padding} ${className}`}
        >
          {batch}
        </span>
      )
  }
}

