import React, { useEffect, useState, useCallback } from 'react'
import { BookOpen, Filter, Printer, FileDown } from 'lucide-react'
import type { Client, SOATransaction } from '../../types'
import { useApp } from '../../contexts/AppContext'

export default function SOAModule() {
  const { settings } = useApp()
  const curr = settings.currency || 'AED'

  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [transactions, setTransactions] = useState<SOATransaction[]>([])
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    window.api.listClients({ client_type: 'monthly' }).then(c => setClients(c as Client[]))
  }, [])

  const loadSOA = useCallback(async () => {
    if (!selectedClient) return
    setLoading(true)
    const [txs, bal] = await Promise.all([
      window.api.listSOA({ client_id: selectedClient, start_date: dateRange.start || undefined, end_date: dateRange.end || undefined }),
      window.api.getSOABalance(selectedClient)
    ])
    setTransactions(txs as SOATransaction[])
    setBalance((bal as any)?.balance || 0)
    setLoading(false)
  }, [selectedClient, dateRange])

  useEffect(() => { loadSOA() }, [loadSOA])

  const client = clients.find(c => c.id === selectedClient)

  const SOA_PRINT_CSS = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; }
    .page { width: 210mm; min-height: 297mm; padding: 12mm 14mm; margin: 0 auto; }
    .letterhead-space { height: 35mm; }
    .soa-title { text-align: center; margin-bottom: 10px; }
    .soa-title h1 { font-size: 20px; font-weight: 900; letter-spacing: 2px; text-decoration: underline; text-transform: uppercase; color: #000; }
    .to-block { margin-bottom: 8px; font-size: 10px; }
    .to-block .to-label { font-size: 10px; font-weight: 700; }
    .to-block .to-name { font-size: 13px; font-weight: 900; color: #003399; margin-left: 6px; }
    .intro { font-size: 9px; color: #444; margin-bottom: 10px; font-style: italic; }
    .meta { display: flex; justify-content: space-between; font-size: 9px; color: #555; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1a1a3e; color: #fff; padding: 6px 4px; font-size: 8px; border: 1px solid #333; text-align: center; }
    td { padding: 4px; border: 1px solid #ccc; font-size: 9px; text-align: center; }
    tfoot td { background: #1a1a3e; color: #fff; font-weight: 900; font-size: 10px; }
    .balance-box { margin-top: 10px; text-align: right; font-size: 12px; font-weight: 900; }
    .sig { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .sig-line { border-top: 1px solid #333; padding-top: 4px; font-size: 9px; color: #666; margin-top: 30px; }
    .footer { margin-top: 12px; font-size: 8px; color: #888; text-align: center; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .letterhead-space { height: 35mm; }
    }
  `

  const buildPrintContent = () => {
    if (!client || !transactions.length) return ''
    const rows = transactions.map((tx, i) => `
      <tr style="background:${i%2===1?'#f5f7fa':'#fff'}">
        <td>${i+1}</td>
        <td>${tx.reference || '—'}</td>
        <td>${tx.transaction_date}</td>
        <td style="text-align:left;padding-left:5px">${tx.description}</td>
        <td>${tx.vehicle_info || '—'}</td>
        <td style="text-align:right">${tx.debit > 0 ? tx.debit.toFixed(2) : '—'}</td>
        <td style="text-align:right">${tx.credit > 0 ? tx.credit.toFixed(2) : '—'}</td>
        <td>${tx.lpo_number || '—'}</td>
        <td>${tx.remarks || '—'}</td>
      </tr>`).join('')
    const totalDebit = transactions.reduce((s,t) => s+t.debit, 0)
    const totalCredit = transactions.reduce((s,t) => s+t.credit, 0)
    const periodStr = dateRange.start || dateRange.end ? `${dateRange.start||'Start'} – ${dateRange.end||'End'}` : ''

    return `<!DOCTYPE html><html><head>
      <title>SOA – ${client.company_name}</title>
      <style>${SOA_PRINT_CSS}</style>
      </head><body><div class="page">
      <div class="letterhead-space"></div>
      <div class="soa-title"><h1>Statement of Account</h1></div>
      <div class="to-block">
        <span class="to-label">To:</span><span class="to-name">${client.company_name}</span>
      </div>
      <div class="intro">Please find attached below statement of account that are due for early payment:</div>
      <div class="meta">
        <div>
          ${settings.company_name}<br>
          ${settings.company_address || ''}
          ${settings.company_trn ? `<br>TRN: ${settings.company_trn}` : ''}
        </div>
        <div style="text-align:right">
          ${client.contact_name ? `Contact: ${client.contact_name}<br>` : ''}
          ${client.mobile ? `Mobile: ${client.mobile}<br>` : ''}
          ${client.tax_number ? `TRN: ${client.tax_number}<br>` : ''}
          ${periodStr ? `Period: ${periodStr}` : `Date: ${new Date().toLocaleDateString()}`}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Ser</th><th>Invoice / Ref</th><th>Date</th><th>Description</th><th>Vehicle Info</th>
            <th>INV-Amount ${curr}</th><th>Payment (${curr})</th><th>LPO No</th><th>Remarks</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="5">TOTALS</td>
            <td style="text-align:right">${totalDebit.toFixed(2)}</td>
            <td style="text-align:right">${totalCredit.toFixed(2)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
      <div class="balance-box">
        Balance Due: ${curr} ${Math.abs(balance).toFixed(2)} ${balance > 0 ? '(DUE)' : balance < 0 ? '(CREDIT)' : ''}
      </div>
      <div class="sig">
        <div><div class="sig-line">Customer Stamp &amp; Signature</div></div>
        <div><div class="sig-line">For ${settings.company_name}</div></div>
      </div>
      <div class="footer">Generated: ${new Date().toLocaleString()} | Page 1 of 1</div>
      </div></body></html>`
  }

  const handlePrint = () => {
    const html = buildPrintContent()
    if (!html) return
    const w = window.open('', '_blank')!
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 400)
  }

  const handleExportPDF = async () => {
    if (!client || !transactions.length) return
    const [jsPDFModule, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ])
    const { jsPDF } = jsPDFModule
    const autoTable = autoTableModule.default

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    // Letterhead space
    let y = 35

    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    const title = 'STATEMENT OF ACCOUNT'
    const titleW = doc.getTextWidth(title)
    const pageW = doc.internal.pageSize.getWidth()
    doc.text(title, (pageW - titleW) / 2, y)
    // underline
    doc.setLineWidth(0.5)
    doc.line((pageW - titleW) / 2, y + 1, (pageW - titleW) / 2 + titleW, y + 1)
    y += 10

    // To: block
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('To:', 14, y)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 51, 153)
    doc.text(client.company_name, 22, y)
    doc.setTextColor(0, 0, 0)
    y += 7

    // Intro
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Please find attached below statement of account that are due for early payment:', 14, y)
    doc.setFont('helvetica', 'normal')
    y += 7

    // Meta info
    doc.setFontSize(8)
    doc.text(settings.company_name || '', 14, y)
    const dateLabel = dateRange.start || dateRange.end
      ? `Period: ${dateRange.start||'Start'} – ${dateRange.end||'End'}`
      : `Date: ${new Date().toLocaleDateString()}`
    doc.text(dateLabel, pageW - 14, y, { align: 'right' })
    y += 10

    const totalDebit = transactions.reduce((s, t) => s + t.debit, 0)
    const totalCredit = transactions.reduce((s, t) => s + t.credit, 0)

    autoTable(doc, {
      startY: y,
      head: [['Ser', 'Invoice / Ref', 'Date', 'Description', 'Vehicle Info', `INV-Amount ${curr}`, `Payment (${curr})`, 'LPO No', 'Remarks']],
      body: transactions.map((tx, i) => [
        i + 1,
        tx.reference || '—',
        tx.transaction_date,
        tx.description,
        tx.vehicle_info || '—',
        tx.debit > 0 ? tx.debit.toFixed(2) : '—',
        tx.credit > 0 ? tx.credit.toFixed(2) : '—',
        tx.lpo_number || '—',
        tx.remarks || '—'
      ]),
      foot: [['', '', '', '', 'TOTALS', totalDebit.toFixed(2), totalCredit.toFixed(2), '', '']],
      headStyles: { fillColor: [26, 26, 62], fontSize: 8, halign: 'center' },
      footStyles: { fillColor: [26, 26, 62], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    })

    const finalY = (doc as any).lastAutoTable.finalY + 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(
      `Balance Due: ${curr} ${Math.abs(balance).toFixed(2)} ${balance > 0 ? '(DUE)' : balance < 0 ? '(CREDIT)' : ''}`,
      pageW - 14, finalY, { align: 'right' }
    )

    doc.save(`SOA_${client.company_name}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const TYPE_BADGE: Record<string, string> = {
    invoice:    'bg-blue-500/20 text-blue-400',
    payment:    'bg-emerald-500/20 text-emerald-400',
    credit:     'bg-green-500/20 text-green-400',
    debit:      'bg-red-500/20 text-red-400',
    adjustment: 'bg-purple-500/20 text-purple-400'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Statement of Account</h1>
          <p className="text-slate-500 text-sm mt-0.5">Monthly client ledger with running balances</p>
        </div>
        {selectedClient && transactions.length > 0 && (
          <div className="flex gap-2">
            <button onClick={handleExportPDF} className="btn-secondary">
              <FileDown className="w-4 h-4" /> Export PDF
            </button>
            <button onClick={handlePrint} className="btn-secondary">
              <Printer className="w-4 h-4" /> Print SOA
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="flex gap-3 flex-wrap">
          <div className="form-group flex-1 min-w-48">
            <label className="label">Select Client (Monthly)</label>
            <select className="select" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="">-- Choose Monthly Client --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">From Date</label>
            <input className="input" type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">To Date</label>
            <input className="input" type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
          </div>
          <div className="form-group justify-end flex items-end">
            <button onClick={loadSOA} className="btn-secondary"><Filter className="w-4 h-4" /> Filter</button>
          </div>
        </div>
      </div>

      {!selectedClient ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-600">
          <BookOpen className="w-12 h-12 mb-3 opacity-30" />
          <p>Select a monthly client to view Statement of Account</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {client && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="card p-4">
                <p className="text-xs text-slate-500">Client</p>
                <p className="text-lg font-bold text-slate-100 mt-1">{client.company_name}</p>
                {client.contact_name && <p className="text-xs text-slate-400">{client.contact_name}</p>}
              </div>
              <div className="card p-4">
                <p className="text-xs text-slate-500">Total Transactions</p>
                <p className="text-xl font-black text-slate-100 mt-1">{transactions.length}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-slate-500">Current Balance</p>
                <p className={`text-xl font-black mt-1 ${balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {curr} {Math.abs(balance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  <span className="text-sm font-normal ml-1">{balance > 0 ? 'DUE' : balance < 0 ? 'CREDIT' : ''}</span>
                </p>
              </div>
            </div>
          )}

          {/* Ledger Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Vehicle Info</th>
                  <th>LPO No</th>
                  <th className="text-right">INV-Amount {curr}</th>
                  <th className="text-right">Payment ({curr})</th>
                  <th className="text-right">Balance ({curr})</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-8 text-slate-500">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-slate-500">No transactions found</td></tr>
                ) : transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="text-slate-400 whitespace-nowrap">{tx.transaction_date}</td>
                    <td><span className={`badge ${TYPE_BADGE[tx.type] || 'badge-draft'}`}>{tx.type}</span></td>
                    <td className="font-mono text-xs text-slate-400">{tx.reference || '—'}</td>
                    <td className="text-slate-300 max-w-xs truncate">{tx.description}</td>
                    <td className="text-slate-400 text-xs">{tx.vehicle_info || '—'}</td>
                    <td className="text-slate-400 text-xs">{tx.lpo_number || '—'}</td>
                    <td className="text-right font-medium text-red-400">
                      {tx.debit > 0 ? tx.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="text-right font-medium text-emerald-400">
                      {tx.credit > 0 ? tx.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className={`text-right font-semibold ${tx.balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {(tx.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-slate-400 text-xs max-w-[120px] truncate">{tx.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
              {transactions.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900">
                    <td colSpan={6} className="px-4 py-3 font-semibold text-slate-300">CLOSING BALANCE</td>
                    <td className="px-4 py-3 text-right font-bold text-red-400">
                      {transactions.reduce((s,t) => s + t.debit, 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">
                      {transactions.reduce((s,t) => s + t.credit, 0).toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right font-black text-lg ${balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {Math.abs(balance).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  )
}
