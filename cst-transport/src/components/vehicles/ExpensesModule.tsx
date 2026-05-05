import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, TrendingUp, Wrench } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { VehicleExpense, Vehicle } from '../../types'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

export default function ExpensesModule() {
  const { user } = useAuth()
  const { settings } = useApp()
  const curr = settings.currency || 'AED'

  const [expenses, setExpenses] = useState<VehicleExpense[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [profit, setProfit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<VehicleExpense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VehicleExpense | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [vs, es] = await Promise.all([
      window.api.listVehicles(),
      window.api.listExpenses({ vehicle_id: selectedVehicle || undefined, category: filterCategory || undefined })
    ])
    setVehicles(vs as Vehicle[])
    setExpenses(es as VehicleExpense[])
    if (selectedVehicle) {
      const p = await window.api.getVehicleProfit({ vehicle_id: selectedVehicle })
      setProfit(p)
    } else {
      setProfit(null)
    }
    setLoading(false)
  }, [selectedVehicle, filterCategory])

  useEffect(() => { load() }, [load])

  const handleSave = async (form: any) => {
    if (editing) {
      await window.api.updateExpense({ id: editing.id, ...form })
    } else {
      await window.api.createExpense({ ...form, created_by: user?.id })
    }
    setShowForm(false)
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await window.api.deleteExpense(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  const CATEGORIES = ['fuel','maintenance','repair','insurance','registration','fine','parking','other']
  const catTotals = CATEGORIES.map(c => ({
    name: c.charAt(0).toUpperCase() + c.slice(1),
    total: expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0)
  })).filter(c => c.total > 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle Expenses</h1>
          <p className="text-slate-500 text-sm">Track all vehicle-related costs and profitability</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select className="select text-sm w-52" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
          <option value="">All Vehicles</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number} – {v.vehicle_type}</option>)}
        </select>
        <select className="select text-sm w-36" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
        </select>
      </div>

      {/* Profit card (when vehicle selected) */}
      {profit && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="card p-4">
            <p className="text-xs text-slate-500">Total Revenue</p>
            <p className="text-xl font-black text-emerald-400 mt-1">{curr} {(profit.revenue || 0).toLocaleString()}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">Total Expenses</p>
            <p className="text-xl font-black text-red-400 mt-1">{curr} {(profit.expenses || 0).toLocaleString()}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">Net Profit</p>
            <p className={`text-xl font-black mt-1 ${profit.profit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {curr} {(profit.profit || 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {catTotals.length > 0 && (
        <div className="card p-4 mb-5">
          <h3 className="section-title">Expense by Category</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={catTotals} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${curr} ${v.toFixed(0)}`]} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px' }} />
              <Bar dataKey="total" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Category</th>
              <th>Description</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">No expenses found</td></tr>
            ) : expenses.map(e => (
              <tr key={e.id}>
                <td className="text-slate-400">{e.expense_date}</td>
                <td>
                  <div className="font-mono text-xs text-blue-400">{e.plate_number}</div>
                  <div className="text-xs text-slate-500">{e.vehicle_type}</div>
                </td>
                <td><span className="badge badge-draft capitalize">{e.category}</span></td>
                <td className="text-slate-300">{e.description}</td>
                <td className="text-slate-400 text-xs">{e.vendor || '—'}</td>
                <td className="font-semibold text-red-400">{curr} {(e.amount || 0).toLocaleString()}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(e); setShowForm(true) }} className="btn-icon"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteTarget(e)} className="btn-icon text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="bg-slate-900">
                <td colSpan={5} className="px-4 py-3 font-semibold text-slate-300">Total</td>
                <td className="px-4 py-3 font-black text-red-400">{curr} {expenses.reduce((s,e) => s + e.amount, 0).toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showForm && (
        <ExpenseFormModal
          expense={editing}
          vehicles={vehicles}
          categories={CATEGORIES}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Expense"
          message="Delete this expense record? This cannot be undone."
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function ExpenseFormModal({ expense, vehicles, categories, onClose, onSave }: any) {
  const [form, setForm] = useState({
    vehicle_id:     expense?.vehicle_id    || '',
    expense_date:   expense?.expense_date  || new Date().toISOString().split('T')[0],
    category:       expense?.category      || 'fuel',
    description:    expense?.description   || '',
    amount:         expense?.amount        || '',
    vendor:         expense?.vendor        || '',
    receipt_number: expense?.receipt_number || '',
    odometer:       expense?.odometer      || ''
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal
      title={expense ? 'Edit Expense' : 'Add Vehicle Expense'}
      onClose={onClose}
      size="md"
      footer={<>
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={() => onSave(form)} className="btn-primary">{expense ? 'Update' : 'Add Expense'}</button>
      </>}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2">
          <label className="label">Vehicle *</label>
          <select className="select" value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}>
            <option value="">-- Select Vehicle --</option>
            {vehicles.map((v: Vehicle) => <option key={v.id} value={v.id}>{v.plate_number} – {v.vehicle_type}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Date *</label>
          <input className="input" type="date" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Category *</label>
          <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
            {categories.map((c: string) => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
          </select>
        </div>
        <div className="form-group col-span-2">
          <label className="label">Description *</label>
          <input className="input" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Amount *</label>
          <input className="input" type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Vendor</label>
          <input className="input" value={form.vendor} onChange={e => set('vendor', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Receipt #</label>
          <input className="input" value={form.receipt_number} onChange={e => set('receipt_number', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Odometer (km)</label>
          <input className="input" type="number" value={form.odometer} onChange={e => set('odometer', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
