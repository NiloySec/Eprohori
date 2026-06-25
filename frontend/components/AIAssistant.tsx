'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { validateText, checkPhone } from '@/lib/api'
import { useLanguage } from '@/lib/LanguageContext'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type MessageRole = 'user' | 'bot' | 'thinking'

interface ChatMessage {
  id: string
  role: MessageRole
  text: string
}

type InputType = 'PHONE' | 'URL' | 'SMS' | 'QUESTION'

type Intent =
  | 'ACCOUNT_HACK'
  | 'FINANCIAL_FRAUD'
  | 'OTP_LEAKED'
  | 'SIM_SWAP'
  | 'NID_FRAUD'
  | 'HARASSMENT'
  | 'AWARENESS'
  | 'UNKNOWN'

type Platform =
  | 'facebook'
  | 'gmail'
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'bank'
  | 'whatsapp'
  | 'telegram'
  | 'general'

type KBPlatformMap = Partial<Record<Platform, string>> & { general: string }
type KnowledgeBase = Partial<Record<Intent, KBPlatformMap>>

type HistoryItem = { role: 'user' | 'assistant'; content: string }

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION — STEP 1
// ═══════════════════════════════════════════════════════════════════════════════

const detectType = (text: string): InputType => {
  const t = text.trim()
  const cleaned = t.replace(/[\s\-\+]/g, '')
  if (/^(880|0088)?01[3-9]\d{8}$/.test(cleaned)) return 'PHONE'
  if (/https?:\/\/|(\.(com|net|org|tk|xyz|bd|info|click|ml|live))/.test(t)) return 'URL'
  if (/OTP|ওটিপি|পিন|PIN|লটারি|জিতেছেন|বিকাশ.*(পাঠান|দিন|ক্লিক)|bit\.ly|tinyurl/i.test(t))
    return 'SMS'
  return 'QUESTION'
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT CLASSIFICATION — STEP 2
// ═══════════════════════════════════════════════════════════════════════════════

const classifyIntent = (text: string): { intent: Intent; risk: 'HIGH' | 'LOW' } => {
  const t = text.toLowerCase()
  if (/হ্যাক|hack|দখল|রিকভার|recover|ঢুকতে পারছি না|লগইন হচ্ছে না/.test(t))
    return { intent: 'ACCOUNT_HACK', risk: 'HIGH' }
  if (/বিকাশ|নগদ|nagad|rocket|ব্যাংক|bank|টাকা.*(গেছে|চুরি|কেটে)|প্রতারণা|fraud/.test(t))
    return { intent: 'FINANCIAL_FRAUD', risk: 'HIGH' }
  if (/otp|ওটিপি|পিন.*দিয়ে|শেয়ার করে ফেলেছি/.test(t))
    return { intent: 'OTP_LEAKED', risk: 'HIGH' }
  if (/সিম|sim|নম্বর বন্ধ|নম্বর কাজ করছে না/.test(t))
    return { intent: 'SIM_SWAP', risk: 'HIGH' }
  if (/nid|এনআইডি|জাতীয় পরিচয়|ভোটার/.test(t))
    return { intent: 'NID_FRAUD', risk: 'HIGH' }
  if (/ব্ল্যাকমেইল|blackmail|হয়রানি|ছবি|ভিডিও ছড়িয়ে/.test(t))
    return { intent: 'HARASSMENT', risk: 'HIGH' }
  if (/নিরাপদ|safe|সুরক্ষা|protect|tips|পরামর্শ/.test(t))
    return { intent: 'AWARENESS', risk: 'LOW' }
  return { intent: 'UNKNOWN', risk: 'LOW' }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM DETECTOR — STEP 3
// ═══════════════════════════════════════════════════════════════════════════════

const detectPlatform = (text: string): Platform => {
  const t = text.toLowerCase()
  if (/facebook|fb|ফেসবুক/.test(t)) return 'facebook'
  if (/gmail|google|জিমেইল/.test(t)) return 'gmail'
  if (/bkash|বিকাশ/.test(t)) return 'bkash'
  if (/nagad|নগদ/.test(t)) return 'nagad'
  if (/rocket/.test(t)) return 'rocket'
  if (/bank|ব্যাংক/.test(t)) return 'bank'
  if (/whatsapp|হোয়াটসঅ্যাপ/.test(t)) return 'whatsapp'
  if (/telegram/.test(t)) return 'telegram'
  return 'general'
}

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════════════════════

const KB: KnowledgeBase = {
  ACCOUNT_HACK: {
    facebook: `🚨 **ফেসবুক হ্যাক — এখনই করুন:**

1. https://facebook.com/hacked এ যান
2. "Forgot Password" দিয়ে রিসেট করুন
3. Settings → Security → Active Sessions → সব Logout
4. Two-Factor Authentication চালু করুন
5. Recovery Email ও Phone যাচাই করুন

📚 সূত্র: Facebook Help Center | CIRT Bangladesh`,

    gmail: `🚨 **Gmail হ্যাক — এখনই করুন:**

1. https://myaccount.google.com/security তে যান
2. Security Checkup করুন
3. সব ডিভাইস থেকে Sign Out করুন
4. Recovery info আপডেট করুন
5. 2-Step Verification চালু করুন

📚 সূত্র: Google Help Center | CIRT Bangladesh`,

    whatsapp: `🚨 **WhatsApp হ্যাক — এখনই করুন:**

1. Settings → Account → Two-step verification চালু করুন
2. আপনার নম্বরে OTP আসলে কাউকে দেবেন না
3. Linked Devices চেক করুন — অপরিচিত device logout করুন
4. Account re-register করুন

📚 সূত্র: WhatsApp Help | CIRT Bangladesh`,

    general: `🚨 **অ্যাকাউন্ট হ্যাক — জরুরি পদক্ষেপ:**

1. অন্য ডিভাইস থেকে পাসওয়ার্ড রিসেট করুন
2. সব ডিভাইস থেকে Logout করুন
3. Two-Factor Authentication চালু করুন
4. Recovery contact আপডেট করুন
5. Login history চেক করুন

🆘 BGD e-GOV CIRT: https://cirt.gov.bd
📚 সূত্র: CIRT Bangladesh`,
  },

  FINANCIAL_FRAUD: {
    bkash: `🚨 **বিকাশ প্রতারণা — এখনই কল করুন:**

📞 **Hotline: 16247** (24/7)

করণীয়:
1. এখনই 16247 তে কল করুন
2. Transaction বন্ধ করতে বলুন
3. Transaction ID ও screenshot সংরক্ষণ করুন
4. নিকটস্থ থানায় GD করুন
5. CIRT তে রিপোর্ট করুন

⏰ যত দ্রুত কল করবেন, টাকা ফেরার সম্ভাবনা তত বেশি
🆘 https://cirt.gov.bd`,

    nagad: `🚨 **নগদ প্রতারণা — এখনই কল করুন:**

📞 **Hotline: 16167** (24/7)

করণীয়:
1. এখনই 16167 তে কল করুন
2. Account freeze করতে বলুন
3. Screenshot সংরক্ষণ করুন
4. থানায় GD করুন

🆘 Bangladesh Bank: 16236 | https://cirt.gov.bd`,

    rocket: `🚨 **Rocket প্রতারণা — এখনই কল করুন:**

📞 **Hotline: 16216** (24/7)

করণীয়:
1. এখনই 16216 তে কল করুন
2. Transaction block করতে বলুন
3. থানায় GD করুন

🆘 https://cirt.gov.bd`,

    bank: `🚨 **ব্যাংক প্রতারণা — জরুরি পদক্ষেপ:**

1. ব্যাংকের Emergency Hotline এ কল করুন
2. Card এবং Account block করুন
3. Branch এ সরাসরি যান
4. থানায় GD করুন

📞 Bangladesh Bank: 16236
🆘 https://cirt.gov.bd`,

    general: `🚨 **আর্থিক প্রতারণা — জরুরি পদক্ষেপ:**

1. সংশ্লিষ্ট সার্ভিসের hotline এ কল করুন
2. Transaction বন্ধ করতে বলুন
3. সব প্রমাণ (screenshot) সংরক্ষণ করুন
4. থানায় GD করুন

📞 বিকাশ: 16247 | নগদ: 16167 | Rocket: 16216
🆘 https://cirt.gov.bd`,
  },

  OTP_LEAKED: {
    general: `⚡ **OTP শেয়ার হয়ে গেছে — এখনই করুন:**

⚠️ মনে রাখুন: কোনো কোম্পানি কখনো OTP চায় না!

1. এখনই পাসওয়ার্ড পরিবর্তন করুন
2. সংশ্লিষ্ট সার্ভিসের hotline এ কল করুন
3. সব device থেকে logout করুন
4. 2FA নতুন নম্বরে চালু করুন
5. আর্থিক ক্ষতি হলে থানায় GD করুন

📞 বিকাশ: 16247 | নগদ: 16167
🆘 https://cirt.gov.bd`,
  },

  SIM_SWAP: {
    general: `🚨 **SIM Swap আক্রমণ — জরুরি পদক্ষেপ:**

1. অপারেটর Customer Care এ এখনই কল করুন
   📞 GP: 121 | Robi: 123 | BL: 121 | Teletalk: 121
2. SIM re-issue block করতে বলুন
3. NID দিয়ে SIM ownership verify করুন
4. সব আর্থিক অ্যাকাউন্ট check করুন
5. BTRC তে অভিযোগ: 100

🆘 https://cirt.gov.bd`,
  },

  NID_FRAUD: {
    general: `🚨 **NID প্রতারণা — জরুরি পদক্ষেপ:**

1. Bangladesh Election Commission: 105
2. https://nidw.gov.bd তে report করুন
3. থানায় GD করুন
4. সব ব্যাংক ও MFS কে জানান

🆘 https://cirt.gov.bd`,
  },

  HARASSMENT: {
    general: `🚨 **সাইবার হয়রানি — পদক্ষেপ নিন:**

⚠️ কাউকে টাকা দেবেন না — এতে আরো বাড়বে!

1. সব প্রমাণ (screenshot/recording) সংরক্ষণ করুন
2. Platform এ report করুন
3. Cyber Crime Police: 01320000027
4. থানায় মামলা করুন

🆘 https://cirt.gov.bd`,
  },

  AWARENESS: {
    general: `🛡️ **অনলাইনে নিরাপদ থাকতে:**

1. প্রতিটি অ্যাকাউন্টে আলাদা শক্তিশালী পাসওয়ার্ড
2. সব গুরুত্বপূর্ণ অ্যাকাউন্টে 2FA চালু করুন
3. অপরিচিতকে কখনো OTP/PIN দেবেন না
4. লোভনীয় অফারে ক্লিক করবেন না
5. Public WiFi তে banking করবেন না
6. সন্দেহজনক কিছু দেখলে Eprohori তে রিপোর্ট করুন

🆘 https://cirt.gov.bd`,
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI FALLBACK — routes through /api/chat (Groq → Gemini → OpenAI → Claude)
// ═══════════════════════════════════════════════════════════════════════════════

async function askAI(message: string, history: HistoryItem[]): Promise<string> {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: history.slice(-6) }),
  })
  if (!resp.ok) throw new Error('API error')
  const data = await resp.json()
  return (data as { text?: string }).text || ''
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKDOWN RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

function renderLine(line: string): React.ReactNode {
  // Match **bold** and https:// URLs — local regex to avoid /g flag state issues
  const tokenRe = /(\*\*[^*]+\*\*|https?:\/\/[^\s)>,]+)/g
  const parts: React.ReactNode[] = []
  let last = 0
  let ki = 0
  let m: RegExpExecArray | null

  while ((m = tokenRe.exec(line)) !== null) {
    if (m.index > last) parts.push(<span key={ki++}>{line.slice(last, m.index)}</span>)
    const token = m[0]
    if (token.startsWith('**')) {
      parts.push(
        <strong key={ki++} style={{ color: '#00e5c4', fontWeight: 600 }}>
          {token.slice(2, -2)}
        </strong>
      )
    } else {
      const display = token.replace(/^https?:\/\//, '').replace(/\/$/, '')
      parts.push(
        <a
          key={ki++}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#00e5c4', textDecoration: 'underline', wordBreak: 'break-all' }}
        >
          {display}
        </a>
      )
    }
    last = m.index + token.length
  }

  if (last < line.length) parts.push(<span key={ki++}>{line.slice(last)}</span>)
  return <>{parts}</>
}

function BotText({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 12, lineHeight: 1.72, wordBreak: 'break-word' }}>
      {text.split('\n').map((line, i) => {
        if (line === '') return <div key={i} style={{ height: 5 }} />
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <div key={i} style={{ display: 'flex', gap: 6, margin: '2px 0' }}>
              <span style={{ color: '#00e5c4', flexShrink: 0 }}>•</span>
              <span>{renderLine(line.slice(2))}</span>
            </div>
          )
        }
        return (
          <div key={i} style={{ margin: '1px 0' }}>
            {renderLine(line)}
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPEWRITER
// ═══════════════════════════════════════════════════════════════════════════════

function TypewriterBotText({
  text,
  scrollEl,
}: {
  text: string
  scrollEl: React.RefObject<HTMLDivElement | null>
}) {
  const [shown, setShown] = useState('')
  const done = shown.length >= text.length

  useEffect(() => {
    let cancelled = false
    let i = 0
    const tick = () => {
      if (cancelled) return
      i += 3
      if (i >= text.length) {
        setShown(text)
        return
      }
      setShown(text.slice(0, i))
      scrollEl.current?.scrollIntoView({ behavior: 'auto' })
      setTimeout(tick, 14)
    }
    tick()
    return () => {
      cancelled = true
    }
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return <BotText text={text} />
  return (
    <div
      style={{ fontSize: 12, lineHeight: 1.72, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {shown}
      <span className="typing-cursor" aria-hidden="true" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPING INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', padding: '2px 0' }}>
      {[0, 160, 320].map((d) => (
        <span
          key={d}
          className="animate-bounce"
          style={{
            display: 'block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'rgba(0,229,196,0.75)',
            animationDelay: `${d}ms`,
            animationDuration: '0.9s',
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

function BotAvatar({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-icon.png"
        alt="Eprohori"
        width={Math.round(size * 0.66)}
        height={Math.round(size * 0.66)}
        style={{ display: 'block' }}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WELCOME MESSAGE
// ═══════════════════════════════════════════════════════════════════════════════

const WELCOME = `👋 আমি Eprohori AI — আপনার সাইবার নিরাপত্তা বিশেষজ্ঞ।

সন্দেহজনক কিছু পাঠান অথবা যেকোনো সাইবার সমস্যা জানান:

📱 ফোন নম্বর যাচাই
🔗 লিংক / URL যাচাই
💬 SMS যাচাই
🆘 হ্যাক / স্ক্যাম সমস্যা`

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const { lang } = useLanguage()

  // ── Voice input (Web Speech API — real-time live transcription) ──
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const finalTranscriptRef = useRef('')

  const toggleVoiceInput = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      addMsg({ id: `${Date.now()}-novoice`, role: 'bot', text: 'এই ব্রাউজারে ভয়েস ইনপুট সাপোর্ট নেই। Chrome ব্যবহার করুন।' })
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const recognition = new SR()
    recognition.lang = lang === 'bn' ? 'bn-BD' : 'en-US'
    recognition.interimResults = true   // live text as you speak
    recognition.continuous = true       // keep listening across pauses
    recognition.maxAlternatives = 1
    // Start from whatever is already typed, then append speech
    finalTranscriptRef.current = input ? input.trim() + ' ' : ''
    recognition.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalTranscriptRef.current += t + ' '
        else interim += t
      }
      setInput((finalTranscriptRef.current + interim).trimStart())
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  // ── Voice output (Text-to-Speech) ──
  const stripMarkdown = (text: string) =>
    text
      .replace(/\*\*|__|\*|`{1,3}|#{1,6}\s/g, ' ')
      .replace(/[•›→✓✗▸]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const speak = (text: string) => {
    try {
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(stripMarkdown(text))
      utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US'
      speechSynthesis.speak(utterance)
    } catch { /* TTS unavailable — ignore */ }
  }
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [unread, setUnread] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [lastBotId, setLastBotId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(false)

  useEffect(() => {
    openRef.current = open
  }, [open])

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // First open → welcome message
  useEffect(() => {
    if (open && !hasOpened) {
      setHasOpened(true)
      const id = 'welcome'
      setMessages([{ id, role: 'bot', text: WELCOME }])
      setLastBotId(id)
    }
  }, [open, hasOpened])

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  // Auto-scroll on new messages
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Click-outside to close (desktop)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (isMobile) return
      if (panelRef.current?.contains(e.target as Node)) return
      if ((e.target as HTMLElement).closest('#ai-fab')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, isMobile])

  const addMsg = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, msg]
      return next.length > 20 ? next.slice(-20) : next
    })
  }, [])

  // ─── Main send handler ────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    addMsg({ id: `u-${Date.now()}`, role: 'user', text })

    const thinkId = `t-${Date.now()}`
    addMsg({ id: thinkId, role: 'thinking', text: '' })

    let botText = ''

    try {
      const type = detectType(text)

      // ── PHONE ────────────────────────────────────────────────────────────────
      if (type === 'PHONE') {
        const cleaned = text.replace(/[\s\-\+\(\)]/g, '')
        const result = (await checkPhone(cleaned)) as { is_scam: boolean; message: string }
        botText = result.is_scam
          ? `🚨 **স্ক্যাম নম্বর চিহ্নিত!**\n\n${result.message}\n\n📵 এই নম্বরে কোনো টাকা পাঠাবেন না।`
          : `✅ **নম্বরটি আমাদের তালিকায় নেই**\n\n${result.message}\n\n⚠️ তবুও অপরিচিত নম্বরে সতর্ক থাকুন।`

      // ── URL / SMS ─────────────────────────────────────────────────────────────
      } else if (type === 'URL' || type === 'SMS') {
        const result = (await validateText(text, type.toLowerCase() as 'url' | 'sms')) as unknown as {
          is_phishing: boolean
          confidence: number
          reason: string
          actions?: string[]
        }
        const conf = result.confidence || 0
        if (conf > 70) {
          botText = `🔴 **বিপজ্জনক! (${conf}% ঝুঁকি)**\n\n${result.reason}\n\n⚠️ **করণীয়:**\n• কোনো লিংকে ক্লিক করবেন না\n• OTP বা PIN দেবেন না\n• কাউকে টাকা পাঠাবেন না\n\n🆘 ক্ষতি হলে: https://cirt.gov.bd`
        } else if (conf > 30) {
          botText = `🟡 **সন্দেহজনক (${conf}% ঝুঁকি)**\n\n${result.reason}\n\n⚠️ সতর্কতার সাথে যাচাই করুন।`
        } else {
          botText = `🟢 **নিরাপদ মনে হচ্ছে (${conf}% ঝুঁকি)**\n\n${result.reason}\n\nতবুও অপরিচিত লিংক বা নম্বরে সতর্ক থাকুন।`
        }
        if (result.actions?.length) {
          botText += `\n\n**করণীয়:**\n${result.actions.map((a) => `• ${a}`).join('\n')}`
        }

      // ── QUESTION ──────────────────────────────────────────────────────────────
      } else {
        const { intent } = classifyIntent(text)
        const platform = detectPlatform(text)
        const kbData = KB[intent]
        const kbResponse = kbData ? (kbData[platform] ?? kbData.general) : undefined

        if (kbResponse) {
          botText = kbResponse
        } else {
          // AI fallback
          try {
            botText = await askAI(text, history)
          } catch {
            botText =
              'দুঃখিত, এই মুহূর্তে সংযোগ নেই।\n\n🆘 জরুরি সাহায্যে: https://cirt.gov.bd\n📞 Cyber Crime: 01320000027'
          }
        }

        // Update Claude multi-turn history
        if (botText && !botText.startsWith('দুঃখিত')) {
          setHistory((prev) =>
            [
              ...prev,
              { role: 'user' as const, content: text },
              { role: 'assistant' as const, content: botText },
            ].slice(-12)
          )
        }
      }
    } catch {
      botText =
        'দুঃখিত, একটা সমস্যা হয়েছে।\n\n🆘 https://cirt.gov.bd\n📞 Cyber Crime: 01320000027'
    }

    const botId = `b-${Date.now()}`
    setMessages((prev) => {
      const without = prev.filter((m) => m.id !== thinkId)
      return [...without, { id: botId, role: 'bot', text: botText }]
    })
    setLastBotId(botId)
    setSending(false)
    if (!openRef.current) setUnread(true)
  }

  const handleOpen = () => {
    setOpen(true)
    setUnread(false)
  }

  // ─── Panel size (desktop vs mobile) ─────────────────────────────────────────

  const panelStyle: React.CSSProperties = isMobile
    ? { bottom: 0, left: 0, right: 0, height: '75vh', borderRadius: '20px 20px 0 0' }
    : { bottom: 80, right: 20, width: 340, height: 460, borderRadius: 16 }

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <>
      {/* ════════ FAB ════════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {/* Glowing title badge — always visible above the robot avatar */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(13,24,41,0.97) 0%, rgba(6,13,26,0.97) 100%)',
            border: '1px solid rgba(0,229,196,0.65)',
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '5px 14px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            animation: 'epBadgeGlow 2.4s ease-in-out infinite',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          Eprohori AI
        </div>
        <style>{`
          @keyframes epBadgeGlow {
            0%, 100% { box-shadow: 0 0 6px rgba(0,229,196,0.35), 0 0 16px rgba(0,229,196,0.18), inset 0 0 6px rgba(0,229,196,0.08); }
            50%      { box-shadow: 0 0 12px rgba(0,229,196,0.65), 0 0 28px rgba(0,229,196,0.32), inset 0 0 10px rgba(0,229,196,0.14); }
          }
        `}</style>

        {/* Button */}
        <button
          id="ai-fab"
          onClick={open ? () => setOpen(false) : handleOpen}
          aria-label="Eprohori AI"
          style={{
            position: 'relative',
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00e5c4 0%, #0891b2 100%)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 20px rgba(0,229,196,0.4), 0 4px 12px rgba(0,0,0,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseDown={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.93)'
          }}
          onMouseUp={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
          }}
        >
          {/* Pulse ring */}
          {!open && (
            <span
              className="animate-ping"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'rgba(0,229,196,0.3)',
              }}
            />
          )}

          {/* Icon */}
          <span
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.3s',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            {open ? (
              <svg width={20} height={20} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <span
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-icon.png" alt="Eprohori" width={22} height={22} style={{ display: 'block' }} />
              </span>
            )}
          </span>

          {/* Unread badge */}
          {!open && unread && (
            <span
              className="animate-pulse"
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#ff4444',
                border: '2px solid #060d1a',
              }}
            />
          )}
        </button>
      </div>

      {/* ════════ CHAT PANEL ═════════════════════════════════════════════════════ */}
      {open && isMobile && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
          }}
        />
      )}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(0,229,196,0.2)',
            background: 'rgba(6,13,26,0.97)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,196,0.05)',
            ...panelStyle,
          }}
        >
          {/* ── Header ───────────────────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'rgba(13,24,41,0.98)',
              borderBottom: '1px solid rgba(0,229,196,0.12)',
              flexShrink: 0,
            }}
          >
            <BotAvatar size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{ fontSize: 14, fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}
              >
                Eprohori AI
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(0,229,196,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#4ade80',
                    boxShadow: '0 0 5px #4ade80',
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                🟢 অনলাইন • সাইবার বিশেষজ্ঞ
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.1)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'white'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'
              }}
            >
              <svg width={15} height={15} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* ── Messages ─────────────────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: '#060d1a',
              backgroundImage:
                'radial-gradient(circle, rgba(0,229,196,0.05) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0,229,196,0.2) transparent',
            }}
          >
            {messages.map((msg, idx) => {
              const prevRole = idx > 0 ? messages[idx - 1].role : null
              const showAvatar =
                msg.role === 'bot' && prevRole !== 'bot' && prevRole !== 'thinking'
              const isNewest = msg.role === 'bot' && msg.id === lastBotId

              // Thinking bubble
              if (msg.role === 'thinking') {
                return (
                  <div
                    key={msg.id}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
                  >
                    <BotAvatar size={28} />
                    <div
                      style={{
                        background: '#0d1829',
                        borderRadius: '4px 18px 18px 18px',
                        padding: '10px 14px',
                      }}
                    >
                      <TypingIndicator />
                    </div>
                  </div>
                )
              }

              // Bot bubble
              if (msg.role === 'bot') {
                return (
                  <div
                    key={msg.id}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
                  >
                    {showAvatar ? (
                      <BotAvatar size={28} />
                    ) : (
                      <div style={{ width: 28, flexShrink: 0 }} />
                    )}
                    <div
                      style={{
                        background: '#0d1829',
                        borderRadius: '4px 18px 18px 18px',
                        padding: '10px 13px',
                        maxWidth: '82%',
                        color: 'rgba(255,255,255,0.88)',
                      }}
                    >
                      {isNewest && msg.id !== 'welcome' ? (
                        <TypewriterBotText text={msg.text} scrollEl={bottomRef} />
                      ) : (
                        <BotText text={msg.text} />
                      )}
                      {/* Read aloud */}
                      <button
                        onClick={() => speak(msg.text)}
                        aria-label="Read aloud"
                        title="শুনুন"
                        style={{
                          marginTop: 6,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 13,
                          opacity: 0.6,
                          padding: 0,
                          display: 'block',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6' }}
                      >
                        🔊
                      </button>
                    </div>
                  </div>
                )
              }

              // User bubble
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      background: '#00e5c4',
                      borderRadius: '18px 4px 18px 18px',
                      padding: '9px 13px',
                      maxWidth: '82%',
                      color: '#060d1a',
                      fontSize: 12,
                      fontWeight: 500,
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* ── Input Bar ─────────────────────────────────────────────────────── */}
          <div
            style={{
              padding: '10px 12px 12px',
              background: 'rgba(13,24,41,0.98)',
              borderTop: '1px solid rgba(0,229,196,0.08)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={listening ? '🎤 শুনছি... কথা বলুন' : 'একটি প্রশ্ন করুন বা কিছু যাচাই করুন...'}
                disabled={sending}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(0,229,196,0.18)',
                  borderRadius: 999,
                  padding: '9px 16px',
                  fontSize: 12,
                  color: 'white',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  opacity: sending ? 0.5 : 1,
                }}
                onFocus={(e) => {
                  ;(e.target as HTMLInputElement).style.borderColor = 'rgba(0,229,196,0.45)'
                }}
                onBlur={(e) => {
                  ;(e.target as HTMLInputElement).style.borderColor = 'rgba(0,229,196,0.18)'
                }}
              />
              {/* Voice input (mic) */}
              <button
                onClick={toggleVoiceInput}
                aria-label="Voice input"
                title={listening ? 'Stop listening' : 'Voice input'}
                className={listening ? 'animate-pulse' : ''}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: listening ? '2px solid #ff4444' : '1px solid rgba(0,229,196,0.3)',
                  background: listening ? 'rgba(255,68,68,0.2)' : 'rgba(0,229,196,0.08)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 15,
                  boxShadow: listening ? '0 0 12px rgba(255,68,68,0.5)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                🎤
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00e5c4, #0088ff)',
                  color: 'white',
                  cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  opacity: !input.trim() || sending ? 0.4 : 1,
                  transition: 'opacity 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && !sending) {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
                }}
              >
                <svg
                  width={16}
                  height={16}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
            <p
              style={{
                textAlign: 'center',
                fontSize: 10,
                color: 'rgba(255,255,255,0.22)',
                marginTop: 6,
                letterSpacing: '0.03em',
              }}
            >
              URL • SMS • নম্বর • যেকোনো প্রশ্ন
            </p>
          </div>
        </div>
      )}
    </>
  )
}
