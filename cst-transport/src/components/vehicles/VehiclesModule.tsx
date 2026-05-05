import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Car, AlertTriangle } from 'lucide-react'
import type { Vehicle } from '../../types'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_STYLES: Record<string, string> = {
  available:   'badge bg-emerald-500/20 text-emerald-400',
  on_trip:     'badge bg-blue-500/20 text-blue-400',
  maintenance: 'badge bg-amber-500/20 text-amber-400',
  inactive:    'badge bg-slate-500/20 text-slate-400'
}

export default function VehiclesModule() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const vs = await window.api.listVehicles()
    setVehicles(vs as Vehicle[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (form: any) => {
    if (editing) {
      await window.api.updateVehicle({ id: editing.id, ...form })
    } else {
      await window.api.createVehicle(form)
    }
    setShowForm(false)
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await window.api.deleteVehicle(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  const isExpiring = (date: string | null) => {
    if (!date) return false
    const d = new Date(date)
    const now = new Date()
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diff < 30
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet Vehicles</h1>
          <p className="text-slate-500 text-sm">Manage vehicles, status and documents</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {(['available','on_trip','maintenance','inactive'] as const).map(s => (
          <div key={s} className="card p-4">
            <p className="text-xs text-slate-500 capitalize">{s.replace('_', ' ')}</p>
            <p className="text-2xl font-black text-slate-100 mt-1">{vehicles.filter(v => v.status === s).length}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-4 text-center py-8 text-slate-500">Loading...</div>
        ) : vehicles.map(v => (
          <div key={v.id} className="card p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditing(v); setShowForm(true) }} className="btn-icon">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteTarget(v)} className="btn-icon text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="font-mono font-bold text-slate-100 text-lg">{v.plate_number}</div>
            <div className="text-sm text-slate-400">{v.vehicle_type} {v.make && `– ${v.make} ${v.model || ''}`}</div>
            <div className="text-xs text-slate-500 mt-1">{v.seats} seats | Owner: {v.owner_name}</div>
            <div className="flex items-center gap-2 mt-3">
              <span className={STATUS_STYLES[v.status] || 'badge badge-draft'}>{v.status.replace('_', ' ')}</span>
              {(isExpiring(v.insurance_expiry) || isExpiring(v.mulkiya_expiry)) && (
                <span className="badge bg-amber-500/20 text-amber-400" title="Document expiring soon">
                  <AlertTriangle className="w-3 h-3" />
                </span>
              )}
            </div>
            <div className="mt-2 space-y-0.5 text-[10px] text-slate-500">
              {v.insurance_expiry && <div className={isExpiring(v.insurance_expiry) ? 'text-amber-400' : ''}>Insurance: {v.insurance_expiry}</div>}
              {v.mulkiya_expiry && <div className={isExpiring(v.mulkiya_expiry) ? 'text-amber-400' : ''}>Mulkiya: {v.mulkiya_expiry}</div>}
            </div>
          </div>
        ))}
        {!loading && vehicles.length === 0 && (
          <div className="col-span-4 text-center py-8 text-slate-500">No vehicles added yet</div>
        )}
      </div>

      {showForm && (
        <VehicleFormModal
          vehicle={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Vehicle"
          message={`Delete vehicle ${deleteTarget.plate_number}? This action cannot be undone.`}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function VehicleFormModal({ vehicle, onClose, onSave }: { vehicle: Vehicle | null; onClose: () => void; onSave: (f: any) => void }) {
  const [form, setForm] = useState({
    plate_number:     vehicle?.plate_number     || '',
    vehicle_type:     vehicle?.vehicle_type     || '',
    make:             vehicle?.make             || '',
    model:            vehicle?.model            || '',
    year:             vehicle?.year             || '',
    seats:            vehicle?.seats            || '',
    owner_name:       vehicle?.owner_name       || '',
    owner_mobile:     vehicle?.owner_mobile     || '',
    color:            vehicle?.color            || '',
    status:           vehicle?.status           || 'available',
    insurance_expiry: vehicle?.insurance_expiry || '',
    mulkiya_expiry:   vehicle?.mulkiya_expiry   || '',
    notes:            vehicle?.notes            || ''
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal
      title={vehicle ? `Edit Vehicle – ${vehicle.plate_number}` : 'Add New Vehicle'}
      onClose={onClose}
      size="lg"
      footer={<>
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={() => onSave(form)} className="btn-primary">{vehicle ? 'Update' : 'Add Vehicle'}</button>
      </>}
    >
      <div className="grid grid-cols-2 gap-4">
        {[
          ['plate_number', 'Plate Number *', 'text'],
          ['vehicle_type', 'Vehicle Type *', 'text'],
          ['make', 'Make (Brand)', 'text'],
          ['model', 'Model', 'text'],
          ['year', 'Year', 'number'],
          ['seats', 'Seats', 'number'],
          ['owner_name', 'Owner Name *', 'text'],
          ['owner_mobile', 'Owner Mobile', 'text'],
          ['color', 'Color', 'text'],
        ].map(([k, l, t]) => (
          <div key={k} className="form-group">
            <label className="label">{l}</label>
            <input className="input" type={t} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
        <div className="form-group">
          <label className="label">Status</label>
          <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
            {['available','on_trip','maintenance','inactive'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Insurance Expiry</label>
          <input className="input" type="date" value={form.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Mulkiya Expiry</label>
          <input className="input" type="date" value={form.mulkiya_expiry} onChange={e => set('mulkiya_expiry', e.target.value)} />
        </div>
        <div className="form-group col-span-2">
          <label className="label">Notes</label>
          <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
