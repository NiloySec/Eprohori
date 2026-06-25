import { NextRequest, NextResponse } from 'next/server'

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `তুমি EProhori AI — বাংলাদেশের একজন সাইবার নিরাপত্তা বিশেষজ্ঞ।

তোমার কাজ:
- সাইবার অপরাধ, হ্যাকিং, ফিশিং, স্ক্যাম থেকে মানুষকে রক্ষা করা
- সহজ বাংলায় ব্যবহারিক পরামর্শ দেওয়া

নিয়ম:
- সবসময় বাংলায় উত্তর দাও (ইংরেজি প্রশ্নে ইংরেজিতে উত্তর দাও)
- সংক্ষিপ্ত ও কার্যকর পরামর্শ দাও (সর্বোচ্চ ১৫০ শব্দ)
- ইমোজি ব্যবহার করো বোঝার সুবিধায়
- জরুরি সমস্যায় cirt.gov.bd উল্লেখ করো
- শুধু সাইবার নিরাপত্তা বিষয়ে কথা বলো; অন্য বিষয়ে ভদ্রভাবে এড়িয়ে যাও
- গুরুত্বপূর্ণ টেক্সটে **bold** মার্কডাউন ব্যবহার করো`

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryItem {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  message: string
  history?: HistoryItem[]
}

type OpenAIMsg = { role: string; content: string }

// ─── Provider Callers ─────────────────────────────────────────────────────────

/** Groq + OpenAI share the same API shape */
async function callOpenAICompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  history: HistoryItem[],
  message: string
): Promise<string> {
  const messages: OpenAIMsg[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message },
  ]
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, max_tokens: 1024, messages }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new ProviderError(
      (e as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`,
      res.status
    )
  }
  const d = await res.json()
  return (d as { choices?: Array<{ message?: { content?: string } }> })
    ?.choices?.[0]?.message?.content ?? ''
}

/** Google Gemini has a completely different API format */
async function callGemini(
  apiKey: string,
  history: HistoryItem[],
  message: string
): Promise<string> {
  // Gemini uses 'model' instead of 'assistant' for the AI role
  const contents = [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ]
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  )
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new ProviderError(
      (e as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`,
      res.status
    )
  }
  const d = await res.json()
  return (
    (
      d as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
    )?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  )
}

/** Anthropic Claude has its own format */
async function callClaude(
  apiKey: string,
  history: HistoryItem[],
  message: string
): Promise<string> {
  const messages = [...history, { role: 'user', content: message }]
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new ProviderError(
      (e as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`,
      res.status
    )
  }
  const d = await res.json()
  return (
    (d as { content?: Array<{ type: string; text?: string }> })?.content?.[0]?.text ?? ''
  )
}

// ─── Provider Error ───────────────────────────────────────────────────────────

class ProviderError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

// ─── Provider Chain ───────────────────────────────────────────────────────────
//
//  Fallback order:
//    Groq  →  Gemini  →  OpenAI  →  Claude
//
//  ACTIVE_PROVIDER env দিয়ে যেকোনো একটায় pin করা যাবে:
//    ACTIVE_PROVIDER=claude   → শুধু Claude ব্যবহার করবে
//    ACTIVE_PROVIDER=gemini   → শুধু Gemini ব্যবহার করবে
//

function buildProviders(history: HistoryItem[], message: string) {
  return [
    {
      name: 'groq',
      key: process.env.GROQ_API_KEY,
      call: () =>
        callOpenAICompat(
          'https://api.groq.com/openai/v1',
          process.env.GROQ_API_KEY!,
          'llama-3.3-70b-versatile',
          history,
          message
        ),
    },
    {
      name: 'gemini',
      key: process.env.GEMINI_API_KEY,
      call: () => callGemini(process.env.GEMINI_API_KEY!, history, message),
    },
    {
      name: 'openai',
      key: process.env.OPENAI_API_KEY,
      call: () =>
        callOpenAICompat(
          // Third-party OpenAI-compatible gateways supported via OPENAI_BASE_URL
          process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          process.env.OPENAI_API_KEY!,
          process.env.OPENAI_MODEL || 'gpt-4o-mini',
          history,
          message
        ),
    },
    {
      name: 'claude',
      key: process.env.ANTHROPIC_API_KEY,
      call: () => callClaude(process.env.ANTHROPIC_API_KEY!, history, message),
    },
  ] as const
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody
    const { message, history = [] } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const historySlice = history.slice(-6)
    const providers = buildProviders(historySlice, message.trim())

    // ── Pinned mode: ACTIVE_PROVIDER এ যা আছে শুধু সেটাই চলবে ──────────────
    const pinned = process.env.ACTIVE_PROVIDER?.toLowerCase()
    if (pinned) {
      const p = providers.find((x) => x.name === pinned)
      if (!p) {
        return NextResponse.json(
          { error: `Unknown provider: '${pinned}'. Use: groq, gemini, openai, claude` },
          { status: 400 }
        )
      }
      if (!p.key) {
        return NextResponse.json(
          { error: `'${pinned}' is set as ACTIVE_PROVIDER but its API key is missing` },
          { status: 503 }
        )
      }
      const text = await p.call()
      return NextResponse.json({ text, provider: p.name })
    }

    // ── Fallback mode: limit বা error হলে পরেরটায় যাবে ─────────────────────
    const errors: string[] = []
    for (const p of providers) {
      if (!p.key) continue // কনফিগার করা নেই → skip

      try {
        const text = await p.call()
        if (text.trim()) {
          return NextResponse.json({ text, provider: p.name })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`[${p.name}] ${msg}`)
        // rate limit (429) বা server error → next provider try করো
        // client error (4xx except 429) → হয়তো message-এর সমস্যা, তবুও চেষ্টা করো
      }
    }

    // সব provider fail করেছে
    if (errors.length === 0) {
      return NextResponse.json(
        { error: 'কোনো AI provider কনফিগার করা নেই। .env.local চেক করুন।' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'সব AI provider ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।', details: errors },
      { status: 503 }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
