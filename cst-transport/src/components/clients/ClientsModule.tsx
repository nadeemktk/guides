import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Search, Building2, Phone, Mail, MapPin, Hash, User } from 'lucide-react'
import type { Client } from '../../types'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'

const emptyClient = (): Partial<Client> => ({
  customer_code: '', company_name: '', contact_name: '',
  mobile: '', email: '', address: '', tax_number: '', credit_limit: 0, notes: ''
})

export default function ClientsModule() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<Partial<Client>>(emptyClient())
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await window.api.listClients()
    setClients(data as Client[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => { setEditing(null); setForm(emptyClient()); setShowForm(true) }
  const openEdit = (c: Client) => { setEditing(c); setForm({ ...c }); setShowForm(true) }

  const handleSave = async () => {
    if (!form.company_name?.trim()) { alert('Company name is required'); return }
    setSaving(true)
    if (editing) {
      await window.api.updateClient({ id: editing.id, ...form })
    } else {
      await window.api.createClient(form)
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await window.api.deleteClient(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  const f = (key: keyof Client) => (
    <input
      className="input"
      value={String(form[key] || '')}
      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
    />
  )

  const filtered = clients.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.customer_code || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile || '').includes(search)
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your client database — shared across Trips, Invoices & SOA</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Clients</p>
          <p className="text-2xl font-black text-slate-100 mt-1">{clients.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Active</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{clients.filter(c => c.is_active).length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">With TRN</p>
          <p className="text-2xl font-black text-blue-400 mt-1">{clients.filter(c => c.tax_number).length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input className="input pl-9 text-sm" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <Building2 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No clients found. Add your first client.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="card p-5 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-100 text-sm truncate">{c.company_name}</h3>
                    {c.customer_code && (
                      <span className="text-[10px] text-blue-400 font-mono bg-blue-400/10 px-1.5 py-0.5 rounded">
                        Code: {c.customer_code}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(c)} className="btn-icon"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteTarget(c)} className="btn-icon text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                {c.contact_name && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span>{c.contact_name}</span>
                  </div>
                )}
                {c.mobile && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span>{c.mobile}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.address && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{c.address}</span>
                  </div>
                )}
                {c.tax_number && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Hash className="w-3 h-3 flex-shrink-0" />
                    <span className="font-mono">TRN: {c.tax_number}</span>
                  </div>
                )}
              </div>

              {c.notes && (
                <p className="mt-2 text-[10px] text-slate-600 italic truncate">{c.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Also show as table for dense view */}
      {filtered.length > 0 && (
        <div className="mt-6">
          <h3 className="section-title mb-3">All Clients (Table View)</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Company Name</th>
                  <th>Contact</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>TRN</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td className="font-mono text-blue-400 text-xs">{c.customer_code || '—'}</td>
                    <td className="font-medium text-slate-200">{c.company_name}</td>
                    <td className="text-slate-400">{c.contact_name || '—'}</td>
                    <td className="text-slate-400">{c.mobile || '—'}</td>
                    <td className="text-slate-400 text-xs">{c.email || '—'}</td>
                    <td className="font-mono text-xs text-slate-400">{c.tax_number || '—'}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(c)} className="btn-icon"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget(c)} className="btn-icon text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <Modal
          title={editing ? `Edit Client – ${editing.company_name}` : 'Add New Client'}
          onClose={() => setShowForm(false)}
          size="lg"
          footer={
            <>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editing ? 'Update Client' : 'Add Client'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Customer Code</label>
                {f('customer_code')}
              </div>
              <div className="form-group">
                <label className="label">Company Name *</label>
                <input
                  className="input"
                  value={form.company_name || ''}
                  onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                  placeholder="e.g. POWERCHINA JIANGXI ELECTRIC POWER"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Contact Name</label>
                {f('contact_name')}
              </div>
              <div className="form-group">
                <label className="label">Mobile Number</label>
                {f('mobile')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Email</label>
                {f('email')}
              </div>
              <div className="form-group">
                <label className="label">TRN (Tax Registration Number)</label>
                {f('tax_number')}
              </div>
            </div>
            <div className="form-group">
              <label className="label">Address</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={form.address || ''}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="Full address..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Credit Limit (AED)</label>
                <input
                  className="input"
                  type="number"
                  value={form.credit_limit || 0}
                  onChange={e => setForm(p => ({ ...p, credit_limit: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="form-group">
                <label className="label">Notes</label>
                <input className="input" value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Client"
          message={`Delete "${deleteTarget.company_name}"? All related invoices and SOA data links will be preserved.`}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
