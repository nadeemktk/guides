import React, { useRef } from 'react'
import { Printer, X } from 'lucide-react'
import type { Invoice, AppSettings } from '../../types'

interface Props {
  invoice: Invoice
  settings: AppSettings
  onClose: () => void
}

function numToWords(n: number): string {
  if (n === 0) return 'Zero'
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  const below100 = (x: number) => x < 20 ? ones[x] : tens[Math.floor(x/10)] + (x%10 ? ' '+ones[x%10] : '')
  const below1000 = (x: number) => x < 100 ? below100(x) : ones[Math.floor(x/100)]+' Hundred'+(x%100?' '+below100(x%100):'')
  const parts: string[] = []
  const labels = ['','Thousand','Million','Billion']
  let rem = Math.floor(Math.abs(n)); let i = 0
  const chunks: number[] = []
  while (rem > 0) { chunks.unshift(rem % 1000); rem = Math.floor(rem/1000); i++ }
  chunks.forEach((c, idx) => { if (c) parts.push(below1000(c) + (labels[chunks.length-1-idx] ? ' '+labels[chunks.length-1-idx] : '')) })
  const fils = Math.round((Math.abs(n) - Math.floor(Math.abs(n))) * 100)
  return parts.join(' ') + (fils > 0 ? ` and ${below100(fils)} Fils` : ' Only')
}

const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; background: white; }
  .page { width: 210mm; min-height: 297mm; padding: 12mm 14mm; margin: 0 auto; }
  .letterhead-space { height: 35mm; }
  .header-title { text-align: center; margin-bottom: 6px; }
  .header-title h1 { font-size: 20px; font-weight: 900; letter-spacing: 4px; color: #000; }
  .header-title .ar { font-size: 14px; color: #444; font-family: Arial; direction: rtl; }
  .company-block { display: flex; justify-content: space-between; align-items: flex-start; border: 1.5px solid #222; padding: 8px 10px; margin-bottom: 0; }
  .company-block .left h2 { font-size: 13px; font-weight: 900; color: #003399; }
  .company-block .left p { font-size: 9px; color: #444; line-height: 1.5; }
  .company-block .right { text-align: right; }
  .company-block .right p { font-size: 9px; color: #444; }
  .company-block .right .trn { font-size: 11px; font-weight: 800; color: #000; margin-top: 2px; }
  .info-box { display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid #222; border-top: none; margin-bottom: 0; }
  .info-box .col { padding: 6px 10px; }
  .info-box .col:first-child { border-right: 1px solid #aaa; }
  .info-row { display: flex; gap: 6px; margin-bottom: 3px; font-size: 9px; }
  .info-row .lbl { color: #555; min-width: 90px; }
  .info-row .lbl-ar { color: #333; font-size: 9px; direction: rtl; }
  .info-row .val { font-weight: 700; color: #000; flex: 1; }
  .client-name { font-size: 12px; font-weight: 900; color: #003399; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 8px; border: 1.5px solid #222; border-top: none; }
  table th { background: #1a1a3e; color: #fff; padding: 5px 3px; text-align: center; border: 1px solid #333; line-height: 1.3; }
  table th .en { font-size: 8px; font-weight: 700; }
  table th .ar { font-size: 7px; color: #ccc; direction: rtl; display: block; }
  table td { padding: 4px 3px; text-align: center; border: 1px solid #ccc; vertical-align: middle; }
  table td.desc { text-align: left; padding-left: 5px; }
  table tbody tr:nth-child(even) td { background: #f5f7fa; }
  .totals-section { display: flex; justify-content: flex-end; border: 1.5px solid #222; border-top: none; padding: 6px 10px; }
  .totals-table { width: 260px; }
  .totals-table tr td { padding: 3px 6px; font-size: 9px; border: none; }
  .totals-table tr td:first-child { color: #333; }
  .totals-table tr td:last-child { text-align: right; font-weight: 700; color: #000; }
  .totals-table .ar-label { font-size: 8px; color: #666; direction: rtl; display: block; }
  .totals-table .net-row td { background: #1a1a3e; color: #fff !important; font-weight: 900; font-size: 10px; }
  .words-box { border: 1.5px solid #222; border-top: none; padding: 5px 10px; font-size: 9px; }
  .words-box span { font-weight: 700; }
  .bank-box { border: 1.5px solid #222; border-top: none; padding: 6px 10px; }
  .bank-box h4 { font-size: 9px; font-weight: 800; margin-bottom: 4px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
  .bank-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
  .bank-item .lbl { font-size: 7px; color: #666; }
  .bank-item .val { font-size: 9px; font-weight: 700; color: #000; }
  .sig-box { display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid #222; border-top: none; }
  .sig-col { padding: 20px 10px 8px; }
  .sig-col:first-child { border-right: 1px solid #ccc; }
  .sig-col .title { font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .sig-col .line { border-top: 1px solid #333; margin-top: 30px; padding-top: 3px; font-size: 8px; color: #666; }
  .footer-bar { display: flex; justify-content: space-between; margin-top: 6px; font-size: 8px; color: #666; padding: 0 2px; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 8mm 10mm; }
    .letterhead-space { height: 35mm; }
  }
`

export default function InvoicePrint({ invoice, settings, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const curr = settings.currency || 'AED'

  const companyName = invoice.company_name || settings.company_name
  const companyTRN  = invoice.company_trn  || settings.company_trn
  const companyAddr = invoice.company_address || settings.company_address
  const companyPhone= invoice.company_phone || settings.company_phone
  const bankName    = invoice.bank_name    || settings.bank_name
  const bankAccount = invoice.bank_account || settings.bank_account
  const bankIban    = invoice.bank_iban    || settings.bank_iban
  const bankSwift   = invoice.bank_swift   || settings.bank_swift
  const bankBenef   = settings.bank_beneficiary || companyName

  const taxRate = invoice.tax_rate || 5
  const items = invoice.items || []

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const w = window.open('', '_blank')!
    w.document.write(`<!DOCTYPE html><html><head>
      <title>Tax Invoice ${invoice.invoice_number}</title>
      <style>${PRINT_CSS}</style>
      </head><body><div class="page">${content}</div></body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 400)
  }

  return (
    <div className="modal-overlay">
      <div className="modal max-w-5xl w-full">
        <div className="modal-header">
          <h3 className="text-base font-semibold text-slate-100">
            Tax Invoice Preview – {invoice.invoice_number}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn-primary">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* A4 Preview */}
        <div className="overflow-auto max-h-[80vh] bg-gray-200 p-4">
          <div
            ref={printRef}
            style={{ width: '210mm', minHeight: '297mm', background: 'white', margin: '0 auto', padding: '12mm 14mm', fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1a1a1a' }}
          >
            {/* Letterhead space – filled by company letterhead when printing on pre-printed paper */}
            <div className="letterhead-space" style={{ height: '35mm' }} />

            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '4px', color: '#000' }}>TAX INVOICE</div>
              <div style={{ fontSize: '13px', color: '#444', direction: 'rtl' }}>فاتورة ضريبية</div>
            </div>

            {/* Company header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', border: '1.5px solid #222', padding: '8px 10px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#003399' }}>{companyName}</div>
                <div style={{ fontSize: '9px', color: '#555', lineHeight: '1.6', marginTop: '2px' }}>
                  {companyAddr && <span>{companyAddr}<br /></span>}
                  {companyPhone && <span>Tel: {companyPhone}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '9px', color: '#666' }}>Tax Registration Number</div>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#000', marginTop: '2px' }}>TRN: {companyTRN || '—'}</div>
              </div>
            </div>

            {/* Info box: Bill-to (left) | Invoice details (right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1.5px solid #222', borderTop: 'none' }}>
              {/* Left: Client info */}
              <div style={{ padding: '6px 10px', borderRight: '1px solid #aaa' }}>
                {invoice.customer_code && (
                  <div style={{ fontSize: '8px', color: '#777', marginBottom: '2px' }}>
                    Customer Code: <strong>{invoice.customer_code}</strong>
                  </div>
                )}
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#003399', marginBottom: '3px' }}>{invoice.client_name}</div>
                {invoice.client_address && <div style={{ fontSize: '9px', color: '#444', marginBottom: '2px' }}>{invoice.client_address}</div>}
                {invoice.client_trn && (
                  <div style={{ fontSize: '9px' }}>
                    TRN: <strong>{invoice.client_trn}</strong>
                  </div>
                )}
              </div>
              {/* Right: Invoice meta */}
              <div style={{ padding: '6px 10px' }}>
                {[
                  { en: 'Invoice Date', ar: 'تاريخ الفاتورة', val: invoice.invoice_date },
                  { en: 'Invoice No', ar: 'رقم الفاتورة', val: invoice.invoice_number },
                  invoice.po_number ? { en: 'PO No', ar: 'عدد PO', val: invoice.po_number } : null,
                  invoice.delivery_note ? { en: 'Delivery Note No', ar: 'رقم مذكرة التسليم', val: invoice.delivery_note } : null,
                  invoice.sales_man ? { en: 'Sales Man', ar: 'مندوب مبيعات', val: invoice.sales_man } : null,
                  invoice.lpo_number ? { en: 'LPO No', ar: 'رقم أمر الشراء', val: invoice.lpo_number } : null,
                ].filter(Boolean).map((row, i) => row && (
                  <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px', fontSize: '9px' }}>
                    <div style={{ minWidth: '100px', color: '#555' }}>
                      {row.en}
                      <span style={{ display: 'block', fontSize: '8px', color: '#888', direction: 'rtl' }}>{row.ar}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: '#000', flex: 1 }}>: {row.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #222', borderTop: 'none', fontSize: '8px' }}>
              <thead>
                <tr style={{ background: '#1a1a3e', color: '#fff' }}>
                  {[
                    { en: 'SI No', ar: 'رقم SL', w: '4%' },
                    { en: 'Description', ar: 'وصف الخدمة', w: '22%' },
                    { en: 'Vehicle', ar: 'مركبة', w: '10%' },
                    { en: 'Duration', ar: 'مدة', w: '8%' },
                    { en: 'Unit', ar: 'وحدة', w: '6%' },
                    { en: 'Qty', ar: 'كمية', w: '5%' },
                    { en: 'Unit Price', ar: 'سعر الوحدة', w: '9%' },
                    { en: `${curr} Excl Tax`, ar: 'ضريبة حصرية', w: '10%' },
                    { en: 'Tax Rate %', ar: 'معدل الضريبة', w: '7%' },
                    { en: `Tax Amt ${curr}`, ar: 'قيمة الضريبة', w: '9%' },
                    { en: `Total Incl Tax`, ar: 'شامل الضريبة', w: '10%' },
                  ].map((h, i) => (
                    <th key={i} style={{ padding: '5px 2px', textAlign: 'center', border: '1px solid #333', width: h.w }}>
                      <span style={{ fontSize: '8px', fontWeight: 700, display: 'block' }}>{h.en}</span>
                      <span style={{ fontSize: '7px', color: '#ccc', direction: 'rtl', display: 'block' }}>{h.ar}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: '12px', color: '#999' }}>No items</td></tr>
                ) : items.map((item, i) => {
                  const taxAmt = (item.line_total || 0) * taxRate / 100
                  const totalInc = (item.line_total || 0) + taxAmt
                  return (
                    <tr key={i} style={{ background: i % 2 === 1 ? '#f5f7fa' : '#fff' }}>
                      <td style={{ textAlign: 'center', border: '1px solid #ccc', padding: '4px 2px' }}>{i+1}</td>
                      <td style={{ textAlign: 'left', border: '1px solid #ccc', padding: '4px 5px', fontWeight: 600 }}>{item.description}</td>
                      <td style={{ textAlign: 'center', border: '1px solid #ccc', padding: '4px 2px' }}>{item.vehicle_type || '—'}</td>
                      <td style={{ textAlign: 'center', border: '1px solid #ccc', padding: '4px 2px' }}>{item.duration || '—'}</td>
                      <td style={{ textAlign: 'center', border: '1px solid #ccc', padding: '4px 2px' }}>Trip</td>
                      <td style={{ textAlign: 'center', border: '1px solid #ccc', padding: '4px 2px' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', border: '1px solid #ccc', padding: '4px 4px' }}>{(item.unit_price||0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', border: '1px solid #ccc', padding: '4px 4px' }}>{(item.line_total||0).toFixed(2)}</td>
                      <td style={{ textAlign: 'center', border: '1px solid #ccc', padding: '4px 2px' }}>{taxRate}%</td>
                      <td style={{ textAlign: 'right', border: '1px solid #ccc', padding: '4px 4px' }}>{taxAmt.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', border: '1px solid #ccc', padding: '4px 4px', fontWeight: 700 }}>{totalInc.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', border: '1.5px solid #222', borderTop: 'none', padding: '6px 10px' }}>
              <table style={{ width: '280px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '3px 6px', fontSize: '9px', color: '#444' }}>
                      Total Before VAT
                      <span style={{ display: 'block', fontSize: '8px', color: '#888', direction: 'rtl' }}>المبلغ قبل ضريبة القيمة المضافة</span>
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, fontSize: '9px' }}>{curr} {(invoice.subtotal||0).toFixed(2)}</td>
                  </tr>
                  {(invoice.discount || 0) > 0 && (
                    <tr>
                      <td style={{ padding: '3px 6px', fontSize: '9px', color: '#444' }}>
                        Discount
                        <span style={{ display: 'block', fontSize: '8px', color: '#888', direction: 'rtl' }}>خصم</span>
                      </td>
                      <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, fontSize: '9px', color: '#c00' }}>– {curr} {(invoice.discount||0).toFixed(2)}</td>
                    </tr>
                  )}
                  {(invoice.discount || 0) > 0 && (
                    <tr>
                      <td style={{ padding: '3px 6px', fontSize: '9px', color: '#444' }}>
                        Total After Discount
                        <span style={{ display: 'block', fontSize: '8px', color: '#888', direction: 'rtl' }}>المجموع بعد الخصم</span>
                      </td>
                      <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, fontSize: '9px' }}>{curr} {((invoice.subtotal||0)-(invoice.discount||0)).toFixed(2)}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: '3px 6px', fontSize: '9px', color: '#444' }}>
                      VAT ({taxRate}%)
                      <span style={{ display: 'block', fontSize: '8px', color: '#888', direction: 'rtl' }}>ضريبة القيمة المضافة ({taxRate}%)</span>
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, fontSize: '9px' }}>{curr} {(invoice.tax_amount||0).toFixed(2)}</td>
                  </tr>
                  <tr style={{ background: '#1a1a3e' }}>
                    <td style={{ padding: '5px 6px', fontSize: '10px', fontWeight: 900, color: '#fff' }}>
                      Net Amount Due
                      <span style={{ display: 'block', fontSize: '8px', color: '#ccc', direction: 'rtl' }}>المبلغ الصافي المستحق</span>
                    </td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 900, fontSize: '11px', color: '#fff' }}>{curr} {(invoice.total||0).toFixed(2)}</td>
                  </tr>
                  {invoice.amount_paid > 0 && (
                    <tr>
                      <td style={{ padding: '3px 6px', fontSize: '9px', color: '#16a34a' }}>Amount Paid</td>
                      <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, fontSize: '9px', color: '#16a34a' }}>{curr} {(invoice.amount_paid||0).toFixed(2)}</td>
                    </tr>
                  )}
                  {invoice.balance_due > 0 && (
                    <tr>
                      <td style={{ padding: '3px 6px', fontSize: '9px', color: '#dc2626' }}>Balance Due / الرصيد المستحق</td>
                      <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 900, fontSize: '9px', color: '#dc2626' }}>{curr} {(invoice.balance_due||0).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Amount in words */}
            <div style={{ border: '1.5px solid #222', borderTop: 'none', padding: '5px 10px', fontSize: '9px', background: '#f9f9f9' }}>
              <strong>{curr}. {numToWords(invoice.total || 0)}</strong>
            </div>

            {/* Bank details */}
            {(bankName || bankAccount) && (
              <div style={{ border: '1.5px solid #222', borderTop: 'none', padding: '6px 10px' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', borderBottom: '1px solid #ddd', paddingBottom: '3px', marginBottom: '5px' }}>
                  Payment Bank Details / تفاصيل البنك للدفع
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '6px' }}>
                  {[
                    { label: 'Account Name', val: bankBenef },
                    { label: 'Bank Name', val: bankName },
                    { label: 'Account No', val: bankAccount },
                    { label: 'IBAN', val: bankIban },
                    { label: 'SWIFT Code', val: bankSwift },
                  ].map((b, i) => (
                    <div key={i}>
                      <div style={{ fontSize: '7px', color: '#777' }}>{b.label}</div>
                      <div style={{ fontSize: '8px', fontWeight: 700, color: '#000', wordBreak: 'break-all' }}>{b.val || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div style={{ border: '1.5px solid #222', borderTop: 'none', padding: '5px 10px', fontSize: '9px' }}>
                <strong>Notes:</strong> {invoice.notes}
              </div>
            )}

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1.5px solid #222', borderTop: 'none' }}>
              <div style={{ padding: '24px 10px 8px', borderRight: '1px solid #ccc' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '3px', marginTop: '28px', fontSize: '8px', color: '#555' }}>
                  Customer Stamp &amp; Signature
                </div>
              </div>
              <div style={{ padding: '24px 10px 8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                  For {companyName}
                </div>
                <div style={{ borderTop: '1px solid #333', paddingTop: '3px', marginTop: '28px', fontSize: '8px', color: '#555' }}>
                  Authorized Signature &amp; Stamp
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '8px', color: '#888', padding: '0 2px' }}>
              <span>Date: {new Date().toLocaleDateString()}</span>
              <span>{invoice.terms || 'Payment due within 30 days.'}</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
