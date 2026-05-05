import React, { useEffect, useState } from 'react'
import { Bell, Play, Settings, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { ReminderConfig } from '../../types'

export default function RemindersModule() {
  const [config, setConfig] = useState<ReminderConfig | null>(null)
  const [reminders, setReminders] = useState<any[]>([])
  const [saved, setSaved] = useState(false)
  const [running, setRunning] = useState(false)
  const [tab, setTab] = useState<'log' | 'config'>('log')

  useEffect(() => {
    Promise.all([
      window.api.getReminderConfig(),
      window.api.listReminders()
    ]).then(([cfg, rems]) => {
      setConfig(cfg as ReminderConfig)
      setReminders(rems as any[])
    })
  }, [])

  const handleSave = async () => {
    if (!config) return
    await window.api.saveReminderConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleRunNow = async () => {
    setRunning(true)
    await window.api.runRemindersNow()
    const rems = await window.api.listReminders()
    setReminders(rems as any[])
    setRunning(false)
  }

  if (!config) return <div className="flex items-center justify-center h-40 text-slate-500">Loading...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Reminders</h1>
          <p className="text-slate-500 text-sm">Auto-reminder system for unpaid trips</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRunNow} disabled={running} className="btn-secondary">
            {running ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
            Run Reminders Now
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl w-fit mb-5">
        {[{ id: 'log', label: 'Reminder Log' }, { id: 'config', label: 'Configuration' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Sent At</th>
                <th>Client</th>
                <th>Outstanding</th>
                <th>Overdue Days</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reminders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500">No reminders sent yet</td></tr>
              ) : reminders.map(r => (
                <tr key={r.id}>
                  <td className="text-slate-400 whitespace-nowrap text-xs">{new Date(r.sent_at).toLocaleString()}</td>
                  <td className="font-medium text-slate-200">{r.client_name}</td>
                  <td className="text-red-400 font-semibold">AED {(r.outstanding || 0).toLocaleString()}</td>
                  <td className="text-amber-400">{r.overdue_days} days</td>
                  <td><span className="badge badge-sent capitalize">{r.reminder_type}</span></td>
                  <td>
                    {r.status === 'sent' ? (
                      <span className="badge badge-paid"><CheckCircle className="w-3 h-3 mr-1 inline" />Sent</span>
                    ) : r.status === 'failed' ? (
                      <span className="badge badge-unpaid"><XCircle className="w-3 h-3 mr-1 inline" />Failed</span>
                    ) : (
                      <span className="badge badge-partial">Acknowledged</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'config' && (
        <div className="max-w-2xl space-y-5">
          <div className="card p-5">
            <h3 className="section-title">General Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Enable Auto Reminders</p>
                  <p className="text-xs text-slate-500">Automatically send reminders to clients with unpaid trips</p>
                </div>
                <button
                  onClick={() => setConfig(p => p ? { ...p, enabled: !p.enabled } : p)}
                  className={`w-12 h-6 rounded-full transition-colors ${config.enabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${config.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Frequency</label>
                  <select className="select" value={config.frequency} onChange={e => setConfig(p => p ? { ...p, frequency: e.target.value as any } : p)}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom (days)</option>
                  </select>
                </div>
                {config.frequency === 'custom' && (
                  <div className="form-group">
                    <label className="label">Custom Days Interval</label>
                    <input className="input" type="number" value={config.custom_days} onChange={e => setConfig(p => p ? { ...p, custom_days: parseInt(e.target.value) } : p)} />
                  </div>
                )}
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-blue-500" checked={config.send_inapp} onChange={e => setConfig(p => p ? { ...p, send_inapp: e.target.checked } : p)} />
                  <span className="text-sm text-slate-300">In-App Notifications</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-blue-500" checked={config.send_email} onChange={e => setConfig(p => p ? { ...p, send_email: e.target.checked } : p)} />
                  <span className="text-sm text-slate-300">Email Reminders</span>
                </label>
              </div>
            </div>
          </div>

          {config.send_email && (
            <div className="card p-5">
              <h3 className="section-title">Email Configuration</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="label">Send To</label>
                    <input className="input" type="email" value={config.email_to} onChange={e => setConfig(p => p ? { ...p, email_to: e.target.value } : p)} />
                  </div>
                  <div className="form-group">
                    <label className="label">From Email</label>
                    <input className="input" type="email" value={config.email_from} onChange={e => setConfig(p => p ? { ...p, email_from: e.target.value } : p)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="form-group col-span-2">
                    <label className="label">SMTP Host</label>
                    <input className="input" value={config.smtp_host} onChange={e => setConfig(p => p ? { ...p, smtp_host: e.target.value } : p)} placeholder="smtp.gmail.com" />
                  </div>
                  <div className="form-group">
                    <label className="label">SMTP Port</label>
                    <input className="input" type="number" value={config.smtp_port} onChange={e => setConfig(p => p ? { ...p, smtp_port: parseInt(e.target.value) } : p)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="label">SMTP Username</label>
                    <input className="input" value={config.smtp_user} onChange={e => setConfig(p => p ? { ...p, smtp_user: e.target.value } : p)} />
                  </div>
                  <div className="form-group">
                    <label className="label">SMTP Password</label>
                    <input className="input" type="password" value={config.smtp_pass} onChange={e => setConfig(p => p ? { ...p, smtp_pass: e.target.value } : p)} />
                  </div>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl text-xs text-slate-400">
                  <strong>Gmail tip:</strong> Use smtp.gmail.com, port 587, and an App Password (not your regular password).
                </div>
              </div>
            </div>
          )}

          <button onClick={handleSave} className="btn-primary">
            <Settings className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>
      )}
    </div>
  )
}
