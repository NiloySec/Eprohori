'use client'
import { useEffect, useState } from 'react'
import { isBackendOnline } from '@/lib/api'

export default function DemoModeBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let active = true
    const check = () => isBackendOnline().then(ok => { if (active) setOffline(!ok) })
    check()
    const id = setInterval(check, 60000)
    return () => { active = false; clearInterval(id) }
  }, [])

  if (!offline) return null

  return (
    <div
      className="text-center text-xs font-semibold py-1.5 px-4"
      style={{
        backgroundColor: 'rgba(245,158,11,0.12)',
        borderBottom: '1px solid rgba(245,158,11,0.3)',
        color: '#f59e0b',
      }}
    >
      ⚠️ Demo mode — backend offline · ডেমো ডেটা দেখানো হচ্ছে
    </div>
  )
}
