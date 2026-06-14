interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton rounded ${className}`} />
}

export function ThreatCardSkeleton() {
  return (
    <div
      className="rounded-xl p-4 space-y-3 overflow-hidden"
      style={{ backgroundColor: '#0d1829', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid rgba(255,68,68,0.2)' }}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full ml-auto" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-14 ml-auto" />
      </div>
    </div>
  )
}

export function AlertCardSkeleton() {
  return (
    <div
      className="rounded-xl p-4 space-y-2 overflow-hidden"
      style={{ backgroundColor: '#0d1829', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid rgba(245,158,11,0.2)' }}
    >
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div
      className="rounded-xl p-5 overflow-hidden"
      style={{ backgroundColor: '#0d1829', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <Skeleton className="h-8 w-8 rounded-lg mb-3" />
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

export default Skeleton
