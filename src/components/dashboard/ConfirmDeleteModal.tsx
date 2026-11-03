'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  customerName: string
  customerId: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

export default function ConfirmDeleteModal({
  isOpen,
  customerName,
  customerId,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [confirmInput, setConfirmInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  // Allow either exact customer name or typing "DELETE"
  const isMatch =
    confirmInput.trim().toLowerCase() === customerName.trim().toLowerCase() ||
    confirmInput.trim().toUpperCase() === 'DELETE'

  const handleExecuteDelete = async () => {
    if (!isMatch) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err: any) {
      console.error('Delete error:', err)
      setError(err.message || 'Failed to delete customer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black">Permanent Deletion Warning</h3>
              <p className="text-xs text-red-100">Irreversible Action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 leading-relaxed font-medium">
            This will permanently delete <strong>{customerName}</strong> and ALL related data
            (loans, payments, collections, emergency loans, documents, and profile photo). This cannot be undone.
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">{error}</p>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Type <span className="font-mono text-red-600 font-bold">{customerName}</span> or <span className="font-mono text-red-600 font-bold">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={`Type "${customerName}" or "DELETE"`}
              className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteDelete}
              disabled={!isMatch || loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

