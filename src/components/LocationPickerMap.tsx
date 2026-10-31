'use client'

import React, { useEffect, useRef, useState } from 'react'

interface LocationPickerMapProps {
  latitude: number | null
  longitude: number | null
  address?: string
  interactive?: boolean
  height?: string
  onLocationChange?: (lat: number, lng: number, address?: string) => void
}

export default function LocationPickerMap({
  latitude,
  longitude,
  address,
  interactive = true,
  height = '240px',
  onLocationChange,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  )

  // Keep internal coords state synced with incoming props
  useEffect(() => {
    if (latitude && longitude) {
      setCurrentCoords({ lat: latitude, lng: longitude })
    }
  }, [latitude, longitude])

  // Initialize and update Leaflet map
  useEffect(() => {
    let isMounted = true

    if (typeof window === 'undefined' || !mapContainerRef.current) return

    // Default center if no coordinates: India center [20.5937, 78.9629] zoom 5
    const hasValidCoords =
      currentCoords &&
      !isNaN(currentCoords.lat) &&
      !isNaN(currentCoords.lng) &&
      currentCoords.lat !== 0 &&
      currentCoords.lng !== 0

    const initialCenter = hasValidCoords
      ? [currentCoords.lat, currentCoords.lng]
      : [13.0827, 80.2707] // Default Chennai/Tamil Nadu
    const initialZoom = hasValidCoords ? 15 : 10

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return

      // Custom SVG Marker Icon so it never breaks on missing assets
      const customPinIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="position: relative; width: 32px; height: 32px; transform: translate(-50%, -100%);">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 32px; height: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#DC2626"/>
              <circle cx="12" cy="9" r="3" fill="#FFFFFF"/>
            </svg>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      // If map is already initialized, just update view and marker
      if (mapInstanceRef.current) {
        const map = mapInstanceRef.current
        if (hasValidCoords) {
          map.setView([currentCoords.lat, currentCoords.lng], map.getZoom() || 15)
          if (markerRef.current) {
            markerRef.current.setLatLng([currentCoords.lat, currentCoords.lng])
          } else {
            const marker = L.marker([currentCoords.lat, currentCoords.lng], {
              icon: customPinIcon,
              draggable: interactive,
            }).addTo(map)

            if (interactive && onLocationChange) {
              marker.on('dragend', async (e: any) => {
                const newPos = e.target.getLatLng()
                handleNewCoords(newPos.lat, newPos.lng)
              })
            }
            markerRef.current = marker
          }
        }
        return
      }

      // Initialize map instance
      const map = L.map(mapContainerRef.current, {
        center: initialCenter as [number, number],
        zoom: initialZoom,
        attributionControl: false,
        zoomControl: true,
      })

      mapInstanceRef.current = map

      // OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      // Add marker if coordinates exist
      if (hasValidCoords) {
        const marker = L.marker([currentCoords.lat, currentCoords.lng], {
          icon: customPinIcon,
          draggable: interactive,
        }).addTo(map)

        if (interactive && onLocationChange) {
          marker.on('dragend', async (e: any) => {
            const newPos = e.target.getLatLng()
            handleNewCoords(newPos.lat, newPos.lng)
          })
        }
        markerRef.current = marker
      }

      // Handle map click to reposition marker
      if (interactive && onLocationChange) {
        map.on('click', (e: any) => {
          const lat = e.latlng.lat
          const lng = e.latlng.lng

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          } else {
            const marker = L.marker([lat, lng], {
              icon: customPinIcon,
              draggable: true,
            }).addTo(map)

            marker.on('dragend', (evt: any) => {
              const pos = evt.target.getLatLng()
              handleNewCoords(pos.lat, pos.lng)
            })
            markerRef.current = marker
          }

          handleNewCoords(lat, lng)
        })
      }

      // Helper for reverse geocoding on user interaction
      async function handleNewCoords(lat: number, lng: number) {
        setCurrentCoords({ lat, lng })
        setGeocoding(true)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const detectedAddress = data?.display_name || ''
          onLocationChange?.(lat, lng, detectedAddress)
        } catch (err) {
          console.warn('Reverse geocoding error:', err)
          onLocationChange?.(lat, lng, '')
        } finally {
          setGeocoding(false)
        }
      }

      // Small delay to invalidate size after modal transitions
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize()
        }
      }, 200)
    })

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  }, [currentCoords?.lat, currentCoords?.lng, interactive])

  const hasCoords = currentCoords && !isNaN(currentCoords.lat) && !isNaN(currentCoords.lng)

  return (
    <div className="w-full mt-2 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
      <div className="relative">
        {/* Map Container */}
        <div ref={mapContainerRef} style={{ height, width: '100%', zIndex: 10 }} />

        {/* Geocoding overlay indicator */}
        {geocoding && (
          <div className="absolute top-2 left-2 z-20 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-medium text-blue-700 shadow flex items-center gap-1.5 border border-blue-200">
            <svg className="animate-spin h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Updating address from map pin...
          </div>
        )}

        {/* Interactive hint badge */}
        {interactive && hasCoords && (
          <div className="absolute bottom-2 left-2 z-20 bg-black/75 text-white text-[11px] px-2 py-0.5 rounded shadow pointer-events-none">
            💡 Click or drag pin to adjust location
          </div>
        )}
      </div>

      {/* Map Footer Bar with details and external link */}
      {hasCoords && (
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-600 gap-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-gray-700">
              📍 <span className="font-semibold">Lat:</span> {currentCoords.lat.toFixed(6)} |{' '}
              <span className="font-semibold">Lng:</span> {currentCoords.lng.toFixed(6)}
            </span>
          </div>

          <a
            href={`https://www.google.com/maps?q=${currentCoords.lat},${currentCoords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline inline-flex items-center gap-1"
          >
            Open in Google Maps
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </div>
  )
}

