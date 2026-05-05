import React, { useEffect, useState } from 'react'
import { Activity, User, FileText, Car, Users, DollarSign } from 'lucide-react'

interface LogEntry {
  id: string
  user_id: string
  username: string
  action: string
  entity_type: string
  entity_id: string
  details: string
  created_at: string
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.listActivity(200).then(data => {
      setLogs(data as LogEntry[])
      setLoading(false)
    })
  }, [])

  const getIcon = (entity: string) => {
    switch (entity) {
      case 'invoice': return <FileText className="w-3.5 h-3.5" />
      case 'trip':    return <Car className="w-3.5 h-3.5" />
      case 'driver':  return <Users className="w-3.5 h-3.5" />
      case 'salary':  return <DollarSign className="w-3.5 h-3.5" />
      case 'auth':    return <User className="w-3.5 h-3.5" />
      default:        return <Activity className="w-3.5 h-3.5" />
    }
  }

  const getColor = (action: string) => {
    if (action === 'CREATE')  return 'text-emerald-400 bg-emerald-400/10'
    if (action === 'UPDATE')  return 'text-blue-400 bg-blue-400/10'
    if (action === 'DELETE')  return 'text-red-400 bg-red-400/10'
    if (action === 'LOGIN')   return 'text-purple-400 bg-purple-400/10'
    if (action === 'LOGOUT')  return 'text-slate-400 bg-slate-400/10'
    return 'text-slate-400 bg-slate-400/10'
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Activity Log</h1>
        <div className="text-slate-500 text-sm">{logs.length} entries</div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading activity log...</div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-700/20 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${getColor(log.action)}`}>
                  {getIcon(log.entity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${getColor(log.action)}`}>{log.action}</span>
                    <span className="text-sm text-slate-300 capitalize">{log.entity_type}</span>
                    {log.details && <span className="text-sm text-slate-400">– {log.details}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-medium text-slate-400">{log.username || 'System'}</div>
                  <div className="text-[10px] text-slate-600">{new Date(log.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="p-8 text-center text-slate-500">No activity logged yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
