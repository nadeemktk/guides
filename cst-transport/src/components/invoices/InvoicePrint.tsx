import React, { useRef } from 'react'
import { Printer, X, Download } from 'lucide-react'
import type { Invoice, AppSettings } from '../../types'

interface Props {
  invoice: Invoice
  settings: AppSettings
  onClose: () => void
}

export default function InvoicePrint({ invoice, settings, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const curr = settings.currency || 'AED'

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const w = window.open('', '_blank')!
    w.document.write(`
      <!DOCTYPE html><html><head>
      <title>Invoice ${invoice.invoice_number}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; color: #1e293b; background: white; }
        .page { max-width: 800px; margin: 0 auto; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .company h1 { font-size: 22px; font-weight: 900; color: #1d4ed8; }
        .company p { font-size: 12px; color: #64748b; margin-top: 2px; }
        .invoice-info { text-align: right; }
        .invoice-info h2 { font-size: 28px; font-weight: 900; color: #0f172a; }
        .invoice-info .num { font-size: 16px; color: #2563eb; font-weight: 700; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; background: #f8fafc; border-radius: 12px; padding: 20px; }
        .meta h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px; }
        .meta p { font-size: 13px; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #0f172a; color: white; padding: 10px 12px; text-align: left; font-size: 11px; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .totals { margin-left: auto; width: 280px; }
        .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .totals .total-row { border-top: 2px solid #0f172a; font-weight: 900; font-size: 16px; padding-top: 10px; margin-top: 4px; color: #2563eb; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .status-paid { background: #dcfce7; color: #166534; }
        .status-unpaid { background: #fee2e2; color: #991b1b; }
        .status-partial { background: #fef9c3; color: #92400e; }
      </style>
      </head><body>
      <div class="page">
        ${content}
      </div>
      </body></html>
    `)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  const statusClass = invoice.status === 'paid' ? 'status-paid' : invoice.status === 'partial' ? 'status-partial' : 'status-unpaid'

  return (
    <div className="modal-overlay">
      <div className="modal max-w-4xl w-full">
        <div className="modal-header">
          <h3 className="text-base font-semibold text-slate-100">Invoice Preview – {invoice.invoice_number}</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn-primary">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* White print preview */}
        <div className="p-6 bg-white text-slate-900" ref={printRef}>
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-black text-blue-700">{settings.company_name}</h1>
              <p className="text-slate-500 text-xs mt-1">{settings.company_address}</p>
              <p className="text-slate-500 text-xs">{settings.company_phone} | {settings.company_email}</p>
              {settings.company_trn && <p className="text-slate-500 text-xs">TRN: {settings.company_trn}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-black text-slate-900">INVOICE</h2>
              <p className="text-blue-600 font-bold text-lg">{invoice.invoice_number}</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-6 mb-6 bg-slate-50 rounded-xl p-5">
            <div>
              <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Billed To</h4>
              <p className="font-bold text-slate-900">{invoice.client_name}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Invoice Date</h4>
              <p className="font-medium text-slate-900">{invoice.invoice_date}</p>
              {invoice.due_date && <>
                <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-2 mb-1">Due Date</h4>
                <p className="font-medium text-slate-900">{invoice.due_date}</p>
              </>}
            </div>
            <div>
              {invoice.service_period && <>
                <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Service Period</h4>
                <p className="font-medium text-slate-900">{invoice.service_period}</p>
              </>}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-3 py-2.5 text-left text-xs font-semibold">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Description</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Vehicle</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Driver</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Date</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold">Qty</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold">Rate</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 text-slate-500 text-xs">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{item.description}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{[item.vehicle_type, item.vehicle_plate].filter(Boolean).join(' – ')}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{item.driver_name}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{item.trip_date}</td>
                  <td className="px-3 py-2 text-right">{item.quantity}</td>
                  <td className="px-3 py-2 text-right">{curr} {(item.unit_price || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{curr} {(item.line_total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-72 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal:</span><span>{curr} {(invoice.subtotal || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tax ({invoice.tax_rate}%):</span><span>{curr} {(invoice.tax_amount || 0).toFixed(2)}</span></div>
              {invoice.discount > 0 && <div className="flex justify-between"><span className="text-slate-500">Discount:</span><span>– {curr} {invoice.discount.toFixed(2)}</span></div>}
              <div className="border-t border-slate-300 pt-2 flex justify-between font-black text-base"><span>Total:</span><span className="text-blue-700">{curr} {(invoice.total || 0).toFixed(2)}</span></div>
              {invoice.amount_paid > 0 && <div className="flex justify-between text-emerald-700 font-medium"><span>Amount Paid:</span><span>{curr} {(invoice.amount_paid || 0).toFixed(2)}</span></div>}
              {invoice.balance_due > 0 && <div className="flex justify-between text-red-700 font-bold"><span>Balance Due:</span><span>{curr} {(invoice.balance_due || 0).toFixed(2)}</span></div>}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-slate-700">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Terms & Conditions</p>
              <p className="text-sm text-slate-700">{invoice.terms}</p>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
            {settings.company_name} | {settings.company_address} | {settings.company_email}
            <br />Generated on {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}
