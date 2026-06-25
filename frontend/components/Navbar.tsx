'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/LanguageContext'
import { setAuthToken, setAdminToken, getAdminToken, getAdminProfile } from '@/lib/api'

interface NavAuth {
  name: string
  email: string
  avatar?: string
  loggedIn: boolean
  isAdmin?: boolean
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [auth, setAuth] = useState<NavAuth | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)

  // Read auth state on mount and whenever the route changes (login/logout)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ep_auth') || 'null')
      if (saved?.loggedIn) {
        setAuth({ ...saved, isAdmin: false })
      } else {
        // Check admin session
        const adminProfile = getAdminProfile()
        if (adminProfile && getAdminToken()) {
          setAuth({ name: adminProfile.name, email: adminProfile.email, loggedIn: true, isAdmin: true })
        } else {
          setAuth(null)
        }
      }
    } catch {
      setAuth(null)
    }
    setMenuOpen(false)
    setOpen(false)
  }, [pathname])

  // Click outside closes the profile dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    if (auth?.isAdmin) {
      setAdminToken(null)
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem('ep_auth') || 'null')
        if (saved) localStorage.setItem('ep_auth', JSON.stringify({ ...saved, loggedIn: false }))
      } catch { /* ignore */ }
      setAuthToken(null)
    }
    setAuth(null)
    setMenuOpen(false)
    router.push(auth?.isAdmin ? '/admin-eprohori-secure' : '/account')
  }

  const navLinks = [
    { href: '/',        label: t('nav_home') },
    { href: '/report',  label: t('nav_threats') },
    { href: '/monitor', label: t('nav_monitor') },
    { href: '/about',   label: t('nav_about') },
  ]

  const avatarCircle = (size: number) =>
    auth?.avatar ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={auth.avatar}
        alt="profile"
        className="rounded-full"
        style={{ width: size, height: size, objectFit: 'cover', border: '2px solid rgba(0,229,196,0.5)' }}
      />
    ) : (
      <span
        className="rounded-full flex items-center justify-center font-bold"
        style={{
          width: size, height: size, fontSize: size * 0.45,
          backgroundColor: 'rgba(0,229,196,0.15)', border: '2px solid rgba(0,229,196,0.5)', color: '#00e5c4',
        }}
      >
        {(auth?.name || '?').charAt(0).toUpperCase()}
      </span>
    )

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        backgroundColor: 'rgba(5,8,16,0.78)',
        borderBottom: '1px solid rgba(148,163,184,0.08)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="EProhori"
              width={160}
              height={50}
              style={{ objectFit: 'contain' }}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map(link => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group"
                  style={{ color: active ? '#f1f5f9' : '#94a3b8' }}
                >
                  <span className="relative z-10 group-hover:text-[#f1f5f9] transition-colors">
                    {link.label}
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      left: active ? 16 : '50%',
                      right: active ? 16 : '50%',
                      height: 2,
                      background: '#00e5c4',
                      borderRadius: 2,
                      transition: 'left 0.25s ease, right 0.25s ease',
                      opacity: active ? 1 : 0,
                    }}
                  />
                </Link>
              )
            })}
          </div>

          {/* Sign In / Profile + Hamburger */}
          <div className="flex items-center gap-3">
            {auth ? (
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  aria-label="Profile menu"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}
                >
                  {avatarCircle(28)}
                  <span className="text-sm font-medium text-slate-200 max-w-[100px] truncate">
                    {auth.name.split(' ')[0]}
                  </span>
                  {auth.isAdmin && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                      style={{ background: 'rgba(255,68,68,0.15)', color: '#ff6666' }}>
                      Admin
                    </span>
                  )}
                  <span className="text-slate-500 text-xs">▾</span>
                </button>
                {menuOpen && (
                  <div
                    className="slide-down"
                    style={{
                      position: 'absolute', right: 0, top: '120%', zIndex: 60,
                      minWidth: 180,
                      background: 'rgba(13,24,41,0.98)',
                      border: '1px solid rgba(0,229,196,0.25)',
                      borderRadius: 12,
                      boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                      overflow: 'hidden',
                    }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-sm font-semibold text-white truncate">{auth.name}</p>
                      <p className="text-xs text-slate-500 truncate">{auth.email}</p>
                    </div>
                    <Link
                      href={auth.isAdmin ? '/admin-eprohori-secure' : '/account'}
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                    >
                      {auth.isAdmin ? '⚡ Control Center' : `👤 ${t('nav_profile')}`}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                      style={{ color: '#ff6666' }}
                    >
                      🚪 {t('logout_btn')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/account"
                className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  border: '1px solid rgba(148,163,184,0.15)',
                  color: '#f1f5f9',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(0,229,196,0.4)'
                  e.currentTarget.style.color = '#00e5c4'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(148,163,184,0.15)'
                  e.currentTarget.style.color = '#f1f5f9'
                }}
              >
                {t('sign_in')}
              </Link>
            )}

            <button
              className="lg:hidden p-2 rounded-md text-slate-400 hover:text-white transition-colors"
              onClick={() => setOpen(v => !v)}
              aria-label="Menu"
            >
              <div className="w-5 space-y-1.5">
                <span className="block h-0.5 bg-current transition-all duration-200"
                  style={{ transform: open ? 'translateY(8px) rotate(45deg)' : 'none' }} />
                <span className="block h-0.5 bg-current transition-opacity duration-200"
                  style={{ opacity: open ? 0 : 1 }} />
                <span className="block h-0.5 bg-current transition-all duration-200"
                  style={{ transform: open ? 'translateY(-8px) rotate(-45deg)' : 'none' }} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className="lg:hidden overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '420px' : '0', borderTop: open ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
      >
        <div className="px-4 py-3 space-y-1" style={{ backgroundColor: 'rgba(13,24,41,0.96)', backdropFilter: 'blur(12px)' }}>
          {navLinks.map(link => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: active ? '#00e5c4' : '#94a3b8',
                  backgroundColor: active ? 'rgba(0,229,196,0.08)' : 'transparent',
                  borderLeft: active ? '2px solid #00e5c4' : '2px solid transparent',
                }}
              >
                {link.label}
              </Link>
            )
          })}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ color: pathname === '/account' ? '#00e5c4' : '#94a3b8' }}
          >
            {auth ? <>👤 {t('nav_profile')}</> : <>🔑 {t('sign_in')}</>}
          </Link>
        </div>
      </div>
    </nav>
  )
}
