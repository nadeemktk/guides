import React, { useEffect, useState } from 'react'
import { Save, Key, Building2, Bell } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { AppSettings } from '../../types'

export default function SettingsPage() {
  const { settings, refreshSettings } = useApp()
  const [form, setForm] = useState<AppSettings>(settings)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'company' | 'system' | 'ai'>('company')

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const handleSave = async () => {
    await window.api.saveSettings(form as Record<string, string>)
    await refreshSettings()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const f = (key: keyof AppSettings) => (
    <input
      className="input"
      value={form[key] || ''}
      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
    />
  )

  const tabs = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'system',  label: 'System',  icon: Bell },
    { id: 'ai',      label: 'AI / API', icon: Key }
  ] as const

  return (
    <div className="max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <button onClick={handleSave} className="btn-primary">
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-slate-900 rounded-xl w-fit">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="card p-6 space-y-4">
        {tab === 'company' && (
          <>
            <h3 className="section-title">Company Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="form-group">
                <label className="label">Company Name</label>
                {f('company_name')}
              </div>
              <div className="form-group">
                <label className="label">Address</label>
                {f('company_address')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Phone</label>
                  {f('company_phone')}
                </div>
                <div className="form-group">
                  <label className="label">Email</label>
                  {f('company_email')}
                </div>
              </div>
              <div className="form-group">
                <label className="label">Tax Registration Number (TRN)</label>
                {f('company_trn')}
              </div>
            </div>
          </>
        )}

        {tab === 'system' && (
          <>
            <h3 className="section-title">System Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Currency</label>
                <select className="select" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                  <option value="AED">AED – UAE Dirham</option>
                  <option value="USD">USD – US Dollar</option>
                  <option value="SAR">SAR – Saudi Riyal</option>
                  <option value="EUR">EUR – Euro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Default Tax Rate (%)</label>
                {f('tax_rate')}
              </div>
              <div className="form-group">
                <label className="label">Invoice Prefix</label>
                {f('invoice_prefix')}
              </div>
              <div className="form-group">
                <label className="label">Invoice Start Number</label>
                {f('invoice_counter')}
              </div>
            </div>
          </>
        )}

        {tab === 'ai' && (
          <>
            <h3 className="section-title">AI Configuration</h3>
            <div className="p-3 bg-blue-900/20 border border-blue-700/40 rounded-xl text-sm text-blue-300 mb-4">
              The CST CHAT INTELLIGENT feature requires an Anthropic API key. Get one at console.anthropic.com
            </div>
            <div className="form-group">
              <label className="label">Anthropic API Key</label>
              <input
                className="input font-mono text-xs"
                type="password"
                placeholder="sk-ant-..."
                value={form.anthropic_key || ''}
                onChange={e => setForm(p => ({ ...p, anthropic_key: e.target.value }))}
              />
            </div>
            <p className="text-xs text-slate-500">Your API key is stored locally and never transmitted to any third party other than Anthropic's API.</p>
          </>
        )}
      </div>
    </div>
  )
}
