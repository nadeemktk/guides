# CST Transport Manager – Installation & Setup Guide

## City Star Transport Passengers LLC
### Enterprise Transport Management System v1.0

---

## 📋 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10 (64-bit) | Windows 11 (64-bit) |
| RAM | 4 GB | 8 GB+ |
| Storage | 500 MB | 2 GB+ |
| Display | 1024×768 | 1440×900+ |
| Network | Not required | Internet for AI features |

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js v18+ (https://nodejs.org)
- npm v9+

### 1. Install Dependencies
```bash
cd cst-transport
npm install
```

### 2. Start Development Mode
```bash
npm run dev
```
This starts Vite (React hot-reload) on port 5173 and launches Electron.

### 3. Seed Sample Data (Optional)
```bash
npm run seed
```
This creates a `sample_data.db` with demo data including:
- 3 user accounts
- 6 clients/companies
- 6 vehicles
- 5 drivers
- 60 sample trips
- 15 invoices
- 40 expense records

---

## 🏗️ Build for Production (Windows)

### Build Installer
```bash
npm run build:win
```
Creates `release/` folder containing:
- `CST Transport Manager Setup.exe` – NSIS installer
- `CST Transport Manager.exe` – Portable executable

### Distribution
1. Copy the installer to the target Windows machine
2. Run the installer (no admin rights required)
3. Launch from Desktop shortcut or Start Menu

---

## 🔐 Default Login Credentials

| Username | Password    | Role    |
|----------|-------------|---------|
| admin    | admin123    | Admin   |

> ⚠️ **IMPORTANT:** Change the admin password immediately after first login!

---

## ⚙️ First-Time Configuration

### 1. Company Settings
Go to **Settings** → **Company** tab:
- Update company name, address, phone, email
- Set Tax Registration Number (TRN)
- Set preferred currency (default: AED)

### 2. Invoice Settings
Go to **Settings** → **System** tab:
- Configure invoice prefix (default: INV)
- Set starting invoice number
- Set default tax rate (default: 5% UAE VAT)

### 3. AI Configuration (CST CHAT INTELLIGENT)
Go to **Settings** → **AI / API** tab:
- Enter your Anthropic API key
- Get your key at: https://console.anthropic.com
- The AI feature requires an active Anthropic account

### 4. Email Reminders
Go to **Reminders** → **Configuration** tab:
- Enable email reminders
- Configure SMTP server details
- For Gmail: use smtp.gmail.com, port 587, App Password

---

## 📁 Data Storage

The application stores all data locally:
- **Windows:** `%APPDATA%\cst-transport\cst_transport.db`
- **SQLite format:** Compatible with DB Browser for SQLite

### Backup
Click the **database icon** in the header to create a manual backup.
Backups are saved as `.db` files to your chosen location.

---

## 🔧 Module Overview

| Module | Description |
|--------|-------------|
| Dashboard | KPI cards, revenue charts, top clients |
| Daily Trips | Log trips, toggle payments, send reminders |
| Invoices | Create/manage invoices with PDF print |
| Statement of A/C | Client ledger with running balances |
| Vehicles | Fleet management, document tracking |
| Drivers | Driver profiles, license/ID tracking |
| Driver Salaries | Monthly salary calculation & slip printing |
| Vehicle Expenses | Fuel, maintenance, repair tracking |
| Reports | Financial & operational reports with CSV export |
| CST CHAT AI | AI business assistant (requires API key) |
| Reminders | Automated payment reminder system |
| Users & Roles | RBAC with granular permissions |
| Activity Log | Full audit trail |
| Settings | Company info, system config |

---

## 🤖 CST CHAT INTELLIGENT

The AI assistant uses **Claude claude-opus-4-7** and has real-time access to:
- All trip and payment data
- Invoice and SOA balances
- Vehicle expenses and profit
- Driver salary information
- Top clients and trends

### Example Queries
- "Show me all unpaid invoices"
- "How much profit did we make this month?"
- "Which clients have outstanding balances?"
- "Driver Ali's remaining salary?"
- "Vehicle expense summary for this month"
- "Generate a financial summary report"

---

## 🛡️ Security

- All passwords are **bcrypt-hashed** (10 rounds)
- API keys are stored **locally only**
- Role-based access control with **granular permissions**
- Full **audit trail** of all user actions
- Data never leaves your device (except AI API calls to Anthropic)

---

## 📧 Payment Reminders

Configure automated reminders for unpaid trips:
1. Go to **Reminders** → **Configuration**
2. Enable the reminder system
3. Set frequency (weekly/monthly/custom)
4. Configure SMTP for email delivery
5. Reminders are sent to: **citystar815@gmail.com** by default

Email includes:
- Client name and contact
- Outstanding amount
- Overdue duration (days)
- Trip/job details

---

## 🔄 Future Roadmap

- [ ] Mobile app (iOS/Android) with cloud sync
- [ ] Multi-company support
- [ ] GPS vehicle tracking integration
- [ ] WhatsApp reminder integration
- [ ] Customer self-service portal
- [ ] Advanced AI analytics and forecasting
- [ ] Third-party accounting software integration (QuickBooks, Zoho)

---

## 🆘 Troubleshooting

### Application won't start
- Ensure Node.js 18+ is installed
- Run `npm install` again
- Check Windows Defender isn't blocking the app

### Database errors
- Delete `%APPDATA%\cst-transport\cst_transport.db` to reset
- ⚠️ This will erase all data

### AI Chat not responding
- Verify Anthropic API key in Settings
- Check internet connection
- Ensure API key has sufficient credits

### Email reminders not sending
- Verify SMTP credentials
- For Gmail: enable "App Passwords" in Google Account settings
- Check port 587 is not blocked by firewall

---

## 📞 Support

**City Star Transport Passengers LLC**
📧 citystar815@gmail.com
🌐 Dubai, United Arab Emirates

---

*CST Transport Manager v1.0 – Built with ❤️ for City Star Transport*
