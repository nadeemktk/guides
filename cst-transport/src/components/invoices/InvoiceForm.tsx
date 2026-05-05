import React, { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '../shared/Modal'
import type { Invoice, Client, InvoiceItem } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

interface Props {
  invoice: Invoice | null
  clients: Client[]
  onClose: () => void
  onSaved: () => void
}

const emptyItem = (): Partial<InvoiceItem> => ({
  description: '', vehicle_type: '', vehicle_plate: '',
  driver_name: '', trip_date: '', quantity: 1, unit_price: 0, line_total: 0
})

export default function InvoiceForm({ invoice, clients, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { settings } = useApp()
  const taxRate = parseFloat(settings.tax_rate || '5')

  const [form, setForm] = useState({
    client_id: invoice?.client_id || '',
    client_name: invoice?.client_name || '',
    invoice_date: invoice?.invoice_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || '',
    service_period: invoice?.service_period || '',
    discount: invoice?.discount || 0,
    tax_rate: invoice?.tax_rate || taxRate,
    notes: invoice?.notes || '',
    terms: invoice?.terms || 'Payment due within 30 days.',
    status: invoice?.status || 'draft'
  })

  const [items, setItems] = useState<Partial<InvoiceItem>[]>(
    invoice?.items?.length ? invoice.items : [emptyItem()]
  )

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (form.client_id) {
      const c = clients.find(c => c.id === form.client_id)
      if (c) setForm(p => ({ ...p, client_name: c.company_name }))
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
  const tax_amount = subtotal * (form.tax_rate / 100)
  const total = subtotal + tax_amount - (form.discount || 0)

  const handleSave = async () => {
    if (!form.client_name) { alert('Client name is required'); return }
    setSaving(true)
    const payload = {
      ...form,
      subtotal, tax_amount, total,
      amount_paid: invoice?.amount_paid || 0,
      balance_due: total - (invoice?.amount_paid || 0),
      items: items.filter(i => i.description),
      created_by: user?.id
    }
    if (invoice) {
      await window.api.updateInvoice({ id: invoice.id, ...payload })
    } else {
      await window.api.createInvoice(payload)
    }
    setSaving(false)
    onSaved()
  }

  const curr = settings.currency || 'AED'

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
        {/* Client & Dates */}
        <div className="grid grid-cols-3 gap-4">
          <div className="form-group">
            <label className="label">Client *</label>
            <select className="select" value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
              <option value="">-- Select Client --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Client Name (editable)</label>
            <input className="input" value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}>
              {['draft','sent','paid','partial','overdue','cancelled'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
              ))}
            </select>
          </div>
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
            <input className="input" placeholder="e.g. January 2025" value={form.service_period} onChange={e => setForm(p => ({ ...p, service_period: e.target.value }))} />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label !mb-0">Line Items</label>
            <button onClick={() => setItems(p => [...p, emptyItem()])} className="btn-ghost text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-1/3">Description</th>
                  <th>Vehicle Type</th>
                  <th>Plate</th>
                  <th>Driver</th>
                  <th>Date</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <input className="input text-xs py-1" value={item.description || ''} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Description" />
                    </td>
                    <td>
                      <input className="input text-xs py-1 w-24" value={item.vehicle_type || ''} onChange={e => updateItem(i, 'vehicle_type', e.target.value)} placeholder="Bus" />
                    </td>
                    <td>
                      <input className="input text-xs py-1 w-24" value={item.vehicle_plate || ''} onChange={e => updateItem(i, 'vehicle_plate', e.target.value)} placeholder="DXB-1234" />
                    </td>
                    <td>
                      <input className="input text-xs py-1 w-24" value={item.driver_name || ''} onChange={e => updateItem(i, 'driver_name', e.target.value)} placeholder="Driver" />
                    </td>
                    <td>
                      <input className="input text-xs py-1 w-28" type="date" value={item.trip_date || ''} onChange={e => updateItem(i, 'trip_date', e.target.value)} />
                    </td>
                    <td>
                      <input className="input text-xs py-1 w-16" type="number" value={item.quantity || 1} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td>
                      <input className="input text-xs py-1 w-24" type="number" value={item.unit_price || 0} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td className="font-semibold text-right">{(item.line_total || 0).toFixed(2)}</td>
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
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Terms & Conditions</label>
              <textarea className="input resize-none" rows={2} value={form.terms} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} />
            </div>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal:</span><span>{curr} {subtotal.toFixed(2)}</span></div>
            <div className="flex items-center gap-2 justify-between">
              <span className="text-slate-500">Tax Rate (%):</span>
              <input className="input w-20 text-right py-1 text-xs" type="number" value={form.tax_rate} onChange={e => setForm(p => ({ ...p, tax_rate: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="flex justify-between"><span className="text-slate-500">Tax Amount:</span><span>{curr} {tax_amount.toFixed(2)}</span></div>
            <div className="flex items-center gap-2 justify-between">
              <span className="text-slate-500">Discount:</span>
              <input className="input w-24 text-right py-1 text-xs" type="number" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="border-t border-slate-700 pt-2 flex justify-between font-bold text-base">
              <span className="text-slate-200">Total:</span>
              <span className="text-blue-400">{curr} {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
