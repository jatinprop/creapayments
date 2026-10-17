import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "..", "data.json");

// Helper: Calculate Indian Financial Year (April to March)
export function getFinancialYearCode(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  let startYear, endYear;
  if (month >= 4) {
    startYear = year;
    endYear = year + 1;
  } else {
    startYear = year - 1;
    endYear = year;
  }
  const startStr = String(startYear).slice(-2);
  const endStr = String(endYear).slice(-2);
  return `${startStr}${endStr}`;
}

// Resilient Local Store Fallback
export function readLocalData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Local data fallback read error:", err.message);
  }
  return {
    invoiceCounter: 14,
    members: [],
    heads: [],
    payments: [],
    emailLogs: []
  };
}

export function writeLocalData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Local data fallback write error:", err.message);
  }
}

// Supabase Client Initialization
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
  : null;

export const isSupabaseConfigured = Boolean(supabase);

// 1. Fetch All Data
export async function fetchAllData() {
  if (supabase) {
    try {
      const [membersRes, headsRes, paymentsRes, logsRes, countersRes] = await Promise.all([
        supabase.from("members").select("*").order("created_at", { ascending: true }),
        supabase.from("payment_heads").select("*").order("created_at", { ascending: false }),
        supabase.from("payments").select("*").order("date", { ascending: false }),
        supabase.from("email_logs").select("*").order("timestamp", { ascending: false }),
        supabase.from("invoice_counters").select("*").eq("fy_code", getFinancialYearCode()).maybeSingle()
      ]);

      if (!membersRes.error && !headsRes.error && !paymentsRes.error) {
        return {
          invoiceCounter: countersRes.data?.last_serial || (paymentsRes.data?.length || 14),
          members: (membersRes.data || []).map((m) => ({
            id: m.id,
            name: m.name,
            mobile: m.mobile,
            email: m.email,
            category: m.category,
            company: m.company,
            city: m.city,
            joinedDate: m.joined_date
          })),
          heads: (headsRes.data || []).map((h) => ({
            id: h.id,
            code: h.code,
            title: h.title,
            type: h.type,
            eventDate: h.event_date,
            eventTime: h.event_time,
            venue: h.venue,
            activeUntil: h.active_until,
            status: h.status,
            prices: h.prices || {},
            writeup: h.writeup || ""
          })),
          payments: (paymentsRes.data || []).map((p) => ({
            id: p.id,
            invoiceNo: p.invoice_no,
            serial: p.serial,
            date: p.date,
            headId: p.head_id,
            headCode: p.head_code,
            headTitle: p.head_title,
            payerType: p.payer_type,
            payerCategory: p.payer_category,
            payerId: p.payer_id,
            payerName: p.payer_name,
            payerMobile: p.payer_mobile,
            payerEmail: p.payer_email,
            baseAmount: Number(p.base_amount),
            cgst: Number(p.cgst),
            sgst: Number(p.sgst),
            totalGst: Number(p.total_gst),
            totalAmount: Number(p.total_amount),
            status: p.status,
            method: p.method
          })),
          emailLogs: (logsRes.data || []).map((l) => ({
            id: l.id,
            timestamp: l.timestamp,
            recipient: l.recipient,
            recipientName: l.recipient_name,
            subject: l.subject,
            invoiceNo: l.invoice_no,
            amount: Number(l.amount),
            status: l.status
          }))
        };
      }
    } catch (err) {
      console.warn("Supabase fetch failed, engaging local resilient fallback:", err.message);
    }
  }

  // Graceful fallback to local JSON file
  return readLocalData();
}

// 2. Process Payment & Generate Invoice
export async function recordPayment(paymentInput) {
  const { headId, payerType, payerCategory, payerId, payerName, payerMobile, payerEmail } = paymentInput;
  const currentData = await fetchAllData();
  const head = currentData.heads.find((h) => h.id === headId);

  if (!head) {
    throw new Error("Payment head not found.");
  }

  const basePrice = head.prices[payerCategory];
  if (basePrice === undefined || basePrice === null) {
    throw new Error("No price configured for this category.");
  }

  if (head.activeUntil && new Date(head.activeUntil) < new Date()) {
    throw new Error("This payment head has closed/expired.");
  }

  if (head.status === "deactivated" || head.status === "inactive") {
    throw new Error("This payment head has been deactivated by administration.");
  }

  // 18% GST Calculations
  const base = Number(basePrice);
  const cgst = Math.round(base * 0.09 * 100) / 100;
  const sgst = Math.round(base * 0.09 * 100) / 100;
  const totalGst = Math.round((cgst + sgst) * 100) / 100;
  const total = Math.round((base + totalGst) * 100) / 100;
  const fy = getFinancialYearCode();
  const now = new Date().toISOString();

  let invoiceNo = "";
  let nextSerial = (currentData.invoiceCounter || 0) + 1;

  if (supabase) {
    try {
      // Call atomic stored procedure in Supabase
      const { data: invResult, error: invErr } = await supabase.rpc("fn_next_invoice_number", {
        p_head_code: head.code,
        p_date: now
      });

      if (!invErr && invResult?.invoice_no) {
        invoiceNo = invResult.invoice_no;
        nextSerial = invResult.serial;
      }
    } catch (err) {
      console.warn("Stored proc fn_next_invoice_number failed, using calculated serial:", err.message);
    }
  }

  if (!invoiceNo) {
    const serialStr = String(nextSerial).padStart(4, "0");
    invoiceNo = `CREA/${fy}/${head.code.toUpperCase()}/${serialStr}`;
  }

  const paymentRecord = {
    id: `pay-${Date.now()}`,
    invoiceNo,
    serial: nextSerial,
    date: now,
    headId: head.id,
    headCode: head.code,
    headTitle: head.title,
    payerType: payerType || "member",
    payerCategory,
    payerId: payerId || null,
    payerName: payerName || "Anonymous Payer",
    payerMobile: payerMobile || "",
    payerEmail: payerEmail || "",
    baseAmount: base,
    cgst,
    sgst,
    totalGst,
    totalAmount: total,
    status: "success",
    method: "Simulated Gateway (Instant Checkout)"
  };

  const emailRecord = {
    id: `log-${Date.now()}`,
    timestamp: now,
    recipient: payerEmail,
    recipientName: payerName,
    subject: `CREA(I) Official Tax Invoice ${invoiceNo} - ${head.title}`,
    invoiceNo,
    amount: total,
    status: "Dispatched (Simulated SMTP)"
  };

  // Persist to Supabase if available
  if (supabase) {
    try {
      await Promise.all([
        supabase.from("payments").insert({
          id: paymentRecord.id,
          invoice_no: paymentRecord.invoiceNo,
          serial: paymentRecord.serial,
          date: paymentRecord.date,
          head_id: paymentRecord.headId,
          head_code: paymentRecord.headCode,
          head_title: paymentRecord.headTitle,
          payer_type: paymentRecord.payerType,
          payer_category: paymentRecord.payerCategory,
          payer_id: paymentRecord.payerId,
          payer_name: paymentRecord.payerName,
          payer_mobile: paymentRecord.payerMobile,
          payer_email: paymentRecord.payerEmail,
          base_amount: paymentRecord.baseAmount,
          cgst: paymentRecord.cgst,
          sgst: paymentRecord.sgst,
          total_gst: paymentRecord.totalGst,
          total_amount: paymentRecord.totalAmount,
          status: paymentRecord.status,
          method: paymentRecord.method
        }),
        supabase.from("email_logs").insert({
          id: emailRecord.id,
          timestamp: emailRecord.timestamp,
          recipient: emailRecord.recipient,
          recipient_name: emailRecord.recipientName,
          subject: emailRecord.subject,
          invoice_no: emailRecord.invoiceNo,
          amount: emailRecord.amount,
          status: emailRecord.status
        })
      ]);
    } catch (err) {
      console.error("Supabase insert error:", err.message);
    }
  }

  // Always update local fallback store as well
  try {
    const local = readLocalData();
    local.invoiceCounter = nextSerial;
    local.payments = local.payments || [];
    local.payments.unshift(paymentRecord);
    local.emailLogs = local.emailLogs || [];
    local.emailLogs.unshift(emailRecord);
    writeLocalData(local);
  } catch (e) {}

  return paymentRecord;
}

// 3. Upsert Payment Head
export async function upsertHead(headInput) {
  const { id, code, title, type, status, eventDate, eventTime, venue, activeUntil, prices, writeup } = headInput;

  let headObj = null;

  if (supabase) {
    try {
      const payload = {
        code: (code || "").trim().toUpperCase(),
        title: (title || "").trim(),
        type: type || "training",
        event_date: eventDate || new Date().toISOString().split("T")[0],
        event_time: eventTime || "Full Day",
        venue: (venue || "CREA(I) Centre, Bangalore").trim(),
        active_until: activeUntil,
        status: status || "active",
        prices: {
          new_member: prices?.new_member !== null && prices?.new_member !== undefined && prices?.new_member !== "" ? Number(prices.new_member) : null,
          member: prices?.member !== null && prices?.member !== undefined && prices?.member !== "" ? Number(prices.member) : null,
          board_member: prices?.board_member !== null && prices?.board_member !== undefined && prices?.board_member !== "" ? Number(prices.board_member) : null,
          non_member: prices?.non_member !== null && prices?.non_member !== undefined && prices?.non_member !== "" ? Number(prices.non_member) : null
        },
        writeup: writeup || ""
      };

      if (id) {
        payload.id = id;
        const { data, error } = await supabase.from("payment_heads").upsert(payload).select().single();
        if (!error && data) headObj = data;
      } else {
        payload.id = `head-${Date.now()}`;
        const { data, error } = await supabase.from("payment_heads").insert(payload).select().single();
        if (!error && data) headObj = data;
      }
    } catch (err) {
      console.warn("Supabase upsertHead failed:", err.message);
    }
  }

  // Local fallback
  const local = readLocalData();
  local.heads = local.heads || [];

  if (id) {
    const idx = local.heads.findIndex((h) => h.id === id);
    if (idx !== -1) {
      const existing = local.heads[idx];
      if (title) existing.title = title.trim();
      if (code) existing.code = code.trim().toUpperCase();
      if (type) existing.type = type;
      if (status !== undefined) existing.status = status;
      if (eventDate) existing.eventDate = eventDate;
      if (eventTime !== undefined) existing.eventTime = eventTime;
      if (venue !== undefined) existing.venue = venue.trim();
      if (activeUntil) existing.activeUntil = activeUntil;
      if (prices) {
        existing.prices = {
          new_member: prices.new_member !== null && prices.new_member !== undefined && prices.new_member !== "" ? Number(prices.new_member) : null,
          member: prices.member !== null && prices.member !== undefined && prices.member !== "" ? Number(prices.member) : null,
          board_member: prices.board_member !== null && prices.board_member !== undefined && prices.board_member !== "" ? Number(prices.board_member) : null,
          non_member: prices.non_member !== null && prices.non_member !== undefined && prices.non_member !== "" ? Number(prices.non_member) : null
        };
      }
      if (writeup !== undefined) existing.writeup = writeup;
      writeLocalData(local);
      return existing;
    }
  }

  const newHead = {
    id: id || `head-${Date.now()}`,
    code: (code || "").trim().toUpperCase(),
    title: (title || "").trim(),
    type: type || "training",
    eventDate: eventDate || new Date().toISOString().split("T")[0],
    eventTime: eventTime || "Full Day",
    venue: (venue || "CREA(I) Centre, Bangalore").trim(),
    activeUntil,
    status: status || "active",
    prices: {
      new_member: prices?.new_member !== null && prices?.new_member !== undefined && prices?.new_member !== "" ? Number(prices.new_member) : null,
      member: prices?.member !== null && prices?.member !== undefined && prices?.member !== "" ? Number(prices.member) : null,
      board_member: prices?.board_member !== null && prices?.board_member !== undefined && prices?.board_member !== "" ? Number(prices.board_member) : null,
      non_member: prices?.non_member !== null && prices?.non_member !== undefined && prices?.non_member !== "" ? Number(prices.non_member) : null
    },
    writeup: writeup || ""
  };

  local.heads.unshift(newHead);
  writeLocalData(local);
  return newHead;
}

// 4. Update Head Status (active / inactive / deactivated)
export async function setHeadStatus(id, status) {
  if (supabase) {
    try {
      await supabase.from("payment_heads").update({ status }).eq("id", id);
    } catch (e) {}
  }
  const local = readLocalData();
  const head = local.heads.find((h) => h.id === id);
  if (head) {
    head.status = status;
    writeLocalData(local);
  }
  return head;
}
