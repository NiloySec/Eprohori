import type { Metadata } from 'next'
import { Inter, Space_Grotesk, Hind_Siliguri } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AIAssistant from '@/components/AIAssistant'
import ClientProviders from '@/components/ClientProviders'
import DemoModeBanner from '@/components/DemoModeBanner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import PWARegister from '@/components/PWARegister'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const spaceGrotesk = Space_Grotesk({ weight: ['500', '600', '700'], subsets: ['latin'], variable: '--font-heading-en', display: 'swap' })
const hindSiliguri = Hind_Siliguri({ weight: ['400', '500', '600', '700'], subsets: ['latin', 'bengali'], variable: '--font-hind', display: 'swap' })

const SITE_URL = 'https://eprohori.tech'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Eprohori — বাংলাদেশের সাইবার সুরক্ষা প্ল্যাটফর্ম',
    template: '%s — Eprohori',
  },
  description: 'বাংলাদেশের ক্রাউডসোর্সড সাইবার থ্রেট প্ল্যাটফর্ম। AI দিয়ে phishing, scam ও cyber threat যাচাই করুন। বিনামূল্যে রিপোর্ট করুন।',
  keywords: ['cyber security Bangladesh', 'phishing detection', 'eprohori', 'সাইবার সুরক্ষা', 'বাংলাদেশ', 'scam detection', 'ফিশিং', 'BD CIRT'],
  authors: [{ name: 'Eprohori Team' }],
  creator: 'Eprohori',
  publisher: 'Eprohori',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    alternateLocale: 'en_US',
    url: SITE_URL,
    siteName: 'Eprohori',
    title: 'Eprohori — বাংলাদেশের সাইবার সুরক্ষা',
    description: 'AI-powered phishing & scam detection for Bangladesh. Crowdsourced threat reporting platform.',
    images: [{ url: '/opengraph-image.svg', width: 1200, height: 630, alt: 'Eprohori' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eprohori — Bangladesh Cyber Security',
    description: 'AI-powered phishing & scam detection. Report threats, protect community.',
    images: ['/opengraph-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: { icon: '/icon.svg', shortcut: '/icon.svg', apple: '/apple-icon.svg' },
  manifest: '/manifest.json',
  verification: {
    // Add Google Search Console verification when ready
    // google: 'your-google-verification-code',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${inter.variable} ${spaceGrotesk.variable} ${hindSiliguri.variable}`}>
      <body className="min-h-screen flex flex-col" style={{ backgroundColor: '#050810', color: '#f1f5f9' }}>
        <ClientProviders>
          <Navbar />
          <DemoModeBanner />
          <main className="flex-1">{children}</main>
          <Footer />
          <AIAssistant />
        </ClientProviders>
        <Analytics />
        <SpeedInsights />
        <PWARegister />
      </body>
    </html>
  )
}
