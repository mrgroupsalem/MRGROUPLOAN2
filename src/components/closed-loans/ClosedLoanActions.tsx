'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Eye,
  RotateCcw,
  Download,
  Edit,
  Trash2,
  MoreVertical,
  Printer,
  FileText,
} from 'lucide-react'

interface ClosedLoanActionsProps {
  onView: () => void
  onRenew: () => void
  onDownload: () => void
  onEdit: () => void
  onDelete: () => void
  isAdmin?: boolean
}

export default function ClosedLoanActions({
  onView,
  onRenew,
  onDownload,
  onEdit,
  onDelete,
  isAdmin = true,
}: ClosedLoanActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative flex items-center justify-end gap-1.5" ref={menuRef}>
      {/* DESKTOP ACTION BUTTONS (>= 1024px) */}
      <div className="hidden xl:flex items-center gap-1.5">
        {/* VIEW DETAILS (Soft Blue) */}
        <button
          type="button"
          onClick={onView}
          className="h-10 px-3 rounded-xl bg-blue-50/80 hover:bg-blue-100/90 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 hover:-translate-y-0.5 shadow-xs"
          title="View Complete Profile & Loan History"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View</span>
        </button>

        {/* RENEW LOAN (Soft Emerald) */}
        <button
          type="button"
          onClick={onRenew}
          className="h-10 px-3 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 hover:-translate-y-0.5 shadow-xs"
          title="Issue New Loan / Renew Borrower"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Renew</span>
        </button>

        {/* DOWNLOAD STATEMENT (Soft Purple) */}
        <button
          type="button"
          onClick={onDownload}
          className="h-10 px-3 rounded-xl bg-purple-50/80 hover:bg-purple-100/90 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 hover:-translate-y-0.5 shadow-xs"
          title="Download Closure Certificate / Statement"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Statement</span>
        </button>

        {/* EDIT LOAN (Soft Amber) */}
        <button
          type="button"
          onClick={onEdit}
          className="w-10 h-10 rounded-xl bg-amber-50/80 hover:bg-amber-100/90 text-amber-700 border border-amber-200 flex items-center justify-center transition-all active:scale-95 hover:-translate-y-0.5 shadow-xs"
          title="Edit Loan & Customer Information"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>

        {/* DELETE LOAN (Soft Red) */}
        {isAdmin && (
          <button
            type="button"
            onClick={onDelete}
            className="w-10 h-10 rounded-xl bg-rose-50/80 hover:bg-rose-100/90 text-rose-700 border border-rose-200 flex items-center justify-center transition-all active:scale-95 hover:-translate-y-0.5 shadow-xs"
            title="Permanently Delete (Full Cascade)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* TABLET / COMPACT BUTTONS (< 1280px) */}
      <div className="flex xl:hidden items-center gap-1.5">
        {/* Primary View Button */}
        <button
          type="button"
          onClick={onView}
          className="h-10 px-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 active:scale-95"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View</span>
        </button>

        {/* Primary Renew Button */}
        <button
          type="button"
          onClick={onRenew}
          className="h-10 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Renew</span>
        </button>

        {/* Three Dots More Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
            title="More Actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 z-40 w-48 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 space-y-1 animate-scale-in text-xs font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onDownload()
                }}
                className="w-full px-3 py-2.5 rounded-xl hover:bg-purple-50 hover:text-purple-700 text-left flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-purple-600" />
                <span>Download Statement</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onEdit()
                }}
                className="w-full px-3 py-2.5 rounded-xl hover:bg-amber-50 hover:text-amber-700 text-left flex items-center gap-2"
              >
                <Edit className="w-4 h-4 text-amber-600" />
                <span>Edit Loan Details</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete()
                  }}
                  className="w-full px-3 py-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-700 text-left flex items-center gap-2 border-t border-slate-100 text-rose-600"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Delete Record</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

