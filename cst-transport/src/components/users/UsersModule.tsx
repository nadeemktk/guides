import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Shield, UserCheck, UserX } from 'lucide-react'
import type { User, Permissions } from '../../types'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import { useAuth } from '../../contexts/AuthContext'

const PERMISSION_GROUPS = [
  { key: 'dashboard', label: 'Dashboard', actions: ['view', 'edit'] },
  { key: 'invoices',  label: 'Invoices',  actions: ['create', 'edit', 'delete', 'print'] },
  { key: 'soa',       label: 'Statement of Account', actions: ['view', 'update'] },
  { key: 'trips',     label: 'Daily Trips', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'vehicles',  label: 'Vehicles',   actions: ['view', 'add', 'edit'] },
  { key: 'drivers',   label: 'Drivers',    actions: ['view', 'add', 'edit'] },
  { key: 'expenses',  label: 'Expenses',   actions: ['manage'] },
  { key: 'salary',    label: 'Salaries',   actions: ['view', 'edit'] },
  { key: 'reports',   label: 'Reports',    actions: ['view', 'export'] },
  { key: 'reminders', label: 'Reminders',  actions: ['configure'] },
  { key: 'users',     label: 'Users',      actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'ai',        label: 'AI Chat',    actions: ['access'] }
]

export default function UsersModule() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const us = await window.api.listUsers()
    setUsers(us as User[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (form: any) => {
    if (editing) {
      await window.api.updateUser({ id: editing.id, ...form })
    } else {
      await window.api.createUser({ ...form, created_by: currentUser?.id })
    }
    setShowForm(false)
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await window.api.deleteUser(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  const handleToggleActive = async (u: User) => {
    await window.api.updateUser({ id: u.id, is_active: !u.is_active })
    load()
  }

  const ROLE_STYLE: Record<string, string> = {
    admin: 'badge bg-red-500/20 text-red-400',
    editor: 'badge bg-blue-500/20 text-blue-400',
    visitor: 'badge bg-slate-500/20 text-slate-400'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users & Access Control</h1>
          <p className="text-slate-500 text-sm">Manage user accounts and granular permissions</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : users.map(u => (
          <div key={u.id} className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center font-bold text-blue-400 flex-shrink-0">
              {u.full_name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-100">{u.full_name}</span>
                <span className="font-mono text-xs text-slate-500">@{u.username}</span>
                <span className={ROLE_STYLE[u.role] || 'badge badge-draft'}>{u.role}</span>
                {!u.is_active && <span className="badge bg-slate-700 text-slate-400">Inactive</span>}
                {u.id === currentUser?.id && <span className="badge bg-green-500/20 text-green-400">You</span>}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{u.email}</div>
            </div>
            <div className="text-xs text-slate-600">{new Date(u.created_at).toLocaleDateString()}</div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleToggleActive(u)} className={`btn-icon ${u.is_active ? 'text-emerald-400' : 'text-slate-500'}`} title={u.is_active ? 'Deactivate' : 'Activate'}>
                {u.is_active ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
              </button>
              <button onClick={() => { setEditing(u); setShowForm(true) }} className="btn-icon">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              {u.username !== 'admin' && u.id !== currentUser?.id && (
                <button onClick={() => setDeleteTarget(u)} className="btn-icon text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <UserFormModal
          user={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete User"
          message={`Delete user ${deleteTarget.full_name}? This cannot be undone.`}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function UserFormModal({ user, onClose, onSave }: { user: User | null; onClose: () => void; onSave: (f: any) => void }) {
  const [form, setForm] = useState({
    username:  user?.username  || '',
    full_name: user?.full_name || '',
    email:     user?.email     || '',
    role:      user?.role      || 'editor',
    password:  '',
    is_active: user?.is_active !== false
  })
  const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>(
    (typeof user?.permissions === 'object' ? user.permissions : {}) as Record<string, Record<string, boolean>>
  )

  const togglePerm = (module: string, action: string) => {
    setPerms(p => ({
      ...p,
      [module]: { ...p[module], [action]: !p[module]?.[action] }
    }))
  }

  const setRoleDefaults = (role: string) => {
    setForm(p => ({ ...p, role }))
    if (role === 'admin') {
      const all: Record<string, Record<string, boolean>> = {}
      PERMISSION_GROUPS.forEach(g => {
        all[g.key] = {}
        g.actions.forEach(a => { all[g.key][a] = true })
      })
      setPerms(all)
    } else if (role === 'visitor') {
      const view: Record<string, Record<string, boolean>> = {}
      PERMISSION_GROUPS.forEach(g => {
        view[g.key] = {}
        g.actions.forEach(a => { view[g.key][a] = a === 'view' })
      })
      setPerms(view)
    }
  }

  const handleSave = () => {
    onSave({ ...form, permissions: perms })
  }

  return (
    <Modal
      title={user ? `Edit User – ${user.username}` : 'Add New User'}
      onClose={onClose}
      size="xl"
      footer={<>
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} className="btn-primary">{user ? 'Update User' : 'Create User'}</button>
      </>}
    >
      <div className="space-y-5">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Full Name *</label>
            <input className="input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Username *</label>
            <input className="input" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} disabled={!!user} />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Password {user ? '(leave blank to keep)' : '*'}</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={user ? '••••••••' : ''} />
          </div>
          <div className="form-group">
            <label className="label">Role</label>
            <select className="select" value={form.role} onChange={e => setRoleDefaults(e.target.value)}>
              {['admin','editor','visitor'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Status</label>
            <select className="select" value={form.is_active ? '1' : '0'} onChange={e => setForm(p => ({ ...p, is_active: e.target.value === '1' }))}>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
        </div>

        {/* Permissions */}
        {form.role !== 'admin' && (
          <div>
            <div className="section-title">Granular Permissions</div>
            <div className="grid grid-cols-2 gap-3">
              {PERMISSION_GROUPS.map(group => (
                <div key={group.key} className="bg-slate-900 rounded-xl p-3">
                  <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> {group.label}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.actions.map(action => (
                      <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 accent-blue-500"
                          checked={!!(perms[group.key]?.[action])}
                          onChange={() => togglePerm(group.key, action)}
                        />
                        <span className="text-xs text-slate-400 capitalize">{action}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
