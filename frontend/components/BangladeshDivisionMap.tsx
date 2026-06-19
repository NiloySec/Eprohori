'use client'
import { useEffect, useRef } from 'react'
import type { DivisionData, DistrictData } from '@/lib/api'

// Division centroids
const DIVISION_META: { en: string; bn: string; lat: number; lng: number }[] = [
  { en: 'dhaka',      bn: 'ঢাকা',      lat: 23.8103, lng: 90.4125 },
  { en: 'chittagong', bn: 'চট্টগ্রাম', lat: 22.3569, lng: 91.7832 },
  { en: 'rajshahi',   bn: 'রাজশাহী',   lat: 24.3745, lng: 88.6042 },
  { en: 'khulna',     bn: 'খুলনা',     lat: 22.8456, lng: 89.5403 },
  { en: 'barisal',    bn: 'বরিশাল',    lat: 22.7010, lng: 90.3535 },
  { en: 'sylhet',     bn: 'সিলেট',     lat: 24.8949, lng: 91.8687 },
  { en: 'rangpur',    bn: 'রংপুর',     lat: 25.7439, lng: 89.2752 },
  { en: 'mymensingh', bn: 'ময়মনসিংহ', lat: 24.7471, lng: 90.4203 },
]

function getCircleColor(count: number) {
  if (count >= 16) return '#ff4444'
  if (count >= 6)  return '#f59e0b'
  if (count >= 1)  return '#22c55e'
  return '#3b82f6'
}

function getCircleRadius(count: number) {
  if (count >= 200) return 38
  if (count >= 100) return 30
  if (count >= 50)  return 24
  if (count >= 16)  return 20
  if (count >= 6)   return 16
  if (count >= 1)   return 13
  return 10
}

interface Props {
  divisions: DivisionData[]
  districts?: DistrictData[]
  selectedDivision: string | null
  onSelectDivision: (div: DivisionData | null) => void
}

// Backend division names → frontend division_en slugs
const DIV_SLUG: Record<string, string> = {
  dhaka: 'dhaka', chittagong: 'chittagong', chattogram: 'chittagong',
  sylhet: 'sylhet', rajshahi: 'rajshahi', khulna: 'khulna',
  barishal: 'barisal', barisal: 'barisal',
  mymensingh: 'mymensingh', rangpur: 'rangpur',
}

function getDistrictRadius(count: number) {
  if (count >= 50) return 22
  if (count >= 20) return 17
  if (count >= 10) return 14
  if (count >= 5)  return 11
  if (count >= 1)  return 9
  return 7
}

// District-level circles: hover tooltip, click selects the parent division.
function buildDistrictCircles(
  L: any,
  group: any,
  districts: DistrictData[],
  divisions: DivisionData[],
  onSelectRef: React.MutableRefObject<(div: DivisionData | null) => void>
) {
  group.clearLayers()

  districts.forEach(d => {
    const color  = getCircleColor(d.threats)
    const radius = getDistrictRadius(d.threats)
    const slug   = DIV_SLUG[d.division.toLowerCase()] ?? d.division.toLowerCase()
    const divData = divisions.find(x => x.division_en === slug) ?? null

    const circle = L.circleMarker([d.lat, d.lng], {
      radius,
      fillColor: color,
      color: '#060d1a',
      weight: 2,
      fillOpacity: 0.85,
    })

    circle.bindTooltip(
      `<div style="background:#0d1829;border:1px solid rgba(0,229,196,0.3);border-radius:8px;padding:8px 12px">
        <div style="color:#00e5c4;font-weight:700;font-size:13px">${d.name_bn} (${d.name})</div>
        <div style="color:#64748b;font-size:11px">হুমকি: <span style="color:${color};font-weight:700">${d.threats}</span></div>
      </div>`,
      { className: 'leaflet-tooltip-dark', direction: 'top', offset: [0, -radius], sticky: false }
    )

    circle.on('click', () => { onSelectRef.current(divData) })
    group.addLayer(circle)
  })
}

// Rebuild circles inside the given LayerGroup, clearing old ones first.
// Uses onSelectRef so the callback is always current without needing to
// be a dependency of the effect that calls this.
function buildCircles(
  L: any,
  group: any,
  divisions: DivisionData[],
  onSelectRef: React.MutableRefObject<(div: DivisionData | null) => void>
) {
  group.clearLayers()

  DIVISION_META.forEach(meta => {
    const data  = divisions.find(d => d.division_en === meta.en) ?? null
    const count = data?.threat_count ?? 0
    const color = getCircleColor(count)
    const radius = getCircleRadius(count)

    const circle = L.circleMarker([meta.lat, meta.lng], {
      radius,
      fillColor: color,
      color: '#060d1a',
      weight: 2,
      fillOpacity: 0.85,
    })

    circle.bindPopup(`
      <div style="background:#0d1829;border:1px solid rgba(0,229,196,0.3);border-radius:8px;padding:10px 14px;min-width:140px">
        <div style="color:#00e5c4;font-weight:700;font-size:14px;margin-bottom:4px">${meta.bn}</div>
        <div style="color:#64748b;font-size:12px">মোট হুমকি: <span style="color:${color};font-weight:700">${count}</span></div>
      </div>
    `, { className: 'leaflet-popup-dark' })

    circle.on('click', () => { onSelectRef.current(data) })
    group.addLayer(circle)
  })
}

export default function BangladeshDivisionMap({ divisions, districts, selectedDivision, onSelectDivision }: Props) {
  const mapRef        = useRef<HTMLDivElement>(null)
  const leafletRef    = useRef<any>(null)       // Leaflet L module
  const mapInstRef    = useRef<any>(null)       // map instance
  const circleGrpRef  = useRef<any>(null)       // LayerGroup for circles
  const onSelectRef   = useRef(onSelectDivision) // always-current callback
  const dataRef       = useRef({ divisions, districts }) // latest data for async init

  // Keep refs in sync without triggering re-renders
  useEffect(() => { onSelectRef.current = onSelectDivision }, [onSelectDivision])
  useEffect(() => { dataRef.current = { divisions, districts } }, [divisions, districts])

  // ── Init map once ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return

    import('leaflet').then(L => {
      if (!mapRef.current || mapInstRef.current) return

      const map = L.map(mapRef.current, {
        center: [23.7, 90.35],
        zoom: 7,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,          // fixed map — won't pan or hijack page scroll
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap ©CartoDB',
        maxZoom: 12,
      }).addTo(map)

      const group = L.layerGroup().addTo(map)

      leafletRef.current   = L
      mapInstRef.current   = map
      circleGrpRef.current = group

      // Draw with the latest data (props may have updated while leaflet loaded)
      const { divisions: divs, districts: dists } = dataRef.current
      if (dists && dists.length > 0) {
        buildDistrictCircles(L, group, dists, divs, onSelectRef)
      } else {
        buildCircles(L, group, divs, onSelectRef)
      }
    }).catch(console.error)

    return () => {
      if (mapInstRef.current) {
        mapInstRef.current.remove()
        mapInstRef.current   = null
        leafletRef.current   = null
        circleGrpRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Rebuild circles whenever data props change ────────────────────────────
  useEffect(() => {
    const L     = leafletRef.current
    const group = circleGrpRef.current
    if (!L || !group) return
    if (districts && districts.length > 0) {
      buildDistrictCircles(L, group, districts, divisions, onSelectRef)
    } else {
      buildCircles(L, group, divisions, onSelectRef)
    }
  }, [divisions, districts])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <style>{`
        .leaflet-popup-content-wrapper { background: transparent !important; border: none !important; box-shadow: none !important; }
        .leaflet-popup-tip-container   { display: none; }
        .leaflet-popup-content         { margin: 0 !important; }
        .leaflet-container             { background: #060d1a !important; }
        .leaflet-tooltip-dark          { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .leaflet-tooltip-dark::before  { display: none; }
      `}</style>
    </div>
  )
}
