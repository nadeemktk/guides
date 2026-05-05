import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User, Permissions } from '../types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  hasPermission: (module: keyof Permissions, action: string) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Restore session from localStorage
    const saved = localStorage.getItem('cst_user')
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch {}
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const result = await window.api.login({ username, password })
    if (result.success) {
      setUser(result.user)
      localStorage.setItem('cst_user', JSON.stringify(result.user))
    }
    return result
  }

  const logout = async () => {
    if (user) await window.api.logout(user.id)
    setUser(null)
    localStorage.removeItem('cst_user')
  }

  const hasPermission = (module: keyof Permissions, action: string): boolean => {
    if (!user) return false
    if (user.role === 'admin') return true
    const perms = user.permissions?.[module] as Record<string, boolean> | undefined
    return perms?.[action] === true
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
