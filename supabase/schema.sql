-- ==============================================================================
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
