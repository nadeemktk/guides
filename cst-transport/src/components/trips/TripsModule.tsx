import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Plus, Edit2, Trash2, Search, CheckCircle, XCircle,
  AlertTriangle, Clock, CheckSquare, FileSpreadsheet, FileText
} from 'lucide-react'
import type { Trip, Vehicle, Driver, Client } from '../../types'
import ConfirmDialog from '../shared/ConfirmDialog'
import TripForm from './TripForm'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { format, startOfMonth, endOfMonth } from 'date-fns'

type TripTab = 'upcoming' | 'completed'

export default function TripsModule() {
  const { user } = useAuth()
  const { settings } = useApp()
  const curr = settings.currency || 'AED'
  const today = format(new Date(), 'yyyy-MM-dd')

  const [trips, setTrips] = useState<Trip[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [tripTab, setTripTab] = useState<TripTab>('upcoming')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('')
  const [filterDriver, setFilterDriver] = useState('')
  const [filterBookedBy, setFilterBookedBy] = useState('')
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(new Date().setMonth(new Date().getMonth() + 3)), 'yyyy-MM-dd')
  })
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [ts, vs, ds, cs] = await Promise.all([
      window.api.listTrips({
        start_date: dateRange.start,
        end_date: dateRange.end,
        payment_status: filterStatus || undefined,
        vehicle_id: filterVehicle || undefined,
        driver_id: filterDriver || undefined
      }),
      window.api.listVehicles(),
      window.api.listDrivers(),
      window.api.listClients()
    ])
    setTrips(ts as Trip[])
    setVehicles(vs as Vehicle[])
    setDrivers(ds as Driver[])
    setClients(cs as Client[])
    setLoading(false)
  }, [dateRange, filterStatus, filterVehicle, filterDriver])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    await window.api.deleteTrip(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  const handleTogglePayment = async (trip: Trip, newStatus: string) => {
    await window.api.toggleTripPayment({ id: trip.id, status: newStatus, method: trip.payment_method || 'cash', received_by: user?.full_name })
    load()
  }

  // Unique bookers from loaded trips
  const bookers = useMemo(() =>
    [...new Set(trips.map(t => t.booked_by).filter(Boolean))].sort(),
    [trips]
  )

  // Apply text search + booked_by filter
  const filtered = useMemo(() => trips.filter(t => {
    const matchSearch = !search ||
      t.client_name.toLowerCase().includes(search.toLowerCase()) ||
      t.job_description.toLowerCase().includes(search.toLowerCase()) ||
      (t.driver_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.booked_by || '').toLowerCase().includes(search.toLowerCase())
    const matchBooker = !filterBookedBy || t.booked_by === filterBookedBy
    return matchSearch && matchBooker
  }), [trips, search, filterBookedBy])

  // Split into upcoming vs completed by trip_date relative to today
  const upcoming  = useMemo(() => filtered.filter(t => t.trip_date >= today), [filtered, today])
  const completed = useMemo(() => filtered.filter(t => t.trip_date <  today), [filtered, today])
  const displayed = tripTab === 'upcoming' ? upcoming : completed

  const totalRevenue = displayed.filter(t => t.payment_status === 'paid').reduce((s, t) => s + t.payment_amount, 0)
  const totalUnpaid  = displayed.filter(t => t.payment_status === 'unpaid').reduce((s, t) => s + t.payment_amount, 0)

  // ── Export helpers ──────────────────────────────────────────────────────────

  const exportToExcel = async () => {
    if (!displayed.length) return
    setExporting(true)
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = settings.company_name
      wb.created = new Date()
      const ws = wb.addWorksheet('Daily Trips')

      ws.columns = [
        { header: 'Date',         key: 'trip_date',       width: 14 },
        { header: 'Client',       key: 'client_name',     width: 28 },
        { header: 'Mobile',       key: 'client_mobile',   width: 16 },
        { header: 'Job',          key: 'job_description', width: 32 },
        { header: 'Pickup',       key: 'pickup_location', width: 24 },
        { header: 'Dropoff',      key: 'dropoff_location',width: 24 },
        { header: 'Vehicle Type', key: 'vehicle_type',    width: 16 },
        { header: 'Plate',        key: 'plate_number',    width: 14 },
        { header: 'Driver',       key: 'driver_name',     width: 22 },
        { header: 'Booked By',    key: 'booked_by',       width: 18 },
        { header: 'Amount (AED)', key: 'payment_amount',  width: 14 },
        { header: 'Payment',      key: 'payment_status',  width: 12 },
        { header: 'Method',       key: 'payment_method',  width: 12 },
        { header: 'Trip Type',    key: 'trip_type',       width: 14 },
        { header: 'Remarks',      key: 'remarks',         width: 28 },
      ]

      // Header style
      ws.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A3E' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })
      ws.getRow(1).height = 22

      displayed.forEach((t, i) => {
        const row = ws.addRow({
          trip_date:        t.trip_date,
          client_name:      t.client_name,
          client_mobile:    t.client_mobile || '',
          job_description:  t.job_description,
          pickup_location:  t.pickup_location || '',
          dropoff_location: t.dropoff_location || '',
          vehicle_type:     t.vehicle_type || '',
          plate_number:     (t as any).plate_number || '',
          driver_name:      t.driver_name || '',
          booked_by:        t.booked_by || '',
          payment_amount:   t.payment_amount,
          payment_status:   t.payment_status,
          payment_method:   t.payment_method || 'cash',
          trip_type:        t.trip_type || '',
          remarks:          t.remarks || ''
        })
        if (i % 2 === 1) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } }
          })
        }
        // Color payment status
        const payCell = row.getCell('payment_status')
        payCell.font = {
          bold: true,
          color: { argb: t.payment_status === 'paid' ? 'FF166534' : t.payment_status === 'partial' ? 'FF92400E' : 'FF991B1B' }
        }
      })

      // Summary row
      ws.addRow([])
      const sumRow = ws.addRow(['', 'TOTAL', '', '', '', '', '', '', '', '', displayed.reduce((s,t)=>s+t.payment_amount,0), '', '', '', ''])
      sumRow.getCell(10).value = 'TOTAL'
      sumRow.font = { bold: true }

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `trips_${tripTab}_${format(new Date(),'yyyyMMdd')}.xlsx`
      a.click(); URL.revokeObjectURL(url)
    } catch (e) { console.error('Excel export failed', e) }
    setExporting(false)
  }

  const exportToPDF = async () => {
    if (!displayed.length) return
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      // Header
      doc.setFontSize(16); doc.setFont('helvetica', 'bold')
      doc.text(`${settings.company_name} – Daily Trips Report`, 14, 16)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal')
      doc.text(`${tripTab === 'upcoming' ? 'Upcoming Trips' : 'Completed Trips'} | Period: ${dateRange.start} – ${dateRange.end} | Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 23)

      autoTable(doc, {
        startY: 28,
        head: [['Date','Client','Job Description','Vehicle','Driver','Booked By','Amount (AED)','Payment','Method']],
        body: displayed.map(t => [
          t.trip_date,
          t.client_name,
          t.job_description.length > 35 ? t.job_description.slice(0,35)+'…' : t.job_description,
          t.vehicle_type || '—',
          t.driver_name || '—',
          t.booked_by || '—',
          t.payment_amount.toFixed(2),
          t.payment_status,
          t.payment_method || 'cash'
        ]),
        headStyles: { fillColor: [26,26,62], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245,247,250] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 38 },
          2: { cellWidth: 55 },
          3: { cellWidth: 24 },
          4: { cellWidth: 30 },
          5: { cellWidth: 24 },
          6: { cellWidth: 22, halign: 'right' },
          7: { cellWidth: 20 },
          8: { cellWidth: 18 },
        },
        didParseCell: (data) => {
          if (data.column.index === 7 && data.section === 'body') {
            const v = data.cell.raw as string
            data.cell.styles.textColor = v === 'paid' ? [22,101,52] : v === 'partial' ? [146,64,14] : [153,27,27]
            data.cell.styles.fontStyle = 'bold'
          }
        },
        foot: [[`Total: ${displayed.length} trips`, '', '', '', '', '', `AED ${displayed.reduce((s,t)=>s+t.payment_amount,0).toFixed(2)}`, '', '']],
        footStyles: { fillColor: [26,26,62], textColor: 255, fontStyle: 'bold' },
        showFoot: 'lastPage',
      })

      doc.save(`trips_${tripTab}_${format(new Date(),'yyyyMMdd')}.pdf`)
    } catch (e) { console.error('PDF export failed', e) }
    setExporting(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Trips</h1>
          <p className="text-slate-500 text-sm mt-0.5">Log and manage all transport trips</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToExcel} disabled={exporting || !displayed.length} className="btn-secondary text-xs">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportToPDF} disabled={exporting || !displayed.length} className="btn-secondary text-xs">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
            <Plus className="w-4 h-4" /> New Trip
          </button>
        </div>
      </div>

      {/* Upcoming / Completed Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-slate-900 rounded-xl w-fit">
        <button
          onClick={() => setTripTab('upcoming')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${tripTab === 'upcoming' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Clock className="w-4 h-4" />
          Upcoming Trips
          <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${tripTab === 'upcoming' ? 'bg-blue-500' : 'bg-slate-700 text-slate-400'}`}>
            {upcoming.length}
          </span>
        </button>
        <button
          onClick={() => setTripTab('completed')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${tripTab === 'completed' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <CheckSquare className="w-4 h-4" />
          Completed Trips
          <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${tripTab === 'completed' ? 'bg-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
            {completed.length}
          </span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="card p-4">
          <p className="text-xs text-slate-500">{tripTab === 'upcoming' ? 'Upcoming' : 'Completed'} Trips</p>
          <p className="text-2xl font-black text-slate-100 mt-1">{displayed.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Revenue Collected</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{curr} {totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Outstanding</p>
          <p className="text-2xl font-black text-red-400 mt-1">{curr} {totalUnpaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Unpaid Count</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{displayed.filter(t => t.payment_status === 'unpaid').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="input pl-9 text-sm w-52" placeholder="Search trips..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input className="input text-sm w-36" type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} title="From Date" />
        <input className="input text-sm w-36" type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} title="To Date" />
        <select className="select text-sm w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
        </select>
        <select className="select text-sm w-40" value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}>
          <option value="">All Vehicles</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number} – {v.vehicle_type}</option>)}
        </select>
        <select className="select text-sm w-40" value={filterDriver} onChange={e => setFilterDriver(e.target.value)}>
          <option value="">All Drivers</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
        <select className="select text-sm w-40" value={filterBookedBy} onChange={e => setFilterBookedBy(e.target.value)}>
          <option value="">All Bookers</option>
          {bookers.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Job</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Booked By</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Method</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-8 text-slate-500">Loading...</td></tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    {tripTab === 'upcoming' ? <Clock className="w-8 h-8 opacity-30" /> : <CheckSquare className="w-8 h-8 opacity-30" />}
                    <span>No {tripTab} trips found</span>
                  </div>
                </td>
              </tr>
            ) : displayed.map(trip => (
              <tr key={trip.id} className={trip.payment_status === 'unpaid' && tripTab === 'completed' ? 'highlight-unpaid' : ''}>
                <td className="whitespace-nowrap">
                  <span className={`text-sm ${trip.trip_date === today ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                    {trip.trip_date}
                  </span>
                  {trip.trip_date === today && <div className="text-[10px] text-amber-500">Today</div>}
                </td>
                <td>
                  <div className="font-medium text-slate-200">{trip.client_name}</div>
                  {trip.client_mobile && <div className="text-[10px] text-slate-500">{trip.client_mobile}</div>}
                </td>
                <td className="max-w-[160px]">
                  <div className="text-sm text-slate-300 truncate" title={trip.job_description}>{trip.job_description}</div>
                  {trip.pickup_location && <div className="text-[10px] text-slate-500 truncate">{trip.pickup_location} → {trip.dropoff_location}</div>}
                </td>
                <td>
                  <div className="text-sm text-slate-300">{trip.vehicle_type || '—'}</div>
                  {(trip as any).plate_number && <div className="text-[10px] text-slate-500 font-mono">{(trip as any).plate_number}</div>}
                  {trip.seats ? <div className="text-[10px] text-slate-500">{trip.seats} seats</div> : null}
                </td>
                <td>
                  <div className="text-sm text-slate-300">{trip.driver_name || '—'}</div>
                  {trip.driver_mobile && <div className="text-[10px] text-slate-500">{trip.driver_mobile}</div>}
                </td>
                <td className="text-sm text-slate-400">{trip.booked_by || '—'}</td>
                <td className="font-semibold whitespace-nowrap">{curr} {trip.payment_amount.toLocaleString()}</td>
                <td>
                  <button
                    onClick={() => handleTogglePayment(trip, trip.payment_status === 'paid' ? 'unpaid' : 'paid')}
                    className={`badge cursor-pointer hover:opacity-80 transition-opacity ${
                      trip.payment_status === 'paid' ? 'badge-paid' :
                      trip.payment_status === 'partial' ? 'badge-partial' : 'badge-unpaid'
                    }`}
                    title="Click to toggle"
                  >
                    {trip.payment_status === 'paid'
                      ? <CheckCircle className="w-3 h-3 mr-1 inline" />
                      : <XCircle className="w-3 h-3 mr-1 inline" />}
                    {trip.payment_status}
                  </button>
                  {trip.reminder_sent > 0 && (
                    <div className="text-[10px] text-amber-400 mt-0.5 flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> {trip.reminder_sent} reminder{trip.reminder_sent > 1 ? 's' : ''}
                    </div>
                  )}
                </td>
                <td><span className="badge badge-draft capitalize">{trip.payment_method || 'cash'}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditing(trip); setShowForm(true) }} className="btn-icon">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(trip)} className="btn-icon text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <TripForm
          trip={editing}
          vehicles={vehicles}
          drivers={drivers}
          clients={clients}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Trip"
          message={`Delete this trip for ${deleteTarget.client_name} on ${deleteTarget.trip_date}? This cannot be undone.`}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
