'use client'
import { LanguageProvider } from '@/lib/LanguageContext'
import type { ReactNode } from 'react'

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}
