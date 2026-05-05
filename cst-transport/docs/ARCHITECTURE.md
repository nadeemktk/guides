# CST Transport Manager – System Architecture

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Tailwind CSS | 3.x | Styling |
| Recharts | 2.x | Data visualization |
| Lucide React | 0.344 | Icons |
| date-fns | 3.x | Date manipulation |

### Desktop Runtime
| Technology | Version | Purpose |
|-----------|---------|---------|
| Electron | 29.x | Desktop wrapper |
| Vite | 5.x | Build tool & dev server |
| vite-plugin-electron | 0.28 | Electron + Vite integration |

### Backend (Electron Main Process)
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Runtime |
| better-sqlite3 | 9.x | SQLite database |
| bcryptjs | 2.x | Password hashing |
| nodemailer | 6.x | Email sending |
| @anthropic-ai/sdk | 0.30 | AI integration |
| uuid | 9.x | ID generation |

### Export & Documents
| Technology | Purpose |
|-----------|---------|
| jsPDF | PDF generation |
| jspdf-autotable | PDF tables |
| ExcelJS | Excel export |
| Browser Print API | Invoice printing |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CST Transport Manager                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Renderer Process (React)                 │    │
│  │                                                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │Dashboard │ │  Trips   │ │ Invoices │ │   SOA    │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │ Vehicles │ │ Drivers  │ │Salaries  │ │Expenses  │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │ Reports  │ │AI Chat   │ │  Users   │ │Settings  │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  │                                                          │    │
│  │  Context Layer: AuthContext | AppContext                 │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                              │ IPC (contextBridge)               │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │                  Main Process (Node.js)                   │   │
│  │                                                           │   │
│  │  IPC Handlers:                                            │   │
│  │  auth:* | users:* | clients:* | vehicles:* | drivers:*   │   │
│  │  trips:* | invoices:* | soa:* | expenses:* | salaries:*  │   │
│  │  notifications:* | reminders:* | reports:* | ai:* | ...  │   │
│  │                                                           │   │
│  │  Services:                                                │   │
│  │  ┌────────────┐ ┌─────────────┐ ┌───────────────────┐   │   │
│  │  │   SQLite   │ │  Reminder   │ │  Anthropic Claude  │   │   │
│  │  │ (better-   │ │  Scheduler  │ │   claude-opus-4-7  │   │   │
│  │  │ sqlite3)   │ │ (setInterval│ │  (AI chat context) │   │   │
│  │  └────────────┘ └─────────────┘ └───────────────────┘   │   │
│  │  ┌────────────┐ ┌─────────────┐                          │   │
│  │  │ nodemailer │ │  bcryptjs   │                          │   │
│  │  │ (SMTP rem) │ │  (auth)     │                          │   │
│  │  └────────────┘ └─────────────┘                          │   │
│  └───────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │              SQLite Database (cst_transport.db)            │   │
│  │                                                            │   │
│  │  Tables: users | clients | vehicles | drivers | trips     │   │
│  │          invoices | invoice_items | soa_transactions       │   │
│  │          vehicle_expenses | driver_assignments             │   │
│  │          driver_salaries | payment_reminders               │   │
│  │          reminder_config | chat_history | activity_log     │   │
│  │          notifications | app_settings                      │   │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Summary)

### Core Tables
```sql
users           → Authentication, roles, granular permissions (JSON)
clients         → Companies/individuals, contact details, credit limits
vehicles        → Fleet, documents (insurance/mulkiya), status
drivers         → Profiles, license/ID docs, base salary
```

### Operations Tables
```sql
trips           → Daily trip log (vehicle, driver, client, payment)
invoices        → Invoice headers (amounts, tax, status)
invoice_items   → Line items for each invoice
soa_transactions→ Client ledger (running balance)
```

### Financial Tables
```sql
vehicle_expenses→ Fuel, maintenance, repair per vehicle
driver_salaries → Monthly salary + overtime + deductions
driver_assignments → Which driver is assigned to which vehicle
```

### System Tables
```sql
payment_reminders → Reminder history log
reminder_config   → Scheduler settings (SMTP, frequency)
chat_history      → AI conversation history
activity_log      → Full audit trail
notifications     → In-app notification queue
app_settings      → Key-value settings store
```

---

## Security Model

### Authentication
- Passwords hashed with bcrypt (cost factor 10)
- Sessions stored in localStorage (Electron context)
- Logout clears local session

### Authorization (RBAC)
- **Admin:** Full access to everything
- **Editor:** Configurable per-module access
- **Visitor:** Read-only by default, configurable

Permission format (stored as JSON in users table):
```json
{
  "dashboard": { "view": true, "edit": false },
  "invoices":  { "create": true, "edit": true, "delete": false, "print": true },
  "trips":     { "view": true, "create": true, "edit": true, "delete": false }
}
```

### Data Security
- All data stored locally (SQLite)
- No data sent to external servers except:
  - Anthropic API (AI chat, opt-in, requires user API key)
  - SMTP server (email reminders, opt-in)
- Context isolation enabled in Electron
- Content Security Policy (CSP) header set

---

## IPC Communication

All renderer→main communication uses Electron's `contextBridge` + `ipcMain`:

```
Renderer (React) → window.api.{method}()
                      ↓ (preload.ts contextBridge)
Main Process → ipcMain.handle('{channel}', handler)
                      ↓
            SQLite / External Service
                      ↓
Main Process → returns result
                      ↑ (Promise resolution)
Renderer → result
```

---

## AI Integration (CST CHAT INTELLIGENT)

### Flow
1. User sends message in chat UI
2. Renderer calls `window.api.aiChat({ messages, apiKey })`
3. Main process builds system prompt with live DB context
4. Sends to Anthropic claude-opus-4-7 via SDK
5. Response returned and displayed
6. Conversation saved to `chat_history` table

### Context Injection
The AI receives real-time data summary including:
- Current trip stats (total, paid revenue, unpaid)
- Invoice summary (outstanding balances)
- Vehicle and driver counts
- Top clients by revenue
- Recent and unpaid trips (last 20)

### Permission Awareness
Future enhancement: Filter context data based on logged-in user's permissions.

---

## Reminder Scheduler

```
Electron startup → setTimeout(5s) → checkAndSendReminders()
                → setInterval(1hr) → checkAndSendReminders()

checkAndSendReminders():
  1. Load reminder_config
  2. Check if interval has elapsed since last_run
  3. Query trips WHERE payment_status='unpaid' AND date < 7 days ago
  4. For each trip:
     a. Create in-app notification
     b. Send email via nodemailer (if SMTP configured)
     c. Log to payment_reminders table
     d. Update trip.reminder_sent count
  5. Update reminder_config.last_run
```

---

## File Structure

```
cst-transport/
├── electron/
│   ├── main.ts              # Main process, IPC handlers, scheduler
│   ├── preload.ts           # contextBridge API exposure
│   └── database/
│       ├── schema.sql       # Full database schema
│       └── db.ts            # SQLite connection helpers
├── src/
│   ├── main.tsx             # React entry point
│   ├── App.tsx              # Root component
│   ├── types/index.ts       # TypeScript interfaces
│   ├── styles/globals.css   # Tailwind + custom CSS
│   ├── contexts/
│   │   ├── AuthContext.tsx  # Login, logout, permissions
│   │   └── AppContext.tsx   # Settings, notifications, navigation
│   └── components/
│       ├── auth/            # Login page
│       ├── layout/          # Sidebar, header, main layout
│       ├── dashboard/       # KPI cards, charts
│       ├── invoices/        # Invoice CRUD, print, payment
│       ├── soa/             # Statement of account ledger
│       ├── trips/           # Trip management, reminders
│       ├── vehicles/        # Fleet + expense management
│       ├── drivers/         # Driver + salary management
│       ├── reports/         # Analytics, CSV export
│       ├── users/           # RBAC user management
│       ├── ai/              # CST CHAT INTELLIGENT
│       └── shared/          # Modal, ConfirmDialog, etc.
├── scripts/
│   └── seed.ts              # Sample data seeder
├── docs/
│   ├── INSTALLATION.md      # This file
│   └── ARCHITECTURE.md      # Architecture guide
├── assets/                  # Icons, logos
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Scaling Considerations

### SQLite → PostgreSQL Migration
The database layer (`electron/database/db.ts`) is abstracted. To migrate:
1. Replace `better-sqlite3` with `pg` or `drizzle-orm`
2. Update `db.ts` helpers
3. Convert schema to PostgreSQL syntax
4. Add connection pool management

### Adding New Modules
1. Add route to `Page` type in `src/types/index.ts`
2. Create IPC handlers in `electron/main.ts`
3. Expose via `electron/preload.ts`
4. Add to sidebar in `components/layout/Sidebar.tsx`
5. Add lazy import in `components/layout/MainLayout.tsx`
6. Create component in appropriate `src/components/` folder

### Cloud Sync (Future)
Architecture supports adding:
- Real-time sync via WebSocket
- REST API layer
- JWT-based authentication
- Mobile app via React Native
