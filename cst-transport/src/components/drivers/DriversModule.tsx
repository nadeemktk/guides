import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Edit2, Trash2, Phone, History, ChevronRight } from 'lucide-react'
import type { Driver, DriverEmploymentHistory } from '../../types'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'

const STATUS_STYLE: Record<string, string> = {
  active:   'badge bg-emerald-500/20 text-emerald-400',
  inactive: 'badge bg-slate-500/20 text-slate-400',
  on_leave: 'badge bg-amber-500/20 text-amber-400'
}

const EMP_STATUS_STYLE: Record<string, string> = {
  active:     'bg-emerald-500/20 text-emerald-400',
  rejoined:   'bg-blue-500/20 text-blue-400',
  on_leave:   'bg-amber-500/20 text-amber-400',
  resigned:   'bg-slate-500/20 text-slate-400',
  terminated: 'bg-red-500/20 text-red-400'
}

const EMP_STATUS_LABEL: Record<string, string> = {
  active: 'Active', rejoined: 'Rejoined', on_leave: 'On Leave', resigned: 'Resigned', terminated: 'Terminated'
}

export default function DriversModule() {
  const [drivers, setDrivers]           = useState<Driver[]>([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<Driver | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)
  const [historyDriver, setHistoryDriver] = useState<Driver | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setDrivers(await window.api.listDrivers() as Driver[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (form: any) => {
    if (editing) await window.api.updateDriver({ id: editing.id, ...form })
    else         await window.api.createDriver(form)
    setShowForm(false); setEditing(null); load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await window.api.deleteDriver(deleteTarget.id)
      setDeleteTarget(null); load()
    } catch (e: any) {
      alert(`Delete failed: ${e?.message || 'Unknown error'}`)
      setDeleteTarget(null)
    }
  }

  const isExpiring = (date: string | null) => {
    if (!date) return false
    return (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 30
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Drivers</h1>
          <p className="text-slate-500 text-sm">Manage driver profiles, documents and employment history</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Driver
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {(['active','on_leave','inactive'] as const).map(s => (
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
                <button onClick={() => setHistoryDriver(d)} className="btn-icon" title="Employment History">
                  <History className="w-3.5 h-3.5 text-blue-400" />
                </button>
                <button onClick={() => { setEditing(d); setShowForm(true) }} className="btn-icon">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteTarget(d)} className="btn-icon text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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
              {d.joining_date && <div>Joined: {d.joining_date}</div>}
              {d.leaving_date && <div className="text-rose-400">Left: {d.leaving_date}</div>}
              {d.license_expiry && <div className={isExpiring(d.license_expiry) ? 'text-amber-400' : ''}>License: {d.license_expiry}</div>}
              {d.id_expiry && <div className={isExpiring(d.id_expiry) ? 'text-amber-400' : ''}>ID: {d.id_expiry}</div>}
            </div>
          </div>
        ))}
        {!loading && drivers.length === 0 && (
          <div className="col-span-3 text-center py-8 text-slate-500">No drivers added yet</div>
        )}
      </div>

      {showForm && (
        <DriverFormModal driver={editing} onClose={() => { setShowForm(false); setEditing(null) }} onSave={handleSave} />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Driver"
          message={`Delete driver "${deleteTarget.full_name}"? All salary history and assignments will be removed.`}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {historyDriver && (
        <EmploymentHistoryModal driver={historyDriver} onClose={() => { setHistoryDriver(null); load() }} />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Driver Form Modal
// ──────────────────────────────────────────────────────────────────────────────
function DriverFormModal({ driver, onClose, onSave }: { driver: Driver | null; onClose: () => void; onSave: (f: any) => void }) {
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
    leaving_date:    driver?.leaving_date    || '',
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
        {([
          ['full_name', 'Full Name *', 'text'],
          ['mobile', 'Mobile *', 'text'],
          ['nationality', 'Nationality', 'text'],
          ['base_salary', 'Base Salary (AED/month)', 'number'],
          ['license_number', 'License Number', 'text'],
          ['license_expiry', 'License Expiry', 'date'],
          ['id_number', 'Emirates ID / Passport', 'text'],
          ['id_expiry', 'ID Expiry', 'date'],
          ['joining_date', 'Current Joining Date', 'date'],
          ['leaving_date', 'Leaving Date', 'date'],
        ] as [string, string, string][]).map(([k, l, t]) => (
          <div key={k} className="form-group">
            <label className="label">{l}</label>
            <input className="input" type={t} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
        <div className="form-group">
          <label className="label">Status</label>
          <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
            {(['active','inactive','on_leave'] as const).map(s => (
              <option key={s} value={s}>{s.replace('_',' ')}</option>
            ))}
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

// ──────────────────────────────────────────────────────────────────────────────
// Employment History Modal
// ──────────────────────────────────────────────────────────────────────────────
const BLANK_EMP = { joining_date: '', leaving_date: '', status: 'active' as const, notes: '' }

function EmploymentHistoryModal({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const [records, setRecords] = useState<DriverEmploymentHistory[]>([])
  const [showAdd, setShowAdd]   = useState(false)
  const [editRec, setEditRec]   = useState<DriverEmploymentHistory | null>(null)
  const [delRec, setDelRec]     = useState<DriverEmploymentHistory | null>(null)
  const [form, setForm]         = useState(BLANK_EMP)

  const load = useCallback(async () => {
    const data = await window.api.listEmploymentHistory(driver.id)
    setRecords(data as DriverEmploymentHistory[])
  }, [driver.id])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm(BLANK_EMP); setEditRec(null); setShowAdd(true) }
  const openEdit = (r: DriverEmploymentHistory) => { setForm({ joining_date: r.joining_date, leaving_date: r.leaving_date||'', status: r.status, notes: r.notes }); setEditRec(r); setShowAdd(true) }

  const handleSave = async () => {
    if (!form.joining_date) { alert('Joining date is required'); return }
    if (editRec) {
      await window.api.updateEmploymentRecord({ id: editRec.id, ...form })
    } else {
      await window.api.createEmploymentRecord({ driver_id: driver.id, ...form })
    }
    setShowAdd(false); load()
  }

  const handleDelete = async () => {
    if (!delRec) return
    await window.api.deleteEmploymentRecord(delRec.id)
    setDelRec(null); load()
  }

  return (
    <Modal title={`Employment History – ${driver.full_name}`} onClose={onClose} size="lg"
      footer={<button onClick={onClose} className="btn-secondary">Close</button>}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Track all employment periods for this driver.</p>
          <button onClick={openAdd} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Period
          </button>
        </div>

        {/* Timeline */}
        {records.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No employment records yet. Click "Add Period" to start.</div>
        ) : (
          <div className="space-y-2">
            {records.map((r, idx) => (
              <div key={r.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-1 ${r.leaving_date ? 'bg-slate-500' : 'bg-emerald-500'}`} />
                  {idx < records.length - 1 && <div className="w-px flex-1 bg-slate-700 mt-1 mb-0" style={{ minHeight: '24px' }} />}
                </div>
                <div className="flex-1 card p-3 mb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${EMP_STATUS_STYLE[r.status]}`}>
                          {EMP_STATUS_LABEL[r.status] || r.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-300">
                        <span className="font-medium">{r.joining_date}</span>
                        {r.leaving_date && (
                          <>
                            <ChevronRight className="w-3 h-3 text-slate-500" />
                            <span className="text-rose-400">{r.leaving_date}</span>
                          </>
                        )}
                        {!r.leaving_date && <span className="text-emerald-400">→ Present</span>}
                      </div>
                      {r.notes && <p className="text-[11px] text-slate-500 mt-1">{r.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(r)} className="btn-icon"><Edit2 className="w-3 h-3" /></button>
                      <button onClick={() => setDelRec(r)} className="btn-icon text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit form inline modal */}
      {showAdd && (
        <Modal
          title={editRec ? 'Edit Employment Period' : 'Add Employment Period'}
          onClose={() => setShowAdd(false)}
          size="sm"
          footer={<>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">Save</button>
          </>}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="label">Joining Date *</label>
                <input className="input" type="date" value={form.joining_date}
                  onChange={e => setForm(p => ({ ...p, joining_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Leaving Date</label>
                <input className="input" type="date" value={form.leaving_date}
                  onChange={e => setForm(p => ({ ...p, leaving_date: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Employment Status</label>
              <select className="select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}>
                <option value="active">Active</option>
                <option value="rejoined">Rejoined</option>
                <option value="on_leave">On Leave</option>
                <option value="resigned">Resigned</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Notes / Remarks</label>
              <textarea className="input resize-none" rows={2} value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {delRec && (
        <ConfirmDialog
          title="Delete Record"
          message="Delete this employment period? This cannot be undone."
          danger
          onConfirm={handleDelete}
          onCancel={() => setDelRec(null)}
        />
      )}
    </Modal>
  )
}

