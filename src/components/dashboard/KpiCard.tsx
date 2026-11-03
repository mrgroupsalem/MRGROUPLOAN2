'use client'

import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subLabel?: string | React.ReactNode
  icon: LucideIcon
  tone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo' | 'cyan'
  badge?: React.ReactNode
  onClick?: () => void
  clickable?: boolean
  progress?: number
}

const toneStyles = {
  blue: {
    bgHover: 'group-hover:bg-blue-500/10',
    iconBg: 'bg-gradient-to-tr from-blue-500 to-indigo-600',
    iconShadow: 'shadow-blue-500/30',
    titleColor: 'text-blue-600',
    borderHighlight: 'hover:border-blue-300',
  },
  emerald: {
    bgHover: 'group-hover:bg-emerald-500/10',
    iconBg: 'bg-gradient-to-tr from-emerald-500 to-teal-600',
    iconShadow: 'shadow-emerald-500/30',
    titleColor: 'text-emerald-600',
    borderHighlight: 'hover:border-emerald-300',
  },
  amber: {
    bgHover: 'group-hover:bg-amber-500/10',
    iconBg: 'bg-gradient-to-tr from-amber-500 to-orange-600',
    iconShadow: 'shadow-amber-500/30',
    titleColor: 'text-amber-600',
    borderHighlight: 'hover:border-amber-300',
  },
  rose: {
    bgHover: 'group-hover:bg-rose-500/10',
    iconBg: 'bg-gradient-to-tr from-rose-500 to-pink-600',
    iconShadow: 'shadow-rose-500/30',
    titleColor: 'text-rose-600',
    borderHighlight: 'hover:border-rose-300',
  },
  purple: {
    bgHover: 'group-hover:bg-purple-500/10',
    iconBg: 'bg-gradient-to-tr from-purple-500 to-indigo-600',
    iconShadow: 'shadow-purple-500/30',
    titleColor: 'text-purple-600',
    borderHighlight: 'hover:border-purple-300',
  },
  indigo: {
    bgHover: 'group-hover:bg-indigo-500/10',
    iconBg: 'bg-gradient-to-tr from-indigo-500 to-violet-600',
    iconShadow: 'shadow-indigo-500/30',
    titleColor: 'text-indigo-600',
    borderHighlight: 'hover:border-indigo-300',
  },
  cyan: {
    bgHover: 'group-hover:bg-cyan-500/10',
    iconBg: 'bg-gradient-to-tr from-cyan-500 to-blue-600',
    iconShadow: 'shadow-cyan-500/30',
    titleColor: 'text-cyan-600',
    borderHighlight: 'hover:border-cyan-300',
  },
}

export default function KpiCard({
  title,
  value,
  subLabel,
  icon: Icon,
  tone = 'blue',
  badge,
  onClick,
  clickable = false,
  progress,
}: KpiCardProps) {
  const styles = toneStyles[tone]

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`group relative flex flex-col justify-between p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 overflow-hidden ${
        clickable
          ? `cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_30px_rgb(0,0,0,0.08)] ${styles.borderHighlight}`
          : ''
      }`}
    >
      {/* Subtle background glow */}
      <div
        className={`absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl transition-all duration-500 ${styles.bgHover} pointer-events-none`}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 relative z-10 mb-3">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-wider ${styles.titleColor}`}>
            {title}
          </p>
        </div>
        <div
          className={`p-2.5 rounded-2xl text-white shadow-md ${styles.iconBg} ${styles.iconShadow} transform group-hover:scale-105 transition-transform flex-shrink-0`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Value */}
      <div className="relative z-10 my-auto">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
      </div>

      {/* Footer / Sublabel / Badges */}
      <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5">
        {progress !== undefined && (
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
            <div
              className={`h-full rounded-full ${styles.iconBg}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs text-slate-500 font-medium">{subLabel}</div>
          {badge && <div>{badge}</div>}
        </div>
      </div>
    </div>
  )
}

