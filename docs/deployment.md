# Deployment Guide (Vercel & Supabase)

## Overview
This document guides you through deploying the **CREA(I) Payment & Membership Suite** to **Vercel** with **Supabase PostgreSQL** as the persistent cloud database.

---

## 1. Prerequisites
- **Node.js**: v20.x or v22.x installed.
- **Vercel Account**: Free or Pro account at [vercel.com](https://vercel.com).
- **Supabase Account**: Free or Pro account at [supabase.com](https://supabase.com).
- **Vercel CLI**: Installed globally or via `npx vercel`.

---

## 2. Environment Variables Reference

Configure these in the **Vercel Project Dashboard** (*Settings -> Environment Variables*) and in your local `.env.local`:

| Variable Name | Description | Where to find it |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL (`https://xyz.supabase.co`) | Supabase Dashboard -> Settings -> API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Anon Key for browser/client queries | Supabase Dashboard -> Settings -> API |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged Secret Key for serverless functions | Supabase Dashboard -> Settings -> API |
| `ADMIN_SECRET_KEY` | Admin Secret PIN / Key (default: `crea-admin`) | Admin security setting |

---

## 3. Supabase Database Setup

### Step A: Execute SQL Schema
1. Open your project on [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** in the left sidebar.
3. Click **New Query**, paste the complete contents of `supabase/schema.sql`, and click **Run**.
4. This creates all 5 tables (`members`, `payment_heads`, `payments`, `email_logs`, `invoice_counters`), RLS policies, indexing, and the sequential invoicing stored procedure.

### Step B: Seed Initial Data
You have two options:
- **Option 1 (SQL Editor)**: Paste and run `supabase/seed.sql` in the SQL Editor.
- **Option 2 (CLI Script)**: Run the automated Node.js migration script:
  ```bash
  node scripts/seed-supabase.js
  ```

---

## 4. Vercel Deployment

### Method A: Instant Vercel CLI Deployment
From the project folder `D:\crea\CREA APP`:

```bash
# 1. Login to Vercel (if not already logged in)
npx vercel login

# 2. Deploy Preview Build
npx vercel

# 3. Deploy Production Build
npx vercel --prod
```

### Method B: Git-Integrated Automated Deployments
1. Initialize Git and commit your repository:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit for CREA(I) Vercel and Supabase suite"
   ```
2. Push to your GitHub repository (e.g. `github.com/your-org/crea-suite`).
3. Import the repository in [Vercel Dashboard](https://vercel.com/new).
4. Add the Environment Variables from Section 2.
5. Click **Deploy**. Vercel will build and assign your production domain.

---

## 5. Verification & Health Check
Once deployed, verify:
- **Homepage**: `https://your-project.vercel.app/`
- **Data Endpoint**: `https://your-project.vercel.app/api/data` returns `{ success: true, data: { ... } }`
- **Admin Dashboard**: Click **🛡️ Admin Portal** and enter `crea-admin` to view live KPIs, member lists, and the transactions ledger.
- **Resilient Fallback**: If Supabase credentials are missing or the database is paused, the suite automatically falls back to local data persistence without failing user requests.
