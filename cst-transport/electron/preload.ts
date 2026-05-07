import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Auth
  login:               (data: any) => ipcRenderer.invoke('auth:login', data),
  logout:              (userId: string) => ipcRenderer.invoke('auth:logout', userId),
  // Users
  listUsers:           () => ipcRenderer.invoke('users:list'),
  createUser:          (data: any) => ipcRenderer.invoke('users:create', data),
  updateUser:          (data: any) => ipcRenderer.invoke('users:update', data),
  deleteUser:          (id: string) => ipcRenderer.invoke('users:delete', id),
  // Companies
  listCompanies:       () => ipcRenderer.invoke('companies:list'),
  getCompany:          (id: string) => ipcRenderer.invoke('companies:get', id),
  createCompany:       (data: any) => ipcRenderer.invoke('companies:create', data),
  updateCompany:       (data: any) => ipcRenderer.invoke('companies:update', data),
  deleteCompany:       (id: string) => ipcRenderer.invoke('companies:delete', id),
  // Clients
  listClients:         () => ipcRenderer.invoke('clients:list'),
  getClient:           (id: string) => ipcRenderer.invoke('clients:get', id),
  createClient:        (data: any) => ipcRenderer.invoke('clients:create', data),
  updateClient:        (data: any) => ipcRenderer.invoke('clients:update', data),
  deleteClient:        (id: string) => ipcRenderer.invoke('clients:delete', id),
  // Vehicles
  listVehicles:        () => ipcRenderer.invoke('vehicles:list'),
  getVehicle:          (id: string) => ipcRenderer.invoke('vehicles:get', id),
  createVehicle:       (data: any) => ipcRenderer.invoke('vehicles:create', data),
  updateVehicle:       (data: any) => ipcRenderer.invoke('vehicles:update', data),
  deleteVehicle:       (id: string) => ipcRenderer.invoke('vehicles:delete', id),
  // Drivers
  listDrivers:         () => ipcRenderer.invoke('drivers:list'),
  getDriver:           (id: string) => ipcRenderer.invoke('drivers:get', id),
  createDriver:        (data: any) => ipcRenderer.invoke('drivers:create', data),
  updateDriver:        (data: any) => ipcRenderer.invoke('drivers:update', data),
  deleteDriver:        (id: string) => ipcRenderer.invoke('drivers:delete', id),
  // Staff
  listStaff:           () => ipcRenderer.invoke('staff:list'),
  createStaff:         (data: any) => ipcRenderer.invoke('staff:create', data),
  updateStaff:         (data: any) => ipcRenderer.invoke('staff:update', data),
  deleteStaff:         (id: string) => ipcRenderer.invoke('staff:delete', id),
  // Trips
  listTrips:           (filters?: any) => ipcRenderer.invoke('trips:list', filters),
  getTrip:             (id: string) => ipcRenderer.invoke('trips:get', id),
  createTrip:          (data: any) => ipcRenderer.invoke('trips:create', data),
  updateTrip:          (data: any) => ipcRenderer.invoke('trips:update', data),
  deleteTrip:          (id: string) => ipcRenderer.invoke('trips:delete', id),
  toggleTripPayment:   (data: any) => ipcRenderer.invoke('trips:toggle_payment', data),
  tripStats:           () => ipcRenderer.invoke('trips:stats'),
  // Invoices
  listInvoices:        (filters?: any) => ipcRenderer.invoke('invoices:list', filters),
  getInvoice:          (id: string) => ipcRenderer.invoke('invoices:get', id),
  createInvoice:       (data: any) => ipcRenderer.invoke('invoices:create', data),
  updateInvoice:       (data: any) => ipcRenderer.invoke('invoices:update', data),
  deleteInvoice:       (id: string) => ipcRenderer.invoke('invoices:delete', id),
  recordPayment:       (data: any) => ipcRenderer.invoke('invoices:record_payment', data),
  invoiceStats:        () => ipcRenderer.invoke('invoices:stats'),
  // SOA
  listSOA:             (filters?: any) => ipcRenderer.invoke('soa:list', filters),
  addSOATransaction:   (data: any) => ipcRenderer.invoke('soa:add_transaction', data),
  updateSOATransaction:(data: any) => ipcRenderer.invoke('soa:update_transaction', data),
  deleteSOATransaction:(id: string) => ipcRenderer.invoke('soa:delete_transaction', id),
  getSOABalance:       (clientId: string) => ipcRenderer.invoke('soa:balance', clientId),
  // Expenses
  listExpenses:        (filters?: any) => ipcRenderer.invoke('expenses:list', filters),
  createExpense:       (data: any) => ipcRenderer.invoke('expenses:create', data),
  updateExpense:       (data: any) => ipcRenderer.invoke('expenses:update', data),
  deleteExpense:       (id: string) => ipcRenderer.invoke('expenses:delete', id),
  getVehicleProfit:    (data: any) => ipcRenderer.invoke('expenses:profit', data),
  // Assignments
  listAssignments:     (driverId: string) => ipcRenderer.invoke('assignments:list', driverId),
  createAssignment:    (data: any) => ipcRenderer.invoke('assignments:create', data),
  // Salaries
  listSalaries:        (filters?: any) => ipcRenderer.invoke('salaries:list', filters),
  getSalary:           (data: any) => ipcRenderer.invoke('salaries:get', data),
  getStaffSalary:      (data: any) => ipcRenderer.invoke('salaries:get_staff', data),
  saveSalary:          (data: any) => ipcRenderer.invoke('salaries:save', data),
  // Notifications
  listNotifications:   (userId: string) => ipcRenderer.invoke('notifications:list', userId),
  markRead:            (id: string) => ipcRenderer.invoke('notifications:mark_read', id),
  markAllRead:         (userId: string) => ipcRenderer.invoke('notifications:mark_all_read', userId),
  // Reminders
  listReminders:       () => ipcRenderer.invoke('reminders:list'),
  getReminderConfig:   () => ipcRenderer.invoke('reminders:config_get'),
  saveReminderConfig:  (data: any) => ipcRenderer.invoke('reminders:config_save', data),
  runRemindersNow:     () => ipcRenderer.invoke('reminders:run_now'),
  // Settings
  getSettings:         () => ipcRenderer.invoke('settings:get'),
  saveSettings:        (data: any) => ipcRenderer.invoke('settings:save', data),
  // Activity Log
  listActivity:        (limit?: number) => ipcRenderer.invoke('activity:list', limit),
  // Reports
  getDashboard:        () => ipcRenderer.invoke('reports:dashboard'),
  getTripsReport:      (filters: any) => ipcRenderer.invoke('reports:trips', filters),
  getFinancialReport:  (filters: any) => ipcRenderer.invoke('reports:financial', filters),
  // AI
  aiChat:              (data: any) => ipcRenderer.invoke('ai:chat', data),
  aiChatHistory:       (data: any) => ipcRenderer.invoke('ai:chat_history', data),
  // File System
  saveDialog:          (data: any) => ipcRenderer.invoke('dialog:save', data),
  openDialog:          (data: any) => ipcRenderer.invoke('dialog:open', data),
  openPath:            (path: string) => ipcRenderer.invoke('shell:open_path', path),
  // Search
  globalSearch:        (query: string) => ipcRenderer.invoke('search:global', query),
  // Backup
  createBackup:        () => ipcRenderer.invoke('backup:create')
}

contextBridge.exposeInMainWorld('api', api)
export type ElectronAPI = typeof api
