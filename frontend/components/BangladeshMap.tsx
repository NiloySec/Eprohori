'use client'
import { useEffect, useState } from 'react'
import { fetchDivisions, type DivisionData } from '@/lib/api'

/* ─── Division SVG polygons ─────────────────────────────────────────────────
   ViewBox: 0 0 340 425
   Coordinate mapping:
     x = (lon - 88.0) * 73   (4.65° wide  → 340 px)
     y = (26.65 - lat) * 70  (6.07° tall  → 425 px)

   All eight divisions are adjacent, sharing exact border edges.
   Key junction points (named for adjacency checks):
     A = (222, 92)   Mymensingh / Sylhet / Dhaka top
     B = (222, 220)  Sylhet / Chittagong / Dhaka right-mid
     C = (225, 260)  Dhaka / Chittagong / Barisal junction
     D = (128, 240)  Rajshahi / Dhaka / Khulna junction
     E = (152, 272)  Dhaka / Khulna / Barisal junction
──────────────────────────────────────────────────────────────────────────── */
const DIVISIONS = [
  {
    en: 'rangpur',
    bn: 'রংপুর',
    path: 'M5,5 L128,5 L128,115 L75,118 L5,115 Z',
    lx: 64, ly: 64,
  },
  {
    en: 'mymensingh',
    bn: 'ময়মনসিংহ',
    path: 'M128,5 L222,5 L222,92 L170,112 L128,115 Z',
    lx: 175, ly: 60,
  },
  {
    en: 'sylhet',
    bn: 'সিলেট',
    path: 'M222,5 L330,18 L330,220 L222,220 L222,92 Z',
    lx: 278, ly: 118,
  },
  {
    en: 'rajshahi',
    bn: 'রাজশাহী',
    path: 'M5,115 L75,118 L128,115 L128,240 L68,248 L5,240 Z',
    lx: 62, ly: 183,
  },
  {
    en: 'dhaka',
    bn: 'ঢাকা',
    path: 'M128,115 L170,112 L222,92 L222,220 L225,260 L152,272 L128,258 L128,240 Z',
    lx: 172, ly: 190,
  },
  {
    en: 'chittagong',
    bn: 'চট্টগ্রাম',
    path: 'M222,220 L330,220 L330,412 L280,418 L225,260 Z',
    lx: 284, ly: 325,
  },
  {
    en: 'khulna',
    bn: 'খুলনা',
    path: 'M5,240 L68,248 L128,240 L128,258 L152,272 L148,385 L82,410 L5,402 Z',
    lx: 72, ly: 330,
  },
  {
    en: 'barisal',
    bn: 'বরিশাল',
    path: 'M152,272 L225,260 L280,418 L218,420 L148,385 Z',
    lx: 204, ly: 358,
  },
]

function getFill(count: number, hovered: boolean, selected: boolean): string {
  if (count >= 16) {
    if (selected) return '#7a2020'
    if (hovered)  return '#6a1c1c'
    return '#501818'
  }
  if (count >= 6) {
    if (selected) return '#6a4218'
    if (hovered)  return '#5c3a14'
    return '#4a3010'
  }
  if (count >= 1) {
    if (selected) return '#265e38'
    if (hovered)  return '#1e5432'
    return '#184828'
  }
  if (selected) return '#154030'
  if (hovered)  return '#10382a'
  return '#0a2e22'
}

function getStroke(
  count: number,
  hovered: boolean,
  selected: boolean,
): { color: string; width: number } {
  if (selected) return { color: '#00e5c4', width: 2.5 }
  if (hovered) {
    if (count >= 16) return { color: '#ff6b6b', width: 1.8 }
    if (count >= 6)  return { color: '#fbbf24', width: 1.8 }
    return { color: '#00e5c4', width: 1.8 }
  }
  if (count >= 16) return { color: '#ff444466', width: 1 }
  if (count >= 6)  return { color: '#f59e0b55', width: 1 }
  return { color: '#00e5c433', width: 1 }
}

function getLabelColor(count: number): string {
  if (count >= 16) return '#ff6b6b'
  if (count >= 6)  return '#fbbf24'
  if (count >= 1)  return '#4ade80'
  return '#64748b'
}

interface Props {
  onSelectDivision?: (div: DivisionData | null) => void
  selectedDivision?: string | null
}

export default function BangladeshMap({ onSelectDivision, selectedDivision }: Props) {
  const [divisions, setDivisions] = useState<DivisionData[]>([])
  const [hovered, setHovered]     = useState<string | null>(null)

  useEffect(() => {
    fetchDivisions().then(setDivisions).catch(() => {})
  }, [])

  const getData = (en: string) => divisions.find(d => d.division_en === en)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#060d1a',
        overflow: 'hidden',
      }}
    >
      <svg
        viewBox="0 0 340 425"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {/* Ocean backdrop */}
        <rect width="340" height="425" fill="#060d1a" />

        {/* Subtle grid lines */}
        <g opacity="0.06" stroke="#00e5c4" strokeWidth="0.5">
          {[85, 170, 255].map(x => (
            <line key={`vl${x}`} x1={x} y1={0} x2={x} y2={425} />
          ))}
          {[85, 170, 255, 340].map(y => (
            <line key={`hl${y}`} x1={0} y1={y} x2={340} y2={y} />
          ))}
        </g>

        {/* Division polygons */}
        {DIVISIONS.map(div => {
          const data      = getData(div.en)
          const count     = data?.threat_count ?? 0
          const isHovered  = hovered === div.en
          const isSelected = selectedDivision === div.en
          const stroke     = getStroke(count, isHovered, isSelected)

          return (
            <g
              key={div.en}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectDivision?.(data ?? null)}
              onMouseEnter={() => setHovered(div.en)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Shadow / glow for selected */}
              {isSelected && (
                <path
                  d={div.path}
                  fill="none"
                  stroke="#00e5c4"
                  strokeWidth={6}
                  strokeOpacity={0.15}
                  strokeLinejoin="round"
                />
              )}

              <path
                d={div.path}
                fill={getFill(count, isHovered, isSelected)}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinejoin="round"
                style={{ transition: 'fill 0.18s ease, stroke 0.18s ease' }}
              />

              {/* Division name */}
              <text
                x={div.lx}
                y={div.ly - 7}
                textAnchor="middle"
                fill={isSelected ? '#00e5c4' : isHovered ? '#e2e8f0' : '#94a3b8'}
                fontSize="8.5"
                fontFamily="Hind Siliguri, sans-serif"
                style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.18s' }}
              >
                {div.bn}
              </text>

              {/* Threat count */}
              <text
                x={div.lx}
                y={div.ly + 7}
                textAnchor="middle"
                fill={getLabelColor(count)}
                fontSize="12"
                fontWeight="bold"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {divisions.length === 0 ? '…' : count}
              </text>
            </g>
          )
        })}

        {/* Compass rose */}
        <g transform="translate(315, 408)" opacity="0.35">
          <polygon points="0,-14 -3,-6 3,-6" fill="#00e5c4" />
          <line x1="0" y1="-14" x2="0" y2="0" stroke="#00e5c4" strokeWidth="0.8" />
          <text
            x="0"
            y="8"
            textAnchor="middle"
            fill="#00e5c4"
            fontSize="7"
            fontFamily="sans-serif"
          >
            N
          </text>
        </g>

        {/* Scale label */}
        <text
          x="12"
          y="420"
          fill="#334155"
          fontSize="7"
          fontFamily="sans-serif"
        >
          Bangladesh Divisions
        </text>
      </svg>

      {/* Floating hover tooltip */}
      {hovered && (() => {
        const div  = DIVISIONS.find(d => d.en === hovered)
        const data = getData(hovered)
        if (!div) return null
        const count = data?.threat_count ?? 0
        return (
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              background: 'rgba(13,24,41,0.96)',
              border: '1px solid rgba(0,229,196,0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              pointerEvents: 'none',
              zIndex: 10,
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ color: '#00e5c4', fontWeight: 700, fontSize: '14px', fontFamily: 'Hind Siliguri, sans-serif' }}>
              {div.bn}
            </div>
            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '3px' }}>
              মোট হুমকি:{' '}
              <span style={{ color: count >= 16 ? '#ff6b6b' : count >= 6 ? '#fbbf24' : '#4ade80', fontWeight: 700 }}>
                {count}
              </span>
            </div>
            {data && Object.entries(data.categories).length > 0 && (
              <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Object.entries(data.categories).map(([cat, n]) => (
                  <span
                    key={cat}
                    style={{
                      fontSize: '10px',
                      color: '#94a3b8',
                      background: 'rgba(30,58,95,0.5)',
                      borderRadius: '4px',
                      padding: '1px 6px',
                    }}
                  >
                    {cat}: {n}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
