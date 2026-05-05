import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Users, Phone, FileText } from 'lucide-react'
import type { Driver } from '../../types'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'

const STATUS_STYLE: Record<string, string> = {
  active:   'badge bg-emerald-500/20 text-emerald-400',
  inactive: 'badge bg-slate-500/20 text-slate-400',
  on_leave: 'badge bg-amber-500/20 text-amber-400'
}

export default function DriversModule() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const ds = await window.api.listDrivers()
    setDrivers(ds as Driver[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (form: any) => {
    if (editing) {
      await window.api.updateDriver({ id: editing.id, ...form })
    } else {
      await window.api.createDriver(form)
    }
    setShowForm(false)
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await window.api.deleteDriver(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  const isExpiring = (date: string | null) => {
    if (!date) return false
    const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff < 30
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Drivers</h1>
          <p className="text-slate-500 text-sm">Manage driver profiles and documents</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Driver
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {['active','on_leave','inactive'].map(s => (
          <div key={s} className="card p-4">
            <p className="text-xs text-slate-500 capitalize">{s.replace('_',' ')}</p>
            <p className="text-2xl font-black text-slate-100 mt-1">{drivers.filter(d => d.status === s).length}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-slate-500">Loading...</div>
        ) : drivers.map(d => (
          <div key={d.id} className="card p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center font-bold text-purple-400 text-sm">
                {d.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(d); setShowForm(true) }} className="btn-icon"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteTarget(d)} className="btn-icon text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="font-semibold text-slate-100">{d.full_name}</div>
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
              <Phone className="w-3 h-3" /> {d.mobile}
            </div>
            {d.nationality && <div className="text-xs text-slate-500 mt-0.5">{d.nationality}</div>}
            <div className="flex items-center justify-between mt-3">
              <span className={STATUS_STYLE[d.status] || 'badge badge-draft'}>{d.status.replace('_',' ')}</span>
              <span className="text-xs text-slate-400 font-medium">AED {d.base_salary.toLocaleString()}/mo</span>
            </div>
            <div className="mt-2 space-y-0.5 text-[10px] text-slate-500">
              {d.license_expiry && <div className={isExpiring(d.license_expiry) ? 'text-amber-400' : ''}>License: {d.license_expiry}</div>}
              {d.id_expiry && <div className={isExpiring(d.id_expiry) ? 'text-amber-400' : ''}>ID: {d.id_expiry}</div>}
            </div>
          </div>
        ))}
        {!loading && drivers.length === 0 && (
          <div className="col-span-3 text-center py-8 text-slate-500">No drivers added yet</div>
        )}
      </div>

      {showForm && <DriverFormModal driver={editing} onClose={() => { setShowForm(false); setEditing(null) }} onSave={handleSave} />}
      {deleteTarget && (
        <ConfirmDialog title="Delete Driver" message={`Delete driver ${deleteTarget.full_name}?`} danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  )
}

function DriverFormModal({ driver, onClose, onSave }: any) {
  const [form, setForm] = useState({
    full_name:       driver?.full_name       || '',
    mobile:          driver?.mobile          || '',
    license_number:  driver?.license_number  || '',
    license_expiry:  driver?.license_expiry  || '',
    nationality:     driver?.nationality     || '',
    id_number:       driver?.id_number       || '',
    id_expiry:       driver?.id_expiry       || '',
    base_salary:     driver?.base_salary     || '',
    joining_date:    driver?.joining_date    || '',
    status:          driver?.status          || 'active',
    notes:           driver?.notes           || ''
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal
      title={driver ? `Edit Driver – ${driver.full_name}` : 'Add New Driver'}
      onClose={onClose}
      size="lg"
      footer={<>
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={() => onSave(form)} className="btn-primary">{driver ? 'Update' : 'Add Driver'}</button>
      </>}
    >
      <div className="grid grid-cols-2 gap-4">
        {[
          ['full_name', 'Full Name *', 'text'],
          ['mobile', 'Mobile *', 'text'],
          ['nationality', 'Nationality', 'text'],
          ['base_salary', 'Base Salary (AED/month)', 'number'],
          ['license_number', 'License Number', 'text'],
          ['license_expiry', 'License Expiry', 'date'],
          ['id_number', 'Emirates ID / Passport', 'text'],
          ['id_expiry', 'ID Expiry', 'date'],
          ['joining_date', 'Joining Date', 'date'],
        ].map(([k, l, t]) => (
          <div key={k} className="form-group">
            <label className="label">{l}</label>
            <input className="input" type={t} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
        <div className="form-group">
          <label className="label">Status</label>
          <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
            {['active','inactive','on_leave'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
        <div className="form-group col-span-2">
          <label className="label">Notes</label>
          <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
