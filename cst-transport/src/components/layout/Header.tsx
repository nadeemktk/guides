import React, { useState, useRef, useEffect } from 'react'
import { Bell, Search, Sun, Moon, LogOut, Database, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import type { Page } from '../../types'

export default function Header() {
  const { user, logout } = useAuth()
  const { notifications, unreadCount, isDark, toggleTheme, setCurrentPage, globalSearch, setGlobalSearch, refreshNotifications } = useApp()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<any>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      refreshNotifications(user.id)
      const interval = setInterval(() => refreshNotifications(user.id), 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    if (showSearch) searchRef.current?.focus()
  }, [showSearch])

  const handleSearch = async (q: string) => {
    setGlobalSearch(q)
    if (q.length < 2) { setSearchResults(null); return }
    setSearchLoading(true)
    const results = await window.api.globalSearch(q)
    setSearchResults(results)
    setSearchLoading(false)
  }

  const navigateTo = (type: string) => {
    const map: Record<string, Page> = {
      client: 'soa', trip: 'trips', invoice: 'invoices', driver: 'drivers', vehicle: 'vehicles'
    }
    if (map[type]) setCurrentPage(map[type])
    setShowSearch(false)
    setGlobalSearch('')
    setSearchResults(null)
  }

  const handleMarkAllRead = async () => {
    if (user) {
      await window.api.markAllRead(user.id)
      refreshNotifications(user.id)
    }
  }

  const handleBackup = async () => {
    await window.api.createBackup()
  }

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-3 flex-shrink-0">
      {/* Search */}
      <div className="flex-1 relative">
        {showSearch ? (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              ref={searchRef}
              className="input pl-9 pr-8 text-sm"
              placeholder="Search clients, trips, invoices, drivers..."
              value={globalSearch}
              onChange={e => handleSearch(e.target.value)}
            />
            <button
              onClick={() => { setShowSearch(false); setSearchResults(null); setGlobalSearch('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Results dropdown */}
            {searchResults && (
              <div className="absolute top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-slate-500 text-sm text-center">Searching...</div>
                ) : (
                  Object.entries(searchResults).map(([type, items]: [string, any]) =>
                    items.length > 0 ? (
                      <div key={type}>
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-700">
                          {type}
                        </div>
                        {items.map((item: any) => (
                          <button
                            key={item.id}
                            onClick={() => navigateTo(type.replace(/s$/, ''))}
                            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                          >
                            <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-400 capitalize">{type.replace(/s$/, '')}</span>
                            {item.title}
                          </button>
                        ))}
                      </div>
                    ) : null
                  )
                )}
                {Object.values(searchResults).every((v: any) => v.length === 0) && (
                  <div className="p-4 text-slate-500 text-sm text-center">No results found</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:block">Quick search...</span>
            <kbd className="hidden sm:block text-[10px] px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-600">Ctrl+K</kbd>
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button onClick={handleBackup} className="btn-icon" title="Create backup">
          <Database className="w-4 h-4" />
        </button>

        <button onClick={toggleTheme} className="btn-icon" title="Toggle theme">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setShowNotifs(!showNotifs)} className="btn-icon relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50">
              <div className="flex items-center justify-between p-3 border-b border-slate-700">
                <span className="font-semibold text-sm text-slate-200">Notifications</span>
                <button onClick={handleMarkAllRead} className="text-xs text-blue-400 hover:text-blue-300">Mark all read</button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-slate-500 text-sm text-center">No notifications</div>
                ) : notifications.slice(0, 10).map(n => (
                  <div key={n.id} className={`p-3 border-b border-slate-700/50 ${!n.is_read ? 'bg-blue-900/10' : ''}`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${n.type === 'warning' ? 'bg-amber-400' : n.type === 'error' ? 'bg-red-400' : 'bg-blue-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-slate-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-700">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-slate-200">{user?.full_name}</div>
            <div className="text-[10px] text-slate-500 capitalize">{user?.role}</div>
          </div>
          <button onClick={logout} className="btn-icon" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
