'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchRangers, fetchMyReports, sendOTP, verifyOTP, registerUser, loginUser, updateProfile, changePassword, updatePreferences, deleteAccount, setAuthToken, refreshSession, forgotPassword, resetPassword, adminLogin, fetchDailyQuiz, submitDailyQuiz } from '@/lib/api'
import type { DailyQuiz, DailyQuizResult } from '@/lib/api'
import type { Ranger, MyReport } from '@/lib/api'
import DistrictSelect from '@/components/DistrictSelect'
import { useLanguage } from '@/lib/LanguageContext'

// ── Auth types & helpers ─────────────────────────────────────────────────────

interface AuthUser {
  name: string
  email: string
  phone: string
  division: string
  xp: number
  reports: number
  loggedIn: boolean
  joinedAt: string
  rank?: number      // server-computed rank (when registered via backend)
  synced?: boolean   // true = account exists in the backend user DB
  avatar?: string    // base64 profile picture
}

interface SavedReport {
  detail: string
  type: string
  confidence: number
  isPhishing: boolean
  createdAt: string
}

const blockedDomains = [
  'tempmail.com', 'throwaway.email',
  'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'trashmail.com',
  'temp-mail.org', 'fakeinbox.com',
  '10minutemail.com', 'disposablemail.com',
  'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'guerrillamail.info',
  'spam4.me', 'tempr.email',
]

const isBlockedEmail = (email: string) => {
  const domain = email.split('@')[1]?.toLowerCase()
  return blockedDomains.includes(domain)
}

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString()

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

// Bangladesh phone: accepts 01712345678, +8801712345678, 8801712345678
const isValidBDPhone = (phone: string) => {
  const cleaned = phone.replace(/[\s\-]/g, '')
  return /^(\+880|880|0)?1[3-9]\d{8}$/.test(cleaned)
}

// Live password strength checks
const passwordChecks = (pw: string) => ({
  length: pw.length >= 8,
  upper: /[A-Z]/.test(pw),
  lower: /[a-z]/.test(pw),
  number: /[0-9]/.test(pw),
  special: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
})

const PW_CHECK_LABELS: { key: keyof ReturnType<typeof passwordChecks>; label: string }[] = [
  { key: 'length',  label: 'At least 8 characters' },
  { key: 'upper',   label: 'One uppercase letter' },
  { key: 'lower',   label: 'One lowercase letter' },
  { key: 'number',  label: 'One number' },
  { key: 'special', label: 'One special character (!@#$%^&*)' },
]

// XP levels
const LEVELS = [
  { name: 'Rookie', icon: '🌱', minXp: 0 },
  { name: 'Scout',  icon: '🔍', minXp: 100 },
  { name: 'Ranger', icon: '🛡️', minXp: 300 },
  { name: 'Elite',  icon: '⚔️', minXp: 600 },
  { name: 'Master', icon: '👑', minXp: 1000 },
]

function levelFor(xp: number) {
  let idx = 0
  LEVELS.forEach((l, i) => { if (xp >= l.minXp) idx = i })
  const current = LEVELS[idx]
  const next = LEVELS[idx + 1] ?? null
  const progress = next
    ? Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100))
    : 100
  return { current, next, progress }
}

function timeAgo(iso: string) {
  const ts = /Z$|[+]/.test(iso) ? iso : iso + "Z"; const diff = (Date.now() - new Date(ts).getTime()) / 60000
  if (diff < 1)    return 'এইমাত্র'
  if (diff < 60)   return `${Math.floor(diff)} মিনিট আগে`
  if (diff < 1440) return `${Math.floor(diff / 60)} ঘণ্টা আগে`
  return `${Math.floor(diff / 1440)} দিন আগে`
}

const typeIcon: Record<string, string> = {
  url: '🔗', sms: '💬', facebook: '👤', website: '🌐', call: '📞', other: '⚠️',
  URL: '🔗', SMS: '💬', Facebook: '👤', Website: '🌐',
}

const inputStyle = {
  backgroundColor: '#060d1a',
  border: '1px solid rgba(255,255,255,0.08)',
  outline: 'none',
  transition: 'border-color 0.22s, box-shadow 0.22s',
}

// ── Auth form (login / register with OTP) ────────────────────────────────────

function AuthForm({ onAuth }: { onAuth: (u: AuthUser) => void }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState<'login' | 'register'>('login')

  // Login state
  const [loginEmail, setLoginEmail]       = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError]       = useState('')

  // Forgot-password state
  const [forgotMode, setForgotMode]   = useState(false)
  const [forgotStep, setForgotStep]   = useState<'email' | 'reset'>('email')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp]     = useState('')
  const [forgotPass, setForgotPass]   = useState('')
  const [forgotMsg, setForgotMsg]     = useState('')
  const [forgotErr, setForgotErr]     = useState('')
  const [forgotBusy, setForgotBusy]   = useState(false)

  const handleForgotSend = async () => {
    setForgotErr(''); setForgotMsg('')
    if (!isValidEmail(forgotEmail)) { setForgotErr('সঠিক ইমেইল দিন'); return }
    setForgotBusy(true)
    try {
      const r = await forgotPassword(forgotEmail.trim())
      setForgotMsg(r.message || 'OTP পাঠানো হয়েছে — ইমেইল দেখুন')
      setForgotStep('reset')
    } catch { setForgotErr('সমস্যা হয়েছে — আবার চেষ্টা করুন') }
    setForgotBusy(false)
  }

  const handleForgotReset = async () => {
    setForgotErr(''); setForgotMsg('')
    if (forgotOtp.trim().length !== 6) { setForgotErr('৬ ডিজিটের OTP দিন'); return }
    if (forgotPass.length < 8) { setForgotErr('পাসওয়ার্ড কমপক্ষে ৮ অক্ষর'); return }
    setForgotBusy(true)
    try {
      await resetPassword(forgotEmail.trim(), forgotOtp.trim(), forgotPass)
      setForgotMode(false); setForgotStep('email')
      setForgotEmail(''); setForgotOtp(''); setForgotPass('')
      setLoginError(''); setLoginEmail(forgotEmail.trim())
      alert('পাসওয়ার্ড পরিবর্তন হয়েছে — এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।')
    } catch (e) {
      setForgotErr(e instanceof Error ? e.message : 'রিসেট ব্যর্থ — OTP ঠিক আছে কিনা দেখুন')
    }
    setForgotBusy(false)
  }

  // Register state
  const [regName, setRegName]         = useState('')
  const [regEmail, setRegEmail]       = useState('')
  const [regPhone, setRegPhone]       = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm]   = useState('')
  const [regDistrict, setRegDistrict] = useState('Dhaka')
  const [regError, setRegError]       = useState('')

  // Password visibility toggles (👁️/🙈), keyed per field
  const [pwVisible, setPwVisible] = useState<Record<string, boolean>>({})
  const toggleVisible = (key: string) =>
    setPwVisible(v => ({ ...v, [key]: !v[key] }))

  const checks = passwordChecks(regPassword)
  const allChecksPass = Object.values(checks).every(Boolean)

  // OTP state
  const [otp, setOtp]             = useState('')     // local fallback OTP (demo: shown below input)
  const [otpSent, setOtpSent]     = useState(false)
  const [otpInput, setOtpInput]   = useState('')
  const [otpViaEmail, setOtpViaEmail] = useState(false) // true = real email OTP via backend
  const [otpSending, setOtpSending]   = useState(false)
  const [otpProvider, setOtpProvider] = useState('')

  const handleLogin = async () => {
    setLoginError('')
    if (!isValidEmail(loginEmail)) { setLoginError('সঠিক ইমেইল দিন'); return }
    if (isBlockedEmail(loginEmail)) { setLoginError('Temporary email addresses are not allowed'); return }
    if (loginPassword.length < 6) { setLoginError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'); return }

    // Real login against the backend user DB
    try {
      const u = await loginUser(loginEmail.trim(), loginPassword)
      // Admin account → set up admin session + go straight to the admin dashboard
      if (u.is_admin) {
        try {
          await adminLogin(loginEmail.trim(), loginPassword)
          window.location.href = '/admin-eprohori-secure'
          return
        } catch { /* if admin-login fails, fall through to the normal user view */ }
      }
      const user: AuthUser = {
        name: u.name, email: u.email, phone: u.phone, division: u.division || 'ঢাকা',
        xp: u.xp, reports: u.reports, rank: u.rank, synced: true,
        loggedIn: true, joinedAt: u.joinedAt,
      }
      localStorage.setItem('ep_auth', JSON.stringify(user))
      onAuth(user)
      return
    } catch (e) {
      // Backend reachable but credentials wrong → show the error
      if (e instanceof Error && /invalid|incorrect|password/i.test(e.message)) {
        setLoginError(e.message)
        return
      }
      // Backend offline → demo fallback below
    }

    const user: AuthUser = {
      name: loginEmail.split('@')[0],
      email: loginEmail,
      phone: '',
      division: 'ঢাকা',
      xp: 0,
      reports: 0,
      loggedIn: true,
      joinedAt: new Date().toISOString(),
    }
    // Reuse previously registered details if same email
    try {
      const prev = JSON.parse(localStorage.getItem('ep_auth') || 'null')
      if (prev && prev.email === loginEmail) Object.assign(user, prev, { loggedIn: true })
    } catch { /* ignore */ }
    localStorage.setItem('ep_auth', JSON.stringify(user))
    onAuth(user)
  }

  const handleSendOTP = async () => {
    setRegError('')
    if (regName.trim().length < 2) { setRegError('পুরো নাম দিন'); return }
    if (!isValidEmail(regEmail)) { setRegError('সঠিক ইমেইল দিন'); return }
    if (isBlockedEmail(regEmail)) { setRegError('Temporary email addresses are not allowed'); return }
    if (!isValidBDPhone(regPhone)) { setRegError('Enter a valid Bangladesh phone number (e.g. 01712345678)'); return }
    if (!allChecksPass) { setRegError('পাসওয়ার্ডের সব শর্ত পূরণ করুন'); return }
    if (regPassword !== regConfirm) { setRegError('পাসওয়ার্ড মিলছে না'); return }

    setOtpSending(true)
    try {
      // Real email OTP via backend (Resend → Brevo fallback)
      const res = await sendOTP(regEmail.trim(), regName.trim(), 'registration')
      setOtpViaEmail(true)
      setOtpProvider(res.provider ?? '')
      setOtp('')
    } catch {
      // Backend offline or both providers failed — local demo OTP
      setOtpViaEmail(false)
      setOtpProvider('')
      setOtp(generateOTP())
    }
    setOtpSending(false)
    setOtpSent(true)
    setOtpInput('')
  }

  const handleVerify = async () => {
    setRegError('')
    if (isBlockedEmail(regEmail)) { setRegError('Temporary email addresses are not allowed'); return }
    if (otpViaEmail) {
      try {
        await verifyOTP(regEmail.trim(), otpInput.trim())
      } catch (e) {
        setRegError(e instanceof Error ? e.message : 'OTP সঠিক নয়। আবার চেষ্টা করুন।')
        return
      }
    } else if (otpInput.trim() !== otp) {
      setRegError('OTP সঠিক নয়। আবার চেষ্টা করুন।')
      return
    }

    // OTP verified — create the account in the backend user DB
    let user: AuthUser
    try {
      const u = await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        division: regDistrict,
        password: regPassword,
      })
      user = {
        name: u.name, email: u.email, phone: u.phone, division: u.division,
        xp: u.xp, reports: u.reports, rank: u.rank, synced: true,
        loggedIn: true, joinedAt: u.joinedAt,
      }
    } catch (e) {
      if (e instanceof Error && /already exists/i.test(e.message)) {
        setRegError(e.message + ' — লগইন ট্যাব ব্যবহার করুন।')
        return
      }
      // Backend offline — local demo account
      user = {
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        division: regDistrict,
        xp: 0,
        reports: 0,
        loggedIn: true,
        joinedAt: new Date().toISOString(),
      }
    }
    localStorage.setItem('ep_auth', JSON.stringify(user))
    onAuth(user)
  }

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    type = 'text',
    placeholder = '',
    onEnter?: () => void,
  ) => {
    const isPassword = type === 'password'
    const shown = isPassword && pwVisible[label]
    return (
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-1.5">{label}</label>
        <div style={{ position: 'relative' }}>
          <input
            type={isPassword ? (shown ? 'text' : 'password') : type}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onEnter ? e => { if (e.key === 'Enter') { e.preventDefault(); onEnter() } } : undefined}
            placeholder={placeholder}
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500"
            style={{ ...inputStyle, paddingRight: isPassword ? 44 : undefined }}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => toggleVisible(label)}
              aria-label={shown ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, opacity: 0.7,
              }}
            >
              {shown ? '🙈' : '👁️'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(13,24,41,0.85)', border: '1px solid rgba(0,229,196,0.15)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}
      >
        {/* Tabs */}
        {!forgotMode && (
        <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {(['login', 'register'] as const).map(k => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="flex-1 py-4 text-sm font-semibold transition-all relative"
              style={{
                color: tab === k ? '#00e5c4' : '#64748b',
                backgroundColor: tab === k ? 'rgba(0,229,196,0.05)' : 'transparent',
              }}
            >
              {k === 'login' ? t('login_btn') : t('register_btn')}
              {tab === k && (
                <span
                  className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #00e5c4, #3b82f6)' }}
                />
              )}
            </button>
          ))}
        </div>
        )}

        <div className="p-6 space-y-4">
          {forgotMode ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setForgotMode(false); setForgotStep('email'); setForgotErr(''); setForgotMsg('') }}
                  className="text-slate-400 hover:text-white text-lg leading-none"
                  aria-label="Back to login"
                >←</button>
                <h2 className="font-heading text-xl font-bold text-white">পাসওয়ার্ড রিসেট</h2>
              </div>
              {forgotStep === 'email' ? (
                <>
                  <p className="text-xs text-slate-400">আপনার রেজিস্টার্ড ইমেইলে একটি ৬-ডিজিট OTP পাঠানো হবে।</p>
                  {field('ইমেইল', forgotEmail, setForgotEmail, 'email', 'you@example.com', handleForgotSend)}
                  {forgotErr && <p className="text-xs font-semibold" style={{ color: '#ff4444' }}>⚠️ {forgotErr}</p>}
                  <button onClick={handleForgotSend} disabled={forgotBusy} className="btn-primary w-full py-3">
                    {forgotBusy ? 'পাঠানো হচ্ছে...' : 'OTP পাঠান →'}
                  </button>
                </>
              ) : (
                <>
                  {forgotMsg && <p className="text-xs" style={{ color: '#22c55e' }}>✅ {forgotMsg}</p>}
                  {field('OTP (৬ ডিজিট)', forgotOtp, setForgotOtp, 'text', '১২৩৪৫৬', handleForgotReset)}
                  {field('নতুন পাসওয়ার্ড', forgotPass, setForgotPass, 'password', 'কমপক্ষে ৮ অক্ষর', handleForgotReset)}
                  {forgotErr && <p className="text-xs font-semibold" style={{ color: '#ff4444' }}>⚠️ {forgotErr}</p>}
                  <button onClick={handleForgotReset} disabled={forgotBusy} className="btn-primary w-full py-3">
                    {forgotBusy ? 'রিসেট হচ্ছে...' : 'পাসওয়ার্ড রিসেট করুন'}
                  </button>
                  <button onClick={handleForgotSend} disabled={forgotBusy} className="block w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors">
                    OTP পাননি? আবার পাঠান
                  </button>
                </>
              )}
            </>
          ) : tab === 'login' ? (
            <>
              <h2 className="font-heading text-xl font-bold text-white">{t('login_title')}</h2>
              {field(t('email_label'), loginEmail, setLoginEmail, 'email', 'you@example.com', handleLogin)}
              {field(t('password_label'), loginPassword, setLoginPassword, 'password', '••••••••', handleLogin)}
              {loginError && <p className="text-xs font-semibold" style={{ color: '#ff4444' }}>⚠️ {loginError}</p>}
              <button onClick={handleLogin} className="btn-primary w-full py-3">{t('login_btn')} →</button>
              <button
                onClick={() => { setForgotMode(true); setForgotStep('email'); setForgotErr(''); setForgotMsg(''); setForgotEmail(loginEmail) }}
                className="block w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </>
          ) : (
            <>
              <h2 className="font-heading text-xl font-bold text-white">{t('register_title')}</h2>
              {field(t('name_label'), regName, setRegName, 'text', 'আপনার নাম', handleSendOTP)}
              {field(t('email_label'), regEmail, setRegEmail, 'email', 'you@example.com', handleSendOTP)}
              {field('ফোন নম্বর', regPhone, setRegPhone, 'tel', '01XXXXXXXXX', handleSendOTP)}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">{t('district_label')}</label>
                <DistrictSelect value={regDistrict} onChange={setRegDistrict} />
              </div>
              {field(t('password_label'), regPassword, setRegPassword, 'password', 'কমপক্ষে ৮ অক্ষর', handleSendOTP)}

              {/* Live password strength checklist */}
              {regPassword.length > 0 && (
                <div
                  className="rounded-xl px-4 py-3 space-y-1"
                  style={{ background: 'rgba(6,13,26,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {PW_CHECK_LABELS.map(c => (
                    <p
                      key={c.key}
                      className="text-xs flex items-center gap-2"
                      style={{ color: checks[c.key] ? '#22c55e' : '#ff4444' }}
                    >
                      <span>{checks[c.key] ? '✓' : '✗'}</span> {c.label}
                    </p>
                  ))}
                </div>
              )}

              {field('পাসওয়ার্ড নিশ্চিত করুন', regConfirm, setRegConfirm, 'password', '••••••••', handleSendOTP)}

              {regError && <p className="text-xs font-semibold" style={{ color: '#ff4444' }}>⚠️ {regError}</p>}

              {!otpSent ? (
                <button
                  onClick={handleSendOTP}
                  disabled={otpSending || !allChecksPass}
                  className="btn-primary w-full py-3"
                >
                  {otpSending ? 'OTP পাঠানো হচ্ছে...' : 'Send OTP →'}
                </button>
              ) : (
                <div
                  className="rounded-xl p-4 space-y-3 slide-down"
                  style={{ background: 'rgba(0,229,196,0.05)', border: '1px solid rgba(0,229,196,0.2)' }}
                >
                  {otpViaEmail ? (
                    <p className="text-sm text-white font-semibold">
                      📧 OTP sent to {regEmail}
                      {otpProvider && <span className="text-xs text-slate-500 font-normal"> (via {otpProvider})</span>}
                    </p>
                  ) : (
                    <p className="text-sm text-white font-semibold">📲 OTP sent to {regPhone}</p>
                  )}
                  <input
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleVerify() } }}
                    placeholder="6-digit OTP"
                    inputMode="numeric"
                    className="w-full px-4 py-3 rounded-xl text-center text-lg font-bold text-white tracking-widest placeholder-slate-600"
                    style={inputStyle}
                  />
                  {!otpViaEmail && <p className="text-xs text-slate-500 text-center">Demo OTP: {otp}</p>}
                  <button onClick={handleVerify} className="btn-primary w-full py-3">
                    Verify &amp; Create Account →
                  </button>
                  <button
                    onClick={handleSendOTP}
                    disabled={otpSending}
                    className="block w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {otpSending ? 'পাঠানো হচ্ছে...' : 'আবার OTP পাঠান'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Account page ─────────────────────────────────────────────────────────────

// ── Daily cybersecurity quiz ──────────────────────────────────────────────────
function DailyQuizView({ email, onXp }: { email: string; onXp: (totalXp: number) => void }) {
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<DailyQuizResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchDailyQuiz(email)
      .then(q => { setQuiz(q); setLoading(false) })
      .catch(() => { setErr('কুইজ লোড করা যায়নি — পরে চেষ্টা করুন।'); setLoading(false) })
  }, [email])

  const allAnswered = !!quiz && quiz.questions.every(q => answers[String(q.id)])

  const submit = async () => {
    if (!quiz || submitting || !allAnswered) return
    setSubmitting(true); setErr('')
    try {
      const r = await submitDailyQuiz(email, answers)
      setResult(r)
      onXp(r.total_xp)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'জমা দেওয়া যায়নি।')
    } finally { setSubmitting(false) }
  }

  const card = { background: 'rgba(13,24,41,0.85)', border: '1px solid rgba(255,255,255,0.06)' }

  if (loading) {
    return <div className="rounded-2xl p-8 text-center text-slate-400" style={card}>কুইজ লোড হচ্ছে…</div>
  }
  if (err && !quiz) {
    return <div className="rounded-2xl p-8 text-center" style={card}><p className="text-sm" style={{ color: '#ff6b6b' }}>⚠️ {err}</p></div>
  }
  if (!quiz) return null

  // Already completed today (and not just-submitted)
  if (quiz.already_done && !result) {
    return (
      <div className="rounded-2xl p-8 text-center fade-in-up" style={card}>
        <div className="text-5xl mb-3">✅</div>
        <h3 className="font-heading text-xl font-bold text-white mb-2">আজকের কুইজ সম্পন্ন!</h3>
        <p className="text-sm text-slate-400 mb-1">গতবার স্কোর: <span style={{ color: '#00e5c4', fontWeight: 700 }}>{quiz.last_score ?? 0}/5</span></p>
        <p className="text-xs text-slate-500">🗓️ আগামীকাল নতুন ৫টি প্রশ্ন নিয়ে আবার আসুন — প্রতিদিন XP অর্জন করুন!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 flex items-center gap-3 fade-in-up" style={card}>
        <span className="text-3xl">🧠</span>
        <div>
          <h3 className="font-heading text-lg font-bold text-white">আজকের সাইবার কুইজ</h3>
          <p className="text-xs text-slate-400">প্রতিদিন ৫টি নতুন প্রশ্ন • প্রতি সঠিক উত্তরে <span style={{ color: '#00e5c4' }}>+২০ XP</span></p>
        </div>
        <span className="ml-auto text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.3)' }}>
          {quiz.total_xp} XP
        </span>
      </div>

      {quiz.questions.map((q, qi) => {
        const picked = answers[String(q.id)]
        const correctKey = result?.correct[String(q.id)]
        return (
          <div key={q.id} className="rounded-2xl p-5 fade-in-up" style={card}>
            <p className="text-sm font-semibold text-white mb-3">{qi + 1}. {q.q}</p>
            <div className="space-y-2">
              {q.options.map(opt => {
                const isPicked = picked === opt.key
                const isCorrect = result && correctKey === opt.key
                const isWrongPick = result && isPicked && correctKey !== opt.key
                let bg = 'rgba(255,255,255,0.03)', bd = 'rgba(255,255,255,0.08)', col = '#cbd5e1'
                if (isCorrect) { bg = 'rgba(34,197,94,0.14)'; bd = 'rgba(34,197,94,0.5)'; col = '#4ade80' }
                else if (isWrongPick) { bg = 'rgba(255,68,68,0.14)'; bd = 'rgba(255,68,68,0.5)'; col = '#ff6b6b' }
                else if (isPicked) { bg = 'rgba(0,229,196,0.12)'; bd = 'rgba(0,229,196,0.45)'; col = '#00e5c4' }
                return (
                  <button
                    key={opt.key}
                    onClick={() => { if (!result) setAnswers(a => ({ ...a, [String(q.id)]: opt.key })) }}
                    disabled={!!result}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all"
                    style={{ background: bg, border: `1px solid ${bd}`, color: col, cursor: result ? 'default' : 'pointer' }}
                  >
                    <span style={{ fontWeight: 700, marginRight: 8, textTransform: 'uppercase' }}>{opt.key}.</span>
                    {opt.text}
                    {isCorrect && <span style={{ float: 'right' }}>✓</span>}
                    {isWrongPick && <span style={{ float: 'right' }}>✗</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {err && <p className="text-sm text-center" style={{ color: '#ff6b6b' }}>⚠️ {err}</p>}

      {result ? (
        <div className="rounded-2xl p-6 text-center fade-in-up" style={{ background: 'rgba(0,229,196,0.06)', border: '1px solid rgba(0,229,196,0.25)' }}>
          <div className="text-4xl mb-2">{result.score >= 4 ? '🎉' : result.score >= 2 ? '👍' : '📚'}</div>
          <p className="font-heading text-xl font-bold text-white">স্কোর: {result.score}/{result.total}</p>
          <p className="text-sm mt-1" style={{ color: '#00e5c4', fontWeight: 700 }}>+{result.xp_earned} XP অর্জিত!</p>
          <p className="text-xs text-slate-400 mt-1">মোট XP: {result.total_xp} • 🗓️ আগামীকাল নতুন প্রশ্ন</p>
        </div>
      ) : (
        <button
          onClick={submit}
          disabled={!allAnswered || submitting}
          className="btn-primary w-full py-3"
          style={{ opacity: allAnswered && !submitting ? 1 : 0.5 }}
        >
          {submitting ? 'জমা হচ্ছে…' : allAnswered ? 'উত্তর জমা দিন →' : 'সব প্রশ্নের উত্তর দিন'}
        </button>
      )}
    </div>
  )
}

export default function AccountPage() {
  const { t, lang, setLang } = useLanguage()
  const [auth, setAuth]       = useState<AuthUser | null>(null)
  const [loaded, setLoaded]   = useState(false)
  const [reports, setReports] = useState<SavedReport[]>([])
  const [rangers, setRangers] = useState<Ranger[]>([])

  // Edit profile modal
  const [editOpen, setEditOpen]         = useState(false)
  const [editName, setEditName]         = useState('')
  const [editPhone, setEditPhone]       = useState('')
  const [editDivision, setEditDivision] = useState('ঢাকা')
  const [editMsg, setEditMsg]           = useState('')

  // Change password modal
  const [pwOpen, setPwOpen]       = useState(false)
  const [pwOld, setPwOld]         = useState('')
  const [pwNew, setPwNew]         = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwMsg, setPwMsg]         = useState<{ ok: boolean; text: string } | null>(null)

  const openEdit = () => {
    if (!auth) return
    setEditName(auth.name)
    setEditPhone(auth.phone)
    setEditDivision(auth.division || 'ঢাকা')
    setEditMsg('')
    setEditOpen(true)
  }

  const saveProfile = async () => {
    if (!auth) return
    if (editName.trim().length < 2) { setEditMsg('পুরো নাম দিন'); return }
    if (editPhone && !isValidBDPhone(editPhone)) { setEditMsg('সঠিক ফোন নম্বর দিন (01XXXXXXXXX)'); return }
    const updated: AuthUser = { ...auth, name: editName.trim(), phone: editPhone.trim(), division: editDivision }
    try {
      await updateProfile({ email: auth.email, name: editName.trim(), phone: editPhone.trim(), division: editDivision })
    } catch { /* backend offline — saved locally */ }
    localStorage.setItem('ep_auth', JSON.stringify(updated))
    setAuth(updated)
    setEditOpen(false)
  }

  const submitPasswordChange = async () => {
    if (!auth) return
    setPwMsg(null)
    if (pwNew.length < 8) { setPwMsg({ ok: false, text: 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' }); return }
    if (pwNew !== pwConfirm) { setPwMsg({ ok: false, text: 'নতুন পাসওয়ার্ড মিলছে না' }); return }
    try {
      await changePassword(auth.email, pwOld, pwNew)
      setPwMsg({ ok: true, text: '✅ পাসওয়ার্ড পরিবর্তন হয়েছে' })
      setPwOld(''); setPwNew(''); setPwConfirm('')
    } catch (e) {
      setPwMsg({ ok: false, text: e instanceof Error ? e.message : 'পাসওয়ার্ড পরিবর্তন ব্যর্থ' })
    }
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ep_auth') || 'null')
      if (saved?.loggedIn) setAuth(saved)
    } catch { /* ignore */ }
    try {
      const r = JSON.parse(localStorage.getItem('eprohori_reports') || '[]')
      if (Array.isArray(r)) setReports(r)
    } catch { /* ignore */ }
    fetchRangers().then(setRangers)
    refreshSession() // sliding JWT renewal (no-op when offline or logged out)
    setLoaded(true)
  }, [])

  // All of this user's reports across every district (server-side, by email)
  const [myServerReports, setMyServerReports] = useState<MyReport[]>([])
  useEffect(() => {
    if (auth?.email) fetchMyReports(auth.email).then(setMyServerReports)
  }, [auth?.email])

  // Account deletion (danger zone)
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [view, setView] = useState<'overview' | 'quiz' | 'settings' | 'reports' | 'leaderboard'>('overview')
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const confirmDelete = async () => {
    setDeleting(true)
    await deleteAccount() // backend removal (no-op if offline)
    try {
      localStorage.removeItem('ep_auth')
      localStorage.removeItem('ep_token')
      localStorage.removeItem('eprohori_profile')
      localStorage.removeItem('eprohori_reports')
    } catch { /* ignore */ }
    setDeleting(false)
    setDeleteOpen(false)
    setDeleted(true)
    setTimeout(() => router.push('/'), 1800)
  }

  // District threat-alert opt-in (default ON for new users)
  const [notifyAlerts, setNotifyAlerts] = useState(true)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ep_auth') || 'null')
      if (saved && typeof saved.notify_alerts === 'boolean') setNotifyAlerts(saved.notify_alerts)
    } catch { /* ignore */ }
  }, [auth?.email])

  const toggleNotifyAlerts = async () => {
    if (!auth) return
    const next = !notifyAlerts
    setNotifyAlerts(next)
    try {
      await updatePreferences({ notify_alerts: next })
      const updated = { ...auth, notify_alerts: next } as AuthUser & { notify_alerts: boolean }
      localStorage.setItem('ep_auth', JSON.stringify(updated))
    } catch { /* offline — still toggles locally */ }
  }

  // Profile picture upload (base64, max 2MB, stored with account data)
  const [photoError, setPhotoError] = useState('')
  const handlePhoto = (file: File | null) => {
    setPhotoError('')
    if (!file || !auth) return
    // Profile photo can be changed at most once every 30 days.
    const MONTH_MS = 30 * 24 * 3600 * 1000
    try {
      const last = Number(localStorage.getItem('ep_photo_changed_at') || 0)
      if (last && Date.now() - last < MONTH_MS) {
        const days = Math.ceil((MONTH_MS - (Date.now() - last)) / (24 * 3600 * 1000))
        setPhotoError(`ছবি মাসে একবার পরিবর্তন করা যায় — ${days} দিন পর আবার চেষ্টা করুন।`)
        return
      }
    } catch { /* ignore */ }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('সর্বোচ্চ ২MB ছবি আপলোড করা যাবে')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const updated = { ...auth, avatar: reader.result as string }
      localStorage.setItem('ep_auth', JSON.stringify(updated))
      try { localStorage.setItem('ep_photo_changed_at', String(Date.now())) } catch { /* ignore */ }
      setAuth(updated)
    }
    reader.readAsDataURL(file)
  }

  const handleLogout = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('ep_auth') || 'null')
      if (saved) localStorage.setItem('ep_auth', JSON.stringify({ ...saved, loggedIn: false }))
    } catch {
      localStorage.removeItem('ep_auth')
    }
    setAuthToken(null) // invalidate the JWT session locally
    setAuth(null)
  }

  if (!loaded) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="h-40 rounded-2xl shimmer-base" style={{ backgroundColor: 'rgba(13,24,41,0.8)' }} />
      </div>
    )
  }

  if (!auth) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-14">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-white mb-2">{t('nav_profile')}</h1>
          <p className="text-slate-400 text-sm">লগইন করুন বা নতুন অ্যাকাউন্ট তৈরি করুন</p>
        </div>
        <AuthForm onAuth={setAuth} />
      </div>
    )
  }

  // ── Logged-in derived data ──
  // Authoritative count = the user's server-side reports (by email); fall back to
  // local/auth only while the server list is still loading.
  const totalReports  = myServerReports.length || reports.length || auth.reports || 0
  const verifiedCount = myServerReports.length
    ? myServerReports.filter(r => r.status === 'verified').length
    : reports.filter(r => r.isPhishing).length
  const protectedPpl  = totalReports * 27
  let xp = auth.xp ?? 0
  try {
    const p = JSON.parse(localStorage.getItem('eprohori_profile') || 'null')
    if (p?.xp != null) xp = p.xp
  } catch { /* ignore */ }
  const { current, next, progress } = levelFor(xp)
  const myRankIdx = rangers.findIndex(r => r.name === auth.name)
  const myRank    = auth.rank ? `#${auth.rank}` : myRankIdx >= 0 ? `#${myRankIdx + 1}` : '—'
  const joined    = new Date(auth.joinedAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">

      {/* ── Header card ── */}
      <div
        className="rounded-3xl p-8 fade-in-up relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(0,229,196,0.06) 0%, rgba(10,15,28,0.85) 100%)',
          border: '1px solid rgba(148,163,184,0.08)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.6)',
        }}
      >
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 text-xs px-3 py-1.5 rounded-full font-semibold transition-all hover:scale-105"
          style={{ border: '1px solid rgba(255,68,68,0.35)', color: '#ff6666', backgroundColor: 'rgba(255,68,68,0.06)' }}
        >
          {t('logout_btn')}
        </button>
        <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
          <div className="flex flex-col items-center gap-2 shrink-0">
            {auth.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={auth.avatar}
                alt="profile"
                className="rounded-full"
                style={{ width: 80, height: 80, objectFit: 'cover', border: '2px solid rgba(0,229,196,0.4)' }}
              />
            ) : (
              <div
                className="rounded-full flex items-center justify-center font-heading font-bold text-3xl"
                style={{ width: 80, height: 80, backgroundColor: 'rgba(0,229,196,0.15)', border: '2px solid rgba(0,229,196,0.4)', color: '#00e5c4' }}
              >
                {auth.name.charAt(0).toUpperCase()}
              </div>
            )}
            <label
              className="text-xs px-3 py-1 rounded-full cursor-pointer transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(0,229,196,0.3)', color: '#00e5c4' }}
            >
              📷 Change Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handlePhoto(e.target.files?.[0] ?? null)}
              />
            </label>
            {photoError && <p className="text-xs" style={{ color: '#ff4444' }}>{photoError}</p>}
          </div>
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold text-white mb-1">{auth.name}</h1>
            <p className="text-sm text-slate-400">
              📧 {auth.email}{auth.phone ? <> &nbsp;·&nbsp; 📱 {auth.phone}</> : null}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ backgroundColor: 'rgba(0,229,196,0.1)', border: '1px solid rgba(0,229,196,0.25)', color: '#00e5c4' }}
              >
                📍 {auth.division}
              </span>
              <span className="text-xs text-slate-500">সদস্য: {joined}</span>
            </div>
          </div>
          <button
            onClick={openEdit}
            className="self-start sm:self-center text-sm px-5 py-2.5 rounded-xl font-semibold transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8' }}
          >
            ✏️ Edit Profile
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'মোট রিপোর্ট',      value: String(totalReports),          icon: '📊', color: '#00e5c4' },
          { label: 'যাচাইকৃত রিপোর্ট', value: String(verifiedCount),         icon: '✅', color: '#22c55e' },
          { label: 'সুরক্ষিত মানুষ',    value: protectedPpl.toLocaleString(), icon: '🛡️', color: '#f59e0b' },
          { label: 'বর্তমান র‍্যাংক',   value: myRank,                        icon: '🏆', color: '#a855f7' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl p-5 text-center fade-in-up"
            style={{ backgroundColor: '#0d1829', border: `1px solid ${s.color}22` }}
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="font-heading font-bold text-2xl mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          ['overview', '🎖️ প্রোফাইল'],
          ['quiz', '🧠 কুইজ'],
          ['reports', '📋 রিপোর্ট'],
          ['leaderboard', '🏆 র‍্যাংকিং'],
          ['settings', '⚙️ সেটিংস'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: view === k ? 'rgba(0,229,196,0.12)' : 'rgba(13,24,41,0.6)',
              border: `1px solid ${view === k ? 'rgba(0,229,196,0.35)' : 'rgba(255,255,255,0.06)'}`,
              color: view === k ? '#00e5c4' : '#94a3b8',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Badge / level (overview) ── */}
      {view === 'overview' && (
      <div
        className="rounded-2xl p-6 fade-in-up"
        style={{ background: 'rgba(13,24,41,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{current.icon}</span>
          <div>
            <p className="font-heading text-xl font-bold text-white">{current.name}</p>
            <p className="text-xs text-slate-400">{xp} XP</p>
          </div>
          {next && (
            <p className="ml-auto text-xs text-slate-500">
              পরবর্তী: <span style={{ color: '#00e5c4' }}>{next.name}</span> ({next.minXp} XP)
            </p>
          )}
        </div>
        <div className="h-2.5 rounded-full" style={{ backgroundColor: 'rgba(30,58,95,0.6)' }}>
          <div
            className="h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #00e5c488, #00e5c4)' }}
          />
        </div>
        <div className="flex justify-between mt-2 flex-wrap gap-1">
          {LEVELS.map(l => (
            <span key={l.name} className="text-xs" style={{ color: xp >= l.minXp ? '#00e5c4' : '#475569' }}>
              {l.icon} {l.name}
            </span>
          ))}
        </div>
      </div>
      )}

      {/* ── Daily quiz ── */}
      {view === 'quiz' && (
        <DailyQuizView
          email={auth.email}
          onXp={(totalXp) => {
            setAuth(prev => (prev ? { ...prev, xp: totalXp } : prev))
            try {
              const p = JSON.parse(localStorage.getItem('eprohori_profile') || 'null')
              if (p) { p.xp = totalXp; localStorage.setItem('eprohori_profile', JSON.stringify(p)) }
            } catch { /* ignore */ }
          }}
        />
      )}

      {/* ── Account settings ── */}
      {view === 'settings' && (
        <div
          className="rounded-2xl p-6 fade-in-up"
          style={{ background: 'rgba(13,24,41,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h2 className="font-heading text-lg font-bold text-white mb-4">⚙️ Account Settings</h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t('lang_label')}</span>
              <div className="flex gap-2">
                {(['en', 'bn'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                    style={{
                      backgroundColor: lang === l ? '#00e5c4' : 'rgba(255,255,255,0.05)',
                      color: lang === l ? '#060d1a' : '#94a3b8',
                    }}
                  >
                    {l === 'en' ? 'EN' : 'বাংলা'}
                  </button>
                ))}
              </div>
            </div>
            {/* District threat-alert opt-in */}
            <div
              className="flex items-start justify-between gap-3 pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div>
                <p className="text-slate-300 font-semibold">🔔 Threat alert emails</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  90%+ instant, 70-89% after admin verification
                </p>
              </div>
              <button
                onClick={toggleNotifyAlerts}
                aria-label="Toggle threat alerts"
                style={{
                  width: 44, height: 24, borderRadius: 999, position: 'relative',
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                  backgroundColor: notifyAlerts ? '#00e5c4' : 'rgba(255,255,255,0.15)',
                  transition: 'background-color 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: notifyAlerts ? 22 : 2,
                  width: 20, height: 20, borderRadius: '50%',
                  backgroundColor: '#fff', transition: 'left 0.2s',
                }} />
              </button>
            </div>
            <div className="flex justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-slate-400">{t('email_label')}</span>
              <span className="text-white">{auth.email}</span>
            </div>
            <div className="flex justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-slate-400">ফোন</span>
              <span className="text-white">{auth.phone || '—'}</span>
            </div>
            <div className="flex justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-slate-400">{t('division_label')}</span>
              <span className="text-white">{auth.division}</span>
            </div>
            <button
              onClick={() => { setPwMsg(null); setPwOld(''); setPwNew(''); setPwConfirm(''); setPwOpen(true) }}
              className="w-full mt-2 text-sm px-4 py-2.5 rounded-xl font-semibold transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
            >
              🔒 Change Password
            </button>

            {/* Danger zone */}
            <div className="pt-4 mt-2" style={{ borderTop: '1px solid rgba(255,68,68,0.2)' }}>
              <p className="text-xs font-bold mb-2" style={{ color: '#ff6666' }}>⚠️ Danger Zone</p>
              <button
                onClick={() => setDeleteOpen(true)}
                className="w-full text-sm px-4 py-2.5 rounded-xl font-semibold transition-all hover:scale-[1.01]"
                style={{ border: '1px solid rgba(255,68,68,0.4)', color: '#ff4444', backgroundColor: 'rgba(255,68,68,0.06)' }}
              >
                🗑️ Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent activity (reports) ── */}
      {view === 'reports' && (
        <div
          className="rounded-2xl p-6 fade-in-up"
          style={{ background: 'rgba(13,24,41,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h2 className="font-heading text-lg font-bold text-white mb-4">🕐 Recent Activity</h2>
          {myServerReports.length > 0 ? (
            /* All of this account's reports — every district, every status */
            <div className="space-y-3">
              {myServerReports.slice(0, 8).map(r => (
                <button
                  key={r.id}
                  onClick={() => router.push('/report/' + r.id)}
                  className="w-full flex items-center gap-3 text-sm text-left rounded-lg p-1.5 transition-colors hover:bg-white/5"
                >
                  <span className="text-lg shrink-0">{typeIcon[r.type] ?? '⚠️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 truncate">{r.detail}</p>
                    <p className="text-xs text-slate-600">📍 {r.division}</p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        r.status === 'verified' ? 'rgba(34,197,94,0.1)'
                        : r.status === 'rejected' ? 'rgba(255,68,68,0.1)'
                        : 'rgba(245,158,11,0.1)',
                      color:
                        r.status === 'verified' ? '#22c55e'
                        : r.status === 'rejected' ? '#ff4444'
                        : '#f59e0b',
                    }}
                  >
                    {r.status === 'verified' ? '✓ যাচাইকৃত' : r.status === 'rejected' ? '✕ বাতিল' : '⏳ পেন্ডিং'}
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">{timeAgo(r.created_at)}</span>
                </button>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm text-slate-500">এখনো কোনো রিপোর্ট নেই</p>
              <Link href="/report" className="inline-block mt-3 text-sm font-semibold" style={{ color: '#00e5c4' }}>
                প্রথম রিপোর্ট করুন →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-lg shrink-0">{typeIcon[r.type] ?? '⚠️'}</span>
                  <p className="flex-1 text-slate-300 truncate">{r.detail}</p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: r.isPhishing ? 'rgba(255,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                      color: r.isPhishing ? '#ff4444' : '#22c55e',
                    }}
                  >
                    {r.isPhishing ? '⚠️ হুমকি' : '✅ নিরাপদ'}
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">{timeAgo(r.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Community rank / leaderboard ── */}
      {view === 'leaderboard' && (
      <div
        className="rounded-2xl p-6 fade-in-up"
        style={{ background: 'rgba(13,24,41,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h2 className="font-heading text-lg font-bold text-white mb-4">🏆 Community Rank — Top 10</h2>
        <div className="space-y-2">
          {rangers.slice(0, 10).map((r, i) => {
            const isMe = r.name === auth.name
            return (
              <div
                key={`${r.rank}-${r.name}`}
                className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{
                  backgroundColor: isMe ? 'rgba(0,229,196,0.08)' : i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  border: isMe ? '1px solid rgba(0,229,196,0.3)' : '1px solid transparent',
                }}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    backgroundColor: i === 0 ? 'rgba(245,158,11,0.2)' : i < 3 ? 'rgba(148,163,184,0.15)' : 'rgba(255,255,255,0.05)',
                    color: i === 0 ? '#f59e0b' : i < 3 ? '#94a3b8' : '#64748b',
                  }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium" style={{ color: isMe ? '#00e5c4' : '#fff' }}>
                  {r.name}{isMe ? ' (আপনি)' : ''}
                </span>
                <span className="text-xs text-slate-500">{r.division}</span>
                <span className="text-sm font-bold" style={{ color: '#00e5c4' }}>{r.xp} XP</span>
              </div>
            )
          })}
        </div>
      </div>
      )}

      {/* ── Edit Profile modal ── */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setEditOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 fade-in-up"
            style={{ background: 'rgba(13,24,41,0.97)', border: '1px solid rgba(0,229,196,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-heading text-lg font-bold text-white mb-4">✏️ Edit Profile</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{t('name_label')}</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveProfile() } }}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">ফোন নম্বর</label>
                <input
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveProfile() } }}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{t('district_label')}</label>
                <DistrictSelect value={editDivision} onChange={setEditDivision} />
              </div>
              {editMsg && <p className="text-xs font-semibold" style={{ color: '#ff4444' }}>⚠️ {editMsg}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={saveProfile} className="btn-primary flex-1 py-2.5">Save</button>
                <button
                  onClick={() => setEditOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account confirmation modal ── */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
          onClick={() => !deleting && setDeleteOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 fade-in-up"
            style={{ background: 'rgba(13,24,41,0.97)', border: '1px solid rgba(255,68,68,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-3xl text-center mb-3">⚠️</p>
            <h3 className="font-heading text-lg font-bold text-white text-center mb-2">Delete Account?</h3>
            <p className="text-sm text-slate-400 text-center mb-5">
              Are you sure? This will permanently delete your account and cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ backgroundColor: '#ff4444', color: '#fff', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deleted success toast ── */}
      {deleted && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
        >
          <div
            className="rounded-2xl px-8 py-6 text-center fade-in-up"
            style={{ background: 'rgba(13,24,41,0.97)', border: '1px solid rgba(34,197,94,0.4)' }}
          >
            <p className="text-3xl mb-2">✅</p>
            <p className="font-semibold text-white">Account deleted successfully</p>
            <p className="text-xs text-slate-500 mt-1">হোম পেজে নিয়ে যাওয়া হচ্ছে...</p>
          </div>
        </div>
      )}

      {/* ── Change Password modal ── */}
      {pwOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setPwOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 fade-in-up"
            style={{ background: 'rgba(13,24,41,0.97)', border: '1px solid rgba(0,229,196,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-heading text-lg font-bold text-white mb-4">🔒 Change Password</h3>
            <div className="space-y-3">
              <input
                type="password"
                value={pwOld}
                onChange={e => setPwOld(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitPasswordChange() } }}
                placeholder="বর্তমান পাসওয়ার্ড"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600"
                style={inputStyle}
              />
              <input
                type="password"
                value={pwNew}
                onChange={e => setPwNew(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitPasswordChange() } }}
                placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600"
                style={inputStyle}
              />
              <input
                type="password"
                value={pwConfirm}
                onChange={e => setPwConfirm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitPasswordChange() } }}
                placeholder="নতুন পাসওয়ার্ড নিশ্চিত করুন"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600"
                style={inputStyle}
              />
              {pwMsg && (
                <p className="text-xs font-semibold" style={{ color: pwMsg.ok ? '#22c55e' : '#ff4444' }}>
                  {pwMsg.ok ? pwMsg.text : `⚠️ ${pwMsg.text}`}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={submitPasswordChange} className="btn-primary flex-1 py-2.5">Change</button>
                <button
                  onClick={() => setPwOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
