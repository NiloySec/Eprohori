'use client'
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { translations, type Lang, type TranslationKey } from './i18n'

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey) => string
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('bn') // default: বাংলা (BD-first audience)

  useEffect(() => {
    const stored = localStorage.getItem('ep_lang') as Lang | null
    if (stored === 'en' || stored === 'bn') setLangState(stored)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('ep_lang', l)
  }

  const toggleLanguage = () => setLang(lang === 'en' ? 'bn' : 'en')

  const t = (key: TranslationKey): string =>
    (translations[lang] as Record<string, string>)[key] ??
    (translations['en'] as Record<string, string>)[key] ??
    key

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
