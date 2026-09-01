/**
 * Market & Zones - Interactive Google Maps & Heatmap Studio
 *
 * Implements:
 * - Real Google Maps high-resolution slippy tile canvas (Roadmap, Satellite Hybrid, Dark)
 * - Mouse drag-to-pan & mouse scroll wheel zoom interaction
 * - Riyadh district polygon overlays with dynamic heat gradients
 * - Interactive Google Maps pins with status badges & ripple effects
 * - Floating inspector card with instant driver steering & recruitment actions
 * - Regional live sidebar with search and quick-pan
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  MapPin,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  Flame,
  AlertTriangle,
  Users,
  Navigation,
  Search,
  Layers,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Zone } from '@/data/types'
import { ABSENT, formatPercent, type Translate } from '@/lib'

// Real World Latitude / Longitude coordinates for Google Maps API Polygons & Markers
const RIYADH_ZONE_LAT_LNG: Record<
  string,
  { lat: number; lng: number; path: Array<{ lat: number; lng: number }> }
> = {
  'ZONE-01': {
    lat: 24.838,
    lng: 46.685,
    path: [
      { lat: 24.855, lng: 46.660 },
      { lat: 24.868, lng: 46.695 },
      { lat: 24.838, lng: 46.725 },
      { lat: 24.818, lng: 46.680 },
    ],
  },
  'ZONE-02': {
    lat: 24.805,
    lng: 46.645,
    path: [
      { lat: 24.820, lng: 46.620 },
      { lat: 24.840, lng: 46.655 },
      { lat: 24.810, lng: 46.675 },
      { lat: 24.785, lng: 46.635 },
    ],
  },
  'ZONE-03': {
    lat: 24.815,
    lng: 46.690,
    path: [
      { lat: 24.830, lng: 46.665 },
      { lat: 24.850, lng: 46.700 },
      { lat: 24.820, lng: 46.720 },
      { lat: 24.800, lng: 46.680 },
    ],
  },
  'ZONE-04': {
    lat: 24.668,
    lng: 46.735,
    path: [
      { lat: 24.685, lng: 46.710 },
      { lat: 24.705, lng: 46.745 },
      { lat: 24.675, lng: 46.770 },
      { lat: 24.650, lng: 46.730 },
    ],
  },
  'ZONE-05': {
    lat: 24.760,
    lng: 46.665,
    path: [
      { lat: 24.775, lng: 46.640 },
      { lat: 24.795, lng: 46.675 },
      { lat: 24.765, lng: 46.700 },
      { lat: 24.740, lng: 46.660 },
    ],
  },
  'ZONE-06': {
    lat: 24.805,
    lng: 46.755,
    path: [
      { lat: 24.820, lng: 46.730 },
      { lat: 24.840, lng: 46.770 },
      { lat: 24.810, lng: 46.795 },
      { lat: 24.785, lng: 46.755 },
    ],
  },
}

export interface CityMetric {
  name: string
  zonesCount: number
  activeUsers: number
  failureRate: number | null
  active: boolean
}

const CITIES_DATA: CityMetric[] = [
  { name: 'Riyadh', zonesCount: 6, activeUsers: 5420, failureRate: 45, active: true },
  { name: 'Jeddah', zonesCount: 0, activeUsers: 840, failureRate: null, active: false },
  { name: 'Dammam', zonesCount: 0, activeUsers: 620, failureRate: null, active: false },
  { name: 'Makkah', zonesCount: 0, activeUsers: 410, failureRate: null, active: false },
  { name: 'Medina', zonesCount: 0, activeUsers: 330, failureRate: null, active: false },
]

export interface ZonesMapViewProps {
  zones: readonly Zone[]
  onSteer: (zone: Zone) => void
  onQueueRecruitment: (zone: Zone) => void
  language?: 'en' | 'ar'
  /**
   * **§11.2 reaches the map.** The table's two row actions are disabled in
   * place with a stated reason when the operator's role cannot act or the
   * shell is frozen; the inspector card's copies of the same two actions were
   * not, so the map was a way around the permission the table enforces. Passed
   * in rather than re-derived, so the two surfaces cannot disagree.
   */
  canWrite: boolean
  t: Translate
}

export function ZonesMapView({
  zones,
  onSteer,
  onQueueRecruitment,
  language = 'en',
  canWrite,
  t,
}: ZonesMapViewProps) {
  const [selectedCity, setSelectedCity] = useState<string>('Riyadh')
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>('ZONE-01')
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null)
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true)
  const [heatmapMetric, setHeatmapMetric] = useState<'ratio' | 'failure' | 'demand'>('ratio')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sideTab, setSideTab] = useState<'zones' | 'cities'>('zones')
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'dark'>('standard')

  // Map coordinates projection & pan/zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(12)
  const [centerCoord, setCenterCoord] = useState<{ lat: number; lng: number }>({
    lat: 24.774265,
    lng: 46.683884,
  })
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  })

  // Attach mouse scroll wheel zoom interaction (with non-passive listener to prevent page scrolling)
  useEffect(() => {
    const el = mapContainerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.deltaY < 0) {
        setZoomLevel((prev) => Math.min(prev + 1, 15))
      } else if (e.deltaY > 0) {
        setZoomLevel((prev) => Math.max(prev - 1, 11))
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Web Mercator Projection helpers
  const project = (lat: number, lng: number, zoom: number) => {
    const siny = Math.sin((lat * Math.PI) / 180)
    const clampedSiny = Math.min(Math.max(siny, -0.9999), 0.9999)
    const scale = 256 * Math.pow(2, zoom)
    const x = scale * (0.5 + lng / 360)
    const y = scale * (0.5 - Math.log((1 + clampedSiny) / (1 - clampedSiny)) / (4 * Math.PI))
    return { x, y }
  }

  // Selected Zone object
  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) ?? zones[0] ?? null,
    [zones, selectedZoneId],
  )

  // Filtered zones for search
  const filteredZones = useMemo(
    () =>
      zones.filter(
        (z) =>
          z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          z.city.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [zones, searchQuery],
  )

  // Pan & Zoom drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left mouse button
    if (e.button !== 0) return
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPanOffset({
      x: dragStartRef.current.startPanX + dx,
      y: dragStartRef.current.startPanY + dy,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Heatmap color generator
  const getZoneHeatColor = (zone: Zone) => {
    const ratio = zone.demandSupplyRatio ?? 0
    if (zone.starved || zone.failureRate >= 65 || ratio >= 3.0) {
      return {
        fill: 'rgba(239, 68, 68, 0.42)', // Red Heat
        stroke: '#ef4444',
        text: 'text-rose-600 dark:text-rose-400',
        badgeBg: 'bg-rose-500',
        glow: 'drop-shadow(0 0 16px rgba(239, 68, 68, 0.65))',
      }
    }
    if (zone.failureRate >= 40 || ratio >= 2.0) {
      return {
        fill: 'rgba(245, 158, 11, 0.38)', // Amber Heat
        stroke: '#f59e0b',
        text: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-500',
        glow: 'drop-shadow(0 0 14px rgba(245, 158, 11, 0.55))',
      }
    }
    return {
      fill: 'rgba(16, 185, 129, 0.28)', // Green / Healthy
      stroke: '#10b981',
      text: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-500',
      glow: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.45))',
    }
  }

  // Calculate visible Google Maps tile grid
  const mapCenterPx = project(centerCoord.lat, centerCoord.lng, zoomLevel)
  const containerW = 900
  const containerH = 620
  const viewLeft = mapCenterPx.x - containerW / 2 - panOffset.x
  const viewTop = mapCenterPx.y - containerH / 2 - panOffset.y

  const minTileX = Math.floor(viewLeft / 256) - 1
  const maxTileX = Math.floor((viewLeft + containerW) / 256) + 1
  const minTileY = Math.floor(viewTop / 256) - 1
  const maxTileY = Math.floor((viewTop + containerH) / 256) + 1

  const tiles = []
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      let tileUrl = `https://mt1.google.com/vt/lyrs=m&x=${tx}&y=${ty}&z=${zoomLevel}`
      if (mapStyle === 'satellite') {
        tileUrl = `https://mt1.google.com/vt/lyrs=y&x=${tx}&y=${ty}&z=${zoomLevel}`
      } else if (mapStyle === 'dark') {
        tileUrl = `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/${zoomLevel}/${tx}/${ty}.png`
      }
      tiles.push({
        key: `${zoomLevel}-${tx}-${ty}`,
        url: tileUrl,
        left: tx * 256 - viewLeft,
        top: ty * 256 - viewTop,
      })
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-[660px] w-full gap-3 overflow-hidden font-sans">
      {/* ── Main Workspace: Google Maps Canvas + Intelligence Sidebar ── */}
      <div className="flex flex-1 min-h-[620px] gap-3">
        {/* ── Real Google Map Canvas ──────────────────────────────────────── */}
        <div
          ref={mapContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={cn(
            'flex-1 relative rounded-2xl border border-border/80 overflow-hidden shadow-md select-none transition-colors cursor-grab active:cursor-grabbing bg-[#e5e3df]',
            mapStyle === 'dark' && 'bg-[#1a1d24]',
            mapStyle === 'satellite' && 'bg-[#15232d]',
          )}
        >
          {/* Real Google Maps Slippy Tile Layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {tiles.map((tile) => (
              <img
                key={tile.key}
                src={tile.url}
                alt=""
                className="absolute w-[256px] h-[256px] select-none"
                style={{
                  left: `${tile.left}px`,
                  top: `${tile.top}px`,
                }}
                loading="eager"
                draggable={false}
              />
            ))}
          </div>

          {/* SVG Overlay: District Polygons & Interactive Google Pins */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {/* Riyadh District Heat Polygons */}
            {zones.map((zone) => {
              const geo = RIYADH_ZONE_LAT_LNG[zone.id]
              if (!geo) return null

              const isSelected = selectedZoneId === zone.id
              const isHovered = hoveredZoneId === zone.id
              const colors = getZoneHeatColor(zone)

              const pointsStr = geo.path
                .map((p) => {
                  const pt = project(p.lat, p.lng, zoomLevel)
                  const sx = pt.x - viewLeft
                  const sy = pt.y - viewTop
                  return `${sx},${sy}`
                })
                .join(' ')

              return (
                <polygon
                  key={`poly-${zone.id}`}
                  points={pointsStr}
                  fill={
                    isSelected || isHovered
                      ? 'rgba(59, 130, 246, 0.40)'
                      : showHeatmap
                        ? colors.fill
                        : 'rgba(59, 130, 246, 0.15)'
                  }
                  stroke={isSelected ? '#2563eb' : colors.stroke}
                  strokeWidth={isSelected ? 3.5 : 2}
                  strokeDasharray={zone.starved ? '5,4' : undefined}
                  className="pointer-events-auto cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedZoneId(zone.id)}
                  onMouseEnter={() => setHoveredZoneId(zone.id)}
                  onMouseLeave={() => setHoveredZoneId(null)}
                />
              )
            })}

            {/* Riyadh District Custom Google Markers */}
            {zones.map((zone) => {
              const geo = RIYADH_ZONE_LAT_LNG[zone.id]
              if (!geo) return null

              const pt = project(geo.lat, geo.lng, zoomLevel)
              const sx = pt.x - viewLeft
              const sy = pt.y - viewTop

              const isSelected = selectedZoneId === zone.id
              const isHovered = hoveredZoneId === zone.id
              const colors = getZoneHeatColor(zone)

              return (
                <g
                  key={`marker-${zone.id}`}
                  className={cn(
                    'pointer-events-auto cursor-pointer group transition-all duration-150',
                    isHovered && 'scale-105',
                  )}
                  onClick={() => setSelectedZoneId(zone.id)}
                  onMouseEnter={() => setHoveredZoneId(zone.id)}
                  onMouseLeave={() => setHoveredZoneId(null)}
                >
                  {/* Outer Pulsing Radar Ring for Starved Zones */}
                  {zone.starved && (
                    <circle
                      cx={sx}
                      cy={sy}
                      r={isSelected ? 32 : 22}
                      fill="rgba(239, 68, 68, 0.3)"
                      stroke="#ef4444"
                      strokeWidth="2"
                      className="animate-ping"
                      style={{ transformOrigin: `${sx}px ${sy}px`, animationDuration: '2.5s' }}
                    />
                  )}

                  {/* Google Maps Pin Teardrop */}
                  <g transform={`translate(${sx - 16}, ${sy - 40})`}>
                    <path
                      d="M 16 0 C 7.16 0 0 7.16 0 16 C 0 28 16 42 16 42 C 16 42 32 28 32 16 C 32 7.16 24.84 0 16 0 Z"
                      fill={colors.stroke}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      style={{ filter: isSelected ? colors.glow : 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' }}
                    />
                    <circle cx="16" cy="16" r="6" fill="#ffffff" />
                  </g>

                  {/* District Name Label */}
                  <g transform={`translate(${sx}, ${sy + 12})`}>
                    <rect
                      x="-60"
                      y="0"
                      width="120"
                      height="28"
                      rx="14"
                      fill={mapStyle === 'dark' ? '#1e293b' : '#ffffff'}
                      stroke={isSelected ? '#3b82f6' : mapStyle === 'dark' ? '#334155' : '#cbd5e1'}
                      strokeWidth={isSelected ? 2.5 : 1}
                      style={{ filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.22))' }}
                    />
                    <text
                      x="0"
                      y="18"
                      fontSize="12"
                      textAnchor="middle"
                      fontWeight="700"
                      fill={mapStyle === 'dark' ? '#f8fafc' : '#0f172a'}
                    >
                      {zone.name}
                    </text>
                  </g>

                  {/* Floating Metric Pill */}
                  <g transform={`translate(${sx}, ${sy - 48})`}>
                    <rect
                      x="-30"
                      y="0"
                      width="60"
                      height="20"
                      rx="10"
                      fill={colors.stroke}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
                    />
                    <text
                      x="0"
                      y="14"
                      fontSize="11"
                      textAnchor="middle"
                      fontWeight="800"
                      fill="#ffffff"
                    >
                      {heatmapMetric === 'ratio'
                        ? zone.demandSupplyRatio != null
                          ? `${Number(zone.demandSupplyRatio.toFixed(1))}×`
                          : '—'
                        : heatmapMetric === 'failure'
                          ? `${zone.failureRate}%`
                          : `${zone.demand} req`}
                    </text>
                  </g>
                </g>
              )
            })}
          </svg>

          {/* ── Top-Left Floating Controls: City Title & Heatmap & Metrics ── */}
          <div className="absolute top-3 start-3 z-20 flex items-center gap-2 p-1.5 rounded-xl bg-card/95 backdrop-blur-md border border-border/80 shadow-lg">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-xs">
              <Compass className="size-3.5" />
              <span>{selectedCity}</span>
            </div>

            {/* Heatmap Toggle */}
            <button
              type="button"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                showHeatmap
                  ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 shadow-2xs'
                  : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <Flame className={cn('size-3.5', showHeatmap ? 'fill-rose-500 text-rose-500' : '')} />
              <span>Heatmap {showHeatmap ? 'ON' : 'OFF'}</span>
            </button>

            {/* Metric Selector */}
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60 text-xs">
              {(['ratio', 'failure', 'demand'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setHeatmapMetric(m)}
                  className={cn(
                    'px-2.5 py-1 rounded text-2xs font-semibold transition-all',
                    heatmapMetric === m
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'ratio' ? 'Demand Ratio' : m === 'failure' ? 'Failure Rate' : 'Requests'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Top-Right Floating Layer Switcher: Roadmap / Satellite / Dark ── */}
          <div className="absolute top-3 end-3 z-20 flex items-center gap-1 p-1 rounded-xl bg-card/95 backdrop-blur-md border border-border/80 shadow-lg">
            <button
              type="button"
              onClick={() => setMapStyle('standard')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1',
                mapStyle === 'standard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Layers className="size-3.5" />
              <span>Roadmap</span>
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('satellite')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                mapStyle === 'satellite'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('dark')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                mapStyle === 'dark'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Dark
            </button>
          </div>

          {/* ── Bottom-Right Floating Zoom & Navigation Controls ── */}
          <div className="absolute bottom-4 end-4 z-20 flex flex-col gap-1.5 bg-card/95 backdrop-blur-md p-1 rounded-xl border border-border/80 shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg hover:bg-muted font-bold text-foreground"
              onClick={() => setZoomLevel((prev) => Math.min(prev + 1, 15))}
              title="Zoom in (Scroll Wheel Up)"
            >
              <ZoomIn className="size-4" />
            </Button>
            <div className="h-px bg-border/80 w-full" />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg hover:bg-muted font-bold text-foreground"
              onClick={() => setZoomLevel((prev) => Math.max(prev - 1, 11))}
              title="Zoom out (Scroll Wheel Down)"
            >
              <ZoomOut className="size-4" />
            </Button>
            <div className="h-px bg-border/80 w-full" />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg hover:bg-muted text-foreground"
              onClick={() => {
                setZoomLevel(12)
                setPanOffset({ x: 0, y: 0 })
                setSelectedZoneId('ZONE-01')
              }}
              title="Reset to Riyadh View"
            >
              <Maximize2 className="size-4" />
            </Button>
          </div>

          {/* ── Bottom-Left Google Logo & Heat Legend ── */}
          <div className="absolute bottom-3 start-3 z-20 flex items-center gap-3 select-none">
            {/* Google Watermark */}
            <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-lg border border-border shadow-xs text-xs">
              <span className="font-black text-sm tracking-tight flex items-center">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
              </span>
              <span className="text-2xs text-muted-foreground font-semibold">Maps</span>
              <span className="text-3xs text-muted-foreground/80 ms-1">©2026</span>
            </div>

            {/* Heat Intensity Legend */}
            <div className="flex items-center gap-3 p-2 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-xs text-xs">
              <div className="flex items-center gap-1.5 text-2xs font-semibold text-rose-600 dark:text-rose-400">
                <span className="size-2.5 rounded-full bg-rose-500 shadow-2xs" />
                <span>Starved (≥ 3.0×)</span>
              </div>
              <div className="flex items-center gap-1.5 text-2xs font-semibold text-amber-600 dark:text-amber-400">
                <span className="size-2.5 rounded-full bg-amber-500 shadow-2xs" />
                <span>Watch (≥ 2.0×)</span>
              </div>
              <div className="flex items-center gap-1.5 text-2xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-2.5 rounded-full bg-emerald-500 shadow-2xs" />
                <span>Healthy</span>
              </div>
            </div>
          </div>

          {/* ── Active District Floating Inspector Card (Right Side Overlay) ── */}
          {selectedZone && (
            <div className="absolute top-16 end-3 z-20 w-80 p-4 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl flex flex-col gap-3 animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getZoneHeatColor(selectedZone).stroke }}
                    />
                    <h3 className="text-base font-bold text-foreground tracking-tight">{selectedZone.name}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{selectedZone.city} District</span>
                </div>

                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider',
                    selectedZone.starved
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                  )}
                >
                  {selectedZone.starved ? 'Starved' : 'Normal'}
                </span>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                <div>
                  <span className="text-2xs font-semibold text-muted-foreground block">Demand / Supply</span>
                  <span className="text-base font-black text-foreground">
                    {selectedZone.demandSupplyRatio === null
                      ? ABSENT
                      : `${Number(selectedZone.demandSupplyRatio.toFixed(1))}×`}
                  </span>
                  <span className="text-3xs text-muted-foreground block font-medium">
                    {selectedZone.demand} req : {selectedZone.supply} cap
                  </span>
                </div>

                <div>
                  <span className="text-2xs font-semibold text-muted-foreground block">Failure Rate</span>
                  <span className="text-base font-black text-foreground">
                    {formatPercent(selectedZone.failureRate, language)}
                  </span>
                  <span className="text-3xs text-muted-foreground block font-medium">
                    {selectedZone.failures30d} unserved
                  </span>
                </div>
              </div>

              {/* Alert Notification */}
              {selectedZone.captainsNeeded > 0 && (
                <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 font-semibold">
                  <AlertTriangle className="size-4 shrink-0 text-rose-500" />
                  <span>{selectedZone.captainsNeeded} captains needed immediately</span>
                </div>
              )}

              {/* Instant Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="default"
                  size="xs"
                  className="flex-1 text-xs gap-1.5 font-bold shadow-xs h-8"
                  disabled={!canWrite || selectedZone.activeSteerOffer !== null}
                  title={
                    selectedZone.activeSteerOffer !== null
                      ? t('zones.steer.blocked.live')
                      : canWrite
                        ? undefined
                        : t('zones.blocked.permission')
                  }
                  onClick={() => onSteer(selectedZone)}
                >
                  <Navigation className="size-3.5" />
                  <span>{t('zones.action.steer')}</span>
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  className="flex-1 text-xs gap-1.5 font-bold border border-border/80 h-8"
                  disabled={!canWrite || selectedZone.recruitmentQueuedAt !== null}
                  title={
                    selectedZone.recruitmentQueuedAt !== null
                      ? t('zones.recruit.blocked.queued')
                      : canWrite
                        ? undefined
                        : t('zones.blocked.permission')
                  }
                  onClick={() => onQueueRecruitment(selectedZone)}
                >
                  <Users className="size-3.5" />
                  <span>{t('zones.action.recruit')}</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Intelligence Sidebar (Districts & Regional Breakdown) ── */}
        <aside className="w-80 shrink-0 rounded-2xl border border-border/80 bg-card shadow-sm flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-border/80 flex flex-col gap-2.5 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-4 text-blue-600" />
                <span className="text-xs font-bold text-foreground">Demand Intelligence</span>
              </div>
              <span className="text-3xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold uppercase tracking-wider">
                Live Feed
              </span>
            </div>

            {/* Sub-tab Switcher: Riyadh Zones vs Kingdom Cities */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setSideTab('zones')}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center',
                  sideTab === 'zones'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Riyadh Zones ({zones.length})
              </button>
              <button
                type="button"
                onClick={() => setSideTab('cities')}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center',
                  sideTab === 'cities'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Kingdom Cities ({CITIES_DATA.length})
              </button>
            </div>

            {/* Quick Filter Search */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search district name..."
                className="h-8 ps-8 text-xs bg-card"
              />
            </div>
          </div>

          {/* List of Zones or Cities */}
          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2 max-h-[480px]">
            {sideTab === 'zones' ? (
              filteredZones.map((zone) => {
                const isSelected = selectedZoneId === zone.id
                const colors = getZoneHeatColor(zone)
                return (
                  <button
                    key={zone.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedZoneId(zone.id)
                      const geo = RIYADH_ZONE_LAT_LNG[zone.id]
                      if (geo) {
                        setCenterCoord({ lat: geo.lat, lng: geo.lng })
                        setPanOffset({ x: 0, y: 0 })
                      }
                    }}
                    className={cn(
                      'w-full text-start p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 group',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected
                        ? 'bg-blue-50/70 border-blue-400 dark:bg-blue-950/40 dark:border-blue-700 shadow-xs ring-1 ring-blue-500/20'
                        : 'bg-card border-border/80 hover:bg-muted/40 hover:border-border',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: colors.stroke }}
                        />
                        <span className="text-xs font-bold text-foreground group-hover:text-blue-600">
                          {zone.name}
                        </span>
                      </div>

                      <span className={cn('text-xs font-black tabular-nums', colors.text)}>
                        {zone.demandSupplyRatio != null
                          ? `${Number(zone.demandSupplyRatio.toFixed(1))}×`
                          : '—'}
                      </span>
                    </div>

                    {/* Progress representation */}
                    <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(zone.failureRate, 100)}%`,
                          backgroundColor: colors.stroke,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-2xs text-muted-foreground font-medium">
                      <span>{zone.demand} req • {zone.supply} cap</span>
                      <span className="font-bold">{zone.failureRate}% failure</span>
                    </div>
                  </button>
                )
              })
            ) : (
              CITIES_DATA.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  aria-pressed={selectedCity === city.name}
                  onClick={() => setSelectedCity(city.name)}
                  className={cn(
                    'w-full text-start p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 group',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selectedCity === city.name
                      ? 'bg-blue-50/70 border-blue-400 dark:bg-blue-950/40 dark:border-blue-700 shadow-xs'
                      : 'bg-card border-border/80 hover:bg-muted/40 hover:border-border',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold text-foreground">{city.name}</span>
                    </div>

                    <span className="text-xs font-black tabular-nums text-foreground">
                      {city.activeUsers.toLocaleString()}
                    </span>
                  </div>

                  <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${(city.activeUsers / 5420) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-2xs text-muted-foreground font-medium">
                    <span>{city.zonesCount > 0 ? `${city.zonesCount} zones tracked` : 'Not launched'}</span>
                    <span>{city.failureRate !== null ? `${city.failureRate}% failure` : '—'}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* **The "View full analytics" control that stood here is DELETED,
              not wired, and the reason is a ruling rather than an oversight.**

              The full analytics for Market & Zones is the seeded
              `management-zones` metric board - ten tiles and the
              `zones.citiesHealth` breakdown (`fixtures/metrics.ts:1250`,
              `:2953`). **R4-6b makes the table primary and that board does not
              mount**: `routes.tsx:338` returns `ZonesScreen` for this sub-tab
              before the `METRIC_BOARD_SUB_TABS` branch is reached, and the row
              declares `detailRoutes: []` and `views: []`
              (`fixtures/routeTable.ts:201`). There is no page to go to, and the
              four boards that DO mount answer other questions - sending a click
              that reads "zones, this district, this city" to CSAT and retention
              cohorts is a mismatch, not a destination.

              So the control is removed rather than pointed somewhere plausible.
              Restoring it is a design decision with a prerequisite: either the
              zones board mounts somewhere, or this screen stops hiding its own
              analytics half (see `ZonesScreen`'s `isTestEnv` note).

              The caption's period is corrected with it: every zone measure in
              scope here is 30-day - `failures30d`, `unservedRequests30d`,
              `subMomentum` - and the strip claimed seven. */}
          <div className="p-3 border-t border-border/80 bg-muted/20 flex items-center text-xs">
            <span className="text-2xs text-muted-foreground font-medium">Last 30 days</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
