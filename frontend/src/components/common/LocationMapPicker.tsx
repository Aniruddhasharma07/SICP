'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface LocationMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  disabled?: boolean;
}

export function LocationMapPicker({
  latitude,
  longitude,
  onLocationSelect,
  disabled = false,
}: LocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;

        if (!mapContainerRef.current || !isMounted) return;

        // Custom SVG Civic Marker Icon to prevent missing png 404s
        const civicIcon = L.divIcon({
          className: 'civic-map-marker',
          html: `
            <div style="position: relative; width: 32px; height: 42px; display: flex; align-items: center; justify-content: center;">
              <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
                <path d="M16 0C7.163 0 0 7.163 0 16C0 27.5 16 42 16 42C16 42 32 27.5 32 16C32 7.163 24.837 0 16 0Z" fill="#2563EB"/>
                <circle cx="16" cy="16" r="7" fill="white"/>
                <circle cx="16" cy="16" r="3.5" fill="#1D4ED8"/>
              </svg>
            </div>
          `,
          iconSize: [32, 42],
          iconAnchor: [16, 42],
          popupAnchor: [0, -40],
        });

        // If map already initialized, reuse
        if (!mapInstanceRef.current) {
          const initialCenter: [number, number] =
            latitude && longitude ? [latitude, longitude] : [20.5937, 78.9629]; // Default Central India
          const initialZoom = latitude && longitude ? 15 : 5;

          const map = L.map(mapContainerRef.current, {
            center: initialCenter,
            zoom: initialZoom,
            zoomControl: true,
            scrollWheelZoom: false, // Prevent accidental page scrolling
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map);

          // Click handler to drop or move pin
          map.on('click', (e: any) => {
            if (disabled) return;
            const lat = Math.round(e.latlng.lat * 100000) / 100000;
            const lng = Math.round(e.latlng.lng * 100000) / 100000;

            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
            } else {
              markerRef.current = L.marker([lat, lng], { icon: civicIcon }).addTo(map);
            }
            onLocationSelect(lat, lng);
          });

          // Place initial marker if coordinates exist
          if (latitude && longitude) {
            markerRef.current = L.marker([latitude, longitude], { icon: civicIcon }).addTo(map);
          }

          mapInstanceRef.current = map;
        }

        if (isMounted) setIsLoaded(true);
      } catch (err) {
        console.error('Failed to initialize Leaflet map picker:', err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update marker position and center map when latitude/longitude change from props
  useEffect(() => {
    if (!mapInstanceRef.current || latitude == null || longitude == null) return;

    const updateMap = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      const civicIcon = L.divIcon({
        className: 'civic-map-marker',
        html: `
          <div style="position: relative; width: 32px; height: 42px; display: flex; align-items: center; justify-content: center;">
            <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
              <path d="M16 0C7.163 0 0 7.163 0 16C0 27.5 16 42 16 42C16 42 32 27.5 32 16C32 7.163 24.837 0 16 0Z" fill="#2563EB"/>
              <circle cx="16" cy="16" r="7" fill="white"/>
              <circle cx="16" cy="16" r="3.5" fill="#1D4ED8"/>
            </svg>
          </div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -40],
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        markerRef.current = L.marker([latitude, longitude], { icon: civicIcon }).addTo(map);
      }

      map.setView([latitude, longitude], Math.max(map.getZoom(), 14), { animate: true });
    };

    updateMap();
  }, [latitude, longitude]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
      <div
        ref={mapContainerRef}
        className="w-full h-64 sm:h-72 z-0 cursor-crosshair"
        style={{ minHeight: '240px' }}
      />

      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-100/90 flex flex-col items-center justify-center gap-2 text-slate-500 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs font-medium">Loading interactive map...</span>
        </div>
      )}

      {/* Map Interaction Hint */}
      <div className="absolute bottom-2 left-2 right-2 sm:right-auto bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-xs text-xs text-slate-600 flex items-center gap-2 z-10">
        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>Click anywhere on the map to pin the exact location</span>
      </div>

      {latitude != null && longitude != null && (
        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 shadow-xs text-xs font-mono text-slate-700 z-10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
        </div>
      )}
    </div>
  );
}
