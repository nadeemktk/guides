import React, { useEffect, useState, useCallback } from 'react'
import { DollarSign, Save, Printer, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Driver, DriverSalary } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function SalariesModule() {
  const { user } = useAuth()
  const { settings } = useApp()
  const curr = settings.currency || 'AED'

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [salaries, setSalaries] = useState<DriverSalary[]>([])
  const [selectedDriver, setSelectedDriver] = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [form, setForm] = useState({
    base_salary: '',
    overtime_hours: '0',
    overtime_rate: '0',
    overtime_amount: '0',
    bonus: '0',
    deductions: '0',
    deduction_reason: '',
    amount_paid: '0',
    payment_date: '',
    payment_method: 'cash',
    notes: ''
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.listDrivers().then(ds => {
      setDrivers(ds as Driver[])
      if ((ds as Driver[]).length > 0 && !selectedDriver) setSelectedDriver((ds as Driver[])[0].id)
    })
  }, [])

  const load = useCallback(async () => {
    if (!selectedDriver) return
    const [driver] = drivers.filter(d => d.id === selectedDriver)
    const existing = await window.api.getSalary({ driver_id: selectedDriver, month: currentMonth, year: currentYear })
    if (existing) {
      setForm({
        base_salary: String(existing.base_salary || driver?.base_salary || 0),
        overtime_hours: String(existing.overtime_hours || 0),
        overtime_rate: String(existing.overtime_rate || 0),
        overtime_amount: String(existing.overtime_amount || 0),
        bonus: String(existing.bonus || 0),
        deductions: String(existing.deductions || 0),
        deduction_reason: existing.deduction_reason || '',
        amount_paid: String(existing.amount_paid || 0),
        payment_date: existing.payment_date || '',
        payment_method: existing.payment_method || 'cash',
        notes: existing.notes || ''
      })
    } else {
      setForm(p => ({ ...p, base_salary: String(driver?.base_salary || 0) }))
    }
    const list = await window.api.listSalaries({ driver_id: selectedDriver })
    setSalaries(list as DriverSalary[])
  }, [selectedDriver, currentMonth, currentYear, drivers])

  useEffect(() => { load() }, [load])

  const set = (k: string, v: string) => {
    setForm(p => {
      const next = { ...p, [k]: v }
      if (k === 'overtime_hours' || k === 'overtime_rate') {
        next.overtime_amount = String((parseFloat(next.overtime_hours) || 0) * (parseFloat(next.overtime_rate) || 0))
      }
      return next
    })
  }

  const gross = (parseFloat(form.base_salary)||0) + (parseFloat(form.overtime_amount)||0) + (parseFloat(form.bonus)||0) - (parseFloat(form.deductions)||0)
  const remaining = gross - (parseFloat(form.amount_paid)||0)

  const handleSave = async () => {
    await window.api.saveSalary({
      driver_id: selectedDriver,
      period_month: currentMonth,
      period_year: currentYear,
      base_salary: parseFloat(form.base_salary)||0,
      overtime_hours: parseFloat(form.overtime_hours)||0,
      overtime_rate: parseFloat(form.overtime_rate)||0,
      overtime_amount: parseFloat(form.overtime_amount)||0,
      bonus: parseFloat(form.bonus)||0,
      deductions: parseFloat(form.deductions)||0,
      deduction_reason: form.deduction_reason,
      amount_paid: parseFloat(form.amount_paid)||0,
      payment_date: form.payment_date || null,
      payment_method: form.payment_method,
      notes: form.notes,
      created_by: user?.id
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    load()
  }

  const handlePrint = () => {
    const driver = drivers.find(d => d.id === selectedDriver)
    const content = `
      <!DOCTYPE html><html><head>
      <title>Salary Slip – ${driver?.full_name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; color: #1e293b; padding: 40px; max-width: 600px; margin: 0 auto; }
        h1 { font-size: 22px; font-weight: 900; color: #1d4ed8; }
        h2 { font-size: 18px; font-weight: 700; margin: 16px 0 8px; }
        .company { margin-bottom: 24px; }
        .company p { font-size: 12px; color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        td:last-child { text-align: right; font-weight: 600; }
        .total { font-size: 16px; font-weight: 900; color: #1d4ed8; }
        .signature { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .signature .line { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 11px; color: #64748b; }
      </style>
      </head><body>
      <div class="company">
        <h1>${settings.company_name}</h1>
        <p>${settings.company_address} | ${settings.company_email}</p>
      </div>
      <h2>SALARY SLIP – ${MONTHS[currentMonth-1]} ${currentYear}</h2>
      <table>
        <tr><td>Driver Name</td><td>${driver?.full_name}</td></tr>
        <tr><td>Mobile</td><td>${driver?.mobile}</td></tr>
        <tr><td>Period</td><td>${MONTHS[currentMonth-1]} ${currentYear}</td></tr>
        <tr><td colspan="2"></td></tr>
        <tr><td>Basic Salary</td><td>${curr} ${parseFloat(form.base_salary||'0').toFixed(2)}</td></tr>
        <tr><td>Overtime (${form.overtime_hours}h × ${curr}${form.overtime_rate})</td><td>${curr} ${parseFloat(form.overtime_amount||'0').toFixed(2)}</td></tr>
        <tr><td>Bonus</td><td>${curr} ${parseFloat(form.bonus||'0').toFixed(2)}</td></tr>
        <tr><td>Deductions ${form.deduction_reason ? `(${form.deduction_reason})` : ''}</td><td>– ${curr} ${parseFloat(form.deductions||'0').toFixed(2)}</td></tr>
        <tr class="total"><td>GROSS SALARY</td><td>${curr} ${gross.toFixed(2)}</td></tr>
        <tr><td>Amount Paid</td><td>${curr} ${parseFloat(form.amount_paid||'0').toFixed(2)}</td></tr>
        <tr style="color:#dc2626;font-weight:700"><td>REMAINING BALANCE</td><td>${curr} ${remaining.toFixed(2)}</td></tr>
      </table>
      <p style="font-size:11px;color:#64748b">Payment Method: ${form.payment_method} | Payment Date: ${form.payment_date || 'N/A'}</p>
      ${form.notes ? `<p style="font-size:11px;margin-top:8px">Notes: ${form.notes}</p>` : ''}
      <div class="signature">
        <div><div class="line">Employee Signature</div></div>
        <div><div class="line">Employer Signature & Stamp</div></div>
      </div>
      <p style="font-size:10px;color:#94a3b8;margin-top:24px;text-align:center">Generated: ${new Date().toLocaleString()}</p>
      </body></html>
    `
    const w = window.open('', '_blank')!
    w.document.write(content)
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  const selectedDriverObj = drivers.find(d => d.id === selectedDriver)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Driver Salaries</h1>
          <p className="text-slate-500 text-sm">Track and manage driver salary payments</p>
        </div>
        <div className="flex gap-2">
          {selectedDriver && (
            <>
              <button onClick={handlePrint} className="btn-secondary"><Printer className="w-4 h-4" /> Print Slip</button>
              <button onClick={handleSave} className="btn-primary"><Save className="w-4 h-4" />{saved ? 'Saved!' : 'Save'}</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Driver list */}
        <div className="space-y-2">
          <h3 className="section-title">Drivers</h3>
          {drivers.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDriver(d.id)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${selectedDriver === d.id ? 'bg-blue-600/20 border-blue-600/50 text-blue-300' : 'card hover:border-slate-600 text-slate-300'}`}
            >
              <div className="font-medium text-sm">{d.full_name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{curr} {d.base_salary.toLocaleString()}/mo</div>
            </button>
          ))}
        </div>

        {/* Right: Salary form */}
        <div className="col-span-2">
          {!selectedDriver ? (
            <div className="flex items-center justify-center h-64 text-slate-600">Select a driver</div>
          ) : (
            <>
              {/* Month navigator */}
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => { if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y-1) } else setCurrentMonth(m => m-1) }} className="btn-icon">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-lg font-bold text-slate-100 flex-1 text-center">{MONTHS[currentMonth-1]} {currentYear}</div>
                <button onClick={() => { if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y+1) } else setCurrentMonth(m => m+1) }} className="btn-icon">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Driver info */}
              <div className="card p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center font-bold text-purple-400">
                    {selectedDriverObj?.full_name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">{selectedDriverObj?.full_name}</div>
                    <div className="text-xs text-slate-500">{selectedDriverObj?.mobile}</div>
                  </div>
                  <div className="ml-auto">
                    <div className="text-xs text-slate-500">Base Salary</div>
                    <div className="font-bold text-slate-100">{curr} {selectedDriverObj?.base_salary.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Salary form */}
              <div className="card p-5 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="form-group">
                    <label className="label">Basic Salary</label>
                    <input className="input" type="number" value={form.base_salary} onChange={e => set('base_salary', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Overtime Hours</label>
                    <input className="input" type="number" step="0.5" value={form.overtime_hours} onChange={e => set('overtime_hours', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Overtime Rate/hr</label>
                    <input className="input" type="number" step="0.5" value={form.overtime_rate} onChange={e => set('overtime_rate', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="form-group">
                    <label className="label">Overtime Amount</label>
                    <input className="input bg-slate-900/50 text-emerald-400 font-semibold" type="number" value={form.overtime_amount} readOnly />
                  </div>
                  <div className="form-group">
                    <label className="label">Bonus</label>
                    <input className="input" type="number" value={form.bonus} onChange={e => set('bonus', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Deductions</label>
                    <input className="input" type="number" value={form.deductions} onChange={e => set('deductions', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Deduction Reason</label>
                  <input className="input" value={form.deduction_reason} onChange={e => set('deduction_reason', e.target.value)} placeholder="Reason for deductions..." />
                </div>

                {/* Summary */}
                <div className="bg-slate-900 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Gross Salary</p>
                    <p className="text-xl font-black text-blue-400 mt-1">{curr} {gross.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Amount Paid</p>
                    <p className="text-xl font-black text-emerald-400 mt-1">{curr} {parseFloat(form.amount_paid||'0').toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Remaining</p>
                    <p className={`text-xl font-black mt-1 ${remaining > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{curr} {remaining.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="form-group">
                    <label className="label">Amount Paid</label>
                    <input className="input" type="number" value={form.amount_paid} onChange={e => set('amount_paid', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Payment Date</label>
                    <input className="input" type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Payment Method</label>
                    <select className="select" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                      {['cash','bank','online','other'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Notes</label>
                  <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>

              {/* Salary history */}
              {salaries.length > 0 && (
                <div className="mt-5">
                  <h3 className="section-title">Salary History</h3>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>Gross</th>
                          <th>Paid</th>
                          <th>Remaining</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaries.map(s => (
                          <tr key={s.id}>
                            <td>{MONTHS[s.period_month-1]} {s.period_year}</td>
                            <td className="font-semibold">{curr} {s.gross_salary.toLocaleString()}</td>
                            <td className="text-emerald-400">{curr} {s.amount_paid.toLocaleString()}</td>
                            <td className={s.remaining > 0 ? 'text-red-400' : 'text-emerald-400'}>{curr} {s.remaining.toLocaleString()}</td>
                            <td><span className={`badge ${s.status === 'paid' ? 'badge-paid' : s.status === 'partial' ? 'badge-partial' : 'badge-unpaid'}`}>{s.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
