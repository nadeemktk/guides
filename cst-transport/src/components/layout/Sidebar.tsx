import React from 'react'
import {
  LayoutDashboard, FileText, BookOpen, Car, Users, DollarSign,
  BarChart2, Settings, Bell, Activity, Bot, Truck, Shield,
  Receipt, Wrench, ClipboardList
} from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import type { Page } from '../../types'

interface NavItem {
  id: Page
  label: string
  icon: React.ElementType
  group?: string
  badge?: number
}

export default function Sidebar() {
  const { currentPage, setCurrentPage, unreadCount } = useApp()
  const { user, hasPermission } = useAuth()

  const navItems: NavItem[] = [
    { id: 'dashboard',  label: 'Dashboard',        icon: LayoutDashboard, group: 'Main' },
    { id: 'trips',      label: 'Daily Trips',       icon: ClipboardList,   group: 'Operations' },
    { id: 'invoices',   label: 'Invoices',          icon: Receipt,         group: 'Operations' },
    { id: 'soa',        label: 'Statement of A/C',  icon: BookOpen,        group: 'Operations' },
    { id: 'vehicles',   label: 'Vehicles',          icon: Car,             group: 'Fleet' },
    { id: 'drivers',    label: 'Drivers',           icon: Users,           group: 'Fleet' },
    { id: 'salaries',   label: 'Driver Salaries',   icon: DollarSign,      group: 'Fleet' },
    { id: 'expenses',   label: 'Vehicle Expenses',  icon: Wrench,          group: 'Fleet' },
    { id: 'reports',    label: 'Reports',           icon: BarChart2,       group: 'Intelligence' },
    { id: 'ai',         label: 'CST Chat AI',       icon: Bot,             group: 'Intelligence' },
    { id: 'reminders',  label: 'Reminders',         icon: Bell,            group: 'System', badge: unreadCount },
    { id: 'users',      label: 'Users & Roles',     icon: Shield,          group: 'System' },
    { id: 'activity',   label: 'Activity Log',      icon: Activity,        group: 'System' },
    { id: 'settings',   label: 'Settings',          icon: Settings,        group: 'System' }
  ]

  const visibleItems = navItems.filter(item => {
    if (user?.role === 'admin') return true
    switch (item.id) {
      case 'dashboard':  return hasPermission('dashboard', 'view')
      case 'trips':      return hasPermission('trips', 'view')
      case 'invoices':   return hasPermission('invoices', 'create') || hasPermission('invoices', 'edit')
      case 'soa':        return hasPermission('soa', 'view')
      case 'vehicles':   return hasPermission('vehicles', 'view')
      case 'drivers':    return hasPermission('drivers', 'view')
      case 'salaries':   return hasPermission('salary', 'view')
      case 'expenses':   return hasPermission('expenses', 'manage')
      case 'reports':    return hasPermission('reports', 'view')
      case 'ai':         return hasPermission('ai', 'access')
      case 'reminders':  return hasPermission('reminders', 'configure')
      case 'users':      return hasPermission('users', 'view')
      case 'activity':   return user?.role === 'admin'
      case 'settings':   return user?.role === 'admin'
      default:           return false
    }
  })

  const groups = [...new Set(visibleItems.map(i => i.group))]

  return (
    <aside className="w-60 min-w-[240px] h-full bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-glow flex-shrink-0">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-white text-sm leading-tight">CST Transport</div>
            <div className="text-slate-500 text-[10px] truncate">City Star Transport</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {groups.map(group => {
          const items = visibleItems.filter(i => i.group === group)
          if (!items.length) return null
          return (
            <div key={group}>
              <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1">
                {group}
              </div>
              <ul className="space-y-0.5">
                {items.map(item => {
                  const Icon = item.icon
                  const active = currentPage === item.id
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setCurrentPage(item.id)}
                        className={`sidebar-item w-full ${active ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge ? (
                          <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.full_name?.[0] || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-200 truncate">{user?.full_name}</div>
            <div className="text-[10px] text-slate-500 capitalize">{user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
