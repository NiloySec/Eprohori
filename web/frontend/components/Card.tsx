import { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  style?: CSSProperties
  onClick?: () => void
}

/**
 * Premium card: subtle border, lift + accent glow on hover.
 * Used across all pages for a consistent surface treatment.
 */
export default function Card({
  children,
  className = '',
  hover = true,
  glow = false,
  style,
  onClick,
}: CardProps) {
  const base =
    'relative rounded-2xl border p-6 transition-all duration-300 ease-out'
  const borderColor = 'border-[rgba(148,163,184,0.08)]'
  const bg = 'bg-[#0a0f1c]'
  const hoverCls = hover
    ? 'hover:border-[rgba(0,229,196,0.2)] hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-15px_rgba(0,229,196,0.15)]'
    : ''
  const glowCls = glow
    ? 'before:content-[""] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-[rgba(0,229,196,0.08)] before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:pointer-events-none'
    : ''

  return (
    <div
      onClick={onClick}
      className={`${base} ${borderColor} ${bg} ${hoverCls} ${glowCls} ${className}`}
      style={style}
    >
      <div className="relative z-10">{children}</div>
    </div>
  )
}
