import React, { useEffect, useState, useCallback } from 'react'
import { DollarSign, Save, Printer, ChevronLeft, ChevronRight, Users, UserCheck, FileDown, Eye, Plus, Edit2, Trash2 } from 'lucide-react'
import type { Driver, Staff, DriverSalary } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const BLANK_FORM = {
  base_salary: '0', overtime_hours: '0', overtime_rate: '0', overtime_amount: '0',
  food_allowance: '0', accommodation: '0', transport_allowance: '0', trip_incentives: '0', bonus: '0',
  deductions: '0', deduction_reason: '',
  advance_salary: '0', absence_deduction: '0', traffic_fines: '0',
  penalties: '0', loan_deduction: '0', other_deductions: '0', other_deduction_reason: '',
  amount_paid: '0', payment_date: '', payment_method: 'cash', notes: '',
  payroll_status: 'draft'
}

type EmpTab = 'drivers' | 'staff'

const PAYROLL_STATUS_STYLE: Record<string, string> = {
  draft:     'badge bg-slate-500/20 text-slate-400',
  processed: 'badge bg-blue-500/20 text-blue-400',
  paid:      'badge bg-emerald-500/20 text-emerald-400',
  cancelled: 'badge bg-red-500/20 text-red-400'
}

export default function SalariesModule() {
  const { user } = useAuth()
  const { settings } = useApp()
  const curr = settings.currency || 'AED'

  const [empTab, setEmpTab]           = useState<EmpTab>('drivers')
  const [drivers, setDrivers]         = useState<Driver[]>([])
  const [staffList, setStaffList]     = useState<Staff[]>([])
  const [salaries, setSalaries]       = useState<DriverSalary[]>([])
  const [selectedId, setSelectedId]   = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear]   = useState(new Date().getFullYear())
  const [form, setForm]               = useState(BLANK_FORM)
  const [saved, setSaved]             = useState(false)
  const [saving, setSaving]           = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  // Staff management
  const [showStaffForm, setShowStaffForm]   = useState(false)
  const [editingStaff, setEditingStaff]     = useState<Staff | null>(null)
  const [deleteStaff, setDeleteStaff]       = useState<Staff | null>(null)

  useEffect(() => {
    window.api.listDrivers().then(ds => setDrivers(ds as Driver[]))
    window.api.listStaff().then(st => setStaffList(st as Staff[]))
  }, [])

  useEffect(() => {
    setSelectedId('')
    setForm(BLANK_FORM)
    setSalaries([])
  }, [empTab])

  const isDriver = empTab === 'drivers'
  const employees = isDriver ? drivers : staffList
  const selected = employees.find(e => e.id === selectedId) as any

  const load = useCallback(async () => {
    if (!selectedId) return
    const getMethod = isDriver
      ? window.api.getSalary({ driver_id: selectedId, month: currentMonth, year: currentYear })
      : window.api.getStaffSalary({ staff_id: selectedId, month: currentMonth, year: currentYear })
    const existing = await getMethod as DriverSalary | undefined
    if (existing) {
      setForm({
        base_salary:            String(existing.base_salary || 0),
        overtime_hours:         String(existing.overtime_hours || 0),
        overtime_rate:          String(existing.overtime_rate || 0),
        overtime_amount:        String(existing.overtime_amount || 0),
        food_allowance:         String(existing.food_allowance || 0),
        accommodation:          String(existing.accommodation || 0),
        transport_allowance:    String(existing.transport_allowance || 0),
        trip_incentives:        String(existing.trip_incentives || 0),
        bonus:                  String(existing.bonus || 0),
        deductions:             String(existing.deductions || 0),
        deduction_reason:       existing.deduction_reason || '',
        advance_salary:         String(existing.advance_salary || 0),
        absence_deduction:      String(existing.absence_deduction || 0),
        traffic_fines:          String(existing.traffic_fines || 0),
        penalties:              String(existing.penalties || 0),
        loan_deduction:         String(existing.loan_deduction || 0),
        other_deductions:       String(existing.other_deductions || 0),
        other_deduction_reason: existing.other_deduction_reason || '',
        amount_paid:            String(existing.amount_paid || 0),
        payment_date:           existing.payment_date || '',
        payment_method:         existing.payment_method || 'cash',
        notes:                  existing.notes || '',
        payroll_status:         existing.payroll_status || 'draft'
      })
    } else {
      setForm({ ...BLANK_FORM, base_salary: String(selected?.base_salary || 0) })
    }
    const history = await window.api.listSalaries(
      isDriver ? { driver_id: selectedId } : { staff_id: selectedId }
    )
    setSalaries(history as DriverSalary[])
  }, [selectedId, currentMonth, currentYear, isDriver, selected?.base_salary])

  useEffect(() => { load() }, [load])

  const num = (v: string) => parseFloat(v) || 0

  const set = (k: string, v: string) => {
    setForm(p => {
      const next = { ...p, [k]: v }
      if (k === 'overtime_hours' || k === 'overtime_rate') {
        next.overtime_amount = String(num(next.overtime_hours) * num(next.overtime_rate))
      }
      return next
    })
  }

  const totalEarnings = num(form.food_allowance) + num(form.accommodation) + num(form.transport_allowance) +
    num(form.trip_incentives) + num(form.overtime_amount) + num(form.bonus)
  const totalDeductions = num(form.deductions) + num(form.advance_salary) + num(form.absence_deduction) +
    num(form.traffic_fines) + num(form.penalties) + num(form.loan_deduction) + num(form.other_deductions)
  const gross     = num(form.base_salary) + totalEarnings - totalDeductions
  const remaining = gross - num(form.amount_paid)

  const handleSave = async () => {
    if (!selectedId || saving) return
    setSaving(true)
    try {
      await window.api.saveSalary({
        ...(isDriver ? { driver_id: selectedId, employee_type: 'driver' } : { staff_id: selectedId, employee_type: 'staff' }),
        period_month: currentMonth, period_year: currentYear,
        base_salary:            num(form.base_salary),
        overtime_hours:         num(form.overtime_hours),
        overtime_rate:          num(form.overtime_rate),
        overtime_amount:        num(form.overtime_amount),
        food_allowance:         num(form.food_allowance),
        accommodation:          num(form.accommodation),
        transport_allowance:    num(form.transport_allowance),
        trip_incentives:        num(form.trip_incentives),
        bonus:                  num(form.bonus),
        deductions:             num(form.deductions),
        deduction_reason:       form.deduction_reason,
        advance_salary:         num(form.advance_salary),
        absence_deduction:      num(form.absence_deduction),
        traffic_fines:          num(form.traffic_fines),
        penalties:              num(form.penalties),
        loan_deduction:         num(form.loan_deduction),
        other_deductions:       num(form.other_deductions),
        other_deduction_reason: form.other_deduction_reason,
        amount_paid:            num(form.amount_paid),
        payment_date:           form.payment_date || null,
        payment_method:         form.payment_method,
        notes:                  form.notes,
        payroll_status:         form.payroll_status,
        created_by:             user?.id
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      load()
    } catch (e: any) {
      alert(`Save failed: ${e?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const buildPayslipHtml = () => {
    const label = isDriver ? 'Driver' : 'Staff Member'
    const sub = isDriver
      ? `License: ${(selected as Driver)?.license_number || '—'}`
      : `Role: ${(selected as Staff)?.role || '—'} | Dept: ${(selected as Staff)?.department || '—'}`
    return `<!DOCTYPE html><html><head>
<title>Payslip – ${selected?.full_name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:32px;max-width:680px;margin:0 auto;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1d4ed8;padding-bottom:14px;margin-bottom:18px}
  .co-name{font-size:20px;font-weight:900;color:#1d4ed8}
  .co-sub{font-size:11px;color:#64748b;margin-top:3px}
  .slip-title{font-size:13px;font-weight:700;color:#64748b;text-align:right}
  .slip-period{font-size:22px;font-weight:900;color:#1e293b;text-align:right}
  .emp-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .emp-field{font-size:11px;color:#64748b}
  .emp-val{font-weight:600;color:#1e293b}
  h3{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin:14px 0 6px}
  table{width:100%;border-collapse:collapse;margin-bottom:4px}
  td{padding:6px 10px;font-size:12px;border-bottom:1px solid #f1f5f9}
  td:last-child{text-align:right;font-weight:600}
  .earn td:last-child{color:#16a34a}
  .ded td:last-child{color:#dc2626}
  .base td:last-child{color:#1d4ed8}
  .summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;background:#1e293b;border-radius:8px;padding:14px;margin:16px 0;color:#fff;text-align:center}
  .sum-label{font-size:10px;color:#94a3b8;margin-bottom:3px}
  .sum-val{font-size:18px;font-weight:900}
  .sum-gross{color:#60a5fa}
  .sum-paid{color:#34d399}
  .sum-rem{color:#f87171}
  .pay-info{font-size:11px;color:#64748b;margin-top:4px}
  .sig{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .sig-line{border-top:1px solid #94a3b8;padding-top:6px;font-size:11px;color:#64748b}
  .footer{margin-top:24px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
</style></head><body>
<div class="header">
  <div>
    <div class="co-name">${settings.company_name}</div>
    <div class="co-sub">${settings.company_address}</div>
    <div class="co-sub">${settings.company_email} | ${settings.company_phone || ''}</div>
  </div>
  <div>
    <div class="slip-title">SALARY SLIP</div>
    <div class="slip-period">${MONTHS[currentMonth-1]} ${currentYear}</div>
  </div>
</div>

<div class="emp-box">
  <div><div class="emp-field">${label}</div><div class="emp-val">${selected?.full_name}</div></div>
  <div><div class="emp-field">Mobile</div><div class="emp-val">${selected?.mobile || '—'}</div></div>
  <div><div class="emp-field">${isDriver ? 'License' : 'Designation'}</div><div class="emp-val">${sub.split('|')[0].replace(/.*?:/,'').trim()}</div></div>
  <div><div class="emp-field">Pay Period</div><div class="emp-val">${MONTHS[currentMonth-1]} ${currentYear}</div></div>
</div>

<h3>Basic Pay</h3>
<table class="base"><tr><td>Basic Salary</td><td>${curr} ${num(form.base_salary).toFixed(2)}</td></tr></table>

<h3>Allowances &amp; Earnings</h3>
<table class="earn">
  ${num(form.food_allowance)      > 0 ? `<tr><td>Food Allowance</td><td>${curr} ${num(form.food_allowance).toFixed(2)}</td></tr>` : ''}
  ${num(form.accommodation)       > 0 ? `<tr><td>Accommodation</td><td>${curr} ${num(form.accommodation).toFixed(2)}</td></tr>` : ''}
  ${num(form.transport_allowance) > 0 ? `<tr><td>Transport Allowance</td><td>${curr} ${num(form.transport_allowance).toFixed(2)}</td></tr>` : ''}
  ${num(form.overtime_amount)     > 0 ? `<tr><td>Overtime (${form.overtime_hours}h × ${curr}${form.overtime_rate}/h)</td><td>${curr} ${num(form.overtime_amount).toFixed(2)}</td></tr>` : ''}
  ${num(form.trip_incentives)     > 0 ? `<tr><td>Trip Incentives</td><td>${curr} ${num(form.trip_incentives).toFixed(2)}</td></tr>` : ''}
  ${num(form.bonus)               > 0 ? `<tr><td>Bonus</td><td>${curr} ${num(form.bonus).toFixed(2)}</td></tr>` : ''}
  ${totalEarnings === 0 ? '<tr><td colspan="2" style="color:#94a3b8;font-size:11px">No additional allowances</td></tr>' : ''}
</table>

<h3>Deductions</h3>
<table class="ded">
  ${num(form.deductions)         > 0 ? `<tr><td>General Deductions${form.deduction_reason ? ` (${form.deduction_reason})` : ''}</td><td>– ${curr} ${num(form.deductions).toFixed(2)}</td></tr>` : ''}
  ${num(form.advance_salary)     > 0 ? `<tr><td>Advance Salary</td><td>– ${curr} ${num(form.advance_salary).toFixed(2)}</td></tr>` : ''}
  ${num(form.absence_deduction)  > 0 ? `<tr><td>Absence Deduction</td><td>– ${curr} ${num(form.absence_deduction).toFixed(2)}</td></tr>` : ''}
  ${num(form.traffic_fines)      > 0 ? `<tr><td>Traffic Fines</td><td>– ${curr} ${num(form.traffic_fines).toFixed(2)}</td></tr>` : ''}
  ${num(form.penalties)          > 0 ? `<tr><td>Penalties</td><td>– ${curr} ${num(form.penalties).toFixed(2)}</td></tr>` : ''}
  ${num(form.loan_deduction)     > 0 ? `<tr><td>Loan Deduction</td><td>– ${curr} ${num(form.loan_deduction).toFixed(2)}</td></tr>` : ''}
  ${num(form.other_deductions)   > 0 ? `<tr><td>Other Deductions${form.other_deduction_reason ? ` (${form.other_deduction_reason})` : ''}</td><td>– ${curr} ${num(form.other_deductions).toFixed(2)}</td></tr>` : ''}
  ${totalDeductions === 0 ? '<tr><td colspan="2" style="color:#94a3b8;font-size:11px">No deductions</td></tr>' : ''}
</table>

<div class="summary">
  <div><div class="sum-label">GROSS SALARY</div><div class="sum-val sum-gross">${curr} ${gross.toFixed(2)}</div></div>
  <div><div class="sum-label">AMOUNT PAID</div><div class="sum-val sum-paid">${curr} ${num(form.amount_paid).toFixed(2)}</div></div>
  <div><div class="sum-label">BALANCE DUE</div><div class="sum-val sum-rem">${curr} ${remaining.toFixed(2)}</div></div>
</div>

<div class="pay-info">
  Payment Method: <strong>${form.payment_method.toUpperCase()}</strong> &nbsp;|&nbsp;
  Payment Date: <strong>${form.payment_date || 'N/A'}</strong> &nbsp;|&nbsp;
  Status: <strong>${form.payroll_status.toUpperCase()}</strong>
</div>
${form.notes ? `<div class="pay-info" style="margin-top:6px">Notes: ${form.notes}</div>` : ''}

<div class="sig">
  <div><div class="sig-line">Employee Signature &amp; Date</div></div>
  <div><div class="sig-line">Authorized Signatory &amp; Company Stamp</div></div>
</div>
<div class="footer">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; ${settings.company_name}</div>
</body></html>`
  }

  const handlePrint = () => {
    if (!selected) return
    const w = window.open('', '_blank')!
    w.document.write(buildPayslipHtml())
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  const handleExportPDF = () => {
    if (!selected) return
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth()

    doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(29, 78, 216)
    doc.text(settings.company_name, 14, 18)
    doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(100)
    doc.text(`${settings.company_address} | ${settings.company_email}`, 14, 24)
    doc.setFontSize(18).setFont('helvetica', 'bold').setTextColor(30, 41, 59)
    doc.text('SALARY SLIP', pw - 14, 18, { align: 'right' })
    doc.setFontSize(11).setFont('helvetica', 'normal').setTextColor(100)
    doc.text(`${MONTHS[currentMonth - 1]} ${currentYear}`, pw - 14, 25, { align: 'right' })

    doc.setDrawColor(29, 78, 216).setLineWidth(0.5)
    doc.line(14, 28, pw - 14, 28)

    // Employee info box
    autoTable(doc, {
      startY: 31,
      body: [
        [isDriver ? 'Driver' : 'Staff Member', selected.full_name, 'Period', `${MONTHS[currentMonth - 1]} ${currentYear}`],
        ['Mobile', selected.mobile || '—', isDriver ? 'License' : 'Designation', isDriver ? (selected as Driver).license_number || '—' : (selected as Staff).designation || (selected as Staff).role || '—']
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35, textColor: [100, 116, 139] }, 2: { fontStyle: 'bold', cellWidth: 35, textColor: [100, 116, 139] } },
      margin: { left: 14, right: 14 },
      tableWidth: pw - 28,
      didDrawTable: (data) => { doc.setFillColor(248, 250, 252); doc.rect(14, 31, pw - 28, data.table.finalY - 31, 'F') }
    })

    const y1 = (doc as any).lastAutoTable.finalY + 4

    // Earnings
    const earnRows: any[] = [[`Basic Salary`, `${curr} ${num(form.base_salary).toFixed(2)}`]]
    if (num(form.food_allowance) > 0)      earnRows.push(['Food Allowance', `${curr} ${num(form.food_allowance).toFixed(2)}`])
    if (num(form.accommodation) > 0)       earnRows.push(['Accommodation', `${curr} ${num(form.accommodation).toFixed(2)}`])
    if (num(form.transport_allowance) > 0) earnRows.push(['Transport Allowance', `${curr} ${num(form.transport_allowance).toFixed(2)}`])
    if (num(form.overtime_amount) > 0)     earnRows.push([`Overtime (${form.overtime_hours}h × ${curr}${form.overtime_rate}/h)`, `${curr} ${num(form.overtime_amount).toFixed(2)}`])
    if (num(form.trip_incentives) > 0)     earnRows.push(['Trip Incentives', `${curr} ${num(form.trip_incentives).toFixed(2)}`])
    if (num(form.bonus) > 0)               earnRows.push(['Bonus', `${curr} ${num(form.bonus).toFixed(2)}`])
    earnRows.push([{ content: 'Total Earnings', styles: { fontStyle: 'bold' } }, { content: `${curr} ${(num(form.base_salary) + totalEarnings).toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [22, 163, 74] } }])

    // Deductions
    const dedRows: any[] = []
    if (num(form.deductions) > 0)        dedRows.push([`General${form.deduction_reason ? ` (${form.deduction_reason})` : ''}`, `– ${curr} ${num(form.deductions).toFixed(2)}`])
    if (num(form.advance_salary) > 0)    dedRows.push(['Advance Salary', `– ${curr} ${num(form.advance_salary).toFixed(2)}`])
    if (num(form.absence_deduction) > 0) dedRows.push(['Absence Deduction', `– ${curr} ${num(form.absence_deduction).toFixed(2)}`])
    if (num(form.traffic_fines) > 0)     dedRows.push(['Traffic Fines', `– ${curr} ${num(form.traffic_fines).toFixed(2)}`])
    if (num(form.penalties) > 0)         dedRows.push(['Penalties', `– ${curr} ${num(form.penalties).toFixed(2)}`])
    if (num(form.loan_deduction) > 0)    dedRows.push(['Loan Deduction', `– ${curr} ${num(form.loan_deduction).toFixed(2)}`])
    if (num(form.other_deductions) > 0)  dedRows.push([`Other${form.other_deduction_reason ? ` (${form.other_deduction_reason})` : ''}`, `– ${curr} ${num(form.other_deductions).toFixed(2)}`])
    if (dedRows.length === 0) dedRows.push(['No deductions', '—'])
    dedRows.push([{ content: 'Total Deductions', styles: { fontStyle: 'bold' } }, { content: `– ${curr} ${totalDeductions.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }])

    autoTable(doc, {
      startY: y1,
      head: [['EARNINGS', `${curr}`]],
      body: earnRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: pw / 2 + 2 },
      tableWidth: pw / 2 - 16
    })
    const y2earn = (doc as any).lastAutoTable.finalY

    autoTable(doc, {
      startY: y1,
      head: [['DEDUCTIONS', `${curr}`]],
      body: dedRows,
      theme: 'striped',
      headStyles: { fillColor: [153, 27, 27], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: pw / 2 + 2, right: 14 },
      tableWidth: pw / 2 - 16
    })
    const y2ded = (doc as any).lastAutoTable.finalY
    const y3 = Math.max(y2earn, y2ded) + 6

    // Summary box
    autoTable(doc, {
      startY: y3,
      body: [
        [
          { content: `GROSS SALARY\n${curr} ${gross.toFixed(2)}`, styles: { halign: 'center', fontStyle: 'bold', fontSize: 12, textColor: [255, 255, 255], fillColor: [29, 78, 216] } },
          { content: `AMOUNT PAID\n${curr} ${num(form.amount_paid).toFixed(2)}`, styles: { halign: 'center', fontStyle: 'bold', fontSize: 12, textColor: [255, 255, 255], fillColor: [5, 150, 105] } },
          { content: `BALANCE DUE\n${curr} ${remaining.toFixed(2)}`, styles: { halign: 'center', fontStyle: 'bold', fontSize: 12, textColor: [255, 255, 255], fillColor: remaining > 0 ? [185, 28, 28] as [number,number,number] : [5, 150, 105] as [number,number,number] } }
        ]
      ],
      theme: 'plain',
      margin: { left: 14, right: 14 },
      tableWidth: pw - 28
    })

    const y4 = (doc as any).lastAutoTable.finalY + 4
    doc.setFontSize(9).setTextColor(100)
    doc.text(`Payment: ${form.payment_method.toUpperCase()}  |  Date: ${form.payment_date || 'N/A'}  |  Status: ${form.payroll_status.toUpperCase()}`, 14, y4)
    if (form.notes) doc.text(`Notes: ${form.notes}`, 14, y4 + 5)

    const sigY = y4 + 25
    doc.setDrawColor(148, 163, 184).setLineWidth(0.3)
    doc.line(14, sigY, 90, sigY)
    doc.line(pw - 14, sigY, pw - 90, sigY)
    doc.setFontSize(9).setTextColor(100)
    doc.text('Employee Signature & Date', 14, sigY + 4)
    doc.text('Authorized Signatory & Stamp', pw - 14, sigY + 4, { align: 'right' })

    doc.setFontSize(8).setTextColor(150)
    doc.text(`Generated: ${new Date().toLocaleString()} | ${settings.company_name}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })

    doc.save(`payslip-${selected.full_name.replace(/\s+/g,'-')}-${MONTHS[currentMonth-1]}-${currentYear}.pdf`)
  }

  const handleExportPayrollReport = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth()
    const label = isDriver ? 'Drivers' : 'Staff'

    doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(30, 41, 59)
    doc.text(`${label.toUpperCase()} PAYROLL REPORT – ${MONTHS[currentMonth-1]} ${currentYear}`, pw / 2, 16, { align: 'center' })
    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(100)
    doc.text(`${settings.company_name} | Generated: ${new Date().toLocaleDateString()}`, pw / 2, 22, { align: 'center' })

    autoTable(doc, {
      startY: 27,
      head: [['Name', 'Basic', 'Allowances', 'OT', 'Bonus', 'Deductions', 'Gross', 'Paid', 'Balance', 'Method', 'Status']],
      body: salaries.filter(s => s.period_month === currentMonth && s.period_year === currentYear).map(s => [
        s.full_name || '—',
        `${curr} ${s.base_salary.toFixed(2)}`,
        `${curr} ${((s.food_allowance||0)+(s.accommodation||0)+(s.transport_allowance||0)+(s.trip_incentives||0)).toFixed(2)}`,
        `${curr} ${s.overtime_amount.toFixed(2)}`,
        `${curr} ${s.bonus.toFixed(2)}`,
        `${curr} ${((s.deductions||0)+(s.advance_salary||0)+(s.absence_deduction||0)+(s.traffic_fines||0)+(s.penalties||0)+(s.loan_deduction||0)+(s.other_deductions||0)).toFixed(2)}`,
        `${curr} ${s.gross_salary.toFixed(2)}`,
        `${curr} ${s.amount_paid.toFixed(2)}`,
        `${curr} ${s.remaining.toFixed(2)}`,
        s.payment_method,
        (s.payroll_status || s.status).toUpperCase()
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      margin: { left: 10, right: 10 }
    })

    doc.save(`payroll-${label.toLowerCase()}-${MONTHS[currentMonth-1]}-${currentYear}.pdf`)
  }

  const reloadStaff = () => window.api.listStaff().then(st => setStaffList(st as Staff[]))

  const handleSaveStaff = async (form: any) => {
    if (editingStaff) await window.api.updateStaff({ id: editingStaff.id, ...form })
    else              await window.api.createStaff(form)
    setShowStaffForm(false); setEditingStaff(null); reloadStaff()
  }

  const handleDeleteStaff = async () => {
    if (!deleteStaff) return
    await window.api.deleteStaff(deleteStaff.id)
    if (selectedId === deleteStaff.id) setSelectedId('')
    setDeleteStaff(null); reloadStaff()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Salaries &amp; Payroll</h1>
          <p className="text-slate-500 text-sm">Professional payroll management for drivers &amp; staff</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPayrollReport} className="btn-secondary text-xs">
            <FileDown className="w-4 h-4" /> Payroll Report
          </button>
          {selectedId && (
            <>
              <button onClick={() => setShowPreview(true)} className="btn-secondary">
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button onClick={handlePrint} className="btn-secondary">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={handleExportPDF} className="btn-secondary">
                <FileDown className="w-4 h-4" /> PDF
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Driver / Staff tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-slate-900 rounded-xl w-fit">
        {(['drivers', 'staff'] as EmpTab[]).map(tab => (
          <button key={tab} onClick={() => setEmpTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${empTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {tab === 'drivers' ? <Users className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Employee list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="section-title !mb-0">{isDriver ? 'Drivers' : 'Staff Members'}</h3>
            {!isDriver && (
              <button onClick={() => { setEditingStaff(null); setShowStaffForm(true) }} className="btn-icon text-blue-400" title="Add Staff">
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {employees.length === 0 ? (
            <p className="text-slate-500 text-sm px-1">No {isDriver ? 'drivers' : 'staff'} found{!isDriver && '. Click + to add.'}</p>
          ) : employees.map(e => (
            <div key={e.id} className={`rounded-xl border transition-all ${selectedId === e.id ? 'bg-blue-600/20 border-blue-600/50' : 'card hover:border-slate-600'}`}>
              <button onClick={() => setSelectedId(e.id)} className="w-full text-left p-3">
                <div className="font-medium text-sm text-slate-200">{e.full_name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{curr} {e.base_salary.toLocaleString()}/mo</div>
                {'role' in e && <div className="text-xs text-slate-600">{(e as Staff).designation || (e as Staff).role}</div>}
                <div className={`text-[10px] mt-1 ${e.status === 'active' ? 'text-emerald-500' : 'text-slate-500'}`}>● {e.status}</div>
              </button>
              {!isDriver && (
                <div className="flex gap-1 px-3 pb-2">
                  <button onClick={() => { setEditingStaff(e as Staff); setShowStaffForm(true) }} className="btn-icon text-xs">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => setDeleteStaff(e as Staff)} className="btn-icon text-red-400 text-xs">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Payroll form */}
        <div className="col-span-2">
          {!selectedId ? (
            <div className="flex items-center justify-center h-64 text-slate-600">
              <div className="text-center">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                Select a {isDriver ? 'driver' : 'staff member'} to view or create payroll
              </div>
            </div>
          ) : (
            <>
              {/* Month navigator */}
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => { if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y-1) } else setCurrentMonth(m => m-1) }} className="btn-icon">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-lg font-bold text-slate-100 flex-1 text-center">{MONTHS[currentMonth-1]} {currentYear}</div>
                <button onClick={() => { if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y+1) } else setCurrentMonth(m => m+1) }} className="btn-icon">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Employee header card */}
              <div className="card p-4 mb-4 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${isDriver ? 'bg-purple-600/20' : 'bg-teal-600/20'} flex items-center justify-center font-bold ${isDriver ? 'text-purple-400' : 'text-teal-400'} text-sm`}>
                  {selected?.full_name?.split(' ').map((n: string) => n[0]).slice(0,2).join('') || '?'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-100">{selected?.full_name}</div>
                  <div className="text-xs text-slate-500">{selected?.mobile} {!isDriver && (selected as Staff)?.department ? `| ${(selected as Staff).department}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Base Salary</div>
                  <div className="font-bold text-slate-100">{curr} {selected?.base_salary?.toLocaleString()}</div>
                </div>
                <div>
                  <label className="label text-[10px]">Payroll Status</label>
                  <select className="select text-xs py-1" value={form.payroll_status}
                    onChange={e => set('payroll_status', e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="processed">Processed</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Main payroll grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Earnings */}
                <div className="card p-4 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-700 pb-2">Earnings &amp; Allowances</h4>
                  <Row label="Basic Salary" k="base_salary" form={form} set={set} />
                  <Row label="Food Allowance" k="food_allowance" form={form} set={set} />
                  <Row label="Accommodation" k="accommodation" form={form} set={set} />
                  <Row label="Transport Allowance" k="transport_allowance" form={form} set={set} />
                  <Row label="Trip Incentives" k="trip_incentives" form={form} set={set} />
                  <Row label="Bonus" k="bonus" form={form} set={set} />
                  <div className="border-t border-slate-700 pt-2 grid grid-cols-3 gap-2">
                    <div className="form-group col-span-1">
                      <label className="label text-[10px]">OT Hours</label>
                      <input className="input text-xs py-1" type="number" step="0.5" value={form.overtime_hours} onChange={e => set('overtime_hours', e.target.value)} />
                    </div>
                    <div className="form-group col-span-1">
                      <label className="label text-[10px]">OT Rate/hr</label>
                      <input className="input text-xs py-1" type="number" step="0.5" value={form.overtime_rate} onChange={e => set('overtime_rate', e.target.value)} />
                    </div>
                    <div className="form-group col-span-1">
                      <label className="label text-[10px]">OT Amount</label>
                      <input className="input text-xs py-1 text-emerald-400 font-semibold bg-slate-900/50" value={form.overtime_amount} readOnly />
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg px-3 py-2 flex justify-between text-sm">
                    <span className="text-slate-400">Total Earnings</span>
                    <span className="font-bold text-emerald-400">{curr} {(num(form.base_salary) + totalEarnings).toFixed(2)}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="card p-4 space-y-3">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider border-b border-slate-700 pb-2">Deductions</h4>
                  <Row label="Advance Salary" k="advance_salary" form={form} set={set} />
                  <Row label="Absence Deduction" k="absence_deduction" form={form} set={set} />
                  <Row label="Traffic Fines" k="traffic_fines" form={form} set={set} />
                  <Row label="Penalties" k="penalties" form={form} set={set} />
                  <Row label="Loan Deduction" k="loan_deduction" form={form} set={set} />
                  <div className="form-group">
                    <label className="label text-[10px]">Other Deductions</label>
                    <div className="flex gap-2">
                      <input className="input text-xs py-1 w-24" type="number" value={form.other_deductions} onChange={e => set('other_deductions', e.target.value)} />
                      <input className="input text-xs py-1 flex-1" placeholder="Reason…" value={form.other_deduction_reason} onChange={e => set('other_deduction_reason', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label text-[10px]">General Deduction</label>
                    <div className="flex gap-2">
                      <input className="input text-xs py-1 w-24" type="number" value={form.deductions} onChange={e => set('deductions', e.target.value)} />
                      <input className="input text-xs py-1 flex-1" placeholder="Reason…" value={form.deduction_reason} onChange={e => set('deduction_reason', e.target.value)} />
                    </div>
                  </div>
                  <div className="bg-red-500/10 rounded-lg px-3 py-2 flex justify-between text-sm">
                    <span className="text-slate-400">Total Deductions</span>
                    <span className="font-bold text-red-400">– {curr} {totalDeductions.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Summary + Payment */}
              <div className="card p-4 space-y-4">
                {/* Gross summary bar */}
                <div className="bg-slate-900 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Gross Salary</p>
                    <p className="text-xl font-black text-blue-400 mt-1">{curr} {gross.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Amount Paid</p>
                    <p className="text-xl font-black text-emerald-400 mt-1">{curr} {num(form.amount_paid).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Balance Due</p>
                    <p className={`text-xl font-black mt-1 ${remaining > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{curr} {remaining.toFixed(2)}</p>
                  </div>
                </div>

                {/* Payment fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="form-group">
                    <label className="label">Amount Paid</label>
                    <input className="input" type="number" step="0.01" value={form.amount_paid} onChange={e => set('amount_paid', e.target.value)} />
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

              {/* Salary History */}
              {salaries.length > 0 && (
                <div className="mt-5">
                  <h3 className="section-title">Payroll History</h3>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Period</th><th>Gross</th><th>Allowances</th><th>Deductions</th>
                          <th>Paid</th><th>Balance</th><th>P.Status</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaries.map(s => {
                          const sAllowances = (s.food_allowance||0)+(s.accommodation||0)+(s.transport_allowance||0)+(s.trip_incentives||0)+(s.overtime_amount||0)+(s.bonus||0)
                          const sDeductions = (s.deductions||0)+(s.advance_salary||0)+(s.absence_deduction||0)+(s.traffic_fines||0)+(s.penalties||0)+(s.loan_deduction||0)+(s.other_deductions||0)
                          return (
                            <tr key={s.id}>
                              <td>{MONTHS[s.period_month-1]} {s.period_year}</td>
                              <td className="font-semibold">{curr} {s.gross_salary.toFixed(2)}</td>
                              <td className="text-emerald-400 text-xs">+{curr} {sAllowances.toFixed(2)}</td>
                              <td className="text-red-400 text-xs">–{curr} {sDeductions.toFixed(2)}</td>
                              <td className="text-emerald-400">{curr} {s.amount_paid.toFixed(2)}</td>
                              <td className={s.remaining > 0 ? 'text-red-400' : 'text-emerald-400'}>{curr} {s.remaining.toFixed(2)}</td>
                              <td><span className={PAYROLL_STATUS_STYLE[s.payroll_status] || 'badge badge-draft'}>{s.payroll_status || 'draft'}</span></td>
                              <td><span className={`badge ${s.status === 'paid' ? 'badge-paid' : s.status === 'partial' ? 'badge-partial' : 'badge-unpaid'}`}>{s.status}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Payslip preview modal */}
      {showPreview && selected && (
        <PreviewModal html={buildPayslipHtml()} onClose={() => setShowPreview(false)} />
      )}

      {/* Staff management modals */}
      {showStaffForm && (
        <StaffFormModal
          staff={editingStaff}
          onClose={() => { setShowStaffForm(false); setEditingStaff(null) }}
          onSave={handleSaveStaff}
        />
      )}
      {deleteStaff && (
        <ConfirmDialog
          title="Remove Staff Member"
          message={`Remove "${deleteStaff.full_name}" from staff? Their payroll history will be preserved.`}
          danger
          onConfirm={handleDeleteStaff}
          onCancel={() => setDeleteStaff(null)}
        />
      )}
    </div>
  )
}

// ─── Shared row component ─────────────────────────────────────────────────────
function Row({ label, k, form, set }: { label: string; k: string; form: any; set: (k: string, v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-400 w-36 shrink-0">{label}</label>
      <input className="input text-xs py-1 flex-1" type="number" step="0.01" min="0"
        value={form[k]} onChange={e => set(k, e.target.value)} />
    </div>
  )
}

// ─── Staff Form Modal ─────────────────────────────────────────────────────────
function StaffFormModal({ staff, onClose, onSave }: { staff: Staff | null; onClose: () => void; onSave: (f: any) => void }) {
  const [form, setForm] = useState({
    full_name:    staff?.full_name    || '',
    mobile:       staff?.mobile       || '',
    role:         staff?.role         || 'Staff',
    designation:  staff?.designation  || '',
    department:   staff?.department   || '',
    base_salary:  staff?.base_salary  || '',
    joining_date: staff?.joining_date || '',
    leaving_date: staff?.leaving_date || '',
    id_number:    staff?.id_number    || '',
    id_expiry:    staff?.id_expiry    || '',
    nationality:  staff?.nationality  || '',
    status:       staff?.status       || 'active',
    notes:        staff?.notes        || ''
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal
      title={staff ? `Edit Staff – ${staff.full_name}` : 'Add Staff Member'}
      onClose={onClose}
      size="lg"
      footer={<>
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={() => onSave(form)} className="btn-primary">{staff ? 'Update' : 'Add Staff'}</button>
      </>}
    >
      <div className="grid grid-cols-2 gap-4">
        {([
          ['full_name',    'Full Name *',           'text'],
          ['mobile',       'Mobile',                'text'],
          ['role',         'Role / Job Title',      'text'],
          ['designation',  'Designation',           'text'],
          ['department',   'Department',            'text'],
          ['nationality',  'Nationality',           'text'],
          ['base_salary',  'Base Salary (AED/mo)',  'number'],
          ['id_number',    'Emirates ID / Passport','text'],
          ['id_expiry',    'ID Expiry',             'date'],
          ['joining_date', 'Joining Date',          'date'],
          ['leaving_date', 'Leaving Date',          'date'],
        ] as [string, string, string][]).map(([k, l, t]) => (
          <div key={k} className="form-group">
            <label className="label">{l}</label>
            <input className="input" type={t} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
        <div className="form-group">
          <label className="label">Status</label>
          <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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

// ─── Payslip preview modal ────────────────────────────────────────────────────
function PreviewModal({ html, onClose }: { html: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b border-slate-200">
          <span className="font-semibold text-slate-700 text-sm">Payslip Preview</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-sm px-3 py-1 rounded border border-slate-300">Close</button>
        </div>
        <iframe
          srcDoc={html}
          className="flex-1 w-full border-0"
          title="Payslip Preview"
        />
      </div>
    </div>
  )
}
