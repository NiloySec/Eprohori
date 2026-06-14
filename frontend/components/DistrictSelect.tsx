'use client'
import { useEffect, useRef, useState } from 'react'

// All 64 districts of Bangladesh, grouped by division (division name = backend region)
export const DISTRICT_TO_DIVISION: Record<string, string> = {
  // Dhaka
  Dhaka: 'Dhaka', Faridpur: 'Dhaka', Gazipur: 'Dhaka', Gopalganj: 'Dhaka',
  Kishoreganj: 'Dhaka', Madaripur: 'Dhaka', Manikganj: 'Dhaka', Munshiganj: 'Dhaka',
  Narayanganj: 'Dhaka', Narsingdi: 'Dhaka', Rajbari: 'Dhaka', Shariatpur: 'Dhaka', Tangail: 'Dhaka',
  // Chittagong
  Bandarban: 'Chittagong', Brahmanbaria: 'Chittagong', Chandpur: 'Chittagong',
  Chattogram: 'Chittagong', Cumilla: 'Chittagong', "Cox's Bazar": 'Chittagong',
  Feni: 'Chittagong', Khagrachhari: 'Chittagong', Lakshmipur: 'Chittagong',
  Noakhali: 'Chittagong', Rangamati: 'Chittagong',
  // Rajshahi
  Bogura: 'Rajshahi', Joypurhat: 'Rajshahi', Naogaon: 'Rajshahi', Natore: 'Rajshahi',
  Chapainawabganj: 'Rajshahi', Pabna: 'Rajshahi', Rajshahi: 'Rajshahi', Sirajganj: 'Rajshahi',
  // Rangpur
  Dinajpur: 'Rangpur', Gaibandha: 'Rangpur', Kurigram: 'Rangpur', Lalmonirhat: 'Rangpur',
  Nilphamari: 'Rangpur', Panchagarh: 'Rangpur', Rangpur: 'Rangpur', Thakurgaon: 'Rangpur',
  // Barishal
  Barguna: 'Barishal', Barishal: 'Barishal', Bhola: 'Barishal', Jhalokati: 'Barishal',
  Patuakhali: 'Barishal', Pirojpur: 'Barishal',
  // Sylhet
  Habiganj: 'Sylhet', Moulvibazar: 'Sylhet', Sunamganj: 'Sylhet', Sylhet: 'Sylhet',
  // Khulna
  Bagerhat: 'Khulna', Chuadanga: 'Khulna', Jashore: 'Khulna', Jhenaidah: 'Khulna',
  Khulna: 'Khulna', Kushtia: 'Khulna', Magura: 'Khulna', Meherpur: 'Khulna',
  Narail: 'Khulna', Satkhira: 'Khulna',
  // Mymensingh
  Jamalpur: 'Mymensingh', Mymensingh: 'Mymensingh', Netrokona: 'Mymensingh', Sherpur: 'Mymensingh',
}

export const DISTRICTS = Object.keys(DISTRICT_TO_DIVISION).sort()

interface Props {
  value: string
  onChange: (district: string) => void
  placeholder?: string
}

export default function DistrictSelect({ value, onChange, placeholder = 'Search district...' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  // Click outside closes the dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query.trim()
    ? DISTRICTS.filter(d => d.toLowerCase().includes(query.trim().toLowerCase()))
    : DISTRICTS

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 13, color: '#475569', pointerEvents: 'none',
          }}
        >
          🔍
        </span>
        <input
          value={open ? query : value}
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true) }}
          onFocus={() => { setQuery(''); setOpen(true) }}
          placeholder={value || placeholder}
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500"
          style={{
            backgroundColor: '#060d1a',
            border: '1px solid rgba(255,255,255,0.08)',
            outline: 'none',
          }}
        />
      </div>

      {open && (
        <div
          className="slide-down"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 40,
            marginTop: 6, maxHeight: 220, overflowY: 'auto',
            background: 'rgba(13,24,41,0.98)',
            border: '1px solid rgba(0,229,196,0.25)',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">No district found</p>
          ) : (
            filtered.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => { onChange(d); setQuery(''); setOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                style={{
                  color: d === value ? '#00e5c4' : '#e2e8f0',
                  backgroundColor: d === value ? 'rgba(0,229,196,0.08)' : 'transparent',
                }}
              >
                {d}
                <span className="text-xs text-slate-600 ml-2">{DISTRICT_TO_DIVISION[d]}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
