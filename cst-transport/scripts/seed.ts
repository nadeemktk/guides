/**
 * CST Transport – Sample Data Seed Script
 * Run: npx ts-node scripts/seed.ts
 *
 * Seeds the SQLite database with sample data for testing and demonstration.
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Use a local db path for seeding (not Electron's userData)
const dbPath = path.resolve(__dirname, '../sample_data.db')
const schemaPath = path.resolve(__dirname, '../electron/database/schema.sql')

console.log('🌱 CST Transport – Sample Data Seeder')
console.log('DB Path:', dbPath)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Apply schema
const schema = fs.readFileSync(schemaPath, 'utf-8')
db.exec(schema)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const run = (sql: string, params: any[] = []) => db.prepare(sql).run(...params)
const get = (sql: string, params: any[] = []) => db.prepare(sql).get(...params)

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return d.toISOString().split('T')[0]
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Users ────────────────────────────────────────────────────────────────────
console.log('👤 Creating users...')
const adminPerms = JSON.stringify({
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

const editorPerms = JSON.stringify({
  dashboard: { view: true },
  invoices: { create: true, edit: true, print: true },
  soa: { view: true },
  trips: { create: true, edit: true, view: true },
  vehicles: { view: true },
  drivers: { view: true },
  expenses: { manage: false },
  salary: { view: true },
  reports: { view: true },
  reminders: {},
  users: {},
  ai: { access: true }
})

const USERS = [
  { username: 'admin',   full_name: 'System Administrator', email: 'citystar815@gmail.com', password: 'admin123',  role: 'admin',  perms: adminPerms },
  { username: 'manager', full_name: 'Operations Manager',   email: 'manager@citystar.ae',   password: 'Manager@123', role: 'editor', perms: editorPerms },
  { username: 'staff1',  full_name: 'Ahmed Al Mansouri',    email: 'ahmed@citystar.ae',      password: 'Staff@123', role: 'visitor', perms: editorPerms }
]

const userIds: Record<string, string> = {}
for (const u of USERS) {
  const existing = get('SELECT id FROM users WHERE username=?', [u.username])
  if (!existing) {
    const id = uuidv4()
    userIds[u.username] = id
    run(`INSERT INTO users(id,username,full_name,email,password,role,permissions) VALUES(?,?,?,?,?,?,?)`,
      [id, u.username, u.full_name, u.email, bcrypt.hashSync(u.password, 10), u.role, u.perms])
  } else {
    userIds[u.username] = (existing as any).id
  }
}

// ─── Clients ──────────────────────────────────────────────────────────────────
console.log('🏢 Creating clients...')
const CLIENTS = [
  { company_name: 'Dubai International Corp',   contact_name: 'Mohammad Al Rashid', mobile: '+971501234567', email: 'contact@dic.ae', address: 'Business Bay, Dubai', tax_number: 'TRN100234567890' },
  { company_name: 'Emirates Construction LLC',  contact_name: 'Khalid Hassan',      mobile: '+971552345678', email: 'khalid@emircon.ae', address: 'Al Quoz, Dubai', tax_number: 'TRN100345678901' },
  { company_name: 'Abu Dhabi Hotels Group',     contact_name: 'Fatima Al Zaabi',    mobile: '+971563456789', email: 'fatima@adhg.ae', address: 'Al Khaleej, Abu Dhabi', tax_number: 'TRN100456789012' },
  { company_name: 'Sharjah Industrial Trading', contact_name: 'Omar Sheikh',        mobile: '+971504567890', email: 'omar@sit.ae', address: 'Sharjah Industrial Area', tax_number: 'TRN100567890123' },
  { company_name: 'Gulf Events Management',     contact_name: 'Sara Al Nuaimi',     mobile: '+971555678901', email: 'sara@gem.ae', address: 'Downtown Dubai', tax_number: 'TRN100678901234' },
  { company_name: 'Ajman Ports Authority',      contact_name: 'Rashid Bin Sultan',  mobile: '+971506789012', email: 'rashid@ajmanport.ae', address: 'Port of Ajman', tax_number: 'TRN100789012345' }
]

const clientIds: string[] = []
for (const c of CLIENTS) {
  const existing = get('SELECT id FROM clients WHERE company_name=?', [c.company_name])
  if (!existing) {
    const id = uuidv4()
    clientIds.push(id)
    run(`INSERT INTO clients(id,company_name,contact_name,mobile,email,address,tax_number) VALUES(?,?,?,?,?,?,?)`,
      [id, c.company_name, c.contact_name, c.mobile, c.email, c.address, c.tax_number])
  } else {
    clientIds.push((existing as any).id)
  }
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────
console.log('🚌 Creating vehicles...')
const VEHICLES = [
  { plate_number: 'DXB 11234', vehicle_type: 'Bus', make: 'Toyota', model: 'Coaster', year: 2022, seats: 30, owner_name: 'Abdullah Transport', owner_mobile: '+971501111111', color: 'White', insurance_expiry: '2025-06-30', mulkiya_expiry: '2025-08-15' },
  { plate_number: 'DXB 22345', vehicle_type: 'Coaster', make: 'Toyota', model: 'Coaster', year: 2021, seats: 22, owner_name: 'Abdullah Transport', owner_mobile: '+971501111111', color: 'White', insurance_expiry: '2025-04-30', mulkiya_expiry: '2025-09-20' },
  { plate_number: 'SHJ 33456', vehicle_type: 'Van', make: 'Ford', model: 'Transit', year: 2023, seats: 15, owner_name: 'Gulf Fleet Services', owner_mobile: '+971552222222', color: 'Silver', insurance_expiry: '2025-12-31', mulkiya_expiry: '2025-12-31' },
  { plate_number: 'AUH 44567', vehicle_type: 'Bus', make: 'Hino', model: 'RK8', year: 2020, seats: 50, owner_name: 'Abu Dhabi Bus Co', owner_mobile: '+971503333333', color: 'Blue', insurance_expiry: '2025-07-15', mulkiya_expiry: '2025-07-15' },
  { plate_number: 'DXB 55678', vehicle_type: 'Luxury Van', make: 'Mercedes', model: 'Sprinter', year: 2023, seats: 12, owner_name: 'Prestige Transport', owner_mobile: '+971504444444', color: 'Black', insurance_expiry: '2025-11-30', mulkiya_expiry: '2025-11-30' },
  { plate_number: 'AJM 66789', vehicle_type: 'SUV', make: 'Toyota', model: 'Land Cruiser', year: 2022, seats: 7, owner_name: 'Desert Transport', owner_mobile: '+971505555555', color: 'White', insurance_expiry: '2025-09-30', mulkiya_expiry: '2025-09-30' }
]

const vehicleIds: string[] = []
for (const v of VEHICLES) {
  const existing = get('SELECT id FROM vehicles WHERE plate_number=?', [v.plate_number])
  if (!existing) {
    const id = uuidv4()
    vehicleIds.push(id)
    run(`INSERT INTO vehicles(id,plate_number,vehicle_type,make,model,year,seats,owner_name,owner_mobile,color,status,insurance_expiry,mulkiya_expiry) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, v.plate_number, v.vehicle_type, v.make, v.model, v.year, v.seats, v.owner_name, v.owner_mobile, v.color, 'available', v.insurance_expiry, v.mulkiya_expiry])
  } else {
    vehicleIds.push((existing as any).id)
  }
}

// ─── Drivers ──────────────────────────────────────────────────────────────────
console.log('👨‍✈️ Creating drivers...')
const DRIVERS = [
  { full_name: 'Ali Hassan Al Zarooni', mobile: '+971501112222', license_number: 'DL-001234', nationality: 'UAE', base_salary: 3500, joining_date: '2021-01-15' },
  { full_name: 'Muhammad Rafiq Ahmed',  mobile: '+971552223333', license_number: 'DL-002345', nationality: 'Pakistan', base_salary: 2800, joining_date: '2020-06-01' },
  { full_name: 'Suresh Kumar Rajan',    mobile: '+971503334444', license_number: 'DL-003456', nationality: 'India', base_salary: 2500, joining_date: '2022-03-10' },
  { full_name: 'Ahmed Mohamed Salim',   mobile: '+971564445555', license_number: 'DL-004567', nationality: 'Egypt', base_salary: 3000, joining_date: '2021-09-20' },
  { full_name: 'Abdul Rahman Siddiqui', mobile: '+971505556666', license_number: 'DL-005678', nationality: 'Bangladesh', base_salary: 2600, joining_date: '2023-01-05' }
]

const driverIds: string[] = []
for (const d of DRIVERS) {
  const existing = get('SELECT id FROM drivers WHERE mobile=?', [d.mobile])
  if (!existing) {
    const id = uuidv4()
    driverIds.push(id)
    run(`INSERT INTO drivers(id,full_name,mobile,license_number,nationality,base_salary,joining_date,status) VALUES(?,?,?,?,?,?,?,?)`,
      [id, d.full_name, d.mobile, d.license_number, d.nationality, d.base_salary, d.joining_date, 'active'])
  } else {
    driverIds.push((existing as any).id)
  }
}

// ─── Trips ────────────────────────────────────────────────────────────────────
console.log('🚗 Creating sample trips...')
const JOB_DESCRIPTIONS = [
  'Airport Transfer – DXB to Abu Dhabi Hotel',
  'Staff Transportation – Morning Shift',
  'Staff Transportation – Evening Shift',
  'Event Transportation – Conference',
  'VIP Guest Transfer',
  'School Trip Transportation',
  'Construction Site Workers Transport',
  'Hotel Guest Airport Pickup',
  'Corporate Event Shuttle Service',
  'Annual Company Outing Transport'
]

const PAYMENT_AMOUNTS = [500, 750, 1000, 1200, 1500, 2000, 2500, 3000, 3500, 4000]

const adminId = userIds['admin']
const now = new Date()
const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

const tripIds: string[] = []
for (let i = 0; i < 60; i++) {
  const id = uuidv4()
  tripIds.push(id)
  const clientId = randomItem(clientIds)
  const clientData = get('SELECT company_name, mobile FROM clients WHERE id=?', [clientId]) as any
  const vehicleId = randomItem(vehicleIds)
  const vehicleData = get('SELECT vehicle_type, plate_number, owner_name, seats FROM vehicles WHERE id=?', [vehicleId]) as any
  const driverId = randomItem(driverIds)
  const driverData = get('SELECT full_name, mobile FROM drivers WHERE id=?', [driverId]) as any
  const amount = randomItem(PAYMENT_AMOUNTS)
  const isPaid = Math.random() > 0.35
  const tripDate = randomDate(sixMonthsAgo, now)

  run(`INSERT INTO trips(id,trip_date,vehicle_id,driver_id,client_id,client_name,client_mobile,job_description,vehicle_type,seats,driver_name,driver_mobile,owner_name,payment_amount,payment_status,payment_method,booked_by,created_by,remarks)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, tripDate, vehicleId, driverId, clientId,
     clientData?.company_name || 'Walk-in Client',
     clientData?.mobile || '',
     randomItem(JOB_DESCRIPTIONS),
     vehicleData?.vehicle_type || '',
     vehicleData?.seats || 0,
     driverData?.full_name || '',
     driverData?.mobile || '',
     vehicleData?.owner_name || '',
     amount,
     isPaid ? 'paid' : (Math.random() > 0.7 ? 'partial' : 'unpaid'),
     randomItem(['cash', 'bank', 'online', 'cash', 'cash']),
     randomItem(['Ahmed Al Mansouri', 'Sara Hassan', 'Operations Manager']),
     adminId,
     i % 5 === 0 ? 'Special discount applied' : ''])
}

// ─── Vehicle Expenses ─────────────────────────────────────────────────────────
console.log('🔧 Creating vehicle expenses...')
const EXPENSE_DATA = [
  { category: 'fuel', description: 'Petrol Refuel', vendor: 'ADNOC Station' },
  { category: 'maintenance', description: 'Oil Change & Filter', vendor: 'Quick Service Center' },
  { category: 'repair', description: 'Brake Pad Replacement', vendor: 'Al Rostamani Workshop' },
  { category: 'insurance', description: 'Annual Insurance Premium', vendor: 'AXA Insurance' },
  { category: 'fuel', description: 'Diesel Refuel', vendor: 'Emarat Station' },
  { category: 'parking', description: 'Airport Parking Fee', vendor: 'DXB Airport' },
  { category: 'maintenance', description: 'AC Service', vendor: 'Cool Air Service' },
  { category: 'fuel', description: 'Petrol Refuel', vendor: 'Enoc Station' }
]
const EXPENSE_AMOUNTS = [150, 200, 350, 500, 800, 1200, 100, 75, 250]

for (let i = 0; i < 40; i++) {
  const expData = randomItem(EXPENSE_DATA)
  run(`INSERT INTO vehicle_expenses(id,vehicle_id,expense_date,category,description,amount,vendor,created_by) VALUES(?,?,?,?,?,?,?,?)`,
    [uuidv4(), randomItem(vehicleIds), randomDate(sixMonthsAgo, now), expData.category, expData.description, randomItem(EXPENSE_AMOUNTS), expData.vendor, adminId])
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
console.log('📄 Creating sample invoices...')
const TAX_RATE = 5
let counter = 1001

for (let i = 0; i < 15; i++) {
  const invId = uuidv4()
  const clientId = randomItem(clientIds)
  const clientData = get('SELECT company_name FROM clients WHERE id=?', [clientId]) as any
  const invDate = randomDate(sixMonthsAgo, now)
  const dueDate = new Date(invDate)
  dueDate.setDate(dueDate.getDate() + 30)

  const lineTotal1 = randomItem([2000, 3000, 4000, 5000, 6000])
  const lineTotal2 = randomItem([1000, 1500, 2000])
  const subtotal = lineTotal1 + lineTotal2
  const tax = subtotal * TAX_RATE / 100
  const total = subtotal + tax
  const isPaid = Math.random() > 0.4
  const amountPaid = isPaid ? total : Math.random() > 0.5 ? total * 0.5 : 0
  const balance = total - amountPaid

  run(`INSERT INTO invoices(id,invoice_number,client_id,client_name,invoice_date,due_date,service_period,subtotal,tax_rate,tax_amount,total,amount_paid,balance_due,status,notes,created_by)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [invId, `INV-${counter++}`, clientId, clientData?.company_name || '',
     invDate, dueDate.toISOString().split('T')[0],
     `Service Period: ${invDate.substring(0, 7)}`,
     subtotal, TAX_RATE, tax, total, amountPaid, balance,
     balance === 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'sent',
     'Thank you for your business!', adminId])

  run(`INSERT INTO invoice_items(id,invoice_id,description,quantity,unit_price,line_total,sort_order) VALUES(?,?,?,?,?,?,?)`,
    [uuidv4(), invId, 'Transport Services – Staff Shuttle', 1, lineTotal1, lineTotal1, 0])
  run(`INSERT INTO invoice_items(id,invoice_id,description,quantity,unit_price,line_total,sort_order) VALUES(?,?,?,?,?,?,?)`,
    [uuidv4(), invId, 'Additional Trip Charges', 1, lineTotal2, lineTotal2, 1])

  // SOA entry for invoice
  const lastBal = (get('SELECT balance FROM soa_transactions WHERE client_id=? ORDER BY created_at DESC LIMIT 1', [clientId]) as any)?.balance || 0
  const invRef = `INV-${counter - 1}`
  run(`INSERT INTO soa_transactions(id,client_id,transaction_date,type,reference,invoice_id,description,debit,credit,balance,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [uuidv4(), clientId, invDate, 'invoice', invRef, invId, `Invoice ${invRef}`, total, 0, lastBal + total, adminId])

  if (amountPaid > 0) {
    const bal2 = lastBal + total - amountPaid
    run(`INSERT INTO soa_transactions(id,client_id,transaction_date,type,reference,invoice_id,description,debit,credit,balance,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), clientId, invDate, 'payment', invRef, invId, `Payment received – ${invRef}`, 0, amountPaid, bal2, adminId])
  }
}

// ─── Driver Salaries ──────────────────────────────────────────────────────────
console.log('💰 Creating salary records...')
const currentMonth = now.getMonth() + 1
const currentYear = now.getFullYear()

for (const driverId of driverIds) {
  const driverData = get('SELECT base_salary FROM drivers WHERE id=?', [driverId]) as any
  const base = driverData?.base_salary || 2500
  const overtime = Math.random() > 0.5 ? Math.floor(Math.random() * 20) : 0
  const otRate = 25
  const otAmount = overtime * otRate
  const bonus = Math.random() > 0.7 ? 500 : 0
  const deductions = Math.random() > 0.8 ? 200 : 0
  const gross = base + otAmount + bonus - deductions
  const paid = Math.random() > 0.3 ? gross : gross * 0.5
  const remaining = gross - paid

  for (let mo = currentMonth - 2; mo <= currentMonth; mo++) {
    let month = mo
    let year = currentYear
    if (month <= 0) { month += 12; year -= 1 }

    const existing = get('SELECT id FROM driver_salaries WHERE driver_id=? AND period_month=? AND period_year=?', [driverId, month, year])
    if (!existing) {
      run(`INSERT INTO driver_salaries(id,driver_id,period_month,period_year,base_salary,overtime_hours,overtime_rate,overtime_amount,bonus,deductions,gross_salary,amount_paid,remaining,status,payment_method,created_by)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uuidv4(), driverId, month, year, base, overtime, otRate, otAmount, bonus, deductions, gross,
         mo === currentMonth ? paid : gross,
         mo === currentMonth ? remaining : 0,
         mo === currentMonth ? (remaining === 0 ? 'paid' : 'partial') : 'paid',
         'cash', adminId])
    }
  }
}

console.log('\n✅ Sample data seeded successfully!')
console.log(`📊 Created:
  - ${USERS.length} users
  - ${CLIENTS.length} clients
  - ${VEHICLES.length} vehicles
  - ${DRIVERS.length} drivers
  - 60 trips
  - 40 vehicle expenses
  - 15 invoices with SOA entries
  - Driver salary records (3 months)`)
console.log('\n🔑 Login credentials:')
console.log('  Admin:   admin / admin123')
console.log('  Manager: manager / Manager@123')
console.log('  Staff:   staff1 / Staff@123')
console.log('\n📁 Database saved to:', dbPath)

db.close()
