import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataFilePath = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return "'" + String(val).replace(/'/g, "''") + "'";
}

const schemaSql = `-- ==============================================================================
-- CREA(I) PAYMENT & MEMBERSHIP MANAGEMENT SUITE - UNIFIED SUPABASE SCHEMA
-- Confederation of Real Estate Associates (India)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables to ensure a clean, authoritative state
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invoice_counters CASCADE;
DROP TABLE IF EXISTS public.payment_heads CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;

-- 1. Members Table
CREATE TABLE public.members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('member', 'associate_member')) DEFAULT 'member',
  parent_member_id TEXT DEFAULT NULL,
  parent_member_name TEXT DEFAULT NULL,
  parent_member_mobile TEXT DEFAULT NULL,
  company TEXT NOT NULL DEFAULT 'Independent Broker',
  city TEXT NOT NULL DEFAULT 'Bangalore',
  gstin TEXT DEFAULT NULL,
  rera_number TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'deactivated')) DEFAULT 'active',
  last_paid_fy TEXT DEFAULT NULL,
  payment_means TEXT DEFAULT NULL,
  activation_note TEXT DEFAULT NULL,
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_members_mobile ON public.members(mobile);
CREATE INDEX idx_members_email ON public.members(email);
CREATE INDEX idx_members_category ON public.members(category);
CREATE INDEX idx_members_status ON public.members(status);
CREATE INDEX idx_members_parent ON public.members(parent_member_id);

-- 2. Payment Heads Table
CREATE TABLE public.payment_heads (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('membership', 'training', 'event')),
  event_date TEXT NOT NULL,
  event_time TEXT DEFAULT 'Full Day',
  venue TEXT DEFAULT 'CREA(I) Centre, Bangalore',
  active_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'deactivated', 'deleted')) DEFAULT 'active',
  is_live BOOLEAN NOT NULL DEFAULT false,
  gift_enabled BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 3,
  prices JSONB NOT NULL DEFAULT '{"associate_member": null, "member": null, "non_member": null}'::jsonb,
  writeup TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_heads_code ON public.payment_heads(code);
CREATE INDEX idx_heads_status ON public.payment_heads(status);
CREATE INDEX idx_heads_is_live ON public.payment_heads(is_live);
CREATE INDEX idx_heads_gift_enabled ON public.payment_heads(gift_enabled);
CREATE INDEX idx_heads_priority ON public.payment_heads(priority);

-- 3. Invoice Sequence Counters Table
CREATE TABLE public.invoice_counters (
  fy_code TEXT PRIMARY KEY,
  last_serial INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Payments Table
CREATE TABLE public.payments (
  id TEXT PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  serial INTEGER NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  head_id TEXT,
  head_code TEXT NOT NULL,
  head_title TEXT NOT NULL,
  payer_type TEXT NOT NULL CHECK (payer_type IN ('member', 'non_member')),
  payer_category TEXT NOT NULL CHECK (payer_category IN ('associate_member', 'member', 'non_member')),
  payer_id TEXT,
  payer_name TEXT NOT NULL,
  payer_mobile TEXT NOT NULL,
  payer_email TEXT NOT NULL,
  payer_company TEXT DEFAULT '',
  payer_gstin TEXT DEFAULT '',
  payer_address TEXT DEFAULT '',
  attended BOOLEAN NOT NULL DEFAULT false,
  attended_at TIMESTAMPTZ DEFAULT NULL,
  gift_collected BOOLEAN NOT NULL DEFAULT false,
  gift_collected_at TIMESTAMPTZ DEFAULT NULL,
  base_amount NUMERIC NOT NULL,
  cgst NUMERIC NOT NULL,
  sgst NUMERIC NOT NULL,
  total_gst NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  method TEXT NOT NULL DEFAULT 'Simulated Gateway (Instant Checkout)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_payments_invoice ON public.payments(invoice_no);
CREATE INDEX idx_payments_payer_mobile ON public.payments(payer_mobile);
CREATE INDEX idx_payments_payer_id ON public.payments(payer_id);
CREATE INDEX idx_payments_head_id ON public.payments(head_id);

-- 5. Email Dispatch Logs Table
CREATE TABLE public.email_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  recipient TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  invoice_no TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'Dispatched (Simulated SMTP)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Atomic Invoice Sequence Function
CREATE OR REPLACE FUNCTION public.fn_next_invoice_number(p_head_code text, p_date timestamptz DEFAULT now())
RETURNS TABLE(invoice_no text, serial integer) AS $$
DECLARE
  v_year int;
  v_month int;
  v_start_year int;
  v_end_year int;
  v_fy text;
  v_serial int;
BEGIN
  v_year := extract(year FROM p_date);
  v_month := extract(month FROM p_date);
  IF v_month >= 4 THEN
    v_start_year := v_year;
    v_end_year := v_year + 1;
  ELSE
    v_start_year := v_year - 1;
    v_end_year := v_year;
  END IF;
  v_fy := lpad((v_start_year % 100)::text, 2, '0') || lpad((v_end_year % 100)::text, 2, '0');

  INSERT INTO public.invoice_counters (fy_code, last_serial, updated_at)
  VALUES (v_fy, 1, timezone('utc'::text, now()))
  ON CONFLICT (fy_code) DO UPDATE
  SET last_serial = public.invoice_counters.last_serial + 1,
      updated_at = timezone('utc'::text, now())
  RETURNING invoice_counters.last_serial INTO v_serial;

  invoice_no := 'CREA/' || v_fy || '/' || upper(p_head_code) || '/' || lpad(v_serial::text, 4, '0');
  serial := v_serial;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Row Level Security Policies
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access on members" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on payment_heads" ON public.payment_heads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on invoice_counters" ON public.invoice_counters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on email_logs" ON public.email_logs FOR ALL USING (true) WITH CHECK (true);
`;

fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), schemaSql, 'utf8');

// 2. Generate seed.sql
let seedSql = `-- ==============================================================================
-- CREA(I) PAYMENT & MEMBERSHIP SUITE - AUTHORITATIVE SEED DATA
-- ==============================================================================

-- 1. Seed Members (7 Members)
INSERT INTO public.members (id, name, mobile, email, category, parent_member_id, parent_member_name, parent_member_mobile, company, city, gstin, rera_number, address, status, last_paid_fy, payment_means, activation_note, joined_date)
VALUES
`;

const memberRows = data.members.map(m => {
  return `  (${escapeSql(m.id)}, ${escapeSql(m.name)}, ${escapeSql(m.mobile)}, ${escapeSql(m.email)}, ${escapeSql(m.category)}, ${escapeSql(m.parentMemberId)}, ${escapeSql(m.parentMemberName)}, ${escapeSql(m.parentMemberMobile)}, ${escapeSql(m.company)}, ${escapeSql(m.city)}, ${escapeSql(m.gstin)}, ${escapeSql(m.reraNumber || null)}, ${escapeSql(m.address)}, ${escapeSql(m.status)}, ${escapeSql(m.lastPaidFY)}, ${escapeSql(m.paymentMeans)}, ${escapeSql(m.activationNote)}, ${escapeSql(m.joinedDate)})`;
});

seedSql += memberRows.join(',\n') + `
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  mobile = EXCLUDED.mobile,
  email = EXCLUDED.email,
  category = EXCLUDED.category,
  parent_member_id = EXCLUDED.parent_member_id,
  parent_member_name = EXCLUDED.parent_member_name,
  parent_member_mobile = EXCLUDED.parent_member_mobile,
  company = EXCLUDED.company,
  city = EXCLUDED.city,
  gstin = EXCLUDED.gstin,
  rera_number = EXCLUDED.rera_number,
  address = EXCLUDED.address,
  status = EXCLUDED.status,
  last_paid_fy = EXCLUDED.last_paid_fy,
  payment_means = EXCLUDED.payment_means,
  activation_note = EXCLUDED.activation_note,
  joined_date = EXCLUDED.joined_date;

-- 2. Seed Payment Heads (4 Programs)
INSERT INTO public.payment_heads (id, code, title, type, event_date, event_time, venue, active_until, status, is_live, gift_enabled, priority, prices, writeup)
VALUES
`;

const headRows = data.heads.map(h => {
  const pricesJson = JSON.stringify(h.prices || {});
  return `  (${escapeSql(h.id)}, ${escapeSql(h.code)}, ${escapeSql(h.title)}, ${escapeSql(h.type)}, ${escapeSql(h.eventDate)}, ${escapeSql(h.eventTime || 'Full Day')}, ${escapeSql(h.venue || 'CREA(I) Centre, Bangalore')}, ${escapeSql(h.activeUntil)}, ${escapeSql(h.status || 'active')}, ${Boolean(h.isLive)}, ${Boolean(h.giftEnabled)}, ${Number(h.priority || 3)}, '${pricesJson.replace(/'/g, "''")}'::jsonb, ${escapeSql(h.writeup || '')})`;
});

seedSql += headRows.join(',\n') + `
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  event_date = EXCLUDED.event_date,
  event_time = EXCLUDED.event_time,
  venue = EXCLUDED.venue,
  active_until = EXCLUDED.active_until,
  status = EXCLUDED.status,
  is_live = EXCLUDED.is_live,
  gift_enabled = EXCLUDED.gift_enabled,
  priority = EXCLUDED.priority,
  prices = EXCLUDED.prices,
  writeup = EXCLUDED.writeup;

-- 3. Seed Invoice Counter
INSERT INTO public.invoice_counters (fy_code, last_serial, updated_at)
VALUES ('2627', ${Number(data.invoiceCounter || 14)}, timezone('utc'::text, now()))
ON CONFLICT (fy_code) DO UPDATE SET
  last_serial = GREATEST(public.invoice_counters.last_serial, EXCLUDED.last_serial),
  updated_at = timezone('utc'::text, now());

-- 4. Seed Payments (14 Transactions)
INSERT INTO public.payments (id, invoice_no, serial, date, head_id, head_code, head_title, payer_type, payer_category, payer_id, payer_name, payer_mobile, payer_email, payer_company, payer_gstin, payer_address, attended, attended_at, gift_collected, gift_collected_at, base_amount, cgst, sgst, total_gst, total_amount, status, method)
VALUES
`;

const paymentRows = data.payments.map(p => {
  return `  (${escapeSql(p.id)}, ${escapeSql(p.invoiceNo)}, ${Number(p.serial)}, ${escapeSql(p.date)}, ${escapeSql(p.headId)}, ${escapeSql(p.headCode)}, ${escapeSql(p.headTitle)}, ${escapeSql(p.payerType)}, ${escapeSql(p.payerCategory)}, ${escapeSql(p.payerId)}, ${escapeSql(p.payerName)}, ${escapeSql(p.payerMobile)}, ${escapeSql(p.payerEmail)}, ${escapeSql(p.payerCompany || '')}, ${escapeSql(p.payerGstin || '')}, ${escapeSql(p.payerAddress || '')}, ${Boolean(p.attended)}, ${escapeSql(p.attendedAt)}, ${Boolean(p.giftCollected)}, ${escapeSql(p.giftCollectedAt)}, ${Number(p.baseAmount)}, ${Number(p.cgst)}, ${Number(p.sgst)}, ${Number(p.totalGst)}, ${Number(p.totalAmount)}, ${escapeSql(p.status)}, ${escapeSql(p.method)})`;
});

seedSql += paymentRows.join(',\n') + `
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Email Logs (2 Dispatches)
INSERT INTO public.email_logs (id, timestamp, recipient, recipient_name, subject, invoice_no, amount, status)
VALUES
`;

const logRows = data.emailLogs.map(l => {
  return `  (${escapeSql(l.id)}, ${escapeSql(l.timestamp)}, ${escapeSql(l.recipient)}, ${escapeSql(l.recipientName)}, ${escapeSql(l.subject)}, ${escapeSql(l.invoiceNo)}, ${Number(l.amount)}, ${escapeSql(l.status)})`;
});

seedSql += logRows.join(',\n') + `
ON CONFLICT (id) DO NOTHING;
`;

fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'seed.sql'), seedSql, 'utf8');

// 3. Combined 1-click full-setup.sql
const fullSetupSql = `-- ==============================================================================
-- CREA(I) COMPLETE 1-CLICK DATABASE SETUP FOR SUPABASE
-- Run this entire script in Supabase Dashboard -> SQL Editor -> Click RUN
-- ==============================================================================

${schemaSql}

${seedSql}
`;

fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'full-setup.sql'), fullSetupSql, 'utf8');
console.log('Successfully generated supabase/schema.sql, supabase/seed.sql, and supabase/full-setup.sql!');
