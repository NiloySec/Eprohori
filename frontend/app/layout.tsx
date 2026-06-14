import type { Metadata } from 'next'
import { Inter, Space_Grotesk, Hind_Siliguri } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AIAssistant from '@/components/AIAssistant'
import ClientProviders from '@/components/ClientProviders'
import DemoModeBanner from '@/components/DemoModeBanner'

// Premium typography: Inter (body), Space Grotesk (headings), Hind Siliguri (Bengali)
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-heading-en',
  display: 'swap',
})

const hindSiliguri = Hind_Siliguri({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'bengali'],
  variable: '--font-hind',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Eprohori — বাংলাদেশের সাইবার সুরক্ষা',
  description: 'বাংলাদেশের ক্রাউডসোর্সড সাইবার থ্রেট প্ল্যাটফর্ম। ফিশিং, স্ক্যাম ও সাইবার হুমকি রিপোর্ট করুন।',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${hindSiliguri.variable}`}>
      <body className="min-h-screen flex flex-col" style={{ backgroundColor: '#050810', color: '#f1f5f9' }}>
        <ClientProviders>
          <Navbar />
          <DemoModeBanner />
          <main className="flex-1">{children}</main>
          <Footer />
          <AIAssistant />
        </ClientProviders>
      </body>
    </html>
  )
}
