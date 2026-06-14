'use client'
import { useEffect, useState } from 'react'

interface Props {
  value: number
  size?: number
  showLabel?: boolean
}

export default function ConfidenceMeter({ value, size = 160, showLabel = true }: Props) {
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    setAnimated(0)
    const t = setTimeout(() => setAnimated(value), 80)
    return () => clearTimeout(t)
  }, [value])

  const color =
    animated > 70 ? '#ff4444' :
    animated > 30 ? '#f59e0b' : '#22c55e'

  const trackColor =
    animated > 70 ? 'rgba(255,68,68,0.14)' :
    animated > 30 ? 'rgba(245,158,11,0.14)' : 'rgba(34,197,94,0.14)'

  const label =
    animated > 70 ? 'উচ্চ ঝুঁকি' :
    animated > 30 ? 'মাঝারি ঝুঁকি' : 'নিরাপদ'

  const chipLabel =
    animated > 70 ? 'ফিশিং' :
    animated > 30 ? 'সন্দেহজনক' : 'নিরাপদ'

  const r = 52
  const cx = 64
  const cy = 64
  const circumference = 2 * Math.PI * r   // ≈ 326.7
  const arcLen = circumference * 0.75      // 270° arc ≈ 245
  const filled = (arcLen * animated) / 100

  // Tick marks at 0%, 25%, 50%, 75%, 100% along the 270° arc
  // Arc starts at 135° (7:30 position), ends at 45° (next)
  const TICKS = [0, 25, 50, 75, 100]
  const tickMarks = TICKS.map(pct => {
    const angle = (135 + (pct / 100) * 270) * (Math.PI / 180)
    const r_inner = 41
    const r_outer = 48
    return {
      x1: cx + r_inner * Math.cos(angle),
      y1: cy + r_inner * Math.sin(angle),
      x2: cx + r_outer * Math.cos(angle),
      y2: cy + r_outer * Math.sin(angle),
      pct,
    }
  })

  // Glow filter
  const glowId = `glow-${Math.round(animated)}`

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 128 128"
        className="overflow-visible"
        style={{ filter: `drop-shadow(0 0 8px ${color}55)` }}
      >
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Track background */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circumference}`}
          transform={`rotate(135 ${cx} ${cy})`}
        />

        {/* Dark rail */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(30,58,95,0.7)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circumference}`}
          transform={`rotate(135 ${cx} ${cy})`}
        />

        {/* Value arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(135 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1), stroke 0.35s ease' }}
        />

        {/* Tick marks */}
        {tickMarks.map(t => (
          <line
            key={t.pct}
            x1={t.x1} y1={t.y1}
            x2={t.x2} y2={t.y2}
            stroke={t.pct <= animated ? color : 'rgba(30,58,95,0.8)'}
            strokeWidth={t.pct === 0 || t.pct === 100 ? 2 : 1.2}
            strokeLinecap="round"
            style={{ transition: 'stroke 0.35s' }}
          />
        ))}

        {/* Percentage text */}
        <text
          x={cx} y={cy - 4}
          textAnchor="middle"
          fill={color}
          fontSize="24"
          fontWeight="800"
          fontFamily="Rajdhani, sans-serif"
          style={{ transition: 'fill 0.35s' }}
        >
          {animated}%
        </text>

        {/* Sub-label */}
        <text
          x={cx} y={cy + 13}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="9.5"
          fontFamily="Hind Siliguri, sans-serif"
        >
          {label}
        </text>
      </svg>

      {showLabel && (
        <span
          className="text-xs px-3 py-1 rounded-full font-semibold"
          style={{
            backgroundColor: `${color}20`,
            color,
            border: `1px solid ${color}44`,
            transition: 'background-color 0.35s, color 0.35s',
          }}
        >
          {chipLabel}
        </span>
      )}
    </div>
  )
}
