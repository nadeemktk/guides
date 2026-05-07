import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Building2 } from 'lucide-react'
import Modal from '../shared/Modal'
import type { Invoice, Client, InvoiceItem, Company } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

interface Props {
  invoice: Invoice | null
  clients: Client[]
  onClose: () => void
  onSaved: () => void
}

const emptyItem = (): Partial<InvoiceItem> => ({
  description: '', vehicle_type: '', duration: '', quantity: 1, unit_price: 0, line_total: 0
})

export default function InvoiceForm({ invoice, clients, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { settings } = useApp()
  const taxRate = parseFloat(settings.tax_rate || '5')

  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState({
    company_id:    invoice?.company_id    || '',
    client_id:     invoice?.client_id     || '',
    client_name:   invoice?.client_name   || '',
    client_address:invoice?.client_address|| '',
    client_trn:    invoice?.client_trn    || '',
    customer_code: invoice?.customer_code || '',
    invoice_date:  invoice?.invoice_date  || new Date().toISOString().split('T')[0],
    due_date:      invoice?.due_date      || '',
    service_period:invoice?.service_period|| '',
    po_number:     invoice?.po_number     || '',
    delivery_note: invoice?.delivery_note || '',
    sales_man:     invoice?.sales_man     || '',
    lpo_number:    invoice?.lpo_number    || '',
    discount:      invoice?.discount      || 0,
    tax_rate:      invoice?.tax_rate      || taxRate,
    notes:         invoice?.notes         || '',
    terms:         invoice?.terms         || 'Payment due within 30 days.',
    status:        invoice?.status        || 'draft'
  })

  const [items, setItems] = useState<Partial<InvoiceItem>[]>(
    invoice?.items?.length ? invoice.items : [emptyItem()]
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api.listCompanies().then(c => setCompanies(c as Company[]))
  }, [])

  useEffect(() => {
    if (form.client_id) {
      const c = clients.find(c => c.id === form.client_id)
      if (c) setForm(p => ({
        ...p,
        client_name: c.company_name,
        client_address: c.address || '',
        client_trn: c.tax_number || '',
        customer_code: c.customer_code || ''
      }))
    }
  }, [form.client_id])

  const updateItem = (i: number, key: string, val: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      const updated = { ...item, [key]: val }
      if (key === 'quantity' || key === 'unit_price') {
        updated.line_total = (parseFloat(String(updated.quantity) || '0')) * (parseFloat(String(updated.unit_price) || '0'))
      }
      return updated
    }))
  }

  const subtotal = items.reduce((s, i) => s + (i.line_total || 0), 0)
  const discountAmt = form.discount || 0
  const taxableAmount = Math.max(0, subtotal - discountAmt)
  const tax_amount = Math.round(taxableAmount * (form.tax_rate / 100) * 100) / 100
  const total = taxableAmount + tax_amount

  const handleSave = async () => {
    if (saving) return
    if (!form.client_name.trim()) { alert('Client name is required'); return }
    const validItems = items.filter(i => i.description?.trim())
    if (validItems.length === 0) { alert('Please add at least one line item with a description'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        subtotal,
        tax_amount,
        total,
        amount_paid: invoice?.amount_paid || 0,
        balance_due: total - (invoice?.amount_paid || 0),
        items: validItems,
        created_by: user?.id,
        updated_by: user?.id
      }
      if (invoice) {
        await window.api.updateInvoice({ id: invoice.id, ...payload })
      } else {
        await window.api.createInvoice(payload)
      }
      onSaved()
    } catch (err: any) {
      alert(`Failed to save invoice: ${err?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const curr = settings.currency || 'AED'
  const selectedCompany = companies.find(c => c.id === form.company_id)

  return (
    <Modal
      title={invoice ? `Edit Invoice ${invoice.invoice_number}` : 'New Invoice'}
      onClose={onClose}
      size="2xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Company & Client */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Invoice From (Company) *</label>
            <select className="select" value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))}>
              <option value="">-- Use Default Company Settings --</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.is_default ? ' (Default)' : ''}</option>
              ))}
            </select>
            {selectedCompany && (
              <p className="text-xs text-slate-500 mt-1">TRN: {selectedCompany.trn} | Bank: {selectedCompany.bank_account}</p>
            )}
          </div>
          <div className="form-group">
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}>
              {['draft','sent','paid','partial','overdue','cancelled'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Client Selection */}
        <div className="p-3 bg-slate-900 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bill To (Client)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Select Client</label>
              <select className="select" value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
                <option value="">-- Select or type below --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Customer Code</label>
              <input className="input" value={form.customer_code} onChange={e => setForm(p => ({ ...p, customer_code: e.target.value }))} placeholder="e.g. C29" />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Company / Client Name *</label>
            <input className="input" value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} placeholder="Client company name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Client Address</label>
              <input className="input" value={form.client_address} onChange={e => setForm(p => ({ ...p, client_address: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Client TRN</label>
              <input className="input font-mono" value={form.client_trn} onChange={e => setForm(p => ({ ...p, client_trn: e.target.value }))} placeholder="TRN # ..." />
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-3 gap-4">
          <div className="form-group">
            <label className="label">Invoice Date *</label>
            <input className="input" type="date" value={form.invoice_date} onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Due Date</label>
            <input className="input" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Service Period</label>
            <input className="input" placeholder="e.g. January 2026" value={form.service_period} onChange={e => setForm(p => ({ ...p, service_period: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">PO Number</label>
            <input className="input" placeholder="e.g. JEPCC-LPO-2025-0" value={form.po_number} onChange={e => setForm(p => ({ ...p, po_number: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">LPO Number</label>
            <input className="input" placeholder="LPO #" value={form.lpo_number} onChange={e => setForm(p => ({ ...p, lpo_number: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Delivery Note No</label>
            <input className="input" placeholder="e.g. DN-2026-001" value={form.delivery_note} onChange={e => setForm(p => ({ ...p, delivery_note: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Sales Man</label>
            <input className="input" value={form.sales_man} onChange={e => setForm(p => ({ ...p, sales_man: e.target.value }))} />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label !mb-0">Line Items</label>
            <button onClick={() => setItems(p => [...p, emptyItem()])} className="btn-ghost text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Line
            </button>
          </div>
          <div className="rounded-xl border border-slate-700 overflow-x-auto">
            <table className="table min-w-[700px]">
              <thead>
                <tr>
                  <th className="w-2/5">Description</th>
                  <th>Vehicle Type</th>
                  <th>Duration</th>
                  <th>Qty</th>
                  <th>Unit Price ({curr})</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <input className="input text-xs py-1" value={item.description || ''} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Service description..." />
                    </td>
                    <td>
                      <input className="input text-xs py-1 w-28" value={item.vehicle_type || ''} onChange={e => updateItem(i, 'vehicle_type', e.target.value)} placeholder="60 Seat Bus" />
                    </td>
                    <td>
                      <input className="input text-xs py-1 w-24" value={item.duration || ''} onChange={e => updateItem(i, 'duration', e.target.value)} placeholder="1-31 Jan" />
                    </td>
                    <td>
                      <input className="input text-xs py-1 w-16" type="number" value={item.quantity || 1} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td>
                      <input className="input text-xs py-1 w-28" type="number" step="0.01" value={item.unit_price || 0} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td className="font-semibold text-right text-sm">{(item.line_total || 0).toFixed(2)}</td>
                    <td>
                      <button onClick={() => setItems(p => p.filter((_, j) => j !== i))} className="btn-icon text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Notes */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="form-group">
              <label className="label">Notes / Payment Instructions</label>
              <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Terms & Conditions</label>
              <textarea className="input resize-none" rows={2} value={form.terms} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} />
            </div>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span>{curr} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Discount ({curr}):</span>
              <input
                className="input w-28 text-right py-1 text-xs"
                type="number" min="0" step="0.01"
                value={form.discount}
                onChange={e => setForm(p => ({ ...p, discount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Taxable Amount:</span>
                <span>{curr} {taxableAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">VAT Rate (%):</span>
              <input
                className="input w-20 text-right py-1 text-xs"
                type="number" min="0" max="100" step="0.5"
                value={form.tax_rate}
                onChange={e => setForm(p => ({ ...p, tax_rate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">VAT ({form.tax_rate}%):</span>
              <span>{curr} {tax_amount.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-700 pt-2 flex justify-between font-black text-base">
              <span className="text-slate-200">Total:</span>
              <span className="text-blue-400">{curr} {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
