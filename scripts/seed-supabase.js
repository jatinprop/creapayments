/**
 * Automated Supabase Data Migration & Seeding Script for CREA(I)
 * Usage: node scripts/seed-supabase.js
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env.local or .env
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("\n❌ Error: Missing Supabase credentials.");
  console.error("Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY) in .env.local\n");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DATA_FILE = path.join(__dirname, "..", "data.json");

async function seed() {
  console.log(`\n🚀 Initializing Supabase Data Migration for CREA(I)...`);
  console.log(`📡 Target URL: ${supabaseUrl}`);

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ Data file not found at ${DATA_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_FILE, "utf8");
  const data = JSON.parse(raw);

  // 1. Seed Members
  if (data.members?.length > 0) {
    console.log(`\n👥 Seeding ${data.members.length} Members...`);
    const formattedMembers = data.members.map((m) => ({
      id: m.id,
      name: m.name,
      mobile: m.mobile,
      email: m.email,
      category: m.category,
      company: m.company || "Independent Broker",
      city: m.city || "Bangalore",
      joined_date: m.joinedDate || new Date().toISOString().split("T")[0]
    }));

    const { error: memErr } = await supabase.from("members").upsert(formattedMembers, { onConflict: "id" });
    if (memErr) {
      console.error("❌ Members seed error:", memErr.message);
    } else {
      console.log(`✅ Successfully seeded ${data.members.length} members.`);
    }
  }

  // 2. Seed Payment Heads
  if (data.heads?.length > 0) {
    console.log(`\n📋 Seeding ${data.heads.length} Payment Heads...`);
    const formattedHeads = data.heads.map((h) => ({
      id: h.id,
      code: h.code,
      title: h.title,
      type: h.type,
      event_date: h.eventDate,
      event_time: h.eventTime || "Full Day",
      venue: h.venue || "CREA(I) Centre, Bangalore",
      active_until: h.activeUntil,
      status: h.status || "active",
      prices: h.prices || {},
      writeup: h.writeup || ""
    }));

    const { error: headErr } = await supabase.from("payment_heads").upsert(formattedHeads, { onConflict: "id" });
    if (headErr) {
      console.error("❌ Payment Heads seed error:", headErr.message);
    } else {
      console.log(`✅ Successfully seeded ${data.heads.length} payment heads.`);
    }
  }

  // 3. Seed Invoice Counter
  console.log(`\n🔢 Initializing Invoice Sequence Counter...`);
  const fyCode = "2627";
  const { error: counterErr } = await supabase.from("invoice_counters").upsert(
    {
      fy_code: fyCode,
      last_serial: data.invoiceCounter || 14
    },
    { onConflict: "fy_code" }
  );

  if (counterErr) {
    console.error("❌ Invoice counter seed error:", counterErr.message);
  } else {
    console.log(`✅ Invoice counter for FY ${fyCode} initialized to ${data.invoiceCounter || 14}.`);
  }

  // 4. Seed Payments
  if (data.payments?.length > 0) {
    console.log(`\n💳 Seeding ${data.payments.length} Payments / Tax Invoices...`);
    const formattedPayments = data.payments.map((p) => ({
      id: p.id,
      invoice_no: p.invoiceNo,
      serial: p.serial,
      date: p.date,
      head_id: p.headId,
      head_code: p.headCode,
      head_title: p.headTitle,
      payer_type: p.payerType,
      payer_category: p.payerCategory,
      payer_id: p.payerId || null,
      payer_name: p.payerName,
      payer_mobile: p.payerMobile,
      payer_email: p.payerEmail,
      base_amount: p.baseAmount,
      cgst: p.cgst,
      sgst: p.sgst,
      total_gst: p.totalGst,
      total_amount: p.totalAmount,
      status: p.status,
      method: p.method
    }));

    const { error: payErr } = await supabase.from("payments").upsert(formattedPayments, { onConflict: "id" });
    if (payErr) {
      console.error("❌ Payments seed error:", payErr.message);
    } else {
      console.log(`✅ Successfully seeded ${data.payments.length} payments.`);
    }
  }

  // 5. Seed Email Logs
  if (data.emailLogs?.length > 0) {
    console.log(`\n✉️ Seeding ${data.emailLogs.length} Email Logs...`);
    const formattedLogs = data.emailLogs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      recipient: l.recipient,
      recipient_name: l.recipientName,
      subject: l.subject,
      invoice_no: l.invoiceNo,
      amount: l.amount,
      status: l.status
    }));

    const { error: logErr } = await supabase.from("email_logs").upsert(formattedLogs, { onConflict: "id" });
    if (logErr) {
      console.error("❌ Email logs seed error:", logErr.message);
    } else {
      console.log(`✅ Successfully seeded ${data.emailLogs.length} email logs.`);
    }
  }

  console.log(`\n🎉 All CREA(I) data successfully synchronized to Supabase!\n`);
}

seed().catch((err) => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
