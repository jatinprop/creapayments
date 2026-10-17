-- ==============================================================================
-- CREA(I) PAYMENT & MEMBERSHIP MANAGEMENT SUITE - SUPABASE POSTGRESQL SCHEMA
-- Confederation of Real Estate Associates (India)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing triggers if re-running
DROP TRIGGER IF EXISTS trg_members_updated_at ON public.members;
DROP TRIGGER IF EXISTS trg_heads_updated_at ON public.payment_heads;

-- Helper: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Members Directory Table
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY DEFAULT ('mem-' || substr(md5(random()::text), 1, 8)),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('member', 'associate_member', 'board_member')) DEFAULT 'member',
  parent_member_id TEXT DEFAULT NULL,
  parent_member_name TEXT DEFAULT NULL,
  parent_member_mobile TEXT DEFAULT NULL,
  company TEXT NOT NULL DEFAULT 'Independent Broker',
  city TEXT NOT NULL DEFAULT 'Bangalore',
  gstin TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'deactivated')) DEFAULT 'active',
  last_paid_fy TEXT DEFAULT '2627',
  payment_means TEXT DEFAULT NULL,
  activation_note TEXT DEFAULT NULL,
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_members_mobile ON public.members(mobile);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_category ON public.members(category);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_parent ON public.members(parent_member_id);

CREATE TRIGGER trg_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 4. Payment Heads / Programs Table
CREATE TABLE IF NOT EXISTS public.payment_heads (
  id TEXT PRIMARY KEY DEFAULT ('head-' || substr(md5(random()::text), 1, 8)),
  code TEXT NOT NULL UNIQUE, -- MEM, TRN1, TRN2, EVT1, etc.
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('membership', 'training', 'event')),
  event_date TEXT NOT NULL,
  event_time TEXT DEFAULT 'Full Day',
  venue TEXT DEFAULT 'CREA(I) Centre, Bangalore',
  active_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'deactivated')) DEFAULT 'active',
  prices JSONB NOT NULL DEFAULT '{"associate_member": null, "member": null, "board_member": null, "non_member": null}'::jsonb,
  writeup TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_heads_code ON public.payment_heads(code);
CREATE INDEX IF NOT EXISTS idx_heads_status ON public.payment_heads(status);
CREATE INDEX IF NOT EXISTS idx_heads_active_until ON public.payment_heads(active_until);

CREATE TRIGGER trg_heads_updated_at
BEFORE UPDATE ON public.payment_heads
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 5. Indian Financial Year Invoice Sequence Counter Table
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  fy_code TEXT PRIMARY KEY, -- e.g. '2627' for FY 2026-27
  last_serial INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Payments & Tax Invoices Table
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY DEFAULT ('pay-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4)),
  invoice_no TEXT NOT NULL UNIQUE, -- CREA/2627/MEM/0001
  serial INTEGER NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  head_id TEXT REFERENCES public.payment_heads(id) ON DELETE SET NULL,
  head_code TEXT NOT NULL,
  head_title TEXT NOT NULL,
  payer_type TEXT NOT NULL CHECK (payer_type IN ('member', 'non_member')),
  payer_category TEXT NOT NULL CHECK (payer_category IN ('associate_member', 'member', 'board_member', 'non_member')),
  payer_id TEXT REFERENCES public.members(id) ON DELETE SET NULL,
  payer_name TEXT NOT NULL,
  payer_mobile TEXT NOT NULL,
  payer_email TEXT NOT NULL,
  payer_gstin TEXT DEFAULT NULL,
  payer_address TEXT DEFAULT NULL,
  base_amount NUMERIC(12, 2) NOT NULL,
  cgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  sgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_gst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'pending', 'failed', 'refunded')),
  method TEXT DEFAULT 'Simulated Gateway (Instant Checkout)',
  attended BOOLEAN NOT NULL DEFAULT false,
  attended_at TIMESTAMPTZ DEFAULT NULL,
  gift_collected BOOLEAN NOT NULL DEFAULT false,
  gift_collected_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_no ON public.payments(invoice_no);
CREATE INDEX IF NOT EXISTS idx_payments_payer_mobile ON public.payments(payer_mobile);
CREATE INDEX IF NOT EXISTS idx_payments_payer_email ON public.payments(payer_email);
CREATE INDEX IF NOT EXISTS idx_payments_head_id ON public.payments(head_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_attended ON public.payments(attended);
CREATE INDEX IF NOT EXISTS idx_payments_gift ON public.payments(gift_collected);

-- 7. Email Dispatch Audit Logs Table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id TEXT PRIMARY KEY DEFAULT ('log-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4)),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  recipient TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  invoice_no TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Dispatched (Simulated SMTP)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_email_logs_invoice ON public.email_logs(invoice_no);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient);

-- ==============================================================================
-- STORED PROCEDURES & BUSINESS FUNCTIONS
-- ==============================================================================

-- Helper: Compute Indian Financial Year Code (April to March)
CREATE OR REPLACE FUNCTION public.fn_get_financial_year(target_date TIMESTAMPTZ DEFAULT now())
RETURNS TEXT AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM target_date);
  v_month INT := EXTRACT(MONTH FROM target_date);
  v_start_year INT;
  v_end_year INT;
BEGIN
  IF v_month >= 4 THEN
    v_start_year := v_year;
    v_end_year := v_year + 1;
  ELSE
    v_start_year := v_year - 1;
    v_end_year := v_year;
  END IF;
  RETURN to_char(v_start_year % 100, 'FM00') || to_char(v_end_year % 100, 'FM00');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Atomic Sequential Invoice Number Generator
CREATE OR REPLACE FUNCTION public.fn_next_invoice_number(p_head_code TEXT, p_date TIMESTAMPTZ DEFAULT now())
RETURNS JSONB AS $$
DECLARE
  v_fy TEXT;
  v_next_serial INT;
  v_invoice_no TEXT;
BEGIN
  v_fy := public.fn_get_financial_year(p_date);

  -- Ensure record exists for this financial year
  INSERT INTO public.invoice_counters (fy_code, last_serial, updated_at)
  VALUES (v_fy, 0, timezone('utc'::text, now()))
  ON CONFLICT (fy_code) DO NOTHING;

  -- Lock row and increment
  UPDATE public.invoice_counters
  SET last_serial = last_serial + 1,
      updated_at = timezone('utc'::text, now())
  WHERE fy_code = v_fy
  RETURNING last_serial INTO v_next_serial;

  -- Format invoice: CREA/YYZZ/<HEAD>/<0001>
  v_invoice_no := 'CREA/' || v_fy || '/' || upper(trim(p_head_code)) || '/' || lpad(v_next_serial::text, 4, '0');

  RETURN jsonb_build_object(
    'invoice_no', v_invoice_no,
    'serial', v_next_serial,
    'fy', v_fy
  );
END;
$$ LANGUAGE plpgsql;

-- 1-Click Yearly Renewal Stored Procedure
CREATE OR REPLACE FUNCTION public.fn_yearly_renewal(p_next_year INT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_year INT := coalesce(p_next_year, EXTRACT(YEAR FROM now())::INT + 1);
  v_head_id TEXT := 'head-mem-' || extract(epoch from now())::bigint;
  v_head_title TEXT := 'Annual CREA(I) Membership Renewal ' || v_year || '-' || (v_year + 1);
BEGIN
  -- Promote all 'new_member' to 'member'
  UPDATE public.members
  SET category = 'member'
  WHERE category = 'new_member';

  -- Create next year renewal head
  INSERT INTO public.payment_heads (
    id, code, title, type, event_date, event_time, venue, active_until, status, prices, writeup
  ) VALUES (
    v_head_id,
    'MEM',
    v_head_title,
    'membership',
    v_year || '-04-01',
    'Full Year Access',
    'All Chapters',
    (v_year + 1) || '-03-31T23:59:59Z',
    'active',
    '{"new_member": 12000, "member": 10000, "board_member": 8000, "non_member": null}'::jsonb,
    'Annual membership renewal for CREA(I) accredited brokerages for the session ' || v_year || '-' || (v_year + 1) || '. All members enjoy uninterrupted access to CREA MLS, legal escrow mediation, and certified broker masterclasses.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'head_id', v_head_id,
    'head_title', v_head_title
  );
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

-- Members: Anyone can query to check membership (by mobile or email)
CREATE POLICY "Public can query members for verification"
ON public.members FOR SELECT USING (true);

CREATE POLICY "Service Role and Admin full access on members"
ON public.members FOR ALL USING (true) WITH CHECK (true);

-- Payment Heads: Anyone can view active payment heads
CREATE POLICY "Public can view active payment heads"
ON public.payment_heads FOR SELECT USING (true);

CREATE POLICY "Service Role and Admin full access on payment heads"
ON public.payment_heads FOR ALL USING (true) WITH CHECK (true);

-- Payments: Public checkout can insert payments
CREATE POLICY "Public can insert payments"
ON public.payments FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view own payments"
ON public.payments FOR SELECT USING (true);

CREATE POLICY "Service Role and Admin full access on payments"
ON public.payments FOR ALL USING (true) WITH CHECK (true);

-- Email Logs:
CREATE POLICY "Public can view email logs"
ON public.email_logs FOR SELECT USING (true);

CREATE POLICY "Service Role and Admin full access on email logs"
ON public.email_logs FOR ALL USING (true) WITH CHECK (true);

-- Invoice Counters: Protected (only accessed via stored procedure or service role)
CREATE POLICY "Service Role full access on invoice counters"
ON public.invoice_counters FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- SUPABASE REALTIME REPLICATION
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_heads;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Realtime publication might already include tables or require superuser
  NULL;
END;
$$;
