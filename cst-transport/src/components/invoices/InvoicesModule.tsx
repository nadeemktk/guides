import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Eye, DollarSign, Search, Building2 } from 'lucide-react'
import type { Invoice, Client, Company } from '../../types'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import InvoiceForm from './InvoiceForm'
import InvoicePrint from './InvoicePrint'

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-draft', sent: 'badge-sent', paid: 'badge-paid',
  partial: 'badge-partial', overdue: 'badge-overdue', cancelled: 'badge-draft'
}

const emptyCompany = (): Partial<Company> & { invoice_start?: string } => ({
  name: '', trn: '', po_box: '', address: '', phone: '', email: '',
  bank_name: '', bank_account: '', bank_iban: '', bank_swift: '',
  is_default: false, invoice_prefix: 'INV-', invoice_counter: 0, invoice_start: '1001'
})

export default function InvoicesModule() {
  const { user } = useAuth()
  const { settings } = useApp()
  const curr = settings.currency || 'AED'

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [stats, setStats] = useState<any>(null)

  // Company management state
  const [showCompanyManager, setShowCompanyManager] = useState(false)
  const [companyForm, setCompanyForm] = useState<Partial<Company> & { invoice_start?: string }>(emptyCompany())
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [deleteCompanyTarget, setDeleteCompanyTarget] = useState<Company | null>(null)
  const [savingCompany, setSavingCompany] = useState(false)
  const [showCompanyForm, setShowCompanyForm] = useState(false)

  const loadCompanies = useCallback(async () => {
    const c = await window.api.listCompanies()
    setCompanies(c as Company[])
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [invs, cls, st] = await Promise.all([
      window.api.listInvoices({
        status:     filterStatus   || undefined,
        client_id:  filterClient   || undefined,
        company_id: filterCompany  || undefined,
        start_date: filterDateFrom || undefined,
        end_date:   filterDateTo   || undefined
      }),
      window.api.listClients(),
      window.api.invoiceStats()
    ])
    setInvoices(invs as Invoice[])
    setClients(cls as Client[])
    setStats(st)
    setLoading(false)
  }, [filterStatus, filterClient, filterCompany, filterDateFrom, filterDateTo])

  useEffect(() => {
    load()
    loadCompanies()
  }, [load, loadCompanies])

  // Fetch full invoice (with items) before opening edit form
  const handleEdit = async (inv: Invoice) => {
    setLoadingEdit(true)
    try {
      const full = await window.api.getInvoice(inv.id)
      setEditing(full as Invoice)
      setShowForm(true)
    } catch (err: any) {
      alert(`Failed to load invoice: ${err?.message || 'Unknown error'}`)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await window.api.deleteInvoice(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch (err: any) {
      alert(`Failed to delete invoice: ${err?.message || 'Unknown error'}`)
      setDeleteTarget(null)
    }
  }

  const handleRecordPayment = async () => {
    if (!paymentTarget || !paymentAmount) return
    const amt = parseFloat(paymentAmount)
    if (isNaN(amt) || amt <= 0) { alert('Please enter a valid payment amount'); return }
    if (amt > paymentTarget.balance_due + 0.01) {
      if (!confirm(`Payment amount (${curr} ${amt.toFixed(2)}) exceeds balance due (${curr} ${paymentTarget.balance_due.toFixed(2)}). Continue?`)) return
    }
    try {
      await window.api.recordPayment({ id: paymentTarget.id, amount: amt, method: paymentMethod, created_by: user?.id })
      setPaymentTarget(null)
      setPaymentAmount('')
      setPaymentMethod('cash')
      load()
    } catch (err: any) {
      alert(`Failed to record payment: ${err?.message || 'Unknown error'}`)
    }
  }

  const handleView = async (inv: Invoice) => {
    try {
      const full = await window.api.getInvoice(inv.id)
      setViewInvoice(full as Invoice)
    } catch (err: any) {
      alert(`Failed to load invoice: ${err?.message || 'Unknown error'}`)
    }
  }

  // Company CRUD
  const handleSaveCompany = async () => {
    if (!companyForm.name?.trim()) { alert('Company name is required'); return }
    setSavingCompany(true)
    try {
      if (editingCompany) {
        await window.api.updateCompany({ id: editingCompany.id, ...companyForm })
      } else {
        await window.api.createCompany(companyForm)
      }
      setShowCompanyForm(false)
      setEditingCompany(null)
      setCompanyForm(emptyCompany())
      await loadCompanies()
    } finally {
      setSavingCompany(false)
    }
  }

  const handleDeleteCompany = async () => {
    if (!deleteCompanyTarget) return
    await window.api.deleteCompany(deleteCompanyTarget.id)
    setDeleteCompanyTarget(null)
    loadCompanies()
  }

  const cf = (key: keyof Company) => (
    <input
      className="input"
      value={String(companyForm[key] || '')}
      onChange={e => setCompanyForm(p => ({ ...p, [key]: e.target.value }))}
    />
  )

  const filtered = invoices.filter(i =>
    !search ||
    i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    i.client_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.po_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.lpo_number || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">Multi-company invoice management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCompanyManager(true)} className="btn-secondary">
            <Building2 className="w-4 h-4" /> Manage Companies
            {companies.length > 0 && (
              <span className="ml-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{companies.length}</span>
            )}
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="btn-primary"
            disabled={loadingEdit}
          >
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      {/* No companies warning */}
      {companies.length === 0 && (
        <div className="mb-5 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl flex items-center gap-3">
          <Building2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1 text-sm text-amber-300">
            No companies configured yet. Add your companies first to generate invoices with company details.
          </div>
          <button onClick={() => setShowCompanyManager(true)} className="btn-secondary text-xs flex-shrink-0">
            Add Company
          </button>
        </div>
      )}

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Invoiced',  value: `${curr} ${(stats.total?.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,  sub: `${stats.total?.cnt || 0} invoices`,  color: 'text-slate-100' },
            { label: 'Paid',            value: `${curr} ${(stats.paid?.amount  || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,   sub: `${stats.paid?.cnt  || 0} invoices`,  color: 'text-emerald-400' },
            { label: 'Outstanding',     value: `${curr} ${(stats.unpaid?.amount|| 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,   sub: `${stats.unpaid?.cnt|| 0} pending`,   color: 'text-red-400' },
            { label: 'This Month',      value: `${curr} ${(stats.month?.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,   sub: `${stats.month?.cnt || 0} invoices`,  color: 'text-blue-400' }
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-600 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-3 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input className="input pl-9 text-sm" placeholder="Search by #, client, PO, LPO..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select text-sm w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {['draft','sent','paid','partial','overdue','cancelled'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select className="select text-sm w-48" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          {companies.length > 1 && (
            <select className="select text-sm w-48" value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-2">
            <input className="input text-sm w-36" type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} title="From date" />
            <span className="text-slate-500 text-xs">–</span>
            <input className="input text-sm w-36" type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} title="To date" />
          </div>
          {(filterStatus || filterClient || filterCompany || filterDateFrom || filterDateTo) && (
            <button
              className="btn-ghost text-xs text-slate-400"
              onClick={() => { setFilterStatus(''); setFilterClient(''); setFilterCompany(''); setFilterDateFrom(''); setFilterDateTo('') }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Company</th>
              <th>Client</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-8 text-slate-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8 text-slate-500">No invoices found</td></tr>
            ) : filtered.map(inv => {
              const co = companies.find(c => c.id === (inv as any).company_id)
              return (
                <tr key={inv.id} className={inv.status === 'overdue' ? 'bg-red-950/10' : ''}>
                  <td><span className="font-mono text-blue-400 font-medium text-xs">{inv.invoice_number}</span></td>
                  <td>
                    {co ? (
                      <div>
                        <div className="text-xs font-medium text-slate-300">{co.name}</div>
                        {co.trn && <div className="text-[10px] text-slate-500">TRN: {co.trn}</div>}
                      </div>
                    ) : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="font-medium text-slate-200">{inv.client_name}</td>
                  <td className="text-slate-400">{inv.invoice_date}</td>
                  <td className={`text-slate-400 ${inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid' ? 'text-red-400' : ''}`}>
                    {inv.due_date || '—'}
                  </td>
                  <td className="font-semibold">{curr} {(inv.total || 0).toLocaleString()}</td>
                  <td className="text-emerald-400">{curr} {(inv.amount_paid || 0).toLocaleString()}</td>
                  <td className={`font-semibold ${inv.balance_due > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {curr} {(inv.balance_due || 0).toLocaleString()}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[inv.status] || 'badge-draft'}`}>{inv.status}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleView(inv)} className="btn-icon" title="View"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleEdit(inv)} className="btn-icon" title="Edit" disabled={loadingEdit}><Edit2 className="w-3.5 h-3.5" /></button>
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <button onClick={() => { setPaymentTarget(inv); setPaymentAmount(String((inv.balance_due||0).toFixed(2))); setPaymentMethod('cash') }} className="btn-icon text-emerald-400" title="Record Payment">
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => setDeleteTarget(inv)} className="btn-icon text-red-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Invoice Form */}
      {showForm && (
        <InvoiceForm
          invoice={editing}
          clients={clients}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); load() }}
        />
      )}

      {/* Invoice View/Print */}
      {viewInvoice && (
        <InvoicePrint
          invoice={viewInvoice}
          settings={settings}
          onClose={() => setViewInvoice(null)}
        />
      )}

      {/* Record Payment Modal */}
      {paymentTarget && (
        <Modal
          title={`Record Payment – ${paymentTarget.invoice_number}`}
          onClose={() => { setPaymentTarget(null); setPaymentAmount(''); setPaymentMethod('cash') }}
          size="sm"
          footer={
            <>
              <button onClick={() => { setPaymentTarget(null); setPaymentAmount(''); setPaymentMethod('cash') }} className="btn-secondary">Cancel</button>
              <button onClick={handleRecordPayment} className="btn-primary">
                <DollarSign className="w-4 h-4" /> Record Payment
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="p-3 bg-slate-900 rounded-xl text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Total:</span>
                <span className="font-medium">{curr} {(paymentTarget.total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Paid:</span>
                <span className="font-medium text-emerald-400">{curr} {(paymentTarget.amount_paid || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-1 mt-1">
                <span className="text-slate-400 font-medium">Balance Due:</span>
                <span className="font-bold text-red-400">{curr} {(paymentTarget.balance_due || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Payment Amount ({curr})</label>
              <input
                className="input text-lg font-semibold"
                type="number" step="0.01" min="0"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder={String(paymentTarget.balance_due || 0)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="label">Payment Method</label>
              <select className="select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="online">Online</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Invoice */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Invoice"
          message={`Delete invoice ${deleteTarget.invoice_number}? This action cannot be undone.`}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Company Manager Modal ─────────────────────────────────────────── */}
      {showCompanyManager && (
        <Modal
          title="Manage Companies"
          onClose={() => { setShowCompanyManager(false); setShowCompanyForm(false); setEditingCompany(null); setCompanyForm(emptyCompany()) }}
          size="lg"
          footer={
            <button onClick={() => setShowCompanyManager(false)} className="btn-secondary">Close</button>
          }
        >
          <div className="space-y-4">
            {/* Add/Edit form */}
            {showCompanyForm ? (
              <div className="card p-4 border border-blue-600/30 space-y-4">
                <h4 className="font-semibold text-slate-200 text-sm">
                  {editingCompany ? `Edit: ${editingCompany.name}` : 'Add New Company'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 form-group">
                    <label className="label">Company Name *</label>
                    <input className="input" value={companyForm.name || ''} onChange={e => setCompanyForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. City Star Transport Passengers LLC" />
                  </div>
                  <div className="form-group">
                    <label className="label">TRN (Tax Registration Number)</label>
                    {cf('trn')}
                  </div>
                  <div className="form-group">
                    <label className="label">P.O. Box</label>
                    {cf('po_box')}
                  </div>
                  <div className="col-span-2 form-group">
                    <label className="label">Address</label>
                    <input className="input" value={companyForm.address || ''} onChange={e => setCompanyForm(p => ({ ...p, address: e.target.value }))} placeholder="Full company address..." />
                  </div>
                  <div className="form-group">
                    <label className="label">Phone</label>
                    {cf('phone')}
                  </div>
                  <div className="form-group">
                    <label className="label">Email</label>
                    {cf('email')}
                  </div>
                </div>
                <details className="cursor-pointer">
                  <summary className="text-xs text-slate-400 select-none">Bank Account Details (for invoice printing)</summary>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="form-group">
                      <label className="label">Bank Name</label>
                      {cf('bank_name')}
                    </div>
                    <div className="form-group">
                      <label className="label">Account Number</label>
                      {cf('bank_account')}
                    </div>
                    <div className="form-group">
                      <label className="label">IBAN</label>
                      {cf('bank_iban')}
                    </div>
                    <div className="form-group">
                      <label className="label">SWIFT Code</label>
                      {cf('bank_swift')}
                    </div>
                  </div>
                </details>
                {/* Invoice Numbering */}
                <details open={!editingCompany} className="cursor-pointer">
                  <summary className="text-xs font-semibold text-blue-400 select-none mb-2">
                    Invoice Numbering Settings
                  </summary>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="form-group">
                      <label className="label">Invoice Prefix</label>
                      <input
                        className="input font-mono"
                        placeholder="e.g. CST- or INV- or CS/2026/"
                        value={companyForm.invoice_prefix || ''}
                        onChange={e => setCompanyForm(p => ({ ...p, invoice_prefix: e.target.value }))}
                      />
                      <p className="text-[10px] text-slate-500 mt-0.5">The prefix attached before every invoice number</p>
                    </div>
                    <div className="form-group">
                      {editingCompany ? (
                        <>
                          <label className="label">Invoice Counter (last used: {editingCompany.invoice_counter || 0})</label>
                          <input
                            className="input font-mono"
                            type="number" min="0"
                            value={companyForm.invoice_counter ?? editingCompany.invoice_counter ?? 0}
                            onChange={e => setCompanyForm(p => ({ ...p, invoice_counter: parseInt(e.target.value) || 0 }))}
                          />
                          <p className="text-[10px] text-amber-500 mt-0.5">⚠ Next invoice will be #{(companyForm.invoice_counter ?? editingCompany.invoice_counter ?? 0) + 1}</p>
                        </>
                      ) : (
                        <>
                          <label className="label">Starting Invoice Number</label>
                          <input
                            className="input font-mono"
                            type="number" min="1"
                            value={(companyForm as any).invoice_start || '1001'}
                            onChange={e => setCompanyForm(p => ({ ...p, invoice_start: e.target.value } as any))}
                            placeholder="1001"
                          />
                          <p className="text-[10px] text-slate-500 mt-0.5">First invoice will be {companyForm.invoice_prefix || 'INV-'}{(companyForm as any).invoice_start || '1001'}</p>
                        </>
                      )}
                    </div>
                  </div>
                </details>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_default" className="w-4 h-4 accent-blue-600"
                    checked={!!companyForm.is_default}
                    onChange={e => setCompanyForm(p => ({ ...p, is_default: e.target.checked }))} />
                  <label htmlFor="is_default" className="text-sm text-slate-400">Set as default company for new invoices</label>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowCompanyForm(false); setEditingCompany(null); setCompanyForm(emptyCompany()) }} className="btn-secondary text-sm">Cancel</button>
                  <button onClick={handleSaveCompany} disabled={savingCompany} className="btn-primary text-sm">
                    {savingCompany ? 'Saving...' : editingCompany ? 'Update Company' : 'Add Company'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCompanyForm(true)}
                className="btn-primary w-full justify-center"
              >
                <Plus className="w-4 h-4" /> Add New Company
              </button>
            )}

            {/* Companies list */}
            {companies.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No companies yet. Add your first company above.</div>
            ) : (
              <div className="space-y-3">
                {companies.map(co => (
                  <div key={co.id} className="card p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-100 text-sm">{co.name}</span>
                        {co.is_default && (
                          <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full">Default</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                        {co.trn && <div>TRN: {co.trn}</div>}
                        {co.po_box && <div>P.O. Box: {co.po_box}</div>}
                        {co.address && <div>{co.address}</div>}
                        {co.bank_account && <div>Bank: {co.bank_name} | Acc: {co.bank_account}</div>}
                        <div className="text-blue-400/80 font-mono">
                          Next #: {co.invoice_prefix || 'INV-'}{(co.invoice_counter || 0) + 1}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingCompany(co); setCompanyForm({ ...co }); setShowCompanyForm(true) }}
                        className="btn-icon"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteCompanyTarget(co)} className="btn-icon text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Company Confirm */}
      {deleteCompanyTarget && (
        <ConfirmDialog
          title="Delete Company"
          message={`Delete company "${deleteCompanyTarget.name}"? Existing invoices will retain the company data.`}
          danger
          onConfirm={handleDeleteCompany}
          onCancel={() => setDeleteCompanyTarget(null)}
        />
      )}
    </div>
  )
}
