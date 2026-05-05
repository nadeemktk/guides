import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import LoginPage from './components/auth/LoginPage'
import MainLayout from './components/layout/MainLayout'

function AppContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-glow">
            <span className="text-2xl font-black text-white">CST</span>
          </div>
          <div className="text-slate-500 text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
