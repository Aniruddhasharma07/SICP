'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api-client';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MapPin, Layers, AlertTriangle, ShieldCheck, X, ExternalLink, Loader2, Compass, Filter, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface GeoPoint {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  latitude: number;
  longitude: number;
  district?: string | null;
  state?: string | null;
  affectedPopulation?: number | null;
  isSystemic: boolean;
}

interface GeoCluster {
  district: string;
  state: string;
  challengeCount: number;
  systemicCount: number;
  totalAffectedPopulation: number;
  topCategory: string;
  severityBreakdown: Record<string, number>;
  representativeCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface GeospatialMapProps {
  initialCategory?: string;
}

export function GeospatialMap({ initialCategory }: GeospatialMapProps) {
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [clusters, setClusters] = useState<GeoCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || '');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [activeItem, setActiveItem] = useState<{ type: 'point' | 'cluster'; data: GeoPoint | GeoCluster } | null>(null);
  const [viewMode, setViewMode] = useState<'clusters' | 'points'>('points');
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersLayerRef = useRef<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const catQuery = selectedCategory ? `?category=${encodeURIComponent(selectedCategory)}` : '';
      const [pointsRes, clustersRes] = await Promise.all([
        apiClient.request<{ points: GeoPoint[]; total: number }>(`/api/v1/geospatial/points${catQuery}`),
        apiClient.request<{ clusters: GeoCluster[]; totalDistricts: number }>(`/api/v1/geospatial/clusters${catQuery}`),
      ]);

      if (pointsRes.success && pointsRes.data) {
        setPoints(pointsRes.data.points);
      }
      if (clustersRes.success && clustersRes.data) {
        setClusters(clustersRes.data.clusters);
      }
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CATASTROPHIC':
        return '#ef4444'; // Red
      case 'SEVERE':
        return '#f97316'; // Orange
      case 'MODERATE':
        return '#f59e0b'; // Amber
      default:
        return '#10b981'; // Green
    }
  };

  // Filter points based on selected severity
  const filteredPoints = points.filter(p => {
    // Exclude points without valid coordinates
    if (p.latitude == null || p.longitude == null || isNaN(p.latitude) || isNaN(p.longitude)) {
      return false;
    }
    if (selectedSeverity !== 'ALL' && p.severity !== selectedSeverity) {
      return false;
    }
    return true;
  });

  // Filter clusters with representative coordinates
  const validClusters = clusters.filter(c =>
    c.representativeCoordinates &&
    c.representativeCoordinates.latitude != null &&
    c.representativeCoordinates.longitude != null &&
    !isNaN(c.representativeCoordinates.latitude) &&
    !isNaN(c.representativeCoordinates.longitude)
  );

  const hasValidGeographicData = (viewMode === 'points' && filteredPoints.length > 0) ||
                                (viewMode === 'clusters' && validClusters.length > 0);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    const initLeaflet = async () => {
      try {
        const L = (await import('leaflet')).default;

        if (!mapContainerRef.current) return;

        // If map exists, reuse or remove
        if (!mapInstanceRef.current) {
          const map = L.map(mapContainerRef.current, {
            center: [22.9734, 78.6569], // Central India
            zoom: 5,
            minZoom: 3,
            maxZoom: 18,
            zoomControl: true,
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map);

          markersLayerRef.current = L.layerGroup().addTo(map);
          mapInstanceRef.current = map;
        }

        if (isMounted) setMapLoaded(true);
      } catch (err) {
        console.error('Failed to initialize Leaflet map:', err);
      }
    };

    initLeaflet();

    return () => {
      isMounted = false;
    };
  }, []);

  // Render Markers whenever data or view mode changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const renderMarkers = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;
      const markersLayer = markersLayerRef.current;

      markersLayer.clearLayers();

      const coordsForBounds: [number, number][] = [];

      if (viewMode === 'points') {
        filteredPoints.forEach(point => {
          const color = getSeverityColor(point.severity);
          coordsForBounds.push([point.latitude, point.longitude]);

          const customIcon = L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
              <div style="
                background-color: ${color};
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 10px;
                cursor: pointer;
              ">
                ${point.isSystemic ? '★' : '•'}
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12],
          });

          const marker = L.marker([point.latitude, point.longitude], { icon: customIcon });

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4; padding: 2px;">
              <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">${point.title}</div>
              <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
                ${point.category} • ${point.district ? `${point.district}, ` : ''}${point.state || ''}
              </div>
              <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 8px;">
                <span style="background-color: ${color}; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px;">
                  ${point.severity}
                </span>
                <span style="background-color: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                  ${point.status}
                </span>
                ${point.isSystemic ? '<span style="background-color: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">SYSTEMIC</span>' : ''}
              </div>
              <a href="/challenges/${point.id}" style="color: #2563eb; font-weight: 600; text-decoration: none; font-size: 11px; display: inline-block;">
                View Problem Report &rarr;
              </a>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.on('click', () => {
            setActiveItem({ type: 'point', data: point });
          });

          marker.addTo(markersLayer);
        });
      } else {
        // District Clusters View
        validClusters.forEach(cluster => {
          if (!cluster.representativeCoordinates) return;
          const lat = cluster.representativeCoordinates.latitude;
          const lng = cluster.representativeCoordinates.longitude;
          coordsForBounds.push([lat, lng]);

          const isHeavy = cluster.challengeCount >= 3;
          const size = Math.min(48, Math.max(30, 24 + cluster.challengeCount * 4));

          const clusterIcon = L.divIcon({
            className: 'custom-leaflet-cluster',
            html: `
              <div style="
                background-color: ${isHeavy ? '#dc2626' : '#2563eb'};
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                border: 3px solid rgba(255,255,255,0.9);
                box-shadow: 0 3px 8px rgba(0,0,0,0.35);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 800;
                font-size: 11px;
                cursor: pointer;
              ">
                <span>${cluster.challengeCount}</span>
              </div>
            `,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            popupAnchor: [0, -size / 2],
          });

          const marker = L.marker([lat, lng], { icon: clusterIcon });

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4; padding: 2px;">
              <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                ${cluster.district}, ${cluster.state}
              </div>
              <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
                ${cluster.challengeCount} Active Problem Reports
                ${cluster.systemicCount > 0 ? `• <strong style="color: #dc2626;">${cluster.systemicCount} Systemic</strong>` : ''}
              </div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                Primary Focus: <strong>${cluster.topCategory}</strong>
              </div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 8px;">
                Est. Exposed: <strong>${cluster.totalAffectedPopulation.toLocaleString('en-IN')} citizens</strong>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.on('click', () => {
            setActiveItem({ type: 'cluster', data: cluster });
          });

          marker.addTo(markersLayer);
        });
      }

      // Automatically adjust view bounds if valid coordinates exist
      if (coordsForBounds.length > 0) {
        try {
          const bounds = L.latLngBounds(coordsForBounds);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        } catch {
          // Fallback safely
        }
      }
    };

    renderMarkers();
  }, [filteredPoints, validClusters, viewMode, mapLoaded]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
      {/* Map Controls Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Live Geospatial Problem Hotspots</h3>
            <p className="text-xs text-slate-500">
              Interactive OpenStreetMap rendering citizen-reported infrastructure failures with ground GPS coordinates
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 text-xs font-medium">
            <button
              onClick={() => setViewMode('points')}
              className={`px-3 py-1 rounded-md transition ${
                viewMode === 'points' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Report Points ({filteredPoints.length})
            </button>
            <button
              onClick={() => setViewMode('clusters')}
              className={`px-3 py-1 rounded-md transition ${
                viewMode === 'clusters' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              District Clusters ({validClusters.length})
            </button>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="h-8 text-xs rounded-lg border border-slate-300 bg-white px-2.5 text-slate-700 font-medium"
          >
            <option value="">All Categories</option>
            <option value="Water Supply">Water Supply</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Roads & Transport">Roads & Transport</option>
            <option value="Healthcare Access">Healthcare</option>
            <option value="Education Infrastructure">Education</option>
            <option value="Electricity & Power">Electricity & Power</option>
            <option value="Agriculture & Irrigation">Agriculture</option>
            <option value="Air Quality">Environment & Flood</option>
          </select>

          {/* Severity Filter */}
          {viewMode === 'points' && (
            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              className="h-8 text-xs rounded-lg border border-slate-300 bg-white px-2.5 text-slate-700 font-medium"
            >
              <option value="ALL">All Severities</option>
              <option value="CATASTROPHIC">Catastrophic (Red)</option>
              <option value="SEVERE">Severe (Orange)</option>
              <option value="MODERATE">Moderate (Amber)</option>
              <option value="LOW">Minor (Green)</option>
            </select>
          )}

          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Map Content & Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-[460px]">
        {/* Real Leaflet Map Container */}
        <div className="lg:col-span-2 relative bg-slate-100 min-h-[440px]">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span>Loading live geocoded challenge points...</span>
              </div>
            </div>
          )}

          {/* Map canvas */}
          <div ref={mapContainerRef} className="w-full h-full min-h-[440px] z-0" />

          {/* Geospatial Honesty Notice Fallback */}
          {!loading && !hasValidGeographicData && (
            <div className="absolute inset-0 bg-slate-50/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <Compass className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Not enough location data for a reliable heatmap.
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-3">
                Zero points are fabricated. When citizens report issues with GPS coordinates or district jurisdiction, authentic pins will appear automatically on this OpenStreetMap view.
              </p>
              <Link href="/challenges/new">
                <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  <MapPin className="w-3.5 h-3.5 mr-1.5" />
                  Report Problem with Location
                </Button>
              </Link>
            </div>
          )}

          {/* Map Legend */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-2.5 shadow-md z-[500] text-[11px] space-y-1">
            <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wider mb-1">
              {viewMode === 'points' ? 'Severity Legend' : 'Cluster Density'}
            </div>
            {viewMode === 'points' ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-slate-600">Catastrophic</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-slate-600">Severe</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-600">Moderate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Minor</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-600 text-[9px] text-white flex items-center justify-center font-bold">!</span>
                  <span>High Density (&gt;= 3 reports)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600 text-[9px] text-white flex items-center justify-center font-bold">1</span>
                  <span>Local Cluster</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Item / Inspector Side Panel */}
        <div className="p-4 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col justify-between overflow-y-auto max-h-[460px]">
          {activeItem ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  {activeItem.type === 'point' ? 'Selected Challenge' : 'District Summary'}
                </span>
                <button
                  onClick={() => setActiveItem(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeItem.type === 'point' ? (
                (() => {
                  const pt = activeItem.data as GeoPoint;
                  return (
                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {pt.category}
                          </Badge>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                            style={{ backgroundColor: getSeverityColor(pt.severity) }}
                          >
                            {pt.severity}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {pt.title}
                        </h4>
                      </div>

                      <div className="space-y-1 text-slate-600">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{pt.district ? `${pt.district}, ` : ''}${pt.state || 'India'}</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          Coordinates: {pt.latitude.toFixed(4)}°N, {pt.longitude.toFixed(4)}°E
                        </div>
                        <div className="text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                          Status: <strong className="text-slate-800">{pt.status}</strong>
                          {pt.affectedPopulation && (
                            <span className="block mt-0.5">
                              Exposed: <strong>{pt.affectedPopulation.toLocaleString('en-IN')} citizens</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <Link href={`/challenges/${pt.id}`}>
                        <Button size="sm" className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                          <span>Open Problem Docket</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const cl = activeItem.data as GeoCluster;
                  return (
                    <div className="space-y-2.5">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {cl.district}, {cl.state}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Municipal Administrative Hotspot
                        </span>
                      </div>

                      <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Total Challenges:</span>
                          <span className="font-bold text-slate-800">{cl.challengeCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Systemic Incidents:</span>
                          <span className="font-bold text-red-600">{cl.systemicCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Population Footprint:</span>
                          <span className="font-bold text-slate-800">
                            {cl.totalAffectedPopulation.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Primary Domain:</span>
                          <span className="font-bold text-blue-700">{cl.topCategory}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Click on specific pin markers on the map to inspect individual community reports in this district.
                      </p>
                    </div>
                  );
                })()
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-2">
              <Compass className="w-8 h-8 text-slate-300" />
              <div className="text-xs font-semibold text-slate-600">Explore Ground Hotspots</div>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Click any marker pin on the map to inspect its verified coordinates, severity tier, and civic challenge docket.
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Powered by Leaflet &amp; OpenStreetMap</span>
            <span>Zero Fabricated Data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
