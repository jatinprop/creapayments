# CREA(I) — Real Estate Associates Payment & Membership Suite

Official payment, membership renewal, and event ticketing web application for **CREA(I)** (*Confederation of Real Estate Associates - India*).

---

## 📁 Directory Location
- **Path**: `D:\crea\CREA APP`
- **Primary Entry Points**:
  - `index.html` (Standalone Client App — Works offline & in any modern browser)
  - `server.js` (Optional zero-dependency Node.js HTTP server & REST API)
  - `api/` (Vercel Serverless Functions: data, payment, head, members, renew, reset)
  - `supabase/` (PostgreSQL schema & seed scripts)
  - `package.json` (`npm start`, `npm run seed:supabase`, `npm run deploy`)

---

## 🚀 How to Run & Deploy the Application

You have three deployment and execution modes:

### Option 1: Instant Browser Mode (Zero Setup / Zero Installs)
Simply double-click [`index.html`](file:///D:/crea/CREA%20APP/index.html) or open it directly in Google Chrome, Microsoft Edge, or any modern browser. All features (simulated payments, discriminatory pricing, 18% GST calculation, printable tax invoices, admin analytics, CSV export) run seamlessly with browser persistence (`localStorage`).

### Option 2: Node.js Local Server Mode
Open PowerShell or Command Prompt in `D:\crea\CREA APP` and run:
```powershell
node server.js
```
or
```powershell
npm start
```
Then visit: **`http://localhost:4000`** in your browser.

### Option 3: Production Cloud Mode (Vercel + Supabase)
Deploy to Vercel with serverless functions backed by Supabase PostgreSQL:
```powershell
# 1. Initialize Supabase Schema & Seed Data
# In Supabase SQL Editor: Run supabase/schema.sql and supabase/seed.sql
# Or run automated migration:
npm run seed:supabase

# 2. Deploy to Vercel
npx vercel
# For production:
npx vercel --prod
```

---

## 🔑 Demo Access Credentials

### A. Member Portal
Log in using either mobile number or email:
- **Regular Member**: `9800000001` (*Ramesh Gupta - Apex Prime Realty*)
- **New Member**: `9800000002` (*Sneha Patel - Lotus Property Consultants*)
- **Board Member**: `9800000003` (*Vikramaditya Rao - Deccan Realtors*)

> **Tip:** The login screen has **1-Click Quick Demo Login** buttons so you don't even have to type them!

### B. Admin Portal
- Click **"🛡️ Admin Portal"** in the top navigation or bottom link.
- Enter the Admin Secret PIN: **`crea-admin`**

---

## 🛠️ Key Features Built According to Specifications

### 1. 18% GST Automatic Computation
- Admin configures base prices **excluding GST**.
- The system automatically computes:
  - **Base Fee (Taxable Value)**
  - **Central GST (CGST @ 9%)**
  - **State GST (SGST @ 9%)**
  - **Total Amount Payable (incl. 18% GST)**
- Every generated tax invoice specifies HSN/SAC code `9983` and itemizes the CGST + SGST split.

### 2. Sequential Invoice Numbering (`CREA/YYZZ/<HEAD>/<SERIAL>`)
- Formatted as `CREA/2627/<HEAD_CODE>/<0001>`:
  - `CREA`: Association prefix.
  - `2627`: Indian Financial Year (runs April to March; FY 2026-27 is `2627`).
  - `HEAD_CODE`: `MEM` (Membership), `TRN1` (Training 1), `TRN2` (Training 2), `EVT1` (Conclave Gala), etc.
  - `SERIAL`: Monotonically increasing 4-digit serial (`0001`, `0002`, `0003`...) based on timestamp sequence across **all** heads for the financial year.

### 3. Discriminatory Pricing Tiers
Each payment head supports 4 custom price levels:
1. **New Member** (e.g. ₹12,000 + GST for membership, ₹1,500 + GST for training)
2. **Member** (e.g. ₹10,000 + GST for membership, ₹1,200 + GST for training)
3. **Board Member** (e.g. ₹8,000 + GST for membership, ₹0 complimentary for training)
4. **Non-Member / Guest** (e.g. ₹2,500 + GST for training; blank for exclusive memberships)

> If a price is left blank for a category, that category will **not** see that payment head.

### 4. Closing / Active Until Dates
Every payment head enforces a strict cutoff datetime (`activeUntil`). Once the deadline passes, the head is automatically locked and hidden from new registrations.

### 5. ~500-Word Event Write-Ups & AI Draft Assistant
- Every payment head contains an event write-up detailing syllabus, speaker profiles, agenda, and venue directions.
- In the Admin Head Creator, a **"🪄 Draft with AI Assistant"** button automatically writes a structured ~500-word description from the title, venue, and date with a live word counter.

### 6. Official Printable / Downloadable Tax Invoice
- Clicking **"View / Print Tax Invoice"** opens a compliant tax invoice conforming to Rule 46 of the CGST Rules, 2017.
- Complete with CREA(I) registered office address (No. 702, Barton Center, #84 M.G.Road,Bangalore-560001,Karnataka,India), GSTIN (`29AABAC7593A1ZR`), SAC code, digital verification seal, and clean print CSS for A4 PDF export.

### 7. Admin Dashboard & Analytics
- **KPI Metrics**: Total Gross Collections, Base Value, 18% GST Collected, Member vs Non-Member revenue split.
- **Head-wise Registrations Table**: Compares Member registrations vs Guest registrations separately.
- **Transactions Ledger**: Searchable list of all payments with direct invoice viewer.
- **Dynamic Filtered Totals in Ledger**: Real-time aggregation of filtered heads, count, taxable Base (₹), 18% GST (₹), and Gross Total (₹) with a top KPI summary strip, head-by-head breakdown pills, and an aligned table footer `<tfoot>`.
- **CSV Export**: 1-Click download of `CREA_Payments_Ledger.csv`.
- **1-Click Yearly Renewal**: Promotes all "New Members" to "Regular Members" and publishes the upcoming year's renewal head with one click.
- **Simulation Tools**: "⚡ Simulate 10" to test volume, and "🗑️ Reset All" to reset numbering to `0001`.
