import React, { Suspense } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useApp } from '../../contexts/AppContext'

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

export default function MainLayout() {
  const { currentPage } = useApp()

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':  return <Dashboard />
      case 'clients':    return <Clients />
      case 'trips':      return <Trips />
      case 'invoices':   return <Invoices />
      case 'soa':        return <SOA />
      case 'vehicles':   return <Vehicles />
      case 'drivers':    return <Drivers />
      case 'salaries':   return <Salaries />
      case 'expenses':   return <Expenses />
      case 'reports':    return <Reports />
      case 'ai':         return <AIChat />
      case 'reminders':  return <Reminders />
      case 'users':      return <Users />
      case 'activity':   return <ActivityLog />
      case 'settings':   return <SettingsPage />
      default:           return <Dashboard />
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <Suspense fallback={<PageLoader />}>
            {renderPage()}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
