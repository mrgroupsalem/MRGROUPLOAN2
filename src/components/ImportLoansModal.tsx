import React, { useState, useRef, useEffect } from 'react'
import { Upload, X, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ImportLoansModalProps {
  onClose: () => void
  onSuccess: () => void
}

type JobStatus = 'idle' | 'uploading' | 'starting' | 'running' | 'done' | 'error'

interface ImportStats {
  processed: number
  total: number
  insertedCustomers: number
  insertedLoans: number
  insertedRepayments: number
  skipped: number
  errors: number
  error_message?: string
}

export default function ImportLoansModal({ onClose, onSuccess }: ImportLoansModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  
  const [status, setStatus] = useState<JobStatus>('idle')
  const [jobId, setJobId] = useState<string | null>(null)
  const [stats, setStats] = useState<ImportStats>({
    processed: 0, total: 0, insertedCustomers: 0, insertedLoans: 0, insertedRepayments: 0, skipped: 0, errors: 0
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Polling effect
  useEffect(() => {
    if ((status === 'running' || status === 'starting') && jobId) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/import-loans/status/${jobId}`)
          if (!res.ok) throw new Error('Failed to fetch status')
          const data = await res.json()
          
          setStats({
            processed: data.processed || 0,
            total: data.total || 0,
            insertedCustomers: data.insertedCustomers || 0,
            insertedLoans: data.insertedLoans || 0,
            insertedRepayments: data.insertedRepayments || 0,
            skipped: data.skipped || 0,
            errors: data.errors || 0,
            error_message: data.error_message
          })

          if (data.done) {
            setStatus(data.status as JobStatus) // 'done' or 'error'
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          }
        } catch (error) {
          console.error('Error polling status:', error)
        }
      }, 1000)
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [status, jobId])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      validateAndSetFile(droppedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    const validExtensions = ['.csv', '.xlsx']
    
    if (
      validTypes.includes(selectedFile.type) || 
      validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext))
    ) {
      setFile(selectedFile)
      setStatus('idle')
      setStats({ processed: 0, total: 0, insertedCustomers: 0, insertedLoans: 0, insertedRepayments: 0, skipped: 0, errors: 0 })
    } else {
      alert('Please select a valid CSV or XLSX file.')
    }
  }

  const handeImport = async () => {
    if (!file) return

    try {
      setStatus('uploading')

      // Step 1: Upload file
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadRes = await fetch('/api/import-loans/upload', {
        method: 'POST',
        body: formData
      })
      
      const uploadData = await uploadRes.json()
      
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload file')
      }

      setStatus('starting')
      
      // Step 2: Start import
      const startRes = await fetch('/api/import-loans/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          path: uploadData.path,
          hasHeader: true 
        })
      })
      
      const startData = await startRes.json()
      
      if (!startRes.ok || !startData.success) {
        throw new Error(startData.error || 'Failed to start import')
      }

      setJobId(startData.jobId)
      setStatus('running')
      
    } catch (error: any) {
      console.error('Import failed:', error)
      setStats(prev => ({ ...prev, error_message: error.message || 'Unknown error occurred' }))
      setStatus('error')
    }
  }

  const resetForm = () => {
    setFile(null)
    setStatus('idle')
    setJobId(null)
    setStats({ processed: 0, total: 0, insertedCustomers: 0, insertedLoans: 0, insertedRepayments: 0, skipped: 0, errors: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Calculate Progress Percentage
  const progressPercentage = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Import Loans</h2>
            <p className="text-sm text-slate-500 mt-1">Upload a CSV or XLSX file to bulk add customers and loans.</p>
          </div>
          <button 
            onClick={status === 'done' ? onSuccess : onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            disabled={status === 'uploading' || status === 'starting' || status === 'running'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          
          {/* Default Upload State */}
          {status === 'idle' && (
            <div className="space-y-6">
              <div 
                className={`border-2 border-dashed rounded-2xl p-8 transition-all duration-300 text-center ${
                  isDragActive ? 'border-primary-500 bg-primary-50' : 
                  file ? 'border-emerald-500 bg-emerald-50' : 
                  'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/50'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv" 
                  className="hidden" 
                />
                
                <div className="flex flex-col items-center justify-center space-y-4 cursor-pointer">
                  {file ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-emerald-800 font-semibold">{file.name}</p>
                        <p className="text-xs text-emerald-600/70 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); resetForm(); }}
                        className="text-xs font-semibold px-3 py-1 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all"
                      >
                        Choose different file
                      </button>
                    </>
                  ) : (
                    <>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                        isDragActive ? 'bg-primary-100' : 'bg-white shadow-sm border border-slate-100'
                      }`}>
                        <Upload className={`w-8 h-8 ${isDragActive ? 'text-primary-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                          <span className="text-primary-600 hover:text-primary-700 hover:underline">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-slate-500 mt-2">CSV or XLSX up to 10MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Expected Columns (Auto-mapped)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Customer ID', 'Customer Name', 'Mobile Number', 'Relationship', 'Aadhar Number', 
                    'PAN Number', 'Address', 'Additional Mobile 1', 'Additional Mobile 2', 'Loan Amount', 
                    'Interest Rate', 'Number of Weeks', 'Team Leader', 'Weekly Batch', 'Start Date', 
                    'End Date', 'Bank Name', 'Account Number', 'IFSC Code'
                  ].map(col => (
                    <span key={col} className="px-2 py-1 bg-white border border-blue-100 text-slate-600 rounded-md text-[11px] font-medium shadow-sm">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Running State */}
          {(status === 'uploading' || status === 'starting' || status === 'running') && (
            <div className="space-y-8 py-4">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center animate-pulse"></div>
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin absolute inset-0 m-auto" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {status === 'uploading' ? 'Uploading file...' : status === 'starting' ? 'Analyzing file...' : 'Importing data...'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Please keep this window open and do not refresh.</p>
                </div>
              </div>

              {status === 'running' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-slate-700">Progress</span>
                    <span className="text-primary-600">{progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-primary-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-center font-medium">
                    Processed {stats.processed} of {stats.total} rows
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Done / Error State */}
          {(status === 'done' || status === 'error') && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-sm ${
                  status === 'done' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-red-100 text-red-600 border border-red-200'
                }`}>
                  {status === 'done' ? <CheckCircle className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${status === 'done' ? 'text-emerald-800' : 'text-red-800'}`}>
                    {status === 'done' ? 'Import Complete!' : 'Import Failed'}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {status === 'done' 
                      ? 'Your loans and customers have been successfully synchronized.' 
                      : (stats.error_message || 'An error occurred during the import process.')}
                  </p>
                </div>
              </div>

              {status === 'done' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customers Inserted</p>
                    <p className="text-3xl font-black text-slate-800 mt-1">{stats.insertedCustomers}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Loans Inserted</p>
                    <p className="text-3xl font-black text-slate-800 mt-1">{stats.insertedLoans}</p>
                  </div>
                  {(stats.skipped > 0 || stats.errors > 0) && (
                    <div className="col-span-2 bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800">Some rows encountered issues</p>
                          <p className="text-xs text-amber-700/80">{stats.skipped} skipped, {stats.errors} errors</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-white">
          {status === 'idle' && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handeImport}
                disabled={!file}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Start Import
              </button>
            </div>
          )}
          {(status === 'done' || status === 'error') && (
            <div className="flex flex-col gap-3">
              {status === 'error' && (
                <button
                  onClick={resetForm}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={status === 'done' ? onSuccess : onClose}
                className={`w-full px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors shadow-sm ${
                  status === 'done' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {status === 'done' ? 'View Updated Loans' : 'Close'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
