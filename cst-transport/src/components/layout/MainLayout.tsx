import React, { Suspense } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useApp } from '../../contexts/AppContext'
import ErrorBoundary from '../shared/ErrorBoundary'

// Lazy-load all page modules
const Dashboard     = React.lazy(() => import('../dashboard/Dashboard'))
const Clients       = React.lazy(() => import('../clients/ClientsModule'))
const Trips         = React.lazy(() => import('../trips/TripsModule'))
const Invoices      = React.lazy(() => import('../invoices/InvoicesModule'))
const SOA           = React.lazy(() => import('../soa/SOAModule'))
const Vehicles      = React.lazy(() => import('../vehicles/VehiclesModule'))
const Drivers       = React.lazy(() => import('../drivers/DriversModule'))
const Salaries      = React.lazy(() => import('../drivers/SalariesModule'))
const Expenses      = React.lazy(() => import('../vehicles/ExpensesModule'))
const Reports       = React.lazy(() => import('../reports/ReportsModule'))
const AIChat        = React.lazy(() => import('../ai/AIChatModule'))
const Reminders     = React.lazy(() => import('../trips/RemindersModule'))
const Users         = React.lazy(() => import('../users/UsersModule'))
const ActivityLog   = React.lazy(() => import('../shared/ActivityLog'))
const SettingsPage  = React.lazy(() => import('../shared/SettingsPage'))

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 text-sm">Loading module...</span>
      </div>
    </div>
  )
}

function SafePage({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <ErrorBoundary fallbackLabel={`The "${label}" module failed to load. Click "Try Again" or reload the app.`}>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

export default function MainLayout() {
  const { currentPage } = useApp()

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':  return <SafePage label="Dashboard"><Dashboard /></SafePage>
      case 'clients':    return <SafePage label="Clients"><Clients /></SafePage>
      case 'trips':      return <SafePage label="Trips"><Trips /></SafePage>
      case 'invoices':   return <SafePage label="Invoices"><Invoices /></SafePage>
      case 'soa':        return <SafePage label="Statement of Account"><SOA /></SafePage>
      case 'vehicles':   return <SafePage label="Vehicles"><Vehicles /></SafePage>
      case 'drivers':    return <SafePage label="Drivers"><Drivers /></SafePage>
      case 'salaries':   return <SafePage label="Salaries"><Salaries /></SafePage>
      case 'expenses':   return <SafePage label="Vehicle Expenses"><Expenses /></SafePage>
      case 'reports':    return <SafePage label="Reports"><Reports /></SafePage>
      case 'ai':         return <SafePage label="AI Assistant"><AIChat /></SafePage>
      case 'reminders':  return <SafePage label="Reminders"><Reminders /></SafePage>
      case 'users':      return <SafePage label="Users"><Users /></SafePage>
      case 'activity':   return <SafePage label="Activity Log"><ActivityLog /></SafePage>
      case 'settings':   return <SafePage label="Settings"><SettingsPage /></SafePage>
      default:           return <SafePage label="Dashboard"><Dashboard /></SafePage>
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
