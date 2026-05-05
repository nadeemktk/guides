import React, { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'
import { Download, FileText, BarChart2, Calendar } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { useApp } from '../../contexts/AppContext'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value?.toLocaleString()}</strong></p>
      ))}
    </div>
  )
}

export default function ReportsModule() {
  const { settings } = useApp()
  const curr = settings.currency || 'AED'

  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end:   format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })
  const [reportData, setReportData] = useState<any>(null)
  const [tripsData, setTripsData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'financial' | 'trips'>('financial')

  const setPreset = (preset: string) => {
    const now = new Date()
    if (preset === 'thisMonth') {
      setDateRange({ start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') })
    } else if (preset === 'thisYear') {
      setDateRange({ start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd') })
    } else if (preset === 'last3') {
      const from = new Date(now)
      from.setMonth(from.getMonth() - 3)
      setDateRange({ start: format(from, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') })
    }
  }

  const generateReport = async () => {
    setLoading(true)
    const [fin, trips] = await Promise.all([
      window.api.getFinancialReport({ start_date: dateRange.start, end_date: dateRange.end }),
      window.api.getTripsReport({ start_date: dateRange.start, end_date: dateRange.end })
    ])
    setReportData(fin)
    setTripsData(trips as any[])
    setLoading(false)
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const rows = data.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${dateRange.start}_${dateRange.end}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Build chart data from financial report
  const chartData = reportData ? (() => {
    const map: Record<string, any> = {}
    reportData.trips?.forEach((t: any) => {
      const d = t.date
      if (!map[d]) map[d] = { date: d, revenue: 0, expenses: 0, profit: 0 }
      map[d].revenue = (map[d].revenue || 0) + (t.revenue || 0)
    })
    reportData.expenses?.forEach((e: any) => {
      const d = e.date
      if (!map[d]) map[d] = { date: d, revenue: 0, expenses: 0, profit: 0 }
      map[d].expenses = (map[d].expenses || 0) + (e.total || 0)
    })
    return Object.values(map).sort((a,b) => a.date.localeCompare(b.date)).map(d => ({
      ...d, profit: d.revenue - d.expenses
    }))
  })() : []

  const totalRevenue  = chartData.reduce((s: number, d: any) => s + (d.revenue || 0), 0)
  const totalExpenses = chartData.reduce((s: number, d: any) => s + (d.expenses || 0), 0)
  const totalProfit   = totalRevenue - totalExpenses

  // Trips summary
  const paidTrips   = tripsData.filter(t => t.payment_status === 'paid')
  const unpaidTrips = tripsData.filter(t => t.payment_status === 'unpaid')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="text-slate-500 text-sm">Generate financial and operational reports</p>
        </div>
        <div className="flex gap-2">
          {reportData && (
            <>
              <button onClick={() => exportToCSV(tripsData, 'trips_report')} className="btn-secondary">
                <Download className="w-4 h-4" /> Export Trips CSV
              </button>
              <button onClick={() => exportToCSV(chartData, 'financial_report')} className="btn-secondary">
                <Download className="w-4 h-4" /> Export Financial CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Date range + presets */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2">
            {['thisMonth','last3','thisYear'].map(p => (
              <button key={p} onClick={() => setPreset(p)} className="btn-ghost text-xs">
                {p === 'thisMonth' ? 'This Month' : p === 'last3' ? 'Last 3 Months' : 'This Year'}
              </button>
            ))}
          </div>
          <div className="form-group">
            <label className="label">From</label>
            <input className="input text-sm" type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">To</label>
            <input className="input text-sm" type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
          </div>
          <button onClick={generateReport} disabled={loading} className="btn-primary">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <BarChart2 className="w-4 h-4" />}
            Generate Report
          </button>
        </div>
      </div>

      {!reportData && !loading && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-600">
          <BarChart2 className="w-12 h-12 mb-3 opacity-30" />
          <p>Set date range and click Generate Report</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {reportData && !loading && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total Revenue', value: `${curr} ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-emerald-400' },
              { label: 'Total Expenses', value: `${curr} ${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-red-400' },
              { label: 'Net Profit', value: `${curr} ${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: totalProfit >= 0 ? 'text-blue-400' : 'text-red-400' },
              { label: 'Total Trips', value: String(tripsData.length), color: 'text-slate-100' }
            ].map(s => (
              <div key={s.label} className="card p-4">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-slate-900 rounded-xl w-fit mb-5">
            {[{ id: 'financial', label: 'Financial' }, { id: 'trips', label: 'Trip Listing' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'financial' && (
            <div className="space-y-5">
              {/* Revenue vs Expenses Chart */}
              <div className="card p-5">
                <h3 className="section-title">Daily Revenue vs Expenses</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="url(#revG)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fill="url(#expG)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === 'trips' && (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Job</th>
                    <th>Vehicle</th>
                    <th>Driver</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tripsData.map(t => (
                    <tr key={t.id} className={t.payment_status === 'unpaid' ? 'highlight-unpaid' : ''}>
                      <td className="text-slate-400 whitespace-nowrap">{t.trip_date}</td>
                      <td className="font-medium text-slate-200">{t.client_name}</td>
                      <td className="text-slate-400 max-w-[200px] truncate">{t.job_description}</td>
                      <td className="font-mono text-xs text-blue-400">{t.plate_number || t.vehicle_type || '—'}</td>
                      <td className="text-slate-400">{t.driver_name || '—'}</td>
                      <td className="font-semibold">{curr} {(t.payment_amount||0).toLocaleString()}</td>
                      <td><span className={`badge ${t.payment_status === 'paid' ? 'badge-paid' : t.payment_status === 'partial' ? 'badge-partial' : 'badge-unpaid'}`}>{t.payment_status}</span></td>
                    </tr>
                  ))}
                  {tripsData.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-500">No trips in this period</td></tr>
                  )}
                </tbody>
                {tripsData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900">
                      <td colSpan={5} className="px-4 py-3 font-semibold text-slate-300">Total</td>
                      <td className="px-4 py-3 font-black text-emerald-400">
                        {curr} {paidTrips.reduce((s,t) => s + t.payment_amount, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{paidTrips.length} paid / {unpaidTrips.length} unpaid</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
