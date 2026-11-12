import { createContext, useContext, useState, type ReactNode } from 'react'
import en from '../content/en.json'
import id from '../content/id.json'

export type Language = 'id' | 'en'

const dictionaries: Record<Language, typeof id> = { id, en }

const LanguageContext = createContext<{
  lang: Language
  t: typeof id
  toggle: () => void
}>({ lang: 'id', t: id, toggle: () => {} })

const STORAGE_KEY = 'cakrawala-lang'

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'id' || saved === 'en') return saved
  } catch {
    // storage unavailable (private mode) — keep default
  }
  return 'id'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(initialLanguage)
  const toggle = () =>
    setLang((prev) => {
      const next: Language = prev === 'id' ? 'en' : 'id'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  return (
    <LanguageContext.Provider value={{ lang, t: dictionaries[lang], toggle }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useI18n() {
  return useContext(LanguageContext)
}
