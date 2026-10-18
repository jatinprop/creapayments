-- ==============================================================================
-- CREA(I) PAYMENT & MEMBERSHIP SUITE - AUTHORITATIVE SEED DATA
-- ==============================================================================

-- 1. Seed Members (7 Members)
INSERT INTO public.members (id, name, mobile, email, category, parent_member_id, parent_member_name, parent_member_mobile, company, city, gstin, address, status, last_paid_fy, payment_means, activation_note, joined_date)
VALUES
  ('mem-001', 'Ramesh Gupta', '9800000001', 'ramesh.gupta@crea-realty.in', 'member', NULL, NULL, NULL, 'Apex Prime Realty', 'Bangalore', '29AABCR1234F1Z5', 'Suite 401, Prestige Meridian, MG Road, Bangalore, Karnataka - 560001', 'active', '2627', 'Online Gateway', 'Renewed FY 2627 (Invoice CREA/2627/MEM/0001)', '2024-04-10'),
  ('mem-002', 'Sneha Patel', '9800000002', 'sneha.p@lotushomes.co', 'associate_member', 'mem-001', 'Ramesh Gupta', '9800000001', 'Apex Prime Realty / Lotus Homes', 'Bangalore', '29AABCL5678G2Z1', '#12, Lotus Arcade, 100ft Road, Indiranagar, Bangalore, Karnataka - 560038', 'active', '2627', 'Online Gateway', 'Associate Fee Paid FY 2627 (Main Member Ramesh Gupta Active)', '2026-06-15'),
  ('mem-003', 'Vikramaditya Rao', '9800000003', 'v.rao@deccanproperties.com', 'board_member', NULL, NULL, NULL, 'Deccan Realtors & Estates', 'Bangalore', '29AABCD9012H3Z7', 'Ground Floor, Deccan Chambers, Lavelle Road, Bangalore, Karnataka - 560001', 'active', '2627', 'Online Gateway', 'Board Member Standing Paid FY 2627', '2021-01-20'),
  ('mem-004', 'Anand Murthy', '9845999000', 'anand.m@staypolis.com', 'member', NULL, NULL, NULL, 'Staypolis Brokerage', 'Bangalore', '29AABCS3456J4Z3', 'Unit 3B, Brigade Gateway, Malleshwaram, Bangalore, Karnataka - 560055', 'active', '2627', 'Online Gateway', 'Renewed FY 2627 (Invoice CREA/2627/MEM/0006)', '2023-08-01'),
  ('mem-005', 'Kavita Reddy', '9711288901', 'kavita.r@reddyrealty.in', 'associate_member', 'mem-004', 'Anand Murthy', '9845999000', 'Staypolis / Reddy Associates', 'Bangalore', '29AABCR7890K5Z9', 'Plot 88, Reddy Complex, Whitefield Main Road, Bangalore, Karnataka - 560066', 'deactivated', NULL, NULL, 'Pending Associate Renewal Dues for FY 2026-27', '2026-08-12'),
  ('mem-006', 'Rahul Varma', '9880011224', 'rahul.v@varmarealty.com', 'associate_member', 'mem-007', 'Sunita Sharma', '9988776655', 'Embassy Realty / Varma Realty', 'Bangalore', '29AABCV9988P1Z2', '#44, Varma Towers, Koramangala 5th Block, Bangalore, Karnataka - 560095', 'deactivated', '2627', 'Online Gateway', 'Deactivated: Main Member (Sunita Sharma) has not paid FY 2026-27 dues', '2025-11-01'),
  ('mem-007', 'Sunita Sharma', '9988776655', 'sunita.sharma@embassyrealty.in', 'member', NULL, NULL, NULL, 'Embassy Square Realty', 'Bangalore', '29AABCS1122M3Z4', 'Level 2, Embassy Square, Infantry Road, Bangalore, Karnataka - 560001', 'deactivated', NULL, NULL, 'Deactivated on 1st April: Pending FY 2026-27 Annual Renewal', '2023-05-15')
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
  address = EXCLUDED.address,
  status = EXCLUDED.status,
  last_paid_fy = EXCLUDED.last_paid_fy,
  payment_means = EXCLUDED.payment_means,
  activation_note = EXCLUDED.activation_note,
  joined_date = EXCLUDED.joined_date;

-- 2. Seed Payment Heads (4 Programs)
INSERT INTO public.payment_heads (id, code, title, type, event_date, event_time, venue, active_until, status, priority, prices, writeup)
VALUES
  ('head-mem', 'MEM', 'Annual CREA(I) Membership 2026-2027', 'membership', '2026-04-01', 'Full Year Access', 'CREA(I) Headquarters & All Chapters', '2027-03-31T23:59:59', 'active', 1, '{"associate_member":5000,"member":10000,"board_member":8000,"non_member":null}'::jsonb, 'The Confederation of Real Estate Associates (India) — CREA(I) is the premier self-regulatory association of professional real estate brokers, property managers, and valuation experts in South India. 

Your annual membership subscription for FY 2026-2027 entitles your firm to comprehensive professional standing, legal assistance on brokerage covenant disputes, and direct integration into the CREA Multi-Listing Exchange (MLE). Associate Members affiliated with active primary member firms enjoy discounted annual fees.

Key Member Privileges:
1. Official CREA(I) Certified Realtor Certificate and verified digital credentials for client trust.
2. Direct access to our monthly Legal & Notary clinic for RERA complaints, draft scrutiny, and deposit escrow guidance.
3. Preferential registration rates on all accredited broker mastery certifications and quarterly state symposia.
4. Comprehensive arbitration board access in the event of client or fellow broker commission evasion.
5. Complimentary entry to the bi-annual Property Showcase networking breakfasts with tier-1 developers including Prestige, Sobha, and Brigade.'),
  ('head-trn1', 'TRN1', 'Masterclass: RERA Compliance, Title Verification & Escrows', 'training', '2026-10-28', '10:00 AM - 4:00 PM IST', 'The Lalit Hotel, High Grounds, Bangalore', '2026-10-28T09:00:00', 'active', 2, '{"associate_member":1200,"member":1200,"board_member":0,"non_member":2500}'::jsonb, 'RERA litigation and title verification scrutiny have transformed real estate transactions into rigorous legal engagements. This full-day intensive masterclass is curated specifically for practicing real estate brokers, leasing executives, and independent agents seeking to eliminate liability and elevate deal closings.

Includes delegate entry pass QR, complimentary welcome gift kit QR, legal draft toolkit on pendrive, gourmet lunch, and accredited certification.'),
  ('head-trn2', 'TRN2', 'Executive Training: Digital Lead Generation & NRI Client Acquisition', 'training', '2026-11-18', '02:00 PM - 06:00 PM IST', 'Virtual Live Interactive Studio (Zoom HD)', '2026-11-18T13:30:00', 'active', 3, '{"associate_member":800,"member":800,"board_member":0,"non_member":1800}'::jsonb, 'High-net-worth individuals and Non-Resident Indians (NRIs) represent over 38% of luxury real estate purchases and premium commercial leasing volume in metropolitan Bangalore. Reaching and qualifying these diaspora investors requires sophisticated digital acquisition funnels beyond conventional classifieds.'),
  ('head-evt1', 'EVT1', 'CREA(I) Annual Realty Conclave & Networking Gala 2026', 'event', '2026-12-15', '05:30 PM - 10:30 PM IST', 'Grand Ballroom, The Leela Palace, Old Airport Road, Bangalore', '2026-12-15T16:00:00', 'active', 4, '{"associate_member":2800,"member":2800,"board_member":2000,"non_member":5000}'::jsonb, 'The flagship annual congregation of real estate leaders, developers, institutional funds, and accredited brokerages across India. Features keynote addresses by state urban development ministers, RERA chairpersons, and real estate investment trusts (REITs) directors.

All delegates receive an access pass QR code on their invoice for gate entry, plus a dedicated Gift Collection QR code for claiming the exclusive CREA delegate executive kit and memento at the registration kiosk.')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  event_date = EXCLUDED.event_date,
  event_time = EXCLUDED.event_time,
  venue = EXCLUDED.venue,
  active_until = EXCLUDED.active_until,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  prices = EXCLUDED.prices,
  writeup = EXCLUDED.writeup;

-- 3. Seed Invoice Counter
INSERT INTO public.invoice_counters (fy_code, last_serial, updated_at)
VALUES ('2627', 14, timezone('utc'::text, now()))
ON CONFLICT (fy_code) DO UPDATE SET
  last_serial = GREATEST(public.invoice_counters.last_serial, EXCLUDED.last_serial),
  updated_at = timezone('utc'::text, now());

-- 4. Seed Payments (14 Transactions)
INSERT INTO public.payments (id, invoice_no, serial, date, head_id, head_code, head_title, payer_type, payer_category, payer_id, payer_name, payer_mobile, payer_email, payer_company, payer_gstin, payer_address, attended, attended_at, gift_collected, gift_collected_at, base_amount, cgst, sgst, total_gst, total_amount, status, method)
VALUES
  ('pay-101', 'CREA/2627/MEM/0001', 1, '2026-08-05T10:15:00.000Z', 'head-mem', 'MEM', 'Annual CREA(I) Membership 2026-2027', 'member', 'member', 'mem-001', 'Ramesh Gupta', '9800000001', 'ramesh.gupta@crea-realty.in', 'Apex Prime Realty', '29AABCR1234F1Z5', 'Suite 401, Prestige Meridian, MG Road, Bangalore, Karnataka - 560001', false, NULL, false, NULL, 10000, 900, 900, 1800, 11800, 'success', 'Simulated Gateway (Card / NetBanking)'),
  ('pay-102', 'CREA/2627/MEM/0002', 2, '2026-08-07T14:20:00.000Z', 'head-mem', 'MEM', 'Annual CREA(I) Membership 2026-2027', 'member', 'board_member', 'mem-003', 'Vikramaditya Rao', '9800000003', 'v.rao@deccanproperties.com', 'Deccan Realtors & Estates', '29AABCD9012H3Z7', 'Ground Floor, Deccan Chambers, Lavelle Road, Bangalore, Karnataka - 560001', false, NULL, false, NULL, 8000, 720, 720, 1440, 9440, 'success', 'Simulated Gateway (UPI)'),
  ('pay-103', 'CREA/2627/MEM/0003', 3, '2026-08-14T11:05:00.000Z', 'head-mem', 'MEM', 'Annual CREA(I) Membership 2026-2027', 'member', 'associate_member', 'mem-002', 'Sneha Patel', '9800000002', 'sneha.p@lotushomes.co', 'Lotus Property Consultants', '29AABCL5678G2Z1', '#12, Lotus Arcade, 100ft Road, Indiranagar, Bangalore, Karnataka - 560038', false, NULL, false, NULL, 5000, 450, 450, 900, 5900, 'success', 'Simulated Gateway (NetBanking)'),
  ('pay-104', 'CREA/2627/TRN1/0004', 4, '2026-08-20T09:40:00.000Z', 'head-trn1', 'TRN1', 'Masterclass: RERA Compliance, Title Verification & Escrows', 'member', 'member', 'mem-001', 'Ramesh Gupta', '9800000001', 'ramesh.gupta@crea-realty.in', 'Apex Prime Realty', '29AABCR1234F1Z5', 'Suite 401, Prestige Meridian, MG Road, Bangalore, Karnataka - 560001', true, '2026-10-28T09:45:00.000Z', true, '2026-10-28T09:50:00.000Z', 1200, 108, 108, 216, 1416, 'success', 'Simulated Gateway (UPI)'),
  ('pay-105', 'CREA/2627/TRN1/0005', 5, '2026-08-22T16:15:00.000Z', 'head-trn1', 'TRN1', 'Masterclass: RERA Compliance, Title Verification & Escrows', 'non_member', 'non_member', NULL, 'Siddharth Joshi', '9845112233', 'sid.joshi@urbanestates.in', 'Urban Estates', '29AAACJ1122D1Z8', 'Level 4, Urban Heights, Koramangala, Bangalore - 560034', true, '2026-10-28T10:02:00.000Z', false, NULL, 2500, 225, 225, 450, 2950, 'success', 'Simulated Gateway (Credit Card)'),
  ('pay-106', 'CREA/2627/MEM/0006', 6, '2026-09-01T10:00:00.000Z', 'head-mem', 'MEM', 'Annual CREA(I) Membership 2026-2027', 'member', 'member', 'mem-004', 'Anand Murthy', '9845999000', 'anand.m@staypolis.com', 'Staypolis Brokerage', '29AABCS3456J4Z3', 'Unit 3B, Brigade Gateway, Malleshwaram, Bangalore, Karnataka - 560055', false, NULL, false, NULL, 10000, 900, 900, 1800, 11800, 'success', 'Simulated Gateway (UPI)'),
  ('pay-107', 'CREA/2627/TRN1/0007', 7, '2026-09-04T12:30:00.000Z', 'head-trn1', 'TRN1', 'Masterclass: RERA Compliance, Title Verification & Escrows', 'member', 'associate_member', 'mem-002', 'Sneha Patel', '9800000002', 'sneha.p@lotushomes.co', 'Lotus Property Consultants', '29AABCL5678G2Z1', '#12, Lotus Arcade, 100ft Road, Indiranagar, Bangalore, Karnataka - 560038', false, NULL, false, NULL, 1200, 108, 108, 216, 1416, 'success', 'Simulated Gateway (UPI)'),
  ('pay-108', 'CREA/2627/TRN1/0008', 8, '2026-09-06T15:45:00.000Z', 'head-trn1', 'TRN1', 'Masterclass: RERA Compliance, Title Verification & Escrows', 'non_member', 'non_member', NULL, 'Deepak Mehra', '9820011223', 'deepak@mehraproperty.com', 'Mehra Properties', '27AABCM4433E1Z4', 'Mehra Towers, Nariman Point, Mumbai - 400021', false, NULL, false, NULL, 2500, 225, 225, 450, 2950, 'success', 'Simulated Gateway (Debit Card)'),
  ('pay-109', 'CREA/2627/TRN2/0009', 9, '2026-09-12T11:20:00.000Z', 'head-trn2', 'TRN2', 'Executive Training: Digital Lead Generation & NRI Client Acquisition', 'member', 'member', 'mem-001', 'Ramesh Gupta', '9800000001', 'ramesh.gupta@crea-realty.in', 'Apex Prime Realty', '29AABCR1234F1Z5', 'Suite 401, Prestige Meridian, MG Road, Bangalore, Karnataka - 560001', false, NULL, false, NULL, 800, 72, 72, 144, 944, 'success', 'Simulated Gateway (UPI)'),
  ('pay-110', 'CREA/2627/TRN2/0010', 10, '2026-09-15T17:10:00.000Z', 'head-trn2', 'TRN2', 'Executive Training: Digital Lead Generation & NRI Client Acquisition', 'non_member', 'non_member', NULL, 'Harish Bhatia', '9876543210', 'harish@bhatiarealtors.in', 'Bhatia Realtors', '29AABCB5566G1Z2', 'Bhatia Complex, Jayanagar 4th Block, Bangalore - 560011', false, NULL, false, NULL, 1800, 162, 162, 324, 2124, 'success', 'Simulated Gateway (Card)'),
  ('pay-111', 'CREA/2627/EVT1/0011', 11, '2026-09-22T14:00:00.000Z', 'head-evt1', 'EVT1', 'CREA(I) Annual Realty Conclave & Networking Gala 2026', 'member', 'board_member', 'mem-003', 'Vikramaditya Rao', '9800000003', 'v.rao@deccanproperties.com', 'Deccan Realtors & Estates', '29AABCD9012H3Z7', 'Ground Floor, Deccan Chambers, Lavelle Road, Bangalore, Karnataka - 560001', false, NULL, false, NULL, 2000, 180, 180, 360, 2360, 'success', 'Simulated Gateway (Corporate Card)'),
  ('pay-112', 'CREA/2627/EVT1/0012', 12, '2026-09-28T18:30:00.000Z', 'head-evt1', 'EVT1', 'CREA(I) Annual Realty Conclave & Networking Gala 2026', 'member', 'member', 'mem-001', 'Ramesh Gupta', '9800000001', 'ramesh.gupta@crea-realty.in', 'Apex Prime Realty', '29AABCR1234F1Z5', 'Suite 401, Prestige Meridian, MG Road, Bangalore, Karnataka - 560001', false, NULL, false, NULL, 2800, 252, 252, 504, 3304, 'success', 'Simulated Gateway (UPI)'),
  ('pay-113', 'CREA/2627/EVT1/0013', 13, '2026-10-02T10:45:00.000Z', 'head-evt1', 'EVT1', 'CREA(I) Annual Realty Conclave & Networking Gala 2026', 'non_member', 'non_member', NULL, 'Pooja Venkatesh', '9900112233', 'pooja.v@greenviewbuilders.com', 'Greenview Builders', '29AAACG8899K1Z5', '#7, Greenview Towers, Outer Ring Road, Bangalore - 560103', false, NULL, false, NULL, 5000, 450, 450, 900, 5900, 'success', 'Simulated Gateway (NetBanking)'),
  ('pay-114', 'CREA/2627/TRN2/0014', 14, '2026-10-10T16:20:00.000Z', 'head-trn2', 'TRN2', 'Executive Training: Digital Lead Generation & NRI Client Acquisition', 'member', 'associate_member', 'mem-005', 'Kavita Reddy', '9711288901', 'kavita.r@reddyrealty.in', 'Reddy Associates', '29AABCR7890K5Z9', 'Plot 88, Reddy Complex, Whitefield Main Road, Bangalore, Karnataka - 560066', false, NULL, false, NULL, 800, 72, 72, 144, 944, 'success', 'Simulated Gateway (UPI)')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Email Logs (2 Dispatches)
INSERT INTO public.email_logs (id, timestamp, recipient, recipient_name, subject, invoice_no, amount, status)
VALUES
  ('log-1', '2026-08-05T10:15:02.000Z', 'ramesh.gupta@crea-realty.in', 'Ramesh Gupta', 'CREA(I) Tax Invoice CREA/2627/MEM/0001 - Annual Membership 2026-2027', 'CREA/2627/MEM/0001', 11800, 'Dispatched (Simulated SMTP)'),
  ('log-14', '2026-10-10T16:20:05.000Z', 'kavita.r@reddyrealty.in', 'Kavita Reddy', 'CREA(I) Tax Invoice CREA/2627/TRN2/0014 - Executive Training', 'CREA/2627/TRN2/0014', 944, 'Dispatched (Simulated SMTP)')
ON CONFLICT (id) DO NOTHING;
