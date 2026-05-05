import React, { useEffect, useState, useCallback } from 'react'
import {
  Plus, Edit2, Trash2, Search, Filter, CheckCircle, XCircle,
  AlertTriangle, Car, CalendarDays, Download
} from 'lucide-react'
import type { Trip, Vehicle, Driver, Client } from '../../types'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import TripForm from './TripForm'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export default function TripsModule() {
  const { user } = useAuth()
  const { settings } = useApp()
  const curr = settings.currency || 'AED'

  const [trips, setTrips] = useState<Trip[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('')
  const [filterDriver, setFilterDriver] = useState('')
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null)
  const [paymentModal, setPaymentModal] = useState<Trip | null>(null)
  const [stats, setStats] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [ts, vs, ds, cs, st] = await Promise.all([
      window.api.listTrips({
        start_date: dateRange.start,
        end_date: dateRange.end,
        payment_status: filterStatus || undefined,
        vehicle_id: filterVehicle || undefined,
        driver_id: filterDriver || undefined
      }),
      window.api.listVehicles(),
      window.api.listDrivers(),
      window.api.listClients(),
      window.api.tripStats()
    ])
    setTrips(ts as Trip[])
    setVehicles(vs as Vehicle[])
    setDrivers(ds as Driver[])
    setClients(cs as Client[])
    setStats(st)
    setLoading(false)
  }, [dateRange, filterStatus, filterVehicle, filterDriver])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    await window.api.deleteTrip(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  const handleTogglePayment = async (trip: Trip, newStatus: string, method = 'cash') => {
    await window.api.toggleTripPayment({ id: trip.id, status: newStatus, method, received_by: user?.full_name })
    load()
  }

  const filtered = trips.filter(t =>
    t.client_name.toLowerCase().includes(search.toLowerCase()) ||
    t.job_description.toLowerCase().includes(search.toLowerCase()) ||
    t.driver_name.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = filtered.filter(t => t.payment_status === 'paid').reduce((s, t) => s + t.payment_amount, 0)
  const totalUnpaid  = filtered.filter(t => t.payment_status === 'unpaid').reduce((s, t) => s + t.payment_amount, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Trips</h1>
          <p className="text-slate-500 text-sm mt-0.5">Log and manage all transport trips</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> New Trip
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Trips (Period)</p>
          <p className="text-2xl font-black text-slate-100 mt-1">{filtered.length}</p>
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
          <p className="text-2xl font-black text-amber-400 mt-1">{filtered.filter(t => t.payment_status === 'unpaid').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="input pl-9 text-sm w-52" placeholder="Search trips..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input className="input text-sm w-36" type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} title="From" />
        <input className="input text-sm w-36" type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} title="To" />
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
              <th>Amount</th>
              <th>Payment</th>
              <th>Method</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8 text-slate-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-slate-500">No trips found</td></tr>
            ) : filtered.map(trip => (
              <tr key={trip.id} className={trip.payment_status === 'unpaid' ? 'highlight-unpaid' : ''}>
                <td className="whitespace-nowrap text-slate-400">{trip.trip_date}</td>
                <td>
                  <div className="font-medium text-slate-200">{trip.client_name}</div>
                  {trip.client_mobile && <div className="text-[10px] text-slate-500">{trip.client_mobile}</div>}
                </td>
                <td className="max-w-[160px]">
                  <div className="text-sm text-slate-300 truncate" title={trip.job_description}>{trip.job_description}</div>
                  {trip.booked_by && <div className="text-[10px] text-slate-500">Booked: {trip.booked_by}</div>}
                </td>
                <td>
                  <div className="text-sm text-slate-300">{trip.vehicle_type || '—'}</div>
                  {trip.plate_number && <div className="text-[10px] text-slate-500 font-mono">{trip.plate_number}</div>}
                  {trip.seats ? <div className="text-[10px] text-slate-500">{trip.seats} seats</div> : null}
                </td>
                <td>
                  <div className="text-sm text-slate-300">{trip.driver_name || '—'}</div>
                  {trip.driver_mobile && <div className="text-[10px] text-slate-500">{trip.driver_mobile}</div>}
                </td>
                <td className="font-semibold whitespace-nowrap">
                  {curr} {trip.payment_amount.toLocaleString()}
                </td>
                <td>
                  <button
                    onClick={() => handleTogglePayment(trip, trip.payment_status === 'paid' ? 'unpaid' : 'paid')}
                    className={`badge cursor-pointer hover:opacity-80 transition-opacity ${
                      trip.payment_status === 'paid' ? 'badge-paid' :
                      trip.payment_status === 'partial' ? 'badge-partial' : 'badge-unpaid'
                    }`}
                    title="Click to toggle"
                  >
                    {trip.payment_status === 'paid' ? <CheckCircle className="w-3 h-3 mr-1 inline" /> : <XCircle className="w-3 h-3 mr-1 inline" />}
                    {trip.payment_status}
                  </button>
                  {trip.reminder_sent > 0 && (
                    <div className="text-[10px] text-amber-400 mt-0.5 flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> {trip.reminder_sent} reminder{trip.reminder_sent > 1 ? 's' : ''}
                    </div>
                  )}
                </td>
                <td>
                  <span className="badge badge-draft capitalize">{trip.payment_method || 'cash'}</span>
                </td>
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
