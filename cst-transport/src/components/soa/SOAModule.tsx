import React, { useEffect, useState, useCallback } from 'react'
import { BookOpen, Plus, Filter, Printer, Pencil, Trash2 } from 'lucide-react'
import type { Client, SOATransaction } from '../../types'
import Modal from '../shared/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

const BLANK_TX = {
  type: 'payment' as SOATransaction['type'],
  description: '', reference: '', vehicle_info: '', lpo_number: '', remarks: '',
  debit: '0', credit: '0', status: 'unpaid',
  transaction_date: new Date().toISOString().split('T')[0]
}

export default function SOAModule() {
  const { user } = useAuth()
  const { settings } = useApp()
  const curr = settings.currency || 'AED'

  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [transactions, setTransactions] = useState<SOATransaction[]>([])
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editTx, setEditTx] = useState<SOATransaction | null>(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [formTx, setFormTx] = useState(BLANK_TX)

  useEffect(() => {
    window.api.listClients().then(c => setClients(c as Client[]))
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

  const handleAddTransaction = async () => {
    await window.api.addSOATransaction({
      client_id: selectedClient,
      ...formTx,
      debit: parseFloat(formTx.debit) || 0,
      credit: parseFloat(formTx.credit) || 0,
      created_by: user?.id
    })
    setShowAdd(false)
    setFormTx(BLANK_TX)
    loadSOA()
  }

  const handleUpdateTransaction = async () => {
    if (!editTx) return
    await window.api.updateSOATransaction({
      id: editTx.id,
      ...formTx,
      debit: parseFloat(formTx.debit) || 0,
      credit: parseFloat(formTx.credit) || 0
    })
    setEditTx(null)
    setFormTx(BLANK_TX)
    loadSOA()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return
    await window.api.deleteSOATransaction(id)
    loadSOA()
  }

  const openEdit = (tx: SOATransaction) => {
    setEditTx(tx)
    setFormTx({
      type: tx.type,
      description: tx.description,
      reference: tx.reference || '',
      vehicle_info: tx.vehicle_info || '',
      lpo_number: tx.lpo_number || '',
      remarks: tx.remarks || '',
      debit: String(tx.debit),
      credit: String(tx.credit),
      status: tx.status || 'unpaid',
      transaction_date: tx.transaction_date
    })
  }

  const client = clients.find(c => c.id === selectedClient)

  const handlePrint = () => {
    if (!client || !transactions.length) return
    const rows = transactions.map((tx, i) => `
      <tr style="background:${i%2===1?'#f5f7fa':'#fff'}">
        <td>${i+1}</td>
        <td>${tx.reference || '—'}</td>
        <td>${tx.transaction_date}</td>
        <td>${tx.vehicle_info || '—'}</td>
        <td style="text-align:right">${tx.debit > 0 ? tx.debit.toFixed(2) : '—'}</td>
        <td style="text-align:right">${tx.credit > 0 ? tx.credit.toFixed(2) : '—'}</td>
        <td>${tx.lpo_number || '—'}</td>
        <td>${tx.remarks || '—'}</td>
      </tr>`).join('')
    const totalDebit = transactions.reduce((s,t) => s+t.debit, 0)
    const totalCredit = transactions.reduce((s,t) => s+t.credit, 0)
    const html = `<!DOCTYPE html><html><head>
      <title>SOA – ${client.company_name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; padding: 12mm 14mm; }
        h1 { font-size: 18px; font-weight: 900; color: #003399; }
        .sub { font-size: 11px; font-weight: 700; color: #000; margin-top: 2px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a3e; padding-bottom: 8px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1a1a3e; color: #fff; padding: 6px 4px; text-align: center; font-size: 9px; border: 1px solid #333; }
        td { padding: 4px; border: 1px solid #ccc; font-size: 9px; text-align: center; }
        tfoot td { background: #1a1a3e; color: #fff; font-weight: 900; font-size: 10px; }
        .balance-box { margin-top: 10px; text-align: right; font-size: 12px; font-weight: 900; }
      </style>
      </head><body>
      <div class="header">
        <div>
          <h1>${settings.company_name}</h1>
          <div class="sub">Statement of Account</div>
          <div style="font-size:9px;color:#555;margin-top:2px">${settings.company_address}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;font-weight:700">${client.company_name}</div>
          ${client.tax_number ? `<div style="font-size:9px">TRN: ${client.tax_number}</div>` : ''}
          ${dateRange.start || dateRange.end ? `<div style="font-size:9px">Period: ${dateRange.start||'Start'} – ${dateRange.end||'End'}</div>` : ''}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Ser</th><th>Invoice / Ref</th><th>Date</th><th>Vehicle Info</th>
            <th>Amount (${curr})</th><th>Payment (${curr})</th><th>LPO No</th><th>Remarks</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="4">TOTALS</td>
            <td style="text-align:right">${totalDebit.toFixed(2)}</td>
            <td style="text-align:right">${totalCredit.toFixed(2)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
      <div class="balance-box">
        Balance Due: ${curr} ${Math.abs(balance).toFixed(2)} ${balance > 0 ? '(DUE)' : balance < 0 ? '(CREDIT)' : ''}
      </div>
      <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div><div style="border-top:1px solid #333;padding-top:4px;font-size:9px;color:#666">Customer Stamp &amp; Signature</div></div>
        <div><div style="border-top:1px solid #333;padding-top:4px;font-size:9px;color:#666">For ${settings.company_name}</div></div>
      </div>
      <div style="margin-top:12px;font-size:8px;color:#888;text-align:center">Generated: ${new Date().toLocaleString()} | Page 1 of 1</div>
      </body></html>`
    const w = window.open('', '_blank')!
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 400)
  }

  const TYPE_BADGE: Record<string, string> = {
    invoice: 'bg-blue-500/20 text-blue-400',
    payment: 'bg-emerald-500/20 text-emerald-400',
    credit:  'bg-green-500/20 text-green-400',
    debit:   'bg-red-500/20 text-red-400',
    adjustment: 'bg-purple-500/20 text-purple-400'
  }

  const TxForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label className="label">Transaction Type</label>
          <select className="select" value={formTx.type} onChange={e => setFormTx(p => ({ ...p, type: e.target.value as any }))}>
            {['payment','credit','debit','adjustment'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Date</label>
          <input className="input" type="date" value={formTx.transaction_date} onChange={e => setFormTx(p => ({ ...p, transaction_date: e.target.value }))} />
        </div>
      </div>
      <div className="form-group">
        <label className="label">Description *</label>
        <input className="input" value={formTx.description} onChange={e => setFormTx(p => ({ ...p, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label className="label">Reference</label>
          <input className="input" value={formTx.reference} onChange={e => setFormTx(p => ({ ...p, reference: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="label">LPO Number</label>
          <input className="input" value={formTx.lpo_number} onChange={e => setFormTx(p => ({ ...p, lpo_number: e.target.value }))} />
        </div>
      </div>
      <div className="form-group">
        <label className="label">Vehicle Info</label>
        <input className="input" value={formTx.vehicle_info} onChange={e => setFormTx(p => ({ ...p, vehicle_info: e.target.value }))} placeholder="Vehicle type / plate number" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label className="label">Debit Amount ({curr})</label>
          <input className="input" type="number" step="0.01" value={formTx.debit} onChange={e => setFormTx(p => ({ ...p, debit: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="label">Credit Amount ({curr})</label>
          <input className="input" type="number" step="0.01" value={formTx.credit} onChange={e => setFormTx(p => ({ ...p, credit: e.target.value }))} />
        </div>
      </div>
      <div className="form-group">
        <label className="label">Remarks</label>
        <input className="input" value={formTx.remarks} onChange={e => setFormTx(p => ({ ...p, remarks: e.target.value }))} />
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Statement of Account</h1>
          <p className="text-slate-500 text-sm mt-0.5">Client ledger with running balances</p>
        </div>
        <div className="flex gap-2">
          {selectedClient && transactions.length > 0 && (
            <button onClick={handlePrint} className="btn-secondary"><Printer className="w-4 h-4" /> Print SOA</button>
          )}
          {selectedClient && (
            <button onClick={() => { setFormTx(BLANK_TX); setShowAdd(true) }} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Transaction
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="flex gap-3 flex-wrap">
          <div className="form-group flex-1 min-w-48">
            <label className="label">Select Client</label>
            <select className="select" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="">-- Choose Client --</option>
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
          <p>Select a client to view Statement of Account</p>
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
                  <th className="text-right">Debit ({curr})</th>
                  <th className="text-right">Credit ({curr})</th>
                  <th className="text-right">Balance ({curr})</th>
                  <th>Remarks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-8 text-slate-500">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-8 text-slate-500">No transactions found</td></tr>
                ) : transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="text-slate-400 whitespace-nowrap">{tx.transaction_date}</td>
                    <td><span className={`badge ${TYPE_BADGE[tx.type] || 'badge-draft'}`}>{tx.type}</span></td>
                    <td className="font-mono text-xs text-slate-400">{tx.reference || '—'}</td>
                    <td className="text-slate-300 max-w-xs truncate">{tx.description}</td>
                    <td className="text-slate-400 text-xs">{tx.vehicle_info || '—'}</td>
                    <td className="text-slate-400 text-xs">{tx.lpo_number || '—'}</td>
                    <td className="text-right font-medium text-red-400">
                      {tx.debit > 0 ? `${tx.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="text-right font-medium text-emerald-400">
                      {tx.credit > 0 ? `${tx.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className={`text-right font-semibold ${tx.balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {(tx.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-slate-400 text-xs max-w-[120px] truncate">{tx.remarks || '—'}</td>
                    <td>
                      {tx.type !== 'invoice' && (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(tx)} className="btn-icon p-1"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(tx.id)} className="btn-icon p-1 text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
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
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* Add Transaction Modal */}
      {showAdd && (
        <Modal title="Add Manual Transaction" onClose={() => setShowAdd(false)} size="md"
          footer={<><button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button onClick={handleAddTransaction} className="btn-primary">Add Transaction</button></>}
        >
          <TxForm />
        </Modal>
      )}

      {/* Edit Transaction Modal */}
      {editTx && (
        <Modal title="Edit Transaction" onClose={() => setEditTx(null)} size="md"
          footer={<><button onClick={() => setEditTx(null)} className="btn-secondary">Cancel</button><button onClick={handleUpdateTransaction} className="btn-primary">Save Changes</button></>}
        >
          <TxForm />
        </Modal>
      )}
    </div>
  )
}
