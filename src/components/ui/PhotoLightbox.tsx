'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Loader2,
} from 'lucide-react'

export interface PhotoItem {
  url: string
  title?: string
  subtitle?: string
}

interface PhotoLightboxProps {
  isOpen: boolean
  onClose: () => void
  photos: (PhotoItem | string)[]
  initialIndex?: number
  alt?: string
}

export default function PhotoLightbox({
  isOpen,
  onClose,
  photos,
  initialIndex = 0,
  alt = 'Customer Photo',
}: PhotoLightboxProps) {
  const [mounted, setMounted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoomLevel, setZoomLevel] = useState<number>(1) // 1x, 1.5x, 2x, 2.5x, 3x
  const [rotation, setRotation] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [hasError, setHasError] = useState<boolean>(false)

  // Normalize photos input into PhotoItem array
  const photoList: PhotoItem[] = photos.map((p) =>
    typeof p === 'string' ? { url: p, title: alt } : p
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setCurrentIndex(initialIndex)
    setZoomLevel(1)
    setRotation(0)
    setIsLoading(true)
    setHasError(false)
  }, [initialIndex, isOpen])

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Keyboard navigation & ESC key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight' && photoList.length > 1) {
        handleNext()
      } else if (e.key === 'ArrowLeft' && photoList.length > 1) {
        handlePrev()
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn()
      } else if (e.key === '-') {
        handleZoomOut()
      } else if (e.key === '0') {
        handleResetZoom()
      }
    },
    [isOpen, photoList.length, currentIndex]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!mounted || !isOpen || photoList.length === 0) return null

  const currentPhoto = photoList[currentIndex]

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photoList.length)
    setZoomLevel(1)
    setRotation(0)
    setIsLoading(true)
    setHasError(false)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photoList.length) % photoList.length)
    setZoomLevel(1)
    setRotation(0)
    setIsLoading(true)
    setHasError(false)
  }

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(3, Math.round((prev + 0.5) * 10) / 10))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(1, Math.round((prev - 0.5) * 10) / 10))
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
    setRotation(0)
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  // Double tap / double click to toggle zoom
  const handleDoubleTap = () => {
    setZoomLevel((prev) => (prev > 1 ? 1 : 2))
  }

  const handleDownload = async () => {
    if (!currentPhoto?.url) return
    try {
      const response = await fetch(currentPhoto.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = currentPhoto.url.split('.').pop()?.split('?')[0] || 'jpg'
      const cleanTitle = (currentPhoto.title || 'photo').replace(/[^a-zA-Z0-9_-]/g, '_')
      a.download = `${cleanTitle}_${Date.now()}.${ext}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      window.open(currentPhoto.url, '_blank')
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image Preview"
      className="fixed inset-0 z-[100] flex items-center justify-center select-none animate-fade-in"
      onClick={onClose}
    >
      {/* Dark Blurred Backdrop */}
      <div className="absolute inset-0 bg-black/92 backdrop-blur-md" />

      {/* TOP CONTROL BAR */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title & Counter */}
        <div className="text-white max-w-[60%] truncate">
          <h4 className="text-sm sm:text-base font-bold truncate">
            {currentPhoto?.title || alt}
          </h4>
          {currentPhoto?.subtitle && (
            <p className="text-xs text-white/70 truncate">{currentPhoto.subtitle}</p>
          )}
          {photoList.length > 1 && (
            <span className="text-xs text-white/60 font-mono mt-0.5 block">
              {currentIndex + 1} of {photoList.length}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom Reset / Current Level */}
          <button
            onClick={handleResetZoom}
            className="px-2.5 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center justify-center transition-all"
            title="Reset Zoom (0)"
          >
            {Math.round(zoomLevel * 100)}%
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Rotate */}
          <button
            onClick={handleRotate}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center transition-all"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center transition-all"
            title="Download Image"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Close (X) */}
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-all ml-2"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CENTER IMAGE CONTAINER */}
      <div
        className="relative z-0 max-w-[92vw] max-h-[88vh] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleTap}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80">
            <Loader2 className="w-10 h-10 animate-spin text-primary-400" />
            <span className="text-xs font-semibold mt-3 text-white/70">Loading full image...</span>
          </div>
        )}

        {/* Fallback Error Display */}
        {hasError ? (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-700 text-center text-white max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-300 font-black text-2xl flex items-center justify-center mx-auto mb-3">
              {(currentPhoto?.title || 'NA').slice(0, 2).toUpperCase()}
            </div>
            <h5 className="font-bold text-sm">Unable to load image</h5>
            <p className="text-xs text-slate-400 mt-1">
              The image URL might have expired or storage permissions require re-login.
            </p>
          </div>
        ) : (
          <img
            src={currentPhoto.url}
            alt={currentPhoto.title || alt}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
            }}
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
              transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)',
            }}
            className={`max-w-[92vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}
      </div>

      {/* MULTI-PHOTO NAVIGATION ARROWS */}
      {photoList.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrev()
            }}
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-xl"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-xl"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Bottom Thumbnail Strip */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 p-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 max-w-[90vw] overflow-x-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {photoList.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx)
                  setZoomLevel(1)
                  setRotation(0)
                  setIsLoading(true)
                  setHasError(false)
                }}
                className={`w-12 h-12 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                  idx === currentIndex
                    ? 'border-primary-500 scale-105 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>,
    document.body
  )
}

