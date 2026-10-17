-- ==============================================================================
-- CREA(I) PAYMENT & MEMBERSHIP SUITE - SUPABASE POSTGRESQL SEED DATA
-- ==============================================================================

-- 1. Seed Members
INSERT INTO public.members (id, name, mobile, email, category, company, city, status, last_paid_fy, payment_means, activation_note, joined_date)
VALUES
  ('mem-001', 'Ramesh Gupta', '9800000001', 'ramesh.gupta@crea-realty.in', 'member', 'Apex Prime Realty', 'Bangalore', 'active', '2627', 'Online Gateway', 'Renewed FY 2627', '2024-04-10'),
  ('mem-002', 'Sneha Patel', '9800000002', 'sneha.p@lotushomes.co', 'new_member', 'Lotus Property Consultants', 'Bangalore', 'active', '2627', 'Online Gateway', 'Joined & Paid FY 2627', '2026-06-15'),
  ('mem-003', 'Vikramaditya Rao', '9800000003', 'v.rao@deccanproperties.com', 'board_member', 'Deccan Realtors & Estates', 'Bangalore', 'active', '2627', 'Online Gateway', 'Board Member Exemption / Paid', '2021-01-20'),
  ('mem-004', 'Anand Murthy', '9845999000', 'anand.m@staypolis.com', 'member', 'Staypolis Brokerage', 'Bangalore', 'active', '2627', 'Online Gateway', 'Renewed FY 2627', '2023-08-01'),
  ('mem-005', 'Kavita Reddy', '9711288901', 'kavita.r@reddyrealty.in', 'new_member', 'Reddy Associates', 'Bangalore', 'deactivated', NULL, NULL, 'Pending FY 2026-27 Annual Renewal', '2026-08-12')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  mobile = EXCLUDED.mobile,
  email = EXCLUDED.email,
  category = EXCLUDED.category,
  company = EXCLUDED.company,
  city = EXCLUDED.city,
  status = EXCLUDED.status,
  last_paid_fy = EXCLUDED.last_paid_fy,
  payment_means = EXCLUDED.payment_means,
  activation_note = EXCLUDED.activation_note;

-- 2. Seed Payment Heads
INSERT INTO public.payment_heads (id, code, title, type, event_date, event_time, venue, active_until, status, prices, writeup)
VALUES
  (
    'head-mem',
    'MEM',
    'Annual CREA(I) Membership 2026-2027',
    'membership',
    '2026-04-01',
    'Full Year Access',
    'CREA(I) Headquarters & All Chapters',
    '2027-03-31T23:59:59Z',
    'active',
    '{"new_member": 12000, "member": 10000, "board_member": 8000, "non_member": null}'::jsonb,
    'The Confederation of Real Estate Associates (India) — CREA(I) is the premier self-regulatory association of professional real estate brokers, property managers, and valuation experts in South India.

Your annual membership subscription for FY 2026-2027 entitles your firm to comprehensive professional standing, legal assistance on brokerage covenant disputes, and direct integration into the CREA Multi-Listing Exchange (MLE). Over the past twelve months, CREA(I) mediated over 140 commercial leasing transactions and spearheaded ethical commission standardization benchmarks across residential corridors.

Key Member Privileges:
1. Official CREA(I) Certified Realtor Certificate and verified digital credentials for client trust.
2. Direct access to our monthly Legal & Notary clinic for RERA complaints, draft scrutiny, and deposit escrow guidance.
3. Preferential registration rates on all accredited broker mastery certifications and quarterly state symposia.
4. Comprehensive arbitration board access in the event of client or fellow broker commission evasion.
5. Complimentary entry to the bi-annual Property Showcase networking breakfasts with tier-1 developers including Prestige, Sobha, and Brigade.

Members are requested to complete renewal promptly to prevent de-listing from the public verified realtor register.'
  ),
  (
    'head-trn1',
    'TRN1',
    'Masterclass: RERA Compliance, Title Verification & Escrows',
    'training',
    '2026-10-28',
    '10:00 AM - 4:00 PM IST',
    'The Lalit Hotel, High Grounds, Bangalore',
    '2026-10-28T09:00:00Z',
    'active',
    '{"new_member": 1500, "member": 1200, "board_member": 0, "non_member": 2500}'::jsonb,
    'RERA litigation and title verification scrutiny have transformed real estate transactions into rigorous legal engagements. This full-day intensive masterclass is curated specifically for practicing real estate brokers, leasing executives, and independent agents seeking to eliminate liability and elevate deal closings.

Led by Senior Advocate & Real Estate Arbitrator Mr. Ajay Venkatesh along with seasoned land revenue experts, this masterclass delves into practical title search methodologies across Karnataka land records including RTC (Pahani), Encumbrance Certificates (Form 15 & 16), Katha extract nuances (e-Katha vs A-Katha vs B-Katha), and BDA/BMRDA layout approval checks.

Key Highlights of the Syllabus:
1. Identifying encumbrances, litigation flags, and revenue dispute caveats before listing properties.
2. Formulating watertight rental and sale agreements that safeguard broker commissions against client circumvention.
3. RERA Section 9 and 10 agent compliance mandates, annual filings, and advertising dos and don''ts.
4. Managing client advance tokens and escrow protocol to safeguard earnest deposits.
5. Interactive case studies on 5 high-profile land title defects resolved in Bangalore courts.

Includes accredited certification, comprehensive take-home legal draft toolkit on pendrive, gourmet lunch, and high-tea networking with senior legal professionals.'
  ),
  (
    'head-trn2',
    'TRN2',
    'Executive Training: Digital Lead Generation & NRI Client Acquisition',
    'training',
    '2026-11-18',
    '02:00 PM - 06:00 PM IST',
    'Virtual Live Interactive Studio (Zoom HD)',
    '2026-11-18T13:30:00Z',
    'active',
    '{"new_member": 1000, "member": 800, "board_member": 0, "non_member": 1800}'::jsonb,
    'High-net-worth individuals and Non-Resident Indians (NRIs) represent over 38% of luxury real estate purchases and premium commercial leasing volume in metropolitan Bangalore. Reaching and qualifying these diaspora investors requires sophisticated digital acquisition funnels beyond conventional classifieds.

This intensive interactive webinar equips real estate professionals with automated lead generation systems, WhatsApp Business automation workflows, and high-converting performance marketing campaigns on Google Search and Meta Ads.

Workshop Outline:
1. Setting up geo-targeted campaigns targeting NRI hubs in the UAE, United States, United Kingdom, and Singapore.
2. Crafting video walkthrough presentations that convert remote NRI buyers without requiring physical property visits.
3. Automated WhatsApp CRM workflows for immediate lead engagement within 90 seconds of portal inquiry.
4. Navigating FEMA regulations, NRE/NRO bank accounts, repatriation covenants, and Power of Attorney (PoA) stamping.
5. Live demonstration of AI tools for generating property inspection reports and personalized investor pitch decks.

Participants will receive ready-to-deploy ad copy templates, email sequences, and a recording valid for 12 months.'
  ),
  (
    'head-evt1',
    'EVT1',
    'CREA(I) Annual Realty Conclave & Networking Gala 2026',
    'event',
    '2026-12-12',
    '06:00 PM - 10:30 PM IST',
    'Grand Ballroom, ITC Windsor, Golf Course Road, Bangalore',
    '2026-12-12T17:00:00Z',
    'active',
    '{"new_member": 3500, "member": 2800, "board_member": 2000, "non_member": 5000}'::jsonb,
    'The Confederation of Real Estate Associates (India) cordially invites you to our flagship annual gathering — the CREA(I) Annual Realty Conclave & Networking Gala 2026. This landmark evening brings together over 400 distinguished real estate brokers, developers, legal luminaries, and government dignitaries under one roof.

Theme for 2026: ''The Next Decade of Urban Mobility & PropTech Growth in Bangalore''.

Evening Itinerary:
- 06:00 PM - Registration & Welcome High Tea
- 06:45 PM - Keynote Address by Hon''ble Minister for Housing & Urban Infrastructure
- 07:30 PM - Panel Discussion: Infrastructure corridors (Metro Phase 3, PRR & STRR) shaping high-yield residential clusters
- 08:30 PM - Presentation of the CREA(I) Excellence Awards recognizing top brokerages across South India
- 09:15 PM - Cocktail Reception, Gala Dinner & Unveiling of the CREA Property Research Whitepaper 2027

Dress Code: Formal Western / Indian Traditional Formal.
Complimentary valet parking available at the venue.'
  )
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  title = EXCLUDED.title,
  prices = EXCLUDED.prices,
  active_until = EXCLUDED.active_until;

-- 3. Seed Invoice Counters
INSERT INTO public.invoice_counters (fy_code, last_serial, updated_at)
VALUES ('2627', 14, timezone('utc'::text, now()))
ON CONFLICT (fy_code) DO UPDATE SET
  last_serial = GREATEST(public.invoice_counters.last_serial, EXCLUDED.last_serial);

-- 4. Seed Payments
INSERT INTO public.payments (
  id, invoice_no, serial, date, head_id, head_code, head_title, payer_type, payer_category, payer_id, payer_name, payer_mobile, payer_email, base_amount, cgst, sgst, total_gst, total_amount, status, method
) VALUES
  ('pay-101', 'CREA/2627/MEM/0001', 1, '2026-08-05T10:15:00.000Z', 'head-mem', 'MEM', 'Annual CREA(I) Membership 2026-2027', 'member', 'member', 'mem-001', 'Ramesh Gupta', '9800000001', 'ramesh.gupta@crea-realty.in', 10000, 900, 900, 1800, 11800, 'success', 'Simulated Gateway (Card / NetBanking)'),
  ('pay-102', 'CREA/2627/MEM/0002', 2, '2026-08-07T14:20:00.000Z', 'head-mem', 'MEM', 'Annual CREA(I) Membership 2026-2027', 'member', 'board_member', 'mem-003', 'Vikramaditya Rao', '9800000003', 'v.rao@deccanproperties.com', 8000, 720, 720, 1440, 9440, 'success', 'Simulated Gateway (UPI)'),
  ('pay-103', 'CREA/2627/MEM/0003', 3, '2026-08-14T11:05:00.000Z', 'head-mem', 'MEM', 'Annual CREA(I) Membership 2026-2027', 'member', 'new_member', 'mem-002', 'Sneha Patel', '9800000002', 'sneha.p@lotushomes.co', 12000, 1080, 1080, 2160, 14160, 'success', 'Simulated Gateway (NetBanking)'),
  ('pay-104', 'CREA/2627/TRN1/0004', 4, '2026-08-20T09:40:00.000Z', 'head-trn1', 'TRN1', 'Masterclass: RERA Compliance, Title Verification & Escrows', 'member', 'member', 'mem-001', 'Ramesh Gupta', '9800000001', 'ramesh.gupta@crea-realty.in', 1200, 108, 108, 216, 1416, 'success', 'Simulated Gateway (UPI)'),
  ('pay-105', 'CREA/2627/TRN1/0005', 5, '2026-08-22T16:15:00.000Z', 'head-trn1', 'TRN1', 'Masterclass: RERA Compliance, Title Verification & Escrows', 'non_member', 'non_member', NULL, 'Siddharth Joshi', '9845112233', 'sid.joshi@urbanestates.in', 2500, 225, 225, 450, 2950, 'success', 'Simulated Gateway (Credit Card)'),
  ('pay-106', 'CREA/2627/MEM/0006', 6, '2026-09-01T10:00:00.000Z', 'head-mem', 'MEM', 'Annual CREA(I) Membership 2026-2027', 'member', 'member', 'mem-004', 'Anand Murthy', '9845999000', 'anand.m@staypolis.com', 10000, 900, 900, 1800, 11800, 'success', 'Simulated Gateway (UPI)'),
  ('pay-107', 'CREA/2627/TRN1/0007', 7, '2026-09-04T12:30:00.000Z', 'head-trn1', 'TRN1', 'Masterclass: RERA Compliance, Title Verification & Escrows', 'member', 'new_member', 'mem-002', 'Sneha Patel', '9800000002', 'sneha.p@lotushomes.co', 1500, 135, 135, 270, 1770, 'success', 'Simulated Gateway (UPI)'),
  ('pay-108', 'CREA/2627/TRN1/0008', 8, '2026-09-06T15:45:00.000Z', 'head-trn1', 'TRN1', 'Masterclass: RERA Compliance, Title Verification & Escrows', 'non_member', 'non_member', NULL, 'Deepak Mehra', '9820011223', 'deepak@mehraproperty.com', 2500, 225, 225, 450, 2950, 'success', 'Simulated Gateway (Debit Card)'),
  ('pay-109', 'CREA/2627/TRN2/0009', 9, '2026-09-12T11:20:00.000Z', 'head-trn2', 'TRN2', 'Executive Training: Digital Lead Generation & NRI Client Acquisition', 'member', 'member', 'mem-001', 'Ramesh Gupta', '9800000001', 'ramesh.gupta@crea-realty.in', 800, 72, 72, 144, 944, 'success', 'Simulated Gateway (UPI)'),
  ('pay-110', 'CREA/2627/TRN2/0010', 10, '2026-09-15T17:10:00.000Z', 'head-trn2', 'TRN2', 'Executive Training: Digital Lead Generation & NRI Client Acquisition', 'non_member', 'non_member', NULL, 'Harish Bhatia', '9876543210', 'harish@bhatiarealtors.in', 1800, 162, 162, 324, 2124, 'success', 'Simulated Gateway (Card)'),
  ('pay-111', 'CREA/2627/EVT1/0011', 11, '2026-09-22T14:00:00.000Z', 'head-evt1', 'EVT1', 'CREA(I) Annual Realty Conclave & Networking Gala 2026', 'member', 'board_member', 'mem-003', 'Vikramaditya Rao', '9800000003', 'v.rao@deccanproperties.com', 2000, 180, 180, 360, 2360, 'success', 'Simulated Gateway (Corporate Card)'),
  ('pay-112', 'CREA/2627/EVT1/0012', 12, '2026-09-28T18:30:00.000Z', 'head-evt1', 'EVT1', 'CREA(I) Annual Realty Conclave & Networking Gala 2026', 'member', 'member', 'mem-001', 'Ramesh Gupta', '9800000001', 'ramesh.gupta@crea-realty.in', 2800, 252, 252, 504, 3304, 'success', 'Simulated Gateway (UPI)'),
  ('pay-113', 'CREA/2627/EVT1/0013', 13, '2026-10-02T10:45:00.000Z', 'head-evt1', 'EVT1', 'CREA(I) Annual Realty Conclave & Networking Gala 2026', 'non_member', 'non_member', NULL, 'Pooja Venkatesh', '9900112233', 'pooja.v@greenviewbuilders.com', 5000, 450, 450, 900, 5900, 'success', 'Simulated Gateway (NetBanking)'),
  ('pay-114', 'CREA/2627/TRN2/0014', 14, '2026-10-10T16:20:00.000Z', 'head-trn2', 'TRN2', 'Executive Training: Digital Lead Generation & NRI Client Acquisition', 'member', 'new_member', 'mem-005', 'Kavita Reddy', '9711288901', 'kavita.r@reddyrealty.in', 1000, 90, 90, 180, 1180, 'success', 'Simulated Gateway (UPI)')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Email Logs
INSERT INTO public.email_logs (id, timestamp, recipient, recipient_name, subject, invoice_no, amount, status)
VALUES
  ('log-1', '2026-08-05T10:15:02.000Z', 'ramesh.gupta@crea-realty.in', 'Ramesh Gupta', 'CREA(I) Tax Invoice CREA/2627/MEM/0001 - Annual Membership 2026-2027', 'CREA/2627/MEM/0001', 11800, 'Dispatched (Simulated SMTP)'),
  ('log-14', '2026-10-10T16:20:05.000Z', 'kavita.r@reddyrealty.in', 'Kavita Reddy', 'CREA(I) Tax Invoice CREA/2627/TRN2/0014 - Executive Training', 'CREA/2627/TRN2/0014', 1180, 'Dispatched (Simulated SMTP)')
ON CONFLICT (id) DO NOTHING;
