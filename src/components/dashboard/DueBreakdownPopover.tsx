'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Clock, AlertCircle, X, ChevronRight } from 'lucide-react'
import { DueBreakdownItem } from '@/lib/pendingBreakdown'
import PendingDueList from './PendingDueList'

interface DueBreakdownPopoverProps {
  items: DueBreakdownItem[]
  customerName?: string
  children: React.ReactNode
}

export default function DueBreakdownPopover({
  items,
  customerName = 'Borrower',
  children,
}: DueBreakdownPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false,
  })

  const triggerRef = useRef<HTMLDivElement>(null)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    // Only trigger hover on non-touch devices
    if (window.innerWidth < 768) return

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    hoverTimerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const popoverHeight = 320
        const spaceBelow = window.innerHeight - rect.bottom
        const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight

        const top = placeAbove
          ? rect.top + window.scrollY - 8
          : rect.bottom + window.scrollY + 8
        const left = Math.max(16, Math.min(rect.left + window.scrollX - 40, window.innerWidth - 380))

        setCoords({ top, left, placeAbove })
        setIsOpen(true)
      }
    }, 150)
  }

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }

    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 120)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.innerWidth < 768) {
      setIsMobileOpen(true)
    } else {
      setIsOpen(!isOpen)
    }
  }

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setIsMobileOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      {/* Trigger element wrapping the Due Breakdown cell */}
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="cursor-pointer group/breakdown relative inline-block w-full"
      >
        {children}
      </div>

      {/* Desktop Floating Popover rendered in Portal */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onMouseEnter={() => {
              if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current)
                closeTimerRef.current = null
              }
            }}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'absolute',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.placeAbove ? 'translateY(-100%)' : 'none',
              zIndex: 9999,
            }}
            className="w-[360px] sm:w-[400px] p-4 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-[0_12px_40px_rgb(0,0,0,0.14)] animate-in fade-in-0 zoom-in-95 duration-200 select-none"
          >
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-black text-slate-900 tracking-tight">
                  Due Breakdown · {customerName}
                </h4>
                <p className="text-[10px] text-slate-400">Date-by-date scheduled pending balance</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto pr-1">
              <PendingDueList items={items} />
            </div>
          </div>,
          document.body
        )}

      {/* Mobile Touch Bottom Sheet */}
      {isMobileOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200 p-0 sm:p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Due Breakdown</h3>
                  <p className="text-xs text-slate-500 font-medium">{customerName}</p>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <PendingDueList items={items} />
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

