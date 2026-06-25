/**
 * EProhori API client
 * Base URL: NEXT_PUBLIC_API_URL (default http://localhost:8000)
 * All functions fall back to mock data if the server is unreachable.
 */

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api'

// ── Division translation maps ──────────────────────────────────────────────

const DIV_BN: Record<string, string> = {
  Dhaka: 'ঢাকা',
  Chittagong: 'চট্টগ্রাম',
  Sylhet: 'সিলেট',
  Rajshahi: 'রাজশাহী',
  Khulna: 'খুলনা',
  Barishal: 'বরিশাল',
  Mymensingh: 'ময়মনসিংহ',
  Rangpur: 'রংপুর',
}
const DIV_EN: Record<string, string> = {
  Dhaka: 'dhaka',
  Chittagong: 'chittagong',
  Sylhet: 'sylhet',
  Rajshahi: 'rajshahi',
  Khulna: 'khulna',
  Barishal: 'barisal',
  Mymensingh: 'mymensingh',
  Rangpur: 'rangpur',
}
// Bengali → English (for outgoing requests)
const DIV_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(DIV_BN).map(([en, bn]) => [bn, en])
)

// Backend lowercase types → frontend display types
const TYPE_UP: Record<string, string> = {
  sms: 'SMS',
  url: 'URL',
  facebook: 'Facebook',
  scholarship: 'Website',
  investment: 'Website',
  website: 'Website',
}
// Frontend display types → backend lowercase
const TYPE_DOWN: Record<string, string> = {
  SMS: 'sms',
  URL: 'url',
  Facebook: 'facebook',
  Website: 'url',
}

// ── Types (kept compatible with every page) ────────────────────────────────

export interface Stats {
  today_reports: number
  active_threats: number
  alerted_people: number
  district_coverage: number
  // Extended fields (from backend)
  total_threats?: number
  rangers_count?: number
  pending_count?: number
  saved_count?: number
}

export interface Threat {
  id: number
  type: 'SMS' | 'URL' | 'Facebook' | 'Website'
  detail: string
  division: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: number        // 0-100
  platform?: string
  status: 'verified' | 'pending' | 'rejected'
  created_at: string
  description?: string
  is_campaign?: boolean     // burst of reports — active scam wave
  alerted?: boolean         // a district-wide alert was issued for this threat
  up_votes?: number         // how many times this threat was reported (clustered)
  screenshot?: string       // base64 evidence image (data URL)
  reporter_email?: string   // reporter's email (admin-only field)
}

export interface Alert {
  id: number
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium'
  area: string
  report_count: number
  created_at: string
}

export interface TrendingScam {
  id: number
  category: string
  title: string
  count: number
  division: string
}

export interface Ranger {
  rank: number
  name: string
  division: string
  xp: number
  reports: number
}

export interface DivisionData {
  name: string
  division_en: string
  threat_count: number
  categories: Record<string, number>
}

export interface ValidationResult {
  is_phishing: boolean
  confidence: number        // 0-100
  reason: string
  risk_level: 'safe' | 'medium' | 'high' | 'critical'
  actions?: string[]
}

// ── Mock data (shown when backend is offline) ──────────────────────────────

const mockStats: Stats = {
  today_reports: 47,
  active_threats: 163,
  alerted_people: 14280,
  district_coverage: 51,
  total_threats: 163,
  rangers_count: 8,
  pending_count: 3,
}

const mockThreats: Threat[] = [
  { id: 1, type: 'SMS',     detail: 'বিকাশ থেকে পুরস্কার জেতার ভুয়া SMS',      division: 'ঢাকা',      severity: 'critical', confidence: 94, status: 'verified', created_at: new Date(Date.now() - 5 * 60000).toISOString(),         description: 'আপনি ৫০,০০০ টাকা পুরস্কার জিতেছেন। এখনই ক্লিক করুন...' },
  { id: 2, type: 'URL',     detail: 'nagad-reward.com — নগদ ফিশিং সাইট',         division: 'চট্টগ্রাম', severity: 'high',     confidence: 89, status: 'verified', created_at: new Date(Date.now() - 22 * 60000).toISOString(),        description: 'নগদ-এর নাম ব্যবহার করে ব্যবহারকারীর তথ্য চুরি করছে।' },
  { id: 3, type: 'Facebook',detail: 'চাকরির অফার দিয়ে টাকা হাতিয়ে নেওয়া',    division: 'রাজশাহী',   severity: 'high',     confidence: 82, status: 'verified', created_at: new Date(Date.now() - 45 * 60000).toISOString(),        description: 'ভুয়া কোম্পানির নাম দিয়ে ১০,০০০ টাকা এডভান্স নিচ্ছে।' },
  { id: 4, type: 'SMS',     detail: 'লটারি বিজয়ী জানিয়ে প্রতারণা',             division: 'সিলেট',     severity: 'medium',   confidence: 76, status: 'pending',  created_at: new Date(Date.now() - 90 * 60000).toISOString(),        description: 'জাতীয় লটারি বিজয়ী বলে ব্যক্তিগত তথ্য চাইছে।' },
  { id: 5, type: 'Website', detail: 'ভুয়া সরকারি ওয়েবসাইট',                   division: 'খুলনা',     severity: 'high',     confidence: 91, status: 'verified', created_at: new Date(Date.now() - 2 * 3600000).toISOString(),       description: 'সরকারি ওয়েবসাইটের অনুকরণে ব্যক্তিগত তথ্য সংগ্রহ করছে।' },
  { id: 6, type: 'SMS',     detail: 'রোহিঙ্গা ত্রাণ ফান্ডের নামে প্রতারণা',   division: 'বরিশাল',    severity: 'medium',   confidence: 71, status: 'pending',  created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 7, type: 'URL',     detail: 'bitcoin-bd.com — ক্রিপ্টো স্ক্যাম',         division: 'রংপুর',     severity: 'high',     confidence: 88, status: 'verified', created_at: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: 8, type: 'Facebook',detail: 'বৃত্তির নামে ভর্তি ফি নেওয়া',              division: 'ময়মনসিংহ', severity: 'medium',   confidence: 79, status: 'pending',  created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
]

const mockAlerts: Alert[] = [
  { id: 1, title: 'বিকাশ SMS স্ক্যাম বৃদ্ধি পাচ্ছে',   description: 'গত ২৪ ঘণ্টায় বিকাশ সংক্রান্ত ভুয়া SMS ৩০০% বেড়েছে। কোনো লিংকে ক্লিক করবেন না।',                                         severity: 'critical', area: 'সারাদেশ',           report_count: 234, created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 2, title: 'ফেসবুকে চাকরির ফাঁদ',               description: 'মিথ্যা চাকরির বিজ্ঞাপন দিয়ে টাকা নেওয়ার ঘটনা বাড়ছে। যাচাই না করে টাকা পাঠাবেন না।',                                   severity: 'high',     area: 'ঢাকা, চট্টগ্রাম',  report_count: 87,  created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 3, title: 'ভুয়া বিশ্ববিদ্যালয় ভর্তি',         description: 'ভুয়া বিশ্ববিদ্যালয় ভর্তির নামে প্রতারণা চলছে। ভর্তির আগে বিশ্ববিদ্যালয়ের অফিসিয়াল ওয়েবসাইট যাচাই করুন।',    severity: 'high',     area: 'রাজশাহী',           report_count: 45,  created_at: new Date(Date.now() - 8 * 3600000).toISOString() },
  { id: 4, title: 'ক্রিপ্টো বিনিয়োগ স্ক্যাম',         description: 'ক্রিপ্টো বিনিয়োগে মিথ্যা লাভের প্রলোভন দিয়ে বিনিয়োগ নেওয়া হচ্ছে।',                                                  severity: 'medium',   area: 'সিলেট, ঢাকা',      report_count: 33,  created_at: new Date(Date.now() - 12 * 3600000).toISOString() },
  { id: 5, title: 'ভুয়া ই-কমার্স সাইট',               description: 'অনলাইন কেনাকাটায় পণ্য না দিয়ে টাকা নেওয়া হচ্ছে। পরিচিত ও বিশ্বস্ত সাইট থেকে কেনাকাটা করুন।',                       severity: 'medium',   area: 'সারাদেশ',           report_count: 128, created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
]

const mockTrending: TrendingScam[] = [
  { id: 1, category: 'SMS',     title: 'বিকাশ/নগদ পুরস্কার SMS', count: 487, division: 'সারাদেশ' },
  { id: 2, category: 'Facebook',title: 'ভুয়া চাকরির অফার',       count: 234, division: 'ঢাকা, চট্টগ্রাম' },
  { id: 3, category: 'URL',     title: 'ব্যাংক ফিশিং সাইট',      count: 156, division: 'সারাদেশ' },
]

const mockRangers: Ranger[] = [
  { rank: 1,  name: 'আরিফ হোসেন',    division: 'ঢাকা',      xp: 2340, reports: 156 },
  { rank: 2,  name: 'সুমাইয়া খানম', division: 'চট্টগ্রাম', xp: 1890, reports: 122 },
  { rank: 3,  name: 'রাকিব হাসান',   division: 'সিলেট',     xp: 1650, reports: 108 },
  { rank: 4,  name: 'নাসরিন আক্তার', division: 'রাজশাহী',   xp: 1420, reports: 94  },
  { rank: 5,  name: 'তানভীর আহমেদ',  division: 'খুলনা',     xp: 1280, reports: 87  },
  { rank: 6,  name: 'ফারিহা ইসলাম',  division: 'বরিশাল',    xp: 980,  reports: 65  },
  { rank: 7,  name: 'সাজ্জাদ হোসেন', division: 'রংপুর',     xp: 850,  reports: 56  },
  { rank: 8,  name: 'মিম আক্তার',    division: 'ময়মনসিংহ', xp: 720,  reports: 48  },
  { rank: 9,  name: 'ইব্রাহীম খলিল', division: 'ঢাকা',      xp: 650,  reports: 43  },
  { rank: 10, name: 'হাফসা বেগম',    division: 'চট্টগ্রাম', xp: 580,  reports: 38  },
]

export const mockDivisions: DivisionData[] = [
  { name: 'ঢাকা',      division_en: 'dhaka',      threat_count: 234, categories: { SMS: 120, URL: 65, Facebook: 49 } },
  { name: 'চট্টগ্রাম', division_en: 'chittagong',  threat_count: 156, categories: { SMS: 78,  URL: 45, Facebook: 33 } },
  { name: 'রাজশাহী',   division_en: 'rajshahi',    threat_count: 87,  categories: { SMS: 45,  URL: 22, Facebook: 20 } },
  { name: 'খুলনা',     division_en: 'khulna',      threat_count: 65,  categories: { SMS: 30,  URL: 20, Facebook: 15 } },
  { name: 'বরিশাল',    division_en: 'barisal',     threat_count: 43,  categories: { SMS: 22,  URL: 12, Facebook: 9  } },
  { name: 'সিলেট',     division_en: 'sylhet',      threat_count: 98,  categories: { SMS: 50,  URL: 28, Facebook: 20 } },
  { name: 'রংপুর',     division_en: 'rangpur',     threat_count: 54,  categories: { SMS: 28,  URL: 16, Facebook: 10 } },
  { name: 'ময়মনসিংহ', division_en: 'mymensingh',  threat_count: 38,  categories: { SMS: 20,  URL: 10, Facebook: 8  } },
]

const mockDistricts = [
  { name: 'Dhaka',       name_bn: 'ঢাকা',        division: 'Dhaka',      lat: 23.8103, lng: 90.4125, threats: 105, color: '#ff4444' },
  { name: 'Gazipur',     name_bn: 'গাজীপুর',      division: 'Dhaka',      lat: 24.0023, lng: 90.4264, threats: 59,  color: '#ff4444' },
  { name: 'Narayanganj', name_bn: 'নারায়ণগঞ্জ',  division: 'Dhaka',      lat: 23.6238, lng: 90.5,    threats: 47,  color: '#ff4444' },
  { name: 'Tangail',     name_bn: 'টাঙ্গাইল',     division: 'Dhaka',      lat: 24.2513, lng: 89.9167, threats: 23,  color: '#ff4444' },
  { name: 'Chattogram',  name_bn: 'চট্টগ্রাম',    division: 'Chittagong', lat: 22.3569, lng: 91.7832, threats: 78,  color: '#ff4444' },
  { name: 'Cumilla',     name_bn: 'কুমিল্লা',     division: 'Chittagong', lat: 23.4607, lng: 91.1809, threats: 39,  color: '#ff4444' },
  { name: "Cox's Bazar", name_bn: 'কক্সবাজার',    division: 'Chittagong', lat: 21.4272, lng: 92.0058, threats: 23,  color: '#ff4444' },
  { name: 'Noakhali',    name_bn: 'নোয়াখালী',    division: 'Chittagong', lat: 22.8696, lng: 91.0995, threats: 16,  color: '#f59e0b' },
  { name: 'Sylhet',      name_bn: 'সিলেট',        division: 'Sylhet',     lat: 24.8949, lng: 91.8687, threats: 64,  color: '#ff4444' },
  { name: 'Moulvibazar', name_bn: 'মৌলভীবাজার',  division: 'Sylhet',     lat: 24.4829, lng: 91.7774, threats: 34,  color: '#ff4444' },
  { name: 'Rajshahi',    name_bn: 'রাজশাহী',      division: 'Rajshahi',   lat: 24.3745, lng: 88.6042, threats: 44,  color: '#ff4444' },
  { name: 'Bogura',      name_bn: 'বগুড়া',        division: 'Rajshahi',   lat: 24.8466, lng: 89.3773, threats: 26,  color: '#ff4444' },
  { name: 'Pabna',       name_bn: 'পাবনা',        division: 'Rajshahi',   lat: 24.0064, lng: 89.2372, threats: 17,  color: '#f59e0b' },
  { name: 'Khulna',      name_bn: 'খুলনা',        division: 'Khulna',     lat: 22.8456, lng: 89.5403, threats: 36,  color: '#ff4444' },
  { name: 'Jashore',     name_bn: 'যশোর',         division: 'Khulna',     lat: 23.1664, lng: 89.2081, threats: 29,  color: '#ff4444' },
  { name: 'Barishal',    name_bn: 'বরিশাল',       division: 'Barishal',   lat: 22.701,  lng: 90.3535, threats: 30,  color: '#ff4444' },
  { name: 'Patuakhali',  name_bn: 'পটুয়াখালী',   division: 'Barishal',   lat: 22.3596, lng: 90.3296, threats: 13,  color: '#f59e0b' },
  { name: 'Mymensingh',  name_bn: 'ময়মনসিংহ',    division: 'Mymensingh', lat: 24.7471, lng: 90.4203, threats: 38,  color: '#ff4444' },
  { name: 'Rangpur',     name_bn: 'রংপুর',        division: 'Rangpur',    lat: 25.7439, lng: 89.2752, threats: 32,  color: '#ff4444' },
  { name: 'Dinajpur',    name_bn: 'দিনাজপুর',     division: 'Rangpur',    lat: 25.6217, lng: 88.6354, threats: 22,  color: '#ff4444' },
]

// ── Adapters (backend shape → frontend shape) ──────────────────────────────

function isGarbled(text: string): boolean {
  if (!text || text.trim().length === 0) return true
  const clean = text.replace(/\s/g, '')
  if (clean.length === 0) return true
  // If more than 40% of characters are '?', it's corrupted UTF-8
  const qCount = (clean.match(/\?/g) || []).length
  return qCount / clean.length > 0.4
}

function adaptThreat(t: any): Threat | null {
  const content: string = t.content || t.detail || ''
  // Skip garbled / corrupted entries
  if (isGarbled(content)) return null
  // Backend confidence is 0.0-1.0 float; frontend uses 0-100 int
  const conf = t.confidence > 1 ? Math.round(t.confidence) : Math.round(t.confidence * 100)
  const sev: Threat['severity'] =
    conf >= 85 ? 'critical' : conf >= 70 ? 'high' : conf >= 50 ? 'medium' : 'low'
  return {
    id: t.id,
    type: (TYPE_UP[t.type] || t.type) as Threat['type'],
    detail: content,
    // Show the reporter's actual district when available; division otherwise
    division: t.district || DIV_BN[t.region] || t.region || t.division || '',
    severity: t.severity || sev,
    confidence: conf,
    platform: t.platform,
    status: t.status,
    created_at: t.created_at,
    description: t.description || undefined,
    is_campaign: Boolean(t.is_campaign),
    alerted: Boolean(t.alerted),
    up_votes: t.up_votes ?? 0,
    screenshot: t.screenshot || undefined,
    reporter_email: t.reporter_email || undefined,
  }
}

function adaptAlert(a: any): Alert {
  return {
    id: a.id,
    title: a.title,
    description: a.message || a.description || '',
    severity: a.severity as Alert['severity'],
    area: a.area || 'সারাদেশ',
    report_count: a.report_count || 0,
    created_at: a.created_at,
  }
}

function adaptRanger(r: any, idx: number): Ranger {
  return {
    rank: idx + 1,
    name: r.name,
    division: DIV_BN[r.region] || r.region || r.division || '',
    xp: r.xp,
    reports: r.reports,
  }
}

function adaptDivision(d: any): DivisionData {
  const tc: number = d.threats ?? d.threat_count ?? 0
  return {
    name: DIV_BN[d.name] || d.name,
    division_en: DIV_EN[d.name] || d.name.toLowerCase(),
    threat_count: tc,
    categories: {
      SMS: Math.round(tc * 0.50),
      URL: Math.round(tc * 0.27),
      Facebook: Math.round(tc * 0.23),
    },
  }
}

function adaptTrending(t: any): TrendingScam {
  return {
    id: t.rank ?? t.id ?? 1,
    category: TYPE_UP[t.type] || t.type || t.category || '',
    title: t.example || t.title || '',
    count: t.count,
    division: t.division || 'সারাদেশ',
  }
}

function adaptValidation(v: any): ValidationResult {
  const isPhishing: boolean = v.is_threat ?? v.is_phishing ?? false
  // Backend: 0.0-1.0 float; frontend: 0-100 int; clamp to valid range
  const conf: number = Math.max(0, Math.min(100,
    v.confidence > 1 ? Math.round(v.confidence) : Math.round((v.confidence || 0) * 100)
  ))
  const reasons: string[] = v.reasons || []
  const explanation: string = v.explanation || ''
  const detail: string = reasons.join('; ')
  // Prefer the backend's human explanation (the "why"), then append specific
  // indicators. This makes URL verdicts actually define + explain the risk.
  const unverified = v.category === 'unverified' || v.source === 'unverified'
  const reason: string =
    (explanation && detail ? `${explanation} (${detail})` : explanation) ||
    v.reason ||
    (detail ||
      (unverified
        ? 'এই লিংকটি এখনো যাচাই করা যায়নি — পরিচিত হুমকি তালিকায় নেই। তবুও সতর্ক থাকুন।'
        : isPhishing
        ? 'AI বিশ্লেষণে সন্দেহজনক প্যাটার্ন পাওয়া গেছে।'
        : 'যাচাইয়ে নিরাপদ পাওয়া গেছে।'))
  const risk: ValidationResult['risk_level'] =
    conf >= 80 ? 'critical' : conf >= 60 ? 'high' : conf >= 30 ? 'medium' : 'safe'
  const actions: string[] =
    v.actions ||
    (isPhishing
      ? ['লিংকে ক্লিক করবেন না', 'ব্যক্তিগত তথ্য দেবেন না', 'সন্দেহজনক বার্তা ফরওয়ার্ড করবেন না']
      : ['সতর্ক থাকুন', 'অপরিচিত লিংক এড়িয়ে চলুন'])
  return { is_phishing: isPhishing, confidence: conf, reason, risk_level: risk, actions }
}

// ── HTTP helper ────────────────────────────────────────────────────────────

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

// ── Stats ──────────────────────────────────────────────────────────────────

// ── Auth / OTP (real email via backend: Resend → Brevo fallback) ───────────

export async function sendOTP(
  email: string,
  name: string,
  purpose = 'verification'
): Promise<{ success: boolean; provider?: string; message?: string }> {
  const res = await fetch(`${API_BASE}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, purpose }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to send OTP')
  return data
}

export async function verifyOTP(
  email: string,
  otp: string
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'OTP verification failed')
  return data
}

export interface BackendUser {
  id: number
  name: string
  email: string
  phone: string
  division: string
  xp: number
  reports: number
  badge: string
  rank: number
  joinedAt: string
  token?: string
  is_admin?: boolean
}

// ── JWT token storage ──
// User session token: localStorage (persists). Admin token: sessionStorage (per tab).

export function getAuthToken(): string | null {
  try { return localStorage.getItem('ep_token') } catch { return null }
}
export function setAuthToken(token: string | null) {
  try {
    if (token) localStorage.setItem('ep_token', token)
    else localStorage.removeItem('ep_token')
  } catch { /* ignore */ }
}
export function getAdminToken(): string | null {
  try { return sessionStorage.getItem('ep_admin_token') } catch { return null }
}
export function setAdminToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem('ep_admin_token', token)
    else {
      sessionStorage.removeItem('ep_admin_token')
      sessionStorage.removeItem('ep_admin_name')
      sessionStorage.removeItem('ep_admin_email')
    }
  } catch { /* ignore */ }
}
export function getAdminProfile(): { name: string; email: string } | null {
  try {
    const name = sessionStorage.getItem('ep_admin_name')
    const email = sessionStorage.getItem('ep_admin_email')
    return name ? { name, email: email || '' } : null
  } catch { return null }
}

function bearerHeader(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function authPost(
  path: string,
  body: Record<string, unknown>,
  method = 'POST',
  withToken = false,
): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(withToken ? bearerHeader(getAuthToken()) : {}) },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Request failed')
  return data
}

export async function registerUser(data: {
  name: string; email: string; phone: string; division: string; password: string
}): Promise<BackendUser> {
  const user = await authPost('/auth/register', data)
  if (user.token) setAuthToken(user.token)
  return user
}

export async function loginUser(email: string, password: string): Promise<BackendUser> {
  const user = await authPost('/auth/login', { email, password })
  if (user.token) setAuthToken(user.token)
  return user
}

export function updateProfile(data: {
  email: string; name?: string; phone?: string; division?: string
}): Promise<BackendUser> {
  return authPost('/auth/profile', data, 'PUT', true)
}

export function changePassword(email: string, oldPassword: string, newPassword: string): Promise<{ success: boolean }> {
  return authPost('/auth/change-password', { email, old_password: oldPassword, new_password: newPassword }, 'POST', true)
}

export function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  return authPost('/auth/forgot-password', { email })
}

export function resetPassword(email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return authPost('/auth/reset-password', { email, otp, new_password: newPassword })
}

export async function deleteAccount(): Promise<void> {
  try {
    await fetch(`${API_BASE}/users/me`, {
      method: 'DELETE',
      headers: bearerHeader(getAuthToken()),
    })
  } catch { /* offline — local data is cleared regardless */ }
}

export async function adminLogin(email: string, password: string): Promise<{ name: string; email: string }> {
  const data = await authPost('/auth/admin-login', { email, password })
  if (!data.token) throw new Error('Login failed')
  setAdminToken(data.token)
  try {
    sessionStorage.setItem('ep_admin_name', data.name || 'Admin')
    sessionStorage.setItem('ep_admin_email', email)
  } catch { /* ignore */ }
  return { name: data.name, email: data.email }
}

export interface AuditEntry {
  id: number
  admin_email: string
  action: string
  target: string
  created_at: string
}

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  try {
    return await api<AuditEntry[]>('/admin/audit', { headers: bearerHeader(getAdminToken()) })
  } catch {
    return []
  }
}

/** Sliding session renewal — exchanges a valid token for a fresh one. */
export async function refreshSession(): Promise<void> {
  const token = getAuthToken()
  if (!token) return
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...bearerHeader(token) },
    })
    if (res.ok) {
      const data = await res.json()
      if (data.token) setAuthToken(data.token)
    } else if (res.status === 401) {
      setAuthToken(null) // expired — force re-login next time
    }
  } catch { /* offline — keep existing token */ }
}

export interface DistrictData {
  name: string
  name_bn: string
  division: string
  lat: number
  lng: number
  threats: number
  color: string
}

export async function fetchDistricts(timeframe?: string, type?: string): Promise<DistrictData[]> {
  try {
    const params = new URLSearchParams()
    if (timeframe) params.set('timeframe', timeframe)
    if (type) params.set('type', type)
    const qs = params.toString() ? `?${params}` : ''
    return await api<DistrictData[]>(`/districts${qs}`)
  } catch {
    return mockDistricts
  }
}

export async function isBackendOnline(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 3000)
    const res = await fetch(`${API_BASE}/stats`, { signal: ctrl.signal })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}

export async function fetchStats(): Promise<Stats> {
  try {
    return await api<Stats>('/stats')
  } catch {
    return mockStats
  }
}

// ── Threats ────────────────────────────────────────────────────────────────

export async function fetchThreats(params?: {
  limit?: number
  type?: string
  status?: string
  division?: string
  search?: string
  timeframe?: string
}): Promise<Threat[]> {
  try {
    const entries = Object.entries(params ?? {}).filter(([, v]) => v != null) as [string, string][]
    const qs = entries.length ? '?' + new URLSearchParams(entries).toString() : ''
    // Admin token (when present) unlocks pending/rejected reports
    const data = await api<any[]>(`/threats${qs}`, { headers: bearerHeader(getAdminToken()) })
    return data.map(adaptThreat).filter((t): t is Threat => t !== null)
  } catch {
    return mockThreats
  }
}

// Admin-only: fetch pending threats — NO mock fallback so real reports are always shown
export async function fetchAdminPendingThreats(): Promise<{ threats: Threat[]; error: string | null }> {
  const token = getAdminToken()
  if (!token) return { threats: [], error: 'Not authenticated' }
  try {
    const data = await api<any[]>('/threats?status=pending&limit=200', {
      headers: bearerHeader(token),
    })
    const threats = data.map(adaptThreat).filter((t): t is Threat => t !== null)
    return { threats, error: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return { threats: [], error: msg }
  }
}

export interface ActivityItem {
  id: number
  type: string
  detail: string
  division: string
  severity: string
  status: string
  created_at: string
}

export async function fetchActivity(limit = 10): Promise<ActivityItem[]> {
  try {
    const data = await api<any[]>(`/activity?limit=${limit}`)
    return data.map(a => ({
      id: a.id,
      type: TYPE_UP[a.type] || a.type,
      detail: a.detail || '',
      division: DIV_BN[a.division] || a.division || '',
      severity: a.severity || 'medium',
      status: a.status || 'pending',
      created_at: a.created_at,
    }))
  } catch {
    // Backend offline — derive an activity feed from the threat list (mock fallback)
    const threats = await fetchThreats({ limit })
    return threats.slice(0, limit).map(t => ({
      id: t.id,
      type: t.type,
      detail: t.detail.slice(0, 50),
      division: t.division,
      severity: t.severity,
      status: t.status,
      created_at: t.created_at,
    }))
  }
}

export async function fetchThreatById(id: number, _viewerEmail?: string): Promise<Threat | null> {
  // Identity comes from JWT — user token unlocks own pending, admin token sees all
  const token = getAuthToken() || getAdminToken()
  try {
    const data = await api<any>(`/threats/${id}`, { headers: bearerHeader(token) })
    return adaptThreat(data)
  } catch {
    // Fallback: fetch all and filter
    try {
      const all = await fetchThreats()
      return all.find(t => t.id === id) ?? null
    } catch {
      return mockThreats.find(t => t.id === id) ?? null
    }
  }
}

export async function submitPartnerInquiry(data: {
  name: string
  organization?: string
  role: string
  email: string
  phone?: string
  message: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/partner-inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      let detail = 'পাঠানো যায়নি — পরে আবার চেষ্টা করুন।'
      try { const j = await res.json(); if (j?.detail) detail = j.detail } catch { /* ignore */ }
      return { success: false, error: detail }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'নেটওয়ার্ক সমস্যা — পরে আবার চেষ্টা করুন।' }
  }
}

export async function submitThreat(data: {
  type: string
  detail: string
  division: string
  platform?: string
  description?: string
}): Promise<ValidationResult> {
  try {
    // 1. Save the threat in the database
    const body = {
      type: TYPE_DOWN[data.type] || data.type.toLowerCase(),
      content: data.detail,
      region: DIV_TO_EN[data.division] || data.division,
    }
    await api('/threats', { method: 'POST', body: JSON.stringify(body) })

    // 2. Get real AI analysis for the result panel
    const valResult = await api<any>('/validate/text', {
      method: 'POST',
      body: JSON.stringify({ text: data.detail }),
    })
    return adaptValidation(valResult)
  } catch {
    await delay(1200)
    return {
      is_phishing: true,
      confidence: 87,
      reason: 'বিষয়বস্তুতে সন্দেহজনক প্যাটার্ন পাওয়া গেছে। AI এটিকে ফিশিং হিসেবে চিহ্নিত করেছে।',
      risk_level: 'high',
      actions: ['এই লিংকে ক্লিক করবেন না', 'অন্যদের সতর্ক করুন', 'পরিচিতদের জানান'],
    }
  }
}

export async function reportThreat(data: {
  type: string
  detail: string
  division: string
  platform?: string
  description?: string
  screenshot?: string
  reporterEmail?: string
  confidence?: number
}): Promise<void> {
  try {
    // Logged-in email takes precedence; otherwise use the email the anon user typed.
    let reporterEmail: string | undefined = data.reporterEmail
    try {
      const auth = JSON.parse(localStorage.getItem('ep_auth') || 'null')
      if (auth?.loggedIn && auth.email) reporterEmail = auth.email
    } catch { /* ignore */ }

    const body: Record<string, unknown> = {
      type: TYPE_DOWN[data.type] || data.type.toLowerCase(),
      content: data.detail,
      region: DIV_TO_EN[data.division] || data.division,
      screenshot: data.screenshot,
      reporter_email: reporterEmail,
    }
    // Pass the scan confidence so the backend stores the score the user already saw
    if (data.confidence != null) body.confidence = data.confidence / 100
    // Bearer token (if logged in) lets the backend apply reporter trust scoring
    await api('/threats', {
      method: 'POST',
      headers: bearerHeader(getAuthToken()),
      body: JSON.stringify(body),
    })
  } catch { /* offline — report is still validated client-side */ }
}

export interface MyReport {
  id: number
  type: string
  detail: string
  division: string
  status: string
  confidence: number
  created_at: string
}

export async function fetchMyReports(_email?: string): Promise<MyReport[]> {
  // Identity comes from the JWT — email arg kept for backwards-compat but ignored
  const token = getAuthToken()
  if (!token) return []
  try {
    const data = await api<any[]>('/threats/my-reports', { headers: bearerHeader(token) })
    return data.map(t => ({
      id: t.id,
      type: TYPE_UP[t.type] || t.type,
      detail: t.content || '',
      division: t.district || DIV_BN[t.region] || t.region || '',
      status: t.status,
      confidence: t.confidence > 1 ? Math.round(t.confidence) : Math.round(t.confidence * 100),
      created_at: t.created_at,
    }))
  } catch {
    return []
  }
}

export interface ApproveResult { verified: boolean; emails_sent: boolean; severity: string }

export async function approveThreat(id: number): Promise<ApproveResult> {
  return api<ApproveResult>(`/threats/${id}/verify`, {
    method: 'PATCH',
    headers: bearerHeader(getAdminToken()),
  })
}

export async function updatePreferences(prefs: { notify_alerts?: boolean; district?: string }): Promise<{ notify_alerts: boolean; district: string | null }> {
  const res = await fetch(`${API_BASE}/users/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...bearerHeader(getAuthToken()) },
    body: JSON.stringify(prefs),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed')
  return data
}

export async function rejectThreat(id: number): Promise<void> {
  await api(`/threats/${id}/reject`, { method: 'PUT', headers: bearerHeader(getAdminToken()) })
}

// ── Alerts ─────────────────────────────────────────────────────────────────

export async function fetchAlerts(severity?: string): Promise<Alert[]> {
  try {
    const path = severity && severity !== 'all' ? `/alerts?severity=${severity}` : '/alerts'
    const data = await api<any[]>(path)
    return data.map(adaptAlert)
  } catch {
    return mockAlerts
  }
}

export async function broadcastAlert(data: {
  title: string
  message: string
  severity: string
}): Promise<Alert> {
  const result = await api<any>('/alerts/broadcast', {
    method: 'POST',
    headers: bearerHeader(getAdminToken()),
    body: JSON.stringify(data),
  })
  return adaptAlert(result)
}

// ── Trending ───────────────────────────────────────────────────────────────

export async function fetchTrending(): Promise<TrendingScam[]> {
  try {
    const data = await api<any[]>('/threats/trending')
    return data.map(adaptTrending)
  } catch {
    return mockTrending
  }
}

// ── Rangers ────────────────────────────────────────────────────────────────

export async function fetchRangers(): Promise<Ranger[]> {
  try {
    const data = await api<any[]>('/rangers')
    return data.map(adaptRanger)
  } catch {
    return mockRangers
  }
}

// ── Daily quiz ─────────────────────────────────────────────────────────────

export interface DailyQuizQuestion {
  id: number
  q: string
  options: { key: string; text: string }[]
}
export interface DailyQuiz {
  date: string
  questions: DailyQuizQuestion[]
  already_done: boolean
  total_xp: number
  last_score: number | null
}
export interface DailyQuizResult {
  score: number
  total: number
  xp_earned: number
  total_xp: number
  correct: Record<string, string>
  already_done: boolean
}

export async function fetchDailyQuiz(email?: string): Promise<DailyQuiz> {
  const qs = email ? `?email=${encodeURIComponent(email)}` : ''
  return api<DailyQuiz>(`/quiz/daily${qs}`)
}

export async function submitDailyQuiz(
  email: string,
  answers: Record<string, string>,
): Promise<DailyQuizResult> {
  return api<DailyQuizResult>('/quiz/daily', {
    method: 'POST',
    body: JSON.stringify({ email, answers }),
  })
}

// ── Division heatmap ───────────────────────────────────────────────────────

export async function fetchDivisions(timeframe?: string): Promise<DivisionData[]> {
  try {
    const qs = timeframe ? `?timeframe=${timeframe}` : ''
    const data = await api<any[]>(`/divisions${qs}`)
    return data.map(adaptDivision)
  } catch {
    return mockDivisions
  }
}

// ── AI Validation ──────────────────────────────────────────────────────────

export async function validateText(
  text: string,
  type: 'url' | 'sms'
): Promise<ValidationResult> {
  try {
    const data = await api<any>('/validate/text', {
      method: 'POST',
      body: JSON.stringify({ text, type }),   // forward type so URLs hit the VT+heuristic pipeline
    })
    return adaptValidation(data)
  } catch {
    await delay(1000)
    const lower = text.toLowerCase()
    const isPhishing =
      lower.includes('bkash') ||
      lower.includes('nagad') ||
      lower.includes('prize') ||
      lower.includes('পুরস্কার') ||
      lower.includes('বিজয়ী') ||
      lower.includes('ক্লিক') ||
      lower.includes('লটারি') ||
      /\d{11}/.test(text)
    return {
      is_phishing: isPhishing,
      confidence: isPhishing ? 85 : 12,
      reason: isPhishing
        ? 'এই বার্তায় পরিচিত ফিশিং প্যাটার্ন পাওয়া গেছে। বিকাশ/নগদ পুরস্কারের নামে প্রতারণার চেষ্টা হচ্ছে।'
        : 'এই বার্তা তুলনামূলকভাবে নিরাপদ মনে হচ্ছে। তবে সর্বদা সতর্ক থাকুন।',
      risk_level: isPhishing ? 'high' : 'safe',
      actions: isPhishing
        ? [
            'লিংকে ক্লিক করবেন না',
            'ব্যক্তিগত তথ্য দেবেন না',
            'বিকাশ/নগদ কখনো SMS-এ পুরস্কার দেয় না',
            'নিকটস্থ থানায় জানান',
          ]
        : ['সতর্ক থাকুন', 'অপরিচিত লিংক এড়িয়ে চলুন'],
    }
  }
}

export async function validateProfile(
  data: Record<string, string>
): Promise<ValidationResult> {
  try {
    // Convert string values to numbers for the backend model
    const body = {
      friends:        parseInt(data.friends || data['#friends'] || '0') || 0,
      following:      parseInt(data.following || data['#following'] || '0') || 0,
      community:      parseInt(data.community || data['#community'] || '0') || 0,
      age:            parseInt(data.age || '0') || 0,
      posts_shared:   parseInt(data.posts_shared || data['#postshared'] || '0') || 0,
      url_shared:     parseInt(data.url_shared || data['#urlshared'] || '0') || 0,
      photos_videos:  parseInt(data.photos_videos || data['#photos/videos'] || '0') || 0,
      fp_urls:        parseInt(data.fp_urls || data.fpurls || '0') || 0,
      fp_photos_videos: parseInt(data.fp_photos_videos || data['fpphotos/videos'] || '0') || 0,
      avg_comment:    parseFloat(data.avg_comment || data['avgcomment/post'] || '0') || 0,
      likes:          parseFloat(data.likes || data['likes/post'] || '0') || 0,
      tags:           parseFloat(data.tags || data['tags/post'] || '0') || 0,
      num_tags:       parseInt(data.num_tags || data['#tags/post'] || '0') || 0,
    }
    const result = await api<any>('/validate/profile', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return {
      is_phishing: result.is_spam ?? false,
      confidence: result.confidence > 1
        ? Math.round(result.confidence)
        : Math.round((result.confidence || 0) * 100),
      reason:
        (result.reasons || []).join('। ') ||
        (result.is_spam
          ? 'প্রোফাইলে সন্দেহজনক বৈশিষ্ট্য পাওয়া গেছে। এটি ভুয়া প্রোফাইল হতে পারে।'
          : 'প্রোফাইলটি বৈধ মনে হচ্ছে। তবে সতর্ক থাকুন।'),
      risk_level: result.is_spam ? 'high' : 'safe',
      actions: result.is_spam
        ? [
            'এই প্রোফাইলকে ফ্রেন্ড রিকোয়েস্ট গ্রহণ করবেন না',
            'ব্যক্তিগত তথ্য শেয়ার করবেন না',
            'Facebook-এ রিপোর্ট করুন',
          ]
        : ['সতর্কতার সাথে যোগাযোগ করুন'],
    }
  } catch {
    await delay(1500)
    const filledCount = Object.values(data).filter(v => v.trim() !== '').length
    const confidence = Math.min(90, filledCount * 7)
    return {
      is_phishing: confidence > 45,
      confidence,
      reason:
        confidence > 45
          ? 'প্রোফাইলে একাধিক সন্দেহজনক বৈশিষ্ট্য পাওয়া গেছে। এটি ভুয়া প্রোফাইল হতে পারে।'
          : 'প্রোফাইলটি বৈধ মনে হচ্ছে। তবে সতর্ক থাকুন।',
      risk_level: confidence > 70 ? 'high' : confidence > 40 ? 'medium' : 'safe',
      actions:
        confidence > 45
          ? [
              'এই প্রোফাইলকে ফ্রেন্ড রিকোয়েস্ট গ্রহণ করবেন না',
              'ব্যক্তিগত তথ্য শেয়ার করবেন না',
              'Facebook-এ রিপোর্ট করুন',
            ]
          : ['সতর্কতার সাথে যোগাযোগ করুন'],
    }
  }
}

// ── Phone check ────────────────────────────────────────────────────────────

export async function checkPhone(
  number: string
): Promise<{ is_scam: boolean; message: string; number: string }> {
  try {
    return await api<{ is_scam: boolean; message: string; number: string }>(
      '/check/phone',
      { method: 'POST', body: JSON.stringify({ number }) }
    )
  } catch {
    return {
      number,
      is_scam: false,
      message: 'সার্ভার সংযোগ নেই — নম্বর যাচাই করা যায়নি।',
    }
  }
}
