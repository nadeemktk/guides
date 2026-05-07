import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import { getDatabase, closeDatabase, all, get, run, transaction } from './database/db'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import nodemailer from 'nodemailer'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'

// ─── Window Setup ──────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null
const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.maximize()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    closeDatabase()
  })
}

app.whenReady().then(() => {
  getDatabase() // Initialize DB
  ensureAdminUser()
  createWindow()
  setupReminderScheduler()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── Ensure Default Admin User ──────────────────────────────────────────────

function ensureAdminUser() {
  const existing = get('SELECT id FROM users WHERE username = ?', ['admin'])
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10)
    const defaultPerms = JSON.stringify({
      dashboard: { view: true, edit: true },
      invoices: { create: true, edit: true, delete: true, print: true },
      soa: { view: true, update: true },
      trips: { create: true, edit: true, delete: true, view: true },
      vehicles: { add: true, edit: true, view: true },
      drivers: { add: true, edit: true, view: true },
      expenses: { manage: true },
      salary: { view: true, edit: true },
      reports: { view: true, export: true },
      reminders: { configure: true },
      users: { create: true, edit: true, delete: true, view: true },
      ai: { access: true }
    })
    run(
      `INSERT INTO users(id,username,full_name,email,password,role,permissions) VALUES(?,?,?,?,?,?,?)`,
      [uuidv4(), 'admin', 'System Administrator', 'citystar815@gmail.com', hash, 'admin', defaultPerms]
    )
  }
}

// ─── Reminder Scheduler ────────────────────────────────────────────────────

function setupReminderScheduler() {
  // Check every hour for due reminders
  setInterval(checkAndSendReminders, 60 * 60 * 1000)
  // Also run at startup
  setTimeout(checkAndSendReminders, 5000)
}

async function checkAndSendReminders() {
  try {
    const config = get<any>('SELECT * FROM reminder_config WHERE id = ?', ['singleton'])
    if (!config || !config.enabled) return

    const now = new Date()
    const lastRun = config.last_run ? new Date(config.last_run) : null
    const intervalDays = config.frequency === 'weekly' ? 7 : config.frequency === 'monthly' ? 30 : (config.custom_days || 7)

    if (lastRun) {
      const diffDays = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays < intervalDays) return
    }

    const unpaidTrips = all<any>(
      `SELECT t.*, c.email as client_email FROM trips t
       LEFT JOIN clients c ON c.id = t.client_id
       WHERE t.payment_status = 'unpaid'
       AND date(t.trip_date) <= date('now', '-7 days')`
    )

    for (const trip of unpaidTrips) {
      const overdueDays = Math.floor((now.getTime() - new Date(trip.trip_date).getTime()) / (1000 * 60 * 60 * 24))
      const reminderMsg = buildReminderMessage(trip, overdueDays)

      // In-app notification
      if (config.send_inapp) {
        run(
          `INSERT INTO notifications(id,title,message,type,entity_type,entity_id) VALUES(?,?,?,?,?,?)`,
          [uuidv4(), `Payment Overdue – ${trip.client_name}`, reminderMsg, 'warning', 'trip', trip.id]
        )
      }

      // Email reminder
      if (config.send_email && config.smtp_host) {
        await sendReminderEmail(config, trip, reminderMsg, overdueDays)
      }

      // Log reminder
      run(
        `INSERT INTO payment_reminders(id,trip_id,client_name,client_email,outstanding,overdue_days,reminder_type,status,message)
         VALUES(?,?,?,?,?,?,?,?,?)`,
        [uuidv4(), trip.id, trip.client_name, trip.client_email || config.email_to,
         trip.payment_amount, overdueDays, 'both', 'sent', reminderMsg]
      )
      run(`UPDATE trips SET reminder_sent = reminder_sent + 1, last_reminder = datetime('now') WHERE id = ?`, [trip.id])
    }

    run(`UPDATE reminder_config SET last_run = datetime('now'), updated_at = datetime('now') WHERE id = 'singleton'`)
  } catch (err) {
    console.error('Reminder scheduler error:', err)
  }
}

function buildReminderMessage(trip: any, overdueDays: number): string {
  return `Dear ${trip.client_name},\n\nThis is a reminder that payment of AED ${trip.payment_amount.toFixed(2)} for the following trip is overdue by ${overdueDays} days:\n\nJob: ${trip.job_description}\nDate: ${trip.trip_date}\nVehicle: ${trip.vehicle_type || 'N/A'}\nDriver: ${trip.driver_name || 'N/A'}\n\nPlease arrange payment at your earliest convenience.\n\nRegards,\nCity Star Transport Passengers LLC`
}

async function sendReminderEmail(config: any, trip: any, message: string, overdueDays: number) {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465,
      auth: { user: config.smtp_user, pass: config.smtp_pass }
    })
    await transporter.sendMail({
      from: config.email_from || config.smtp_user,
      to: config.email_to,
      subject: `Payment Reminder – ${trip.client_name} – AED ${trip.payment_amount.toFixed(2)} Overdue (${overdueDays} days)`,
      text: message,
      html: `<pre style="font-family:sans-serif">${message}</pre>`
    })
  } catch (err) {
    console.error('Email send error:', err)
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// AUTH
ipcMain.handle('auth:login', async (_e, { username, password }) => {
  const user = get<any>('SELECT * FROM users WHERE username = ? AND is_active = 1', [username])
  if (!user) return { success: false, error: 'User not found' }
  const valid = bcrypt.compareSync(password, user.password)
  if (!valid) return { success: false, error: 'Invalid password' }
  run(`INSERT INTO activity_log(id,user_id,username,action,entity_type) VALUES(?,?,?,?,?)`,
    [uuidv4(), user.id, user.username, 'LOGIN', 'auth'])
  const { password: _pw, ...safeUser } = user
  return { success: true, user: { ...safeUser, permissions: JSON.parse(safeUser.permissions || '{}') } }
})

ipcMain.handle('auth:logout', async (_, userId) => {
  run(`INSERT INTO activity_log(id,user_id,action,entity_type) VALUES(?,?,?,?)`,
    [uuidv4(), userId, 'LOGOUT', 'auth'])
  return { success: true }
})

// USERS
ipcMain.handle('users:list', async () => all('SELECT id,username,full_name,email,role,is_active,permissions,created_at FROM users ORDER BY created_at DESC'))
ipcMain.handle('users:create', async (_, data) => {
  const hash = bcrypt.hashSync(data.password, 10)
  const id = uuidv4()
  run(`INSERT INTO users(id,username,full_name,email,password,role,permissions) VALUES(?,?,?,?,?,?,?)`,
    [id, data.username, data.full_name, data.email || '', hash, data.role, JSON.stringify(data.permissions || {})])
  logActivity(data.created_by, 'CREATE', 'user', id, data.username)
  return { success: true, id }
})
ipcMain.handle('users:update', async (_, { id, ...data }) => {
  const fields: string[] = []
  const vals: unknown[] = []
  if (data.full_name)   { fields.push('full_name=?');   vals.push(data.full_name) }
  if (data.email)       { fields.push('email=?');        vals.push(data.email) }
  if (data.role)        { fields.push('role=?');         vals.push(data.role) }
  if (data.permissions) { fields.push('permissions=?');  vals.push(JSON.stringify(data.permissions)) }
  if (data.is_active !== undefined) { fields.push('is_active=?'); vals.push(data.is_active ? 1 : 0) }
  if (data.password) { fields.push('password=?'); vals.push(bcrypt.hashSync(data.password, 10)) }
  fields.push('updated_at=datetime(\'now\')')
  vals.push(id)
  run(`UPDATE users SET ${fields.join(',')} WHERE id=?`, vals)
  return { success: true }
})
ipcMain.handle('users:delete', async (_, id) => {
  run('DELETE FROM users WHERE id=? AND username != \'admin\'', [id])
  return { success: true }
})

// COMPANIES
ipcMain.handle('companies:list', async () => all('SELECT * FROM companies ORDER BY is_default DESC, name'))
ipcMain.handle('companies:get', async (_, id) => get('SELECT * FROM companies WHERE id=?', [id]))
ipcMain.handle('companies:create', async (_, data) => {
  const id = uuidv4()
  if (data.is_default) run(`UPDATE companies SET is_default=0`)
  // invoice_counter stores the last-used number; first invoice = counter + 1
  const startAt = Math.max(0, parseInt(data.invoice_start || '1000') - 1)
  run(`INSERT INTO companies(id,name,trn,po_box,address,phone,email,bank_name,bank_account,bank_iban,bank_swift,logo_path,is_default,invoice_prefix,invoice_counter)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.name, data.trn||'', data.po_box||'', data.address||'', data.phone||'', data.email||'',
     data.bank_name||'', data.bank_account||'', data.bank_iban||'', data.bank_swift||'', data.logo_path||'',
     data.is_default?1:0, data.invoice_prefix||'INV-', startAt])
  return { success: true, id }
})
ipcMain.handle('companies:update', async (_, { id, ...data }) => {
  if (data.is_default) run(`UPDATE companies SET is_default=0`)
  // Only update invoice_counter if explicitly provided (prevents accidental resets)
  if (data.invoice_counter !== undefined && data.invoice_counter !== null) {
    run(`UPDATE companies SET name=?,trn=?,po_box=?,address=?,phone=?,email=?,bank_name=?,bank_account=?,bank_iban=?,bank_swift=?,logo_path=?,is_default=?,invoice_prefix=?,invoice_counter=?,updated_at=datetime('now') WHERE id=?`,
      [data.name, data.trn||'', data.po_box||'', data.address||'', data.phone||'', data.email||'',
       data.bank_name||'', data.bank_account||'', data.bank_iban||'', data.bank_swift||'', data.logo_path||'',
       data.is_default?1:0, data.invoice_prefix||'INV-', parseInt(data.invoice_counter)||0, id])
  } else {
    run(`UPDATE companies SET name=?,trn=?,po_box=?,address=?,phone=?,email=?,bank_name=?,bank_account=?,bank_iban=?,bank_swift=?,logo_path=?,is_default=?,invoice_prefix=?,updated_at=datetime('now') WHERE id=?`,
      [data.name, data.trn||'', data.po_box||'', data.address||'', data.phone||'', data.email||'',
       data.bank_name||'', data.bank_account||'', data.bank_iban||'', data.bank_swift||'', data.logo_path||'',
       data.is_default?1:0, data.invoice_prefix||'INV-', id])
  }
  return { success: true }
})
ipcMain.handle('companies:delete', async (_, id) => {
  run('DELETE FROM companies WHERE id=?', [id])
  return { success: true }
})

// CLIENTS
ipcMain.handle('clients:list', async (_, filters: any = {}) => {
  let sql = 'SELECT * FROM clients WHERE 1=1'
  const params: unknown[] = []
  if (filters.client_type) { sql += ' AND client_type=?'; params.push(filters.client_type) }
  sql += ' ORDER BY company_name'
  return all(sql, params)
})
ipcMain.handle('clients:get', async (_, id) => get('SELECT * FROM clients WHERE id=?', [id]))
ipcMain.handle('clients:create', async (_, data) => {
  const id = uuidv4()
  run(`INSERT INTO clients(id,customer_code,company_name,contact_name,mobile,email,address,tax_number,credit_limit,notes,client_type)
       VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.customer_code||'', data.company_name, data.contact_name||'', data.mobile||'', data.email||'', data.address||'', data.tax_number||'', data.credit_limit||0, data.notes||'', data.client_type||'monthly'])
  return { success: true, id }
})
ipcMain.handle('clients:update', async (_, { id, ...data }) => {
  run(`UPDATE clients SET customer_code=?,company_name=?,contact_name=?,mobile=?,email=?,address=?,tax_number=?,credit_limit=?,notes=?,client_type=?,updated_at=datetime('now') WHERE id=?`,
    [data.customer_code||'', data.company_name, data.contact_name||'', data.mobile||'', data.email||'', data.address||'', data.tax_number||'', data.credit_limit||0, data.notes||'', data.client_type||'monthly', id])
  return { success: true }
})
ipcMain.handle('clients:delete', async (_, id) => {
  run('DELETE FROM clients WHERE id=?', [id])
  return { success: true }
})

// VEHICLES
ipcMain.handle('vehicles:list', async () => all('SELECT * FROM vehicles ORDER BY plate_number'))
ipcMain.handle('vehicles:get', async (_, id) => get('SELECT * FROM vehicles WHERE id=?', [id]))
ipcMain.handle('vehicles:create', async (_, data) => {
  const id = uuidv4()
  run(`INSERT INTO vehicles(id,plate_number,vehicle_type,make,model,year,seats,owner_name,owner_mobile,color,status,insurance_expiry,mulkiya_expiry,notes)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.plate_number, data.vehicle_type, data.make||'', data.model||'', data.year||null, data.seats||0,
     data.owner_name, data.owner_mobile||'', data.color||'', data.status||'available',
     data.insurance_expiry||null, data.mulkiya_expiry||null, data.notes||''])
  return { success: true, id }
})
ipcMain.handle('vehicles:update', async (_, { id, ...data }) => {
  run(`UPDATE vehicles SET plate_number=?,vehicle_type=?,make=?,model=?,year=?,seats=?,owner_name=?,owner_mobile=?,color=?,status=?,insurance_expiry=?,mulkiya_expiry=?,notes=?,updated_at=datetime('now') WHERE id=?`,
    [data.plate_number, data.vehicle_type, data.make||'', data.model||'', data.year||null, data.seats||0,
     data.owner_name, data.owner_mobile||'', data.color||'', data.status||'available',
     data.insurance_expiry||null, data.mulkiya_expiry||null, data.notes||'', id])
  return { success: true }
})
ipcMain.handle('vehicles:delete', async (_, id) => {
  run('DELETE FROM vehicles WHERE id=?', [id])
  return { success: true }
})

// DRIVERS
ipcMain.handle('drivers:list', async () => all('SELECT * FROM drivers ORDER BY full_name'))
ipcMain.handle('drivers:get', async (_, id) => get('SELECT * FROM drivers WHERE id=?', [id]))
ipcMain.handle('drivers:create', async (_, data) => {
  const id = uuidv4()
  run(`INSERT INTO drivers(id,full_name,mobile,license_number,license_expiry,nationality,id_number,id_expiry,base_salary,joining_date,status,notes)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.full_name, data.mobile, data.license_number||'', data.license_expiry||null,
     data.nationality||'', data.id_number||'', data.id_expiry||null, data.base_salary||0,
     data.joining_date||null, data.status||'active', data.notes||''])
  return { success: true, id }
})
ipcMain.handle('drivers:update', async (_, { id, ...data }) => {
  run(`UPDATE drivers SET full_name=?,mobile=?,license_number=?,license_expiry=?,nationality=?,id_number=?,id_expiry=?,base_salary=?,joining_date=?,status=?,notes=?,updated_at=datetime('now') WHERE id=?`,
    [data.full_name, data.mobile, data.license_number||'', data.license_expiry||null,
     data.nationality||'', data.id_number||'', data.id_expiry||null, data.base_salary||0,
     data.joining_date||null, data.status||'active', data.notes||'', id])
  return { success: true }
})
ipcMain.handle('drivers:delete', async (_, id) => {
  run('DELETE FROM drivers WHERE id=?', [id])
  return { success: true }
})

// TRIPS
ipcMain.handle('trips:list', async (_, filters: any = {}) => {
  let sql = `SELECT t.*, v.plate_number, v.vehicle_type as v_type FROM trips t
             LEFT JOIN vehicles v ON v.id = t.vehicle_id WHERE 1=1`
  const params: unknown[] = []
  if (filters.start_date) { sql += ' AND t.trip_date >= ?'; params.push(filters.start_date) }
  if (filters.end_date)   { sql += ' AND t.trip_date <= ?'; params.push(filters.end_date) }
  if (filters.client_id)  { sql += ' AND t.client_id = ?'; params.push(filters.client_id) }
  if (filters.driver_id)  { sql += ' AND t.driver_id = ?'; params.push(filters.driver_id) }
  if (filters.vehicle_id) { sql += ' AND t.vehicle_id = ?'; params.push(filters.vehicle_id) }
  if (filters.payment_status) { sql += ' AND t.payment_status = ?'; params.push(filters.payment_status) }
  sql += ' ORDER BY t.trip_date DESC, t.created_at DESC'
  return all(sql, params)
})
ipcMain.handle('trips:get', async (_, id) => get('SELECT * FROM trips WHERE id=?', [id]))
ipcMain.handle('trips:create', async (_, data) => {
  const id = uuidv4()
  run(`INSERT INTO trips(id,trip_date,vehicle_id,driver_id,client_id,client_name,client_mobile,job_description,
       pickup_location,dropoff_location,trip_type,start_time,end_time,vehicle_type,seats,driver_name,driver_mobile,
       owner_name,payment_amount,payment_status,payment_method,partial_amount,received_by,booked_by,created_by,remarks)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.trip_date, data.vehicle_id||null, data.driver_id||null, data.client_id||null,
     data.client_name, data.client_mobile||'', data.job_description,
     data.pickup_location||'', data.dropoff_location||'', data.trip_type||'one_way',
     data.start_time||'', data.end_time||'', data.vehicle_type||'', data.seats||0,
     data.driver_name||'', data.driver_mobile||'', data.owner_name||'',
     data.payment_amount||0, data.payment_status||'unpaid', data.payment_method||'cash',
     data.partial_amount||0, data.received_by||'', data.booked_by||'', data.created_by||null, data.remarks||''])
  logActivity(data.created_by, 'CREATE', 'trip', id, data.client_name)
  return { success: true, id }
})
ipcMain.handle('trips:update', async (_, { id, ...data }) => {
  run(`UPDATE trips SET trip_date=?,vehicle_id=?,driver_id=?,client_id=?,client_name=?,client_mobile=?,
       job_description=?,pickup_location=?,dropoff_location=?,trip_type=?,start_time=?,end_time=?,
       vehicle_type=?,seats=?,driver_name=?,driver_mobile=?,owner_name=?,payment_amount=?,
       payment_status=?,payment_method=?,partial_amount=?,received_by=?,booked_by=?,remarks=?,
       updated_at=datetime('now') WHERE id=?`,
    [data.trip_date, data.vehicle_id||null, data.driver_id||null, data.client_id||null,
     data.client_name, data.client_mobile||'', data.job_description,
     data.pickup_location||'', data.dropoff_location||'', data.trip_type||'one_way',
     data.start_time||'', data.end_time||'', data.vehicle_type||'', data.seats||0,
     data.driver_name||'', data.driver_mobile||'', data.owner_name||'',
     data.payment_amount||0, data.payment_status||'unpaid', data.payment_method||'cash',
     data.partial_amount||0, data.received_by||'', data.booked_by||'', data.remarks||'', id])
  return { success: true }
})
ipcMain.handle('trips:delete', async (_, id) => {
  run('DELETE FROM trips WHERE id=?', [id])
  return { success: true }
})
ipcMain.handle('trips:toggle_payment', async (_, { id, status, method, received_by }) => {
  run(`UPDATE trips SET payment_status=?,payment_method=?,received_by=?,updated_at=datetime('now') WHERE id=?`,
    [status, method||'cash', received_by||'', id])
  return { success: true }
})
ipcMain.handle('trips:stats', async () => {
  return {
    today:    get(`SELECT COUNT(*) as cnt, COALESCE(SUM(payment_amount),0) as total FROM trips WHERE date(trip_date)=date('now')`) ,
    month:    get(`SELECT COUNT(*) as cnt, COALESCE(SUM(payment_amount),0) as total FROM trips WHERE strftime('%Y-%m',trip_date)=strftime('%Y-%m','now')`),
    unpaid:   get(`SELECT COUNT(*) as cnt, COALESCE(SUM(payment_amount),0) as total FROM trips WHERE payment_status='unpaid'`),
    revenue:  all(`SELECT strftime('%Y-%m',trip_date) as month, COALESCE(SUM(payment_amount),0) as total FROM trips WHERE payment_status='paid' GROUP BY month ORDER BY month DESC LIMIT 12`)
  }
})

// INVOICES
ipcMain.handle('invoices:list', async (_, filters: any = {}) => {
  // Auto-mark overdue: any sent/partial invoice past its due date
  run(`UPDATE invoices SET status='overdue', updated_at=datetime('now')
       WHERE status IN ('sent','partial') AND due_date IS NOT NULL AND due_date < date('now')`)

  let sql = 'SELECT * FROM invoices WHERE 1=1'
  const params: unknown[] = []
  if (filters.client_id)  { sql += ' AND client_id=?';     params.push(filters.client_id) }
  if (filters.company_id) { sql += ' AND company_id=?';    params.push(filters.company_id) }
  if (filters.status)     { sql += ' AND status=?';        params.push(filters.status) }
  if (filters.start_date) { sql += ' AND invoice_date>=?'; params.push(filters.start_date) }
  if (filters.end_date)   { sql += ' AND invoice_date<=?'; params.push(filters.end_date) }
  sql += ' ORDER BY created_at DESC'
  return all(sql, params)
})
ipcMain.handle('invoices:get', async (_, id) => {
  const inv = get<any>('SELECT i.*, c.name as company_name, c.trn as company_trn, c.address as company_address, c.phone as company_phone, c.email as company_email, c.bank_name, c.bank_account, c.bank_iban, c.bank_swift FROM invoices i LEFT JOIN companies c ON c.id=i.company_id WHERE i.id=?', [id])
  if (!inv) return null
  inv.items = all('SELECT * FROM invoice_items WHERE invoice_id=? ORDER BY sort_order', [id])
  return inv
})
ipcMain.handle('invoices:create', async (_, data) => {
  return transaction(() => {
    const id = uuidv4()

    // Determine invoice number: per-company sequence takes priority over global settings
    let invNumber: string
    if (data.company_id) {
      const co = get<any>('SELECT invoice_prefix, invoice_counter FROM companies WHERE id=?', [data.company_id])
      if (co) {
        const counter = (co.invoice_counter || 0) + 1
        invNumber = `${co.invoice_prefix || 'INV-'}${counter}`
        run('UPDATE companies SET invoice_counter=?, updated_at=datetime(\'now\') WHERE id=?', [counter, data.company_id])
      } else {
        // Fallback to global
        const setting = get<any>('SELECT value FROM app_settings WHERE key=?', ['invoice_counter'])
        const counter = parseInt(setting?.value || '1000') + 1
        const prefix = (get<any>('SELECT value FROM app_settings WHERE key=?', ['invoice_prefix']))?.value || 'INV-'
        invNumber = `${prefix}${counter}`
        run('UPDATE app_settings SET value=? WHERE key=?', [String(counter), 'invoice_counter'])
      }
    } else {
      // No company selected — use global settings
      const setting = get<any>('SELECT value FROM app_settings WHERE key=?', ['invoice_counter'])
      const counter = parseInt(setting?.value || '1000') + 1
      const prefix = (get<any>('SELECT value FROM app_settings WHERE key=?', ['invoice_prefix']))?.value || 'INV-'
      invNumber = `${prefix}${counter}`
      run('UPDATE app_settings SET value=? WHERE key=?', [String(counter), 'invoice_counter'])
    }

    // Guard against duplicate invoice numbers (e.g. manual edits to counter)
    const existing = get('SELECT id FROM invoices WHERE invoice_number=?', [invNumber])
    if (existing) {
      throw new Error(`Invoice number ${invNumber} already exists. Please check the company invoice counter in Manage Companies.`)
    }

    run(`INSERT INTO invoices(id,invoice_number,company_id,client_id,client_name,client_address,client_trn,customer_code,
         invoice_date,due_date,service_period,po_number,delivery_note,sales_man,lpo_number,
         subtotal,tax_rate,tax_amount,discount,total,amount_paid,balance_due,status,notes,terms,created_by)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, invNumber, data.company_id||null, data.client_id||null, data.client_name,
       data.client_address||'', data.client_trn||'', data.customer_code||'',
       data.invoice_date, data.due_date||null, data.service_period||'',
       data.po_number||'', data.delivery_note||'', data.sales_man||'', data.lpo_number||'',
       data.subtotal||0, data.tax_rate||5, data.tax_amount||0, data.discount||0,
       data.total||0, data.amount_paid||0, data.balance_due||0, data.status||'draft',
       data.notes||'', data.terms||'Payment due within 30 days.', data.created_by||null])

    if (data.items?.length) {
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i]
        run(`INSERT INTO invoice_items(id,invoice_id,trip_id,description,vehicle_type,unit,duration,quantity,unit_price,line_total,sort_order)
             VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), id, item.trip_id||null, item.description, item.vehicle_type||'',
           item.unit||'', item.duration||'', item.quantity||1, item.unit_price||0, item.line_total||0, i])
      }
    }

    if (data.client_id) {
      updateSOA(data.client_id, {
        type: 'invoice', reference: invNumber, invoice_id: id,
        description: `Invoice ${invNumber} – ${data.client_name}`,
        vehicle_info: data.items?.[0]?.vehicle_type || '',
        lpo_number: data.lpo_number || '',
        debit: data.total || 0, credit: 0, status: 'unpaid', created_by: data.created_by
      })
    }

    logActivity(data.created_by, 'CREATE', 'invoice', id, invNumber)
    return { success: true, id, invoice_number: invNumber }
  })
})
ipcMain.handle('invoices:update', async (_, { id, ...data }) => {
  return transaction(() => {
    const existing = get<any>('SELECT * FROM invoices WHERE id=?', [id])
    if (!existing) return { success: false, error: 'Invoice not found' }

    run(`UPDATE invoices SET company_id=?,client_id=?,client_name=?,client_address=?,client_trn=?,customer_code=?,
         invoice_date=?,due_date=?,service_period=?,po_number=?,delivery_note=?,sales_man=?,lpo_number=?,
         subtotal=?,tax_rate=?,tax_amount=?,discount=?,total=?,amount_paid=?,balance_due=?,
         status=?,notes=?,terms=?,updated_at=datetime('now') WHERE id=?`,
      [data.company_id||null, data.client_id||null, data.client_name,
       data.client_address||'', data.client_trn||'', data.customer_code||'',
       data.invoice_date, data.due_date||null, data.service_period||'',
       data.po_number||'', data.delivery_note||'', data.sales_man||'', data.lpo_number||'',
       data.subtotal||0, data.tax_rate||5, data.tax_amount||0, data.discount||0,
       data.total||0, data.amount_paid||0, data.balance_due||0,
       data.status||'draft', data.notes||'', data.terms||'', id])

    if (data.items !== undefined) {
      run('DELETE FROM invoice_items WHERE invoice_id=?', [id])
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i]
        run(`INSERT INTO invoice_items(id,invoice_id,trip_id,description,vehicle_type,unit,duration,quantity,unit_price,line_total,sort_order)
             VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), id, item.trip_id||null, item.description, item.vehicle_type||'',
           item.unit||'', item.duration||'', item.quantity||1, item.unit_price||0, item.line_total||0, i])
      }
    }

    // Sync SOA if invoice total changed
    const newTotal = data.total || 0
    const oldTotal = existing.total || 0
    const clientId = data.client_id || existing.client_id
    if (clientId && Math.abs(newTotal - oldTotal) > 0.001) {
      // Update the debit on the SOA invoice row for this invoice
      run(`UPDATE soa_transactions SET debit=?, lpo_number=?, updated_at=datetime('now')
           WHERE invoice_id=? AND type='invoice'`, [newTotal, data.lpo_number||'', id])
      // Recalculate all running balances for this client
      recalculateSOABalances(clientId)
    }

    logActivity(data.updated_by || null, 'UPDATE', 'invoice', id, existing.invoice_number)
    return { success: true }
  })
})
ipcMain.handle('invoices:delete', async (_, id) => {
  return transaction(() => {
    const existing = get<any>('SELECT * FROM invoices WHERE id=?', [id])
    if (!existing) return { success: false, error: 'Invoice not found' }

    // Unlink trips that reference this invoice
    run('UPDATE trips SET invoice_id=NULL WHERE invoice_id=?', [id])
    // Remove SOA transactions for this invoice
    run('DELETE FROM soa_transactions WHERE invoice_id=?', [id])
    // Delete invoice (CASCADE deletes invoice_items via FK)
    run('DELETE FROM invoices WHERE id=?', [id])

    // Recalculate SOA running balances for the client
    if (existing.client_id) recalculateSOABalances(existing.client_id)

    logActivity(null, 'DELETE', 'invoice', id, existing.invoice_number)
    return { success: true }
  })
})
ipcMain.handle('invoices:record_payment', async (_, { id, amount, method, created_by }) => {
  const inv = get<any>('SELECT * FROM invoices WHERE id=?', [id])
  if (!inv) return { success: false }
  const newPaid = (inv.amount_paid || 0) + amount
  const newBalance = inv.total - newPaid
  const status = newBalance <= 0 ? 'paid' : 'partial'
  run(`UPDATE invoices SET amount_paid=?,balance_due=?,status=?,updated_at=datetime('now') WHERE id=?`,
    [newPaid, Math.max(0, newBalance), status, id])
  if (inv.client_id) {
    updateSOA(inv.client_id, {
      type: 'payment', reference: inv.invoice_number, invoice_id: id,
      description: `Payment received – ${inv.invoice_number}`,
      debit: 0, credit: amount, status: 'paid', created_by
    })
    if (status === 'paid') {
      run(`UPDATE soa_transactions SET status='paid', remarks='Received' WHERE invoice_id=? AND type='invoice'`, [id])
    }
  }
  return { success: true }
})
ipcMain.handle('invoices:stats', async () => ({
  total:   get(`SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as amount FROM invoices WHERE status != 'cancelled'`),
  unpaid:  get(`SELECT COUNT(*) as cnt, COALESCE(SUM(balance_due),0) as amount FROM invoices WHERE status IN ('sent','partial','overdue')`),
  paid:    get(`SELECT COUNT(*) as cnt, COALESCE(SUM(amount_paid),0) as amount FROM invoices WHERE status='paid'`),
  month:   get(`SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as amount FROM invoices WHERE strftime('%Y-%m',invoice_date)=strftime('%Y-%m','now')`)
}))

// SOA
ipcMain.handle('soa:list', async (_, filters: any = {}) => {
  let sql = `SELECT s.*, c.company_name FROM soa_transactions s
             LEFT JOIN clients c ON c.id = s.client_id WHERE 1=1`
  const params: unknown[] = []
  if (filters.client_id)  { sql += ' AND s.client_id=?'; params.push(filters.client_id) }
  if (filters.start_date) { sql += ' AND s.transaction_date>=?'; params.push(filters.start_date) }
  if (filters.end_date)   { sql += ' AND s.transaction_date<=?'; params.push(filters.end_date) }
  sql += ' ORDER BY s.transaction_date ASC, s.created_at ASC'
  return all(sql, params)
})
ipcMain.handle('soa:balance', async (_, clientId) => {
  return get('SELECT COALESCE(SUM(debit-credit),0) as balance FROM soa_transactions WHERE client_id=?', [clientId])
})

// STAFF
ipcMain.handle('staff:list', async () => all('SELECT * FROM staff ORDER BY full_name'))
ipcMain.handle('staff:create', async (_, data) => {
  const id = uuidv4()
  run(`INSERT INTO staff(id,full_name,mobile,role,base_salary,joining_date,id_number,id_expiry,nationality,status,notes)
       VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.full_name, data.mobile||'', data.role||'staff', data.base_salary||0,
     data.joining_date||null, data.id_number||'', data.id_expiry||null, data.nationality||'', data.status||'active', data.notes||''])
  return { success: true, id }
})
ipcMain.handle('staff:update', async (_, { id, ...data }) => {
  run(`UPDATE staff SET full_name=?,mobile=?,role=?,base_salary=?,joining_date=?,id_number=?,id_expiry=?,nationality=?,status=?,notes=?,updated_at=datetime('now') WHERE id=?`,
    [data.full_name, data.mobile||'', data.role||'staff', data.base_salary||0,
     data.joining_date||null, data.id_number||'', data.id_expiry||null, data.nationality||'', data.status||'active', data.notes||'', id])
  return { success: true }
})
ipcMain.handle('staff:delete', async (_, id) => {
  run('DELETE FROM staff WHERE id=?', [id])
  return { success: true }
})

// SALARIES (extended for staff)
ipcMain.handle('salaries:get_staff', async (_, { staff_id, month, year }) => {
  return get('SELECT * FROM driver_salaries WHERE staff_id=? AND period_month=? AND period_year=? AND employee_type=\'staff\'', [staff_id, month, year])
})

// VEHICLE EXPENSES
ipcMain.handle('expenses:list', async (_, filters: any = {}) => {
  let sql = `SELECT e.*, v.plate_number, v.vehicle_type FROM vehicle_expenses e
             LEFT JOIN vehicles v ON v.id = e.vehicle_id WHERE 1=1`
  const params: unknown[] = []
  if (filters.vehicle_id)  { sql += ' AND e.vehicle_id=?'; params.push(filters.vehicle_id) }
  if (filters.category)    { sql += ' AND e.category=?';   params.push(filters.category) }
  if (filters.start_date)  { sql += ' AND e.expense_date>=?'; params.push(filters.start_date) }
  if (filters.end_date)    { sql += ' AND e.expense_date<=?'; params.push(filters.end_date) }
  sql += ' ORDER BY e.expense_date DESC'
  return all(sql, params)
})
ipcMain.handle('expenses:create', async (_, data) => {
  const id = uuidv4()
  run(`INSERT INTO vehicle_expenses(id,vehicle_id,expense_date,category,description,amount,vendor,receipt_number,odometer,created_by)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [id, data.vehicle_id, data.expense_date, data.category, data.description,
     data.amount||0, data.vendor||'', data.receipt_number||'', data.odometer||null, data.created_by||null])
  return { success: true, id }
})
ipcMain.handle('expenses:update', async (_, { id, ...data }) => {
  run(`UPDATE vehicle_expenses SET vehicle_id=?,expense_date=?,category=?,description=?,amount=?,vendor=?,receipt_number=?,odometer=?,updated_at=datetime('now') WHERE id=?`,
    [data.vehicle_id, data.expense_date, data.category, data.description,
     data.amount||0, data.vendor||'', data.receipt_number||'', data.odometer||null, id])
  return { success: true }
})
ipcMain.handle('expenses:delete', async (_, id) => {
  run('DELETE FROM vehicle_expenses WHERE id=?', [id])
  return { success: true }
})
ipcMain.handle('expenses:profit', async (_, { vehicle_id, year, month }) => {
  let revSQL = `SELECT COALESCE(SUM(payment_amount),0) as revenue FROM trips WHERE payment_status='paid' AND vehicle_id=?`
  let expSQL = `SELECT COALESCE(SUM(amount),0) as expenses FROM vehicle_expenses WHERE vehicle_id=?`
  const params: unknown[] = [vehicle_id]
  if (year && month) {
    revSQL += ` AND strftime('%Y-%m',trip_date)=?`; params.push(`${year}-${String(month).padStart(2,'0')}`)
    expSQL += ` AND strftime('%Y-%m',expense_date)=?`
  }
  const rev = get<any>(revSQL, params)
  const exp = get<any>(expSQL, params)
  return { revenue: rev?.revenue || 0, expenses: exp?.expenses || 0, profit: (rev?.revenue || 0) - (exp?.expenses || 0) }
})

// DRIVER ASSIGNMENTS
ipcMain.handle('assignments:list', async (_, driverId) => {
  return all(`SELECT da.*, d.full_name, v.plate_number, v.vehicle_type FROM driver_assignments da
              LEFT JOIN drivers d ON d.id=da.driver_id LEFT JOIN vehicles v ON v.id=da.vehicle_id
              WHERE da.driver_id=? ORDER BY da.assigned_date DESC`, [driverId])
})
ipcMain.handle('assignments:create', async (_, data) => {
  const id = uuidv4()
  run(`INSERT INTO driver_assignments(id,driver_id,vehicle_id,assigned_date,notes,created_by) VALUES(?,?,?,?,?,?)`,
    [id, data.driver_id, data.vehicle_id, data.assigned_date, data.notes||'', data.created_by||null])
  run(`UPDATE vehicles SET status='on_trip' WHERE id=?`, [data.vehicle_id])
  return { success: true, id }
})

// DRIVER SALARIES
ipcMain.handle('salaries:list', async (_, filters: any = {}) => {
  const isStaff = !!filters.staff_id
  let sql = isStaff
    ? `SELECT ds.*, s.full_name, s.mobile FROM driver_salaries ds LEFT JOIN staff s ON s.id=ds.staff_id WHERE ds.employee_type='staff'`
    : `SELECT ds.*, d.full_name, d.mobile FROM driver_salaries ds LEFT JOIN drivers d ON d.id=ds.driver_id WHERE ds.employee_type='driver'`
  const params: unknown[] = []
  if (filters.driver_id) { sql += ' AND ds.driver_id=?'; params.push(filters.driver_id) }
  if (filters.staff_id)  { sql += ' AND ds.staff_id=?';  params.push(filters.staff_id) }
  if (filters.year)      { sql += ' AND ds.period_year=?'; params.push(filters.year) }
  if (filters.month)     { sql += ' AND ds.period_month=?'; params.push(filters.month) }
  sql += ' ORDER BY ds.period_year DESC, ds.period_month DESC'
  return all(sql, params)
})
ipcMain.handle('salaries:get', async (_, { driver_id, month, year }) => {
  return get(`SELECT * FROM driver_salaries WHERE driver_id=? AND period_month=? AND period_year=? AND employee_type='driver'`, [driver_id, month, year])
})
ipcMain.handle('salaries:save', async (_, data) => {
  const isStaff = data.employee_type === 'staff'
  const gross = (data.base_salary||0) + (data.overtime_amount||0) + (data.bonus||0) - (data.deductions||0)
  const remaining = gross - (data.amount_paid||0)
  const status = remaining <= 0 ? 'paid' : data.amount_paid > 0 ? 'partial' : 'pending'
  const existing = isStaff
    ? get(`SELECT id FROM driver_salaries WHERE staff_id=? AND period_month=? AND period_year=? AND employee_type='staff'`,
        [data.staff_id, data.period_month, data.period_year])
    : get(`SELECT id FROM driver_salaries WHERE driver_id=? AND period_month=? AND period_year=? AND employee_type='driver'`,
        [data.driver_id, data.period_month, data.period_year])
  if (existing) {
    const whereCol = isStaff ? 'staff_id' : 'driver_id'
    const whereVal = isStaff ? data.staff_id : data.driver_id
    run(`UPDATE driver_salaries SET base_salary=?,overtime_hours=?,overtime_rate=?,overtime_amount=?,
         deductions=?,deduction_reason=?,bonus=?,gross_salary=?,amount_paid=?,remaining=?,
         payment_date=?,payment_method=?,notes=?,status=?,updated_at=datetime('now')
         WHERE ${whereCol}=? AND period_month=? AND period_year=?`,
      [data.base_salary||0, data.overtime_hours||0, data.overtime_rate||0, data.overtime_amount||0,
       data.deductions||0, data.deduction_reason||'', data.bonus||0, gross, data.amount_paid||0, remaining,
       data.payment_date||null, data.payment_method||'cash', data.notes||'', status,
       whereVal, data.period_month, data.period_year])
  } else {
    run(`INSERT INTO driver_salaries(id,driver_id,staff_id,employee_type,period_month,period_year,base_salary,overtime_hours,overtime_rate,overtime_amount,deductions,deduction_reason,bonus,gross_salary,amount_paid,remaining,payment_date,payment_method,notes,status,created_by)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), data.driver_id||null, data.staff_id||null, data.employee_type||'driver',
       data.period_month, data.period_year, data.base_salary||0,
       data.overtime_hours||0, data.overtime_rate||0, data.overtime_amount||0,
       data.deductions||0, data.deduction_reason||'', data.bonus||0, gross, data.amount_paid||0, remaining,
       data.payment_date||null, data.payment_method||'cash', data.notes||'', status, data.created_by||null])
  }
  return { success: true }
})

// NOTIFICATIONS
ipcMain.handle('notifications:list', async (_, userId) => {
  return all(`SELECT * FROM notifications WHERE (user_id=? OR user_id IS NULL) ORDER BY created_at DESC LIMIT 50`, [userId])
})
ipcMain.handle('notifications:mark_read', async (_, id) => {
  run('UPDATE notifications SET is_read=1 WHERE id=?', [id])
  return { success: true }
})
ipcMain.handle('notifications:mark_all_read', async (_, userId) => {
  run('UPDATE notifications SET is_read=1 WHERE user_id=? OR user_id IS NULL', [userId])
  return { success: true }
})

// REMINDERS
ipcMain.handle('reminders:list', async () => all('SELECT * FROM payment_reminders ORDER BY sent_at DESC LIMIT 100'))
ipcMain.handle('reminders:config_get', async () => get('SELECT * FROM reminder_config WHERE id=?', ['singleton']))
ipcMain.handle('reminders:config_save', async (_, data) => {
  run(`UPDATE reminder_config SET enabled=?,frequency=?,custom_days=?,send_email=?,send_inapp=?,
       email_to=?,email_from=?,smtp_host=?,smtp_port=?,smtp_user=?,smtp_pass=?,updated_at=datetime('now')
       WHERE id='singleton'`,
    [data.enabled?1:0, data.frequency||'weekly', data.custom_days||7, data.send_email?1:0, data.send_inapp?1:0,
     data.email_to||'citystar815@gmail.com', data.email_from||'', data.smtp_host||'',
     data.smtp_port||587, data.smtp_user||'', data.smtp_pass||''])
  return { success: true }
})
ipcMain.handle('reminders:run_now', async () => {
  await checkAndSendReminders()
  return { success: true }
})

// SETTINGS
ipcMain.handle('settings:get', async () => {
  const rows = all<{key:string,value:string}>('SELECT key, value FROM app_settings')
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
})
ipcMain.handle('settings:save', async (_, settings: Record<string,string>) => {
  const stmt = getDatabase().prepare('INSERT OR REPLACE INTO app_settings(key,value,updated_at) VALUES(?,?,datetime(\'now\'))')
  for (const [key, value] of Object.entries(settings)) {
    stmt.run(key, value)
  }
  return { success: true }
})

// ACTIVITY LOG
ipcMain.handle('activity:list', async (_, limit = 100) => {
  return all(`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?`, [limit])
})

// REPORTS
ipcMain.handle('reports:dashboard', async () => {
  return {
    total_trips:    get(`SELECT COUNT(*) as cnt FROM trips WHERE strftime('%Y-%m',trip_date)=strftime('%Y-%m','now')`),
    revenue:        get(`SELECT COALESCE(SUM(payment_amount),0) as total FROM trips WHERE payment_status='paid' AND strftime('%Y-%m',trip_date)=strftime('%Y-%m','now')`),
    unpaid:         get(`SELECT COALESCE(SUM(payment_amount),0) as total FROM trips WHERE payment_status='unpaid'`),
    total_expenses: get(`SELECT COALESCE(SUM(amount),0) as total FROM vehicle_expenses WHERE strftime('%Y-%m',expense_date)=strftime('%Y-%m','now')`),
    active_vehicles:get(`SELECT COUNT(*) as cnt FROM vehicles WHERE status='available' OR status='on_trip'`),
    active_drivers: get(`SELECT COUNT(*) as cnt FROM drivers WHERE status='active'`),
    pending_invoices: get(`SELECT COUNT(*) as cnt, COALESCE(SUM(balance_due),0) as amount FROM invoices WHERE status IN ('sent','partial','overdue')`),
    monthly_revenue: all(`SELECT strftime('%Y-%m',trip_date) as month, COALESCE(SUM(payment_amount),0) as revenue, COUNT(*) as trips FROM trips WHERE payment_status='paid' GROUP BY month ORDER BY month DESC LIMIT 12`),
    monthly_expenses: all(`SELECT strftime('%Y-%m',expense_date) as month, COALESCE(SUM(amount),0) as expenses FROM vehicle_expenses GROUP BY month ORDER BY month DESC LIMIT 12`),
    top_clients:    all(`SELECT client_name, COALESCE(SUM(payment_amount),0) as total FROM trips WHERE payment_status='paid' GROUP BY client_name ORDER BY total DESC LIMIT 5`),
    top_vehicles:   all(`SELECT vehicle_type, COALESCE(SUM(payment_amount),0) as revenue, COUNT(*) as trips FROM trips WHERE payment_status='paid' GROUP BY vehicle_type ORDER BY revenue DESC LIMIT 5`),
    expense_breakdown: all(`SELECT category, COALESCE(SUM(amount),0) as total FROM vehicle_expenses GROUP BY category ORDER BY total DESC`)
  }
})
ipcMain.handle('reports:trips', async (_, filters: any) => {
  return all(`SELECT t.*, v.plate_number FROM trips t LEFT JOIN vehicles v ON v.id=t.vehicle_id
              WHERE t.trip_date >= ? AND t.trip_date <= ? ORDER BY t.trip_date`, [filters.start_date, filters.end_date])
})
ipcMain.handle('reports:financial', async (_, filters: any) => {
  return {
    trips: all(`SELECT strftime('%Y-%m-%d',trip_date) as date, SUM(payment_amount) as revenue, COUNT(*) as cnt FROM trips WHERE trip_date>=? AND trip_date<=? AND payment_status='paid' GROUP BY date`, [filters.start_date, filters.end_date]),
    expenses: all(`SELECT strftime('%Y-%m-%d',expense_date) as date, SUM(amount) as total, category FROM vehicle_expenses WHERE expense_date>=? AND expense_date<=? GROUP BY date,category`, [filters.start_date, filters.end_date])
  }
})

// AI CHAT
ipcMain.handle('ai:chat', async (_, { messages, userId, sessionId, apiKey }) => {
  try {
    const key = apiKey || (get<any>('SELECT value FROM app_settings WHERE key=?', ['anthropic_key']))?.value
    if (!key) return { error: 'Anthropic API key not configured. Please set it in Settings.' }

    // Build system context from live DB data
    const stats = await buildAIContext()
    const systemPrompt = buildSystemPrompt(stats)

    const client = new Anthropic({ apiKey: key })
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content }))
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    // Save to chat history
    if (sessionId) {
      run(`INSERT INTO chat_history(id,user_id,session_id,role,content,tokens_used) VALUES(?,?,?,?,?,?)`,
        [uuidv4(), userId||null, sessionId, 'assistant', content, response.usage.output_tokens])
    }

    return { content, tokens: response.usage.output_tokens }
  } catch (err: any) {
    return { error: err.message || 'AI request failed' }
  }
})

function buildAIContext() {
  return {
    trips:        get<any>(`SELECT COUNT(*) as total, SUM(CASE WHEN payment_status='paid' THEN payment_amount ELSE 0 END) as paid_revenue, SUM(CASE WHEN payment_status='unpaid' THEN payment_amount ELSE 0 END) as unpaid_amount FROM trips`),
    invoices:     get<any>(`SELECT COUNT(*) as total, SUM(total) as total_amount, SUM(balance_due) as outstanding FROM invoices WHERE status!='cancelled'`),
    vehicles:     get<any>(`SELECT COUNT(*) as total, SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as available FROM vehicles`),
    drivers:      get<any>(`SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM drivers`),
    expenses:     get<any>(`SELECT COALESCE(SUM(amount),0) as total FROM vehicle_expenses WHERE strftime('%Y-%m',expense_date)=strftime('%Y-%m','now')`),
    top_clients:  all<any>(`SELECT client_name, SUM(payment_amount) as total FROM trips WHERE payment_status='paid' GROUP BY client_name ORDER BY total DESC LIMIT 5`),
    recent_trips: all<any>(`SELECT client_name, job_description, trip_date, payment_amount, payment_status FROM trips ORDER BY created_at DESC LIMIT 10`),
    unpaid_trips: all<any>(`SELECT client_name, job_description, trip_date, payment_amount FROM trips WHERE payment_status='unpaid' ORDER BY trip_date ASC LIMIT 20`)
  }
}

function buildSystemPrompt(ctx: any): string {
  return `You are CST CHAT INTELLIGENT, the built-in AI business assistant for City Star Transport Passengers LLC's transport management system.

You have REAL-TIME access to the following business data:

📊 CURRENT STATS:
- Total Trips: ${ctx.trips?.total || 0} | Paid Revenue: AED ${(ctx.trips?.paid_revenue || 0).toFixed(2)} | Outstanding: AED ${(ctx.trips?.unpaid_amount || 0).toFixed(2)}
- Invoices: ${ctx.invoices?.total || 0} total | AED ${(ctx.invoices?.total_amount || 0).toFixed(2)} billed | AED ${(ctx.invoices?.outstanding || 0).toFixed(2)} outstanding
- Vehicles: ${ctx.vehicles?.total || 0} total | ${ctx.vehicles?.available || 0} available
- Drivers: ${ctx.drivers?.total || 0} total | ${ctx.drivers?.active || 0} active
- This Month Expenses: AED ${(ctx.expenses?.total || 0).toFixed(2)}

🏆 TOP CLIENTS (by revenue):
${ctx.top_clients?.map((c: any, i: number) => `${i+1}. ${c.client_name}: AED ${(c.total||0).toFixed(2)}`).join('\n') || 'No data'}

⚠️ UNPAID TRIPS (most urgent):
${ctx.unpaid_trips?.slice(0,5).map((t: any) => `- ${t.client_name}: ${t.job_description} (${t.trip_date}) – AED ${t.payment_amount}`).join('\n') || 'All trips paid!'}

You can:
- Answer questions about invoices, SOA, trips, expenses, salaries, vehicles, drivers
- Generate insights and summaries
- Detect anomalies and suggest actions
- Help navigate the system ("Go to Invoices and click New Invoice")
- Suggest sending payment reminders for overdue clients

Always respond professionally. Use AED for currency. Be concise but thorough. If asked to generate a report, describe what data you see and provide a clear summary.`
}

ipcMain.handle('ai:chat_history', async (_, { userId, sessionId }) => {
  return all('SELECT * FROM chat_history WHERE user_id=? AND session_id=? ORDER BY created_at ASC', [userId, sessionId])
})

// FILE DIALOG
ipcMain.handle('dialog:save', async (_, { defaultPath, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow!, { defaultPath, filters })
  return result
})
ipcMain.handle('dialog:open', async (_, { filters }) => {
  const result = await dialog.showOpenDialog(mainWindow!, { properties: ['openFile'], filters })
  return result
})
ipcMain.handle('shell:open_path', async (_, filePath) => {
  await shell.openPath(filePath)
})

// SEARCH
ipcMain.handle('search:global', async (_, query) => {
  const q = `%${query}%`
  return {
    clients:  all(`SELECT id,'client' as type,company_name as title FROM clients WHERE company_name LIKE ? OR contact_name LIKE ? LIMIT 5`, [q,q]),
    trips:    all(`SELECT id,'trip' as type,client_name||' – '||job_description as title FROM trips WHERE client_name LIKE ? OR job_description LIKE ? OR driver_name LIKE ? LIMIT 5`, [q,q,q]),
    invoices: all(`SELECT id,'invoice' as type,invoice_number||' – '||client_name as title FROM invoices WHERE invoice_number LIKE ? OR client_name LIKE ? LIMIT 5`, [q,q]),
    drivers:  all(`SELECT id,'driver' as type,full_name as title FROM drivers WHERE full_name LIKE ? OR mobile LIKE ? LIMIT 5`, [q,q]),
    vehicles: all(`SELECT id,'vehicle' as type,plate_number||' ('||vehicle_type||')' as title FROM vehicles WHERE plate_number LIKE ? OR vehicle_type LIKE ? LIMIT 5`, [q,q])
  }
})

// BACKUP
ipcMain.handle('backup:create', async () => {
  const { filePath } = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: `cst_backup_${new Date().toISOString().split('T')[0]}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  })
  if (filePath) {
    const { app } = await import('electron')
    const src = require('path').join(app.getPath('userData'), 'cst_transport.db')
    fs.copyFileSync(src, filePath)
    return { success: true, path: filePath }
  }
  return { success: false }
})

// ─── Helpers ───────────────────────────────────────────────────────────────────

function recalculateSOABalances(clientId: string) {
  const txns = all<any>(
    'SELECT id, debit, credit FROM soa_transactions WHERE client_id=? ORDER BY transaction_date ASC, created_at ASC',
    [clientId]
  )
  let balance = 0
  for (const tx of txns) {
    balance = balance + (tx.debit || 0) - (tx.credit || 0)
    run('UPDATE soa_transactions SET balance=? WHERE id=?', [Math.round(balance * 100) / 100, tx.id])
  }
}

function updateSOA(clientId: string, data: any) {
  const lastBalance = (get<any>('SELECT balance FROM soa_transactions WHERE client_id=? ORDER BY created_at DESC, id DESC LIMIT 1', [clientId]))?.balance || 0
  const newBalance = lastBalance + (data.debit || 0) - (data.credit || 0)
  run(`INSERT INTO soa_transactions(id,client_id,transaction_date,type,reference,invoice_id,description,vehicle_info,lpo_number,debit,credit,balance,status,remarks,created_by)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [uuidv4(), clientId, new Date().toISOString().split('T')[0], data.type, data.reference||'',
     data.invoice_id||null, data.description, data.vehicle_info||'', data.lpo_number||'',
     data.debit||0, data.credit||0, newBalance, data.status||'unpaid', data.remarks||'', data.created_by||null])
}

function logActivity(userId: string|null|undefined, action: string, entity_type: string, entity_id: string, details?: string) {
  run(`INSERT INTO activity_log(id,user_id,action,entity_type,entity_id,details) VALUES(?,?,?,?,?,?)`,
    [uuidv4(), userId||null, action, entity_type, entity_id, details||null])
}
