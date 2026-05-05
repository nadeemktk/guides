import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Printer, Download, Eye, DollarSign, Search } from 'lucide-react'
import type { Invoice, Client } from '../../types'
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

export default function InvoicesModule() {
  const { user } = useAuth()
  const { settings } = useApp()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [stats, setStats] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [invs, cls, st] = await Promise.all([
      window.api.listInvoices({ status: filterStatus || undefined, client_id: filterClient || undefined }),
      window.api.listClients(),
      window.api.invoiceStats()
    ])
    setInvoices(invs as Invoice[])
    setClients(cls as Client[])
    setStats(st)
    setLoading(false)
  }, [filterStatus, filterClient])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    await window.api.deleteInvoice(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  const handleRecordPayment = async () => {
    if (!paymentTarget || !paymentAmount) return
    await window.api.recordPayment({ id: paymentTarget.id, amount: parseFloat(paymentAmount), method: 'cash', created_by: user?.id })
    setPaymentTarget(null)
    setPaymentAmount('')
    load()
  }

  const handleView = async (inv: Invoice) => {
    const full = await window.api.getInvoice(inv.id)
    setViewInvoice(full as Invoice)
  }

  const filtered = invoices.filter(i =>
    i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    i.client_name.toLowerCase().includes(search.toLowerCase())
  )

  const curr = settings.currency || 'AED'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage client invoices and track payments</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Invoiced', value: `${curr} ${(stats.total?.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `${stats.total?.cnt || 0} invoices`, color: 'text-slate-100' },
            { label: 'Paid', value: `${curr} ${(stats.paid?.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `${stats.paid?.cnt || 0} invoices`, color: 'text-emerald-400' },
            { label: 'Outstanding', value: `${curr} ${(stats.unpaid?.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `${stats.unpaid?.cnt || 0} pending`, color: 'text-red-400' },
            { label: 'This Month', value: `${curr} ${(stats.month?.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `${stats.month?.cnt || 0} invoices`, color: 'text-blue-400' }
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
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="input pl-9 text-sm" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select text-sm w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {['draft','sent','paid','partial','overdue','cancelled'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select className="select text-sm w-48" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
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
              <tr><td colSpan={9} className="text-center py-8 text-slate-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-slate-500">No invoices found</td></tr>
            ) : filtered.map(inv => (
              <tr key={inv.id} className={inv.status === 'overdue' ? 'bg-red-950/10' : ''}>
                <td>
                  <span className="font-mono text-blue-400 font-medium text-xs">{inv.invoice_number}</span>
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
                <td><span className={STATUS_BADGE[inv.status] || 'badge-draft'}>{inv.status}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleView(inv)} className="btn-icon" title="View">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setEditing(inv); setShowForm(true) }} className="btn-icon" title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {inv.status !== 'paid' && (
                      <button onClick={() => { setPaymentTarget(inv); setPaymentAmount(String(inv.balance_due)) }} className="btn-icon text-emerald-400" title="Record Payment">
                        <DollarSign className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => setDeleteTarget(inv)} className="btn-icon text-red-400" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoice Form Modal */}
      {showForm && (
        <InvoiceForm
          invoice={editing}
          clients={clients}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
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
          onClose={() => setPaymentTarget(null)}
          size="sm"
          footer={
            <>
              <button onClick={() => setPaymentTarget(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleRecordPayment} className="btn-primary">
                <DollarSign className="w-4 h-4" /> Record Payment
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="p-3 bg-slate-900 rounded-xl text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Balance Due:</span> <span className="font-semibold text-red-400">{curr} {paymentTarget.balance_due.toLocaleString()}</span></div>
            </div>
            <div className="form-group">
              <label className="label">Payment Amount ({curr})</label>
              <input className="input" type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Invoice"
          message={`Delete invoice ${deleteTarget.invoice_number}? This action cannot be undone.`}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
