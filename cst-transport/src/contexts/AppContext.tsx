import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { AppSettings, Notification, Page } from '../types'

interface AppContextType {
  currentPage: Page
  setCurrentPage: (page: Page) => void
  settings: AppSettings
  refreshSettings: () => void
  notifications: Notification[]
  unreadCount: number
  refreshNotifications: (userId: string) => void
  isDark: boolean
  toggleTheme: () => void
  globalSearch: string
  setGlobalSearch: (q: string) => void
}

const defaultSettings: AppSettings = {
  company_name:    'City Star Transport Passengers LLC',
  company_address: 'Dubai, United Arab Emirates',
  company_phone:   '',
  company_email:   'citystar815@gmail.com',
  company_trn:     '',
  currency:        'AED',
  tax_rate:        '5',
  invoice_prefix:  'INV',
  invoice_counter: '1000',
  theme:           'dark',
  anthropic_key:   '',
  logo_path:       '',
  bank_name:       '',
  bank_account:    '',
  bank_iban:       '',
  bank_swift:      '',
  bank_beneficiary:''
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isDark, setIsDark] = useState(true)
  const [globalSearch, setGlobalSearch] = useState('')

  useEffect(() => {
    refreshSettings()
  }, [])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const refreshSettings = async () => {
    try {
      const s = await window.api.getSettings()
      setSettings(s as AppSettings)
      setIsDark(s.theme !== 'light')
    } catch {}
  }

  const refreshNotifications = async (userId: string) => {
    try {
      const notifs = await window.api.listNotifications(userId)
      setNotifications(notifs as Notification[])
    } catch {}
  }

  const toggleTheme = async () => {
    const next = !isDark
    setIsDark(next)
    await window.api.saveSettings({ theme: next ? 'dark' : 'light' })
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <AppContext.Provider value={{
      currentPage, setCurrentPage,
      settings, refreshSettings,
      notifications, unreadCount, refreshNotifications,
      isDark, toggleTheme,
      globalSearch, setGlobalSearch
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
