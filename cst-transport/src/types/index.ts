// ─── Core Entity Types ─────────────────────────────────────────────────────────

export interface User {
  id: string
  username: string
  full_name: string
  email: string
  role: 'admin' | 'editor' | 'visitor'
  is_active: boolean
  permissions: Permissions
  created_at: string
}

export interface Permissions {
  dashboard?: { view?: boolean; edit?: boolean }
  invoices?:  { create?: boolean; edit?: boolean; delete?: boolean; print?: boolean }
  soa?:       { view?: boolean; update?: boolean }
  trips?:     { create?: boolean; edit?: boolean; delete?: boolean; view?: boolean }
  vehicles?:  { add?: boolean; edit?: boolean; view?: boolean }
  drivers?:   { add?: boolean; edit?: boolean; view?: boolean }
  expenses?:  { manage?: boolean }
  salary?:    { view?: boolean; edit?: boolean }
  reports?:   { view?: boolean; export?: boolean }
  reminders?: { configure?: boolean }
  users?:     { create?: boolean; edit?: boolean; delete?: boolean; view?: boolean }
  ai?:        { access?: boolean }
  clients?:   { view?: boolean; edit?: boolean }
}

export interface Company {
  id: string
  name: string
  trn: string
  address: string
  phone: string
  email: string
  bank_name: string
  bank_account: string
  bank_iban: string
  bank_swift: string
  logo_path: string
  is_default: boolean
  created_at: string
}

export interface Client {
  id: string
  customer_code: string
  company_name: string
  contact_name: string
  mobile: string
  email: string
  address: string
  tax_number: string
  credit_limit: number
  notes: string
  is_active: boolean
  client_type: 'monthly' | 'daily_trip'
  created_at: string
}

export interface Vehicle {
  id: string
  plate_number: string
  vehicle_type: string
  make: string
  model: string
  year: number
  seats: number
  owner_name: string
  owner_mobile: string
  color: string
  status: 'available' | 'on_trip' | 'maintenance' | 'inactive'
  insurance_expiry: string | null
  mulkiya_expiry: string | null
  notes: string
  created_at: string
}

export interface Driver {
  id: string
  full_name: string
  mobile: string
  license_number: string
  license_expiry: string | null
  nationality: string
  id_number: string
  id_expiry: string | null
  base_salary: number
  joining_date: string | null
  status: 'active' | 'inactive' | 'on_leave'
  notes: string
  created_at: string
}

export interface Staff {
  id: string
  full_name: string
  mobile: string
  role: string
  base_salary: number
  joining_date: string | null
  id_number: string
  id_expiry: string | null
  nationality: string
  status: 'active' | 'inactive'
  notes: string
  created_at: string
}

export interface Trip {
  id: string
  trip_date: string
  vehicle_id: string | null
  driver_id: string | null
  client_id: string | null
  client_name: string
  client_mobile: string
  job_description: string
  pickup_location: string
  dropoff_location: string
  trip_type: 'one_way' | 'round_trip' | 'daily_hire' | 'monthly'
  start_time: string
  end_time: string
  vehicle_type: string
  seats: number
  driver_name: string
  driver_mobile: string
  owner_name: string
  payment_amount: number
  payment_status: 'paid' | 'unpaid' | 'partial'
  payment_method: 'cash' | 'bank' | 'online' | 'other'
  partial_amount: number
  received_by: string
  booked_by: string
  created_by: string | null
  invoice_id: string | null
  lpo_number: string
  reminder_sent: number
  last_reminder: string | null
  remarks: string
  plate_number?: string
  created_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  trip_id: string | null
  description: string
  vehicle_type: string
  duration: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

export interface Invoice {
  id: string
  invoice_number: string
  company_id: string | null
  client_id: string | null
  client_name: string
  client_address: string
  client_trn: string
  customer_code: string
  invoice_date: string
  due_date: string | null
  service_period: string
  po_number: string
  delivery_note: string
  sales_man: string
  lpo_number: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount: number
  total: number
  amount_paid: number
  balance_due: number
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled'
  notes: string
  terms: string
  created_by: string | null
  items?: InvoiceItem[]
  company_name?: string
  company_trn?: string
  company_address?: string
  company_phone?: string
  company_email?: string
  bank_name?: string
  bank_account?: string
  bank_iban?: string
  bank_swift?: string
  created_at: string
}

export interface SOATransaction {
  id: string
  client_id: string
  company_name?: string
  transaction_date: string
  type: 'invoice' | 'payment' | 'credit' | 'debit' | 'adjustment'
  reference: string
  invoice_id: string | null
  description: string
  vehicle_info: string
  lpo_number: string
  debit: number
  credit: number
  balance: number
  status: string
  remarks: string
  created_at: string
}

export interface VehicleExpense {
  id: string
  vehicle_id: string
  plate_number?: string
  vehicle_type?: string
  expense_date: string
  category: 'fuel' | 'maintenance' | 'repair' | 'insurance' | 'registration' | 'fine' | 'parking' | 'other'
  description: string
  amount: number
  vendor: string
  receipt_number: string
  odometer: number | null
  created_at: string
}

export interface DriverSalary {
  id: string
  driver_id: string | null
  staff_id: string | null
  employee_type: 'driver' | 'staff'
  full_name?: string
  mobile?: string
  period_month: number
  period_year: number
  base_salary: number
  overtime_hours: number
  overtime_rate: number
  overtime_amount: number
  deductions: number
  deduction_reason: string
  bonus: number
  gross_salary: number
  amount_paid: number
  remaining: number
  payment_date: string | null
  payment_method: string
  notes: string
  status: 'pending' | 'paid' | 'partial'
  created_at: string
}

export interface Notification {
  id: string
  user_id: string | null
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  is_read: boolean
  entity_type: string | null
  entity_id: string | null
  created_at: string
}

export interface ReminderConfig {
  id: string
  enabled: boolean
  frequency: 'weekly' | 'monthly' | 'custom'
  custom_days: number
  send_email: boolean
  send_inapp: boolean
  email_to: string
  email_from: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string
  last_run: string | null
}

export interface AppSettings {
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  company_trn: string
  currency: string
  tax_rate: string
  invoice_prefix: string
  invoice_counter: string
  theme: string
  anthropic_key: string
  logo_path: string
  bank_name: string
  bank_account: string
  bank_iban: string
  bank_swift: string
  bank_beneficiary: string
}

export interface DashboardData {
  total_trips: { cnt: number }
  revenue: { total: number }
  unpaid: { total: number }
  total_expenses: { total: number }
  active_vehicles: { cnt: number }
  active_drivers: { cnt: number }
  pending_invoices: { cnt: number; amount: number }
  monthly_revenue: Array<{ month: string; revenue: number; trips: number }>
  monthly_expenses: Array<{ month: string; expenses: number }>
  top_clients: Array<{ client_name: string; total: number }>
  top_vehicles: Array<{ vehicle_type: string; revenue: number; trips: number }>
  expense_breakdown: Array<{ category: string; total: number }>
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export type Page =
  | 'dashboard'
  | 'clients'
  | 'trips'
  | 'invoices'
  | 'soa'
  | 'vehicles'
  | 'drivers'
  | 'salaries'
  | 'expenses'
  | 'reports'
  | 'users'
  | 'settings'
  | 'reminders'
  | 'activity'
  | 'ai'
