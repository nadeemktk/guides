import React, { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, Car, Users, FileText, AlertTriangle,
  DollarSign, Receipt, Wrench, Clock, CheckCircle
} from 'lucide-react'
import type { DashboardData } from '../../types'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

function KPICard({ label, value, sub, icon: Icon, color, trend }: any) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-black text-slate-100 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>AED {(p.value || 0).toLocaleString()}</strong>
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { settings } = useApp()
  const { user } = useAuth()

  useEffect(() => {
    window.api.getDashboard().then(d => {
      setData(d as DashboardData)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const d = data!
  const curr = settings.currency || 'AED'

  // Merge revenue + expense charts
  const revenueMap: Record<string, any> = {}
  d.monthly_revenue?.forEach(r => { revenueMap[r.month] = { month: r.month, revenue: r.revenue, trips: r.trips } })
  d.monthly_expenses?.forEach(e => {
    if (!revenueMap[e.month]) revenueMap[e.month] = { month: e.month, revenue: 0, trips: 0 }
    revenueMap[e.month].expenses = e.expenses
  })
  const chartData = Object.values(revenueMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(r => ({ ...r, profit: (r.revenue || 0) - (r.expenses || 0), month: r.month?.slice(0, 7) || '' }))

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{settings.company_name}</p>
        </div>
        <div className="text-right text-slate-500 text-sm">
          <div>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="This Month Revenue"
          value={`${curr} ${(d.revenue?.total || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${d.total_trips?.cnt || 0} trips this month`}
          icon={TrendingUp}
          color="bg-blue-600/20 text-blue-400"
        />
        <KPICard
          label="Outstanding Payments"
          value={`${curr} ${(d.unpaid?.total || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub="Unpaid trips"
          icon={AlertTriangle}
          color="bg-red-600/20 text-red-400"
        />
        <KPICard
          label="Pending Invoices"
          value={`${curr} ${(d.pending_invoices?.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${d.pending_invoices?.cnt || 0} invoices outstanding`}
          icon={Receipt}
          color="bg-amber-600/20 text-amber-400"
        />
        <KPICard
          label="Month Expenses"
          value={`${curr} ${(d.total_expenses?.total || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub="Vehicle expenses"
          icon={Wrench}
          color="bg-purple-600/20 text-purple-400"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Active Vehicles"
          value={d.active_vehicles?.cnt || 0}
          icon={Car}
          color="bg-emerald-600/20 text-emerald-400"
        />
        <KPICard
          label="Active Drivers"
          value={d.active_drivers?.cnt || 0}
          icon={Users}
          color="bg-cyan-600/20 text-cyan-400"
        />
        <KPICard
          label="Today's Trips"
          value={d.total_trips?.cnt || 0}
          sub="this month"
          icon={FileText}
          color="bg-indigo-600/20 text-indigo-400"
        />
        <KPICard
          label="Net Profit (Month)"
          value={`${curr} ${((d.revenue?.total || 0) - (d.total_expenses?.total || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          color="bg-green-600/20 text-green-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Revenue vs Expenses */}
        <div className="col-span-2 card p-5">
          <h3 className="section-title">Revenue vs Expenses (12 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="none" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown Pie */}
        <div className="card p-5">
          <h3 className="section-title">Expense Breakdown</h3>
          {(d.expense_breakdown?.length || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={d.expense_breakdown}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                >
                  {d.expense_breakdown?.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`AED ${v.toFixed(0)}`, '']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} formatter={v => v.charAt(0).toUpperCase() + v.slice(1)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-slate-600 text-sm">No expense data</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top Clients */}
        <div className="card p-5">
          <h3 className="section-title">Top Clients by Revenue</h3>
          <div className="space-y-3">
            {(d.top_clients || []).map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">{c.client_name}</div>
                  <div className="h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, (c.total / (d.top_clients[0]?.total || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-100 flex-shrink-0">
                  {curr} {(c.total || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
            {!d.top_clients?.length && <div className="text-slate-600 text-sm">No data yet</div>}
          </div>
        </div>

        {/* Top Vehicles */}
        <div className="card p-5">
          <h3 className="section-title">Vehicle Type Performance</h3>
          {(d.top_vehicles?.length || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d.top_vehicles} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="vehicle_type" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-600 text-sm">No vehicle data yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
