import React, { useEffect, useState, useCallback } from 'react'
import { BookOpen, Plus, Filter } from 'lucide-react'
import type { Client, SOATransaction } from '../../types'
import Modal from '../shared/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

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
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [newTx, setNewTx] = useState({
    type: 'payment' as SOATransaction['type'],
    description: '', reference: '', debit: '0', credit: '0',
    transaction_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    window.api.listClients().then(c => setClients(c as Client[]))
  }, [])

  const loadSOA = useCallback(async () => {
    if (!selectedClient) return
    setLoading(true)
    const [txs, bal] = await Promise.all([
      window.api.listSOA({
        client_id: selectedClient,
        start_date: dateRange.start || undefined,
        end_date: dateRange.end || undefined
      }),
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
      ...newTx,
      debit: parseFloat(newTx.debit) || 0,
      credit: parseFloat(newTx.credit) || 0,
      created_by: user?.id
    })
    setShowAdd(false)
    setNewTx({ type: 'payment', description: '', reference: '', debit: '0', credit: '0', transaction_date: new Date().toISOString().split('T')[0] })
    loadSOA()
  }

  const client = clients.find(c => c.id === selectedClient)

  const TYPE_BADGE: Record<string, string> = {
    invoice: 'bg-blue-500/20 text-blue-400',
    payment: 'bg-emerald-500/20 text-emerald-400',
    credit:  'bg-green-500/20 text-green-400',
    debit:   'bg-red-500/20 text-red-400',
    adjustment: 'bg-purple-500/20 text-purple-400'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Statement of Account</h1>
          <p className="text-slate-500 text-sm mt-0.5">Client ledger with running balances</p>
        </div>
        {selectedClient && (
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        )}
      </div>

      {/* Client Selector */}
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
          {/* Summary */}
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
                  <th className="text-right">Debit ({curr})</th>
                  <th className="text-right">Credit ({curr})</th>
                  <th className="text-right">Balance ({curr})</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-500">No transactions found</td></tr>
                ) : transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="text-slate-400 whitespace-nowrap">{tx.transaction_date}</td>
                    <td>
                      <span className={`badge ${TYPE_BADGE[tx.type] || 'badge-draft'}`}>{tx.type}</span>
                    </td>
                    <td className="font-mono text-xs text-slate-400">{tx.reference || '—'}</td>
                    <td className="text-slate-300 max-w-xs truncate">{tx.description}</td>
                    <td className="text-right font-medium text-red-400">
                      {tx.debit > 0 ? `${curr} ${tx.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="text-right font-medium text-emerald-400">
                      {tx.credit > 0 ? `${curr} ${tx.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className={`text-right font-semibold ${tx.balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {curr} {(tx.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              {transactions.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900">
                    <td colSpan={4} className="px-4 py-3 font-semibold text-slate-300">CLOSING BALANCE</td>
                    <td className="px-4 py-3 text-right font-bold text-red-400">
                      {curr} {transactions.reduce((s,t) => s + t.debit, 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">
                      {curr} {transactions.reduce((s,t) => s + t.credit, 0).toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right font-black text-lg ${balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {curr} {Math.abs(balance).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* Add Transaction Modal */}
      {showAdd && (
        <Modal
          title="Add Manual Transaction"
          onClose={() => setShowAdd(false)}
          size="md"
          footer={
            <>
              <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddTransaction} className="btn-primary">Add Transaction</button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Transaction Type</label>
                <select className="select" value={newTx.type} onChange={e => setNewTx(p => ({ ...p, type: e.target.value as any }))}>
                  {['payment','credit','debit','adjustment'].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Date</label>
                <input className="input" type="date" value={newTx.transaction_date} onChange={e => setNewTx(p => ({ ...p, transaction_date: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Description *</label>
              <input className="input" value={newTx.description} onChange={e => setNewTx(p => ({ ...p, description: e.target.value }))} placeholder="Description of transaction" />
            </div>
            <div className="form-group">
              <label className="label">Reference</label>
              <input className="input" value={newTx.reference} onChange={e => setNewTx(p => ({ ...p, reference: e.target.value }))} placeholder="Receipt #, Cheque #, etc." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Debit Amount ({curr})</label>
                <input className="input" type="number" step="0.01" value={newTx.debit} onChange={e => setNewTx(p => ({ ...p, debit: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Credit Amount ({curr})</label>
                <input className="input" type="number" step="0.01" value={newTx.credit} onChange={e => setNewTx(p => ({ ...p, credit: e.target.value }))} />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
