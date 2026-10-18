import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });
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

export function cleanMobile(mob) {
  if (!mob) return "";
  const digits = String(mob).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function isPaymentForMemberOrPayer(p, { id, mobile, email } = {}) {
  if (!p) return false;
  if (id && p.payerId && String(p.payerId).trim() === String(id).trim()) return true;
  const pMob = cleanMobile(p.payerMobile);
  const targetMob = cleanMobile(mobile);
  if (pMob && targetMob && pMob === targetMob) return true;
  if (email && p.payerEmail && p.payerEmail.trim().toLowerCase() === String(email).trim().toLowerCase()) return true;
  return false;
}

// Helper: Resolve head price for a specific category with associate_member fallback to member price
export function getHeadPriceForCategory(head, category) {
  if (!head || !head.prices) return null;
  const cat = category || "member";
  const val = head.prices[cat];
  if (val !== null && val !== undefined && val !== "") return Number(val);

  const isMem = head.code === "MEM" || head.type === "membership" || (head.title && head.title.toLowerCase().includes("membership"));

  if (cat === "associate_member" || cat === "new_member") {
    if (head.prices.associate_member !== null && head.prices.associate_member !== undefined && head.prices.associate_member !== "") {
      return Number(head.prices.associate_member);
    }
    if (head.prices.new_member !== null && head.prices.new_member !== undefined && head.prices.new_member !== "") {
      return Number(head.prices.new_member);
    }
    // For trainings and events, fee is identical to regular member fee unless customized
    if (!isMem && head.prices.member !== null && head.prices.member !== undefined && head.prices.member !== "") {
      return Number(head.prices.member);
    }
    if (isMem) return 5000;
  }

  return null;
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

// Supabase Client Initialization (with authoritative cloud fallback)
const DEFAULT_SUPABASE_URL = "https://rrwduqspwomiclyknxeu.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_jQ7QdOO0AhD5YFEssYGD3A_UAv3tyvB";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_ANON_KEY;

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
            category: (m.category === "board_member" || m.category === "member") ? "member" : (m.category === "associate_member" || m.category === "new_member") ? "associate_member" : "member",
            parentMemberId: m.parent_member_id || null,
            parentMemberName: m.parent_member_name || null,
            parentMemberMobile: m.parent_member_mobile || null,
            company: m.company,
            city: m.city,
            gstin: m.gstin || "",
            reraNumber: m.rera_number || m.reraNumber || "",
            address: m.address || "",
            status: m.status || "active",
            lastPaidFY: m.last_paid_fy || null,
            paymentMeans: m.payment_means || null,
            activationNote: m.activation_note || null,
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
            isLive: Boolean(h.is_live || h.prices?.is_live),
            giftEnabled: Boolean(h.gift_enabled || h.prices?.gift_enabled || h.giftEnabled),
            priority: h.priority != null ? Number(h.priority) : 3,
            prices: {
              associate_member: h.prices?.associate_member ?? h.prices?.new_member ?? ((h.type !== 'membership' && h.code !== 'MEM') ? h.prices?.member : null),
              member: h.prices?.member ?? null,
              non_member: h.prices?.non_member ?? null
            },
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
            payerCategory: (p.payer_category === "board_member" || p.payer_category === "member") ? "member" : (p.payer_category === "new_member" || p.payer_category === "associate_member") ? "associate_member" : "non_member",
            payerId: p.payer_id,
            payerName: p.payer_name,
            payerMobile: p.payer_mobile,
            payerEmail: p.payer_email,
            payerCompany: p.payer_company || "",
            payerGstin: p.payer_gstin || "",
            payerAddress: p.payer_address || "",
            baseAmount: Number(p.base_amount),
            cgst: Number(p.cgst),
            sgst: Number(p.sgst),
            totalGst: Number(p.total_gst),
            totalAmount: Number(p.total_amount),
            status: p.status,
            method: p.method,
            attended: Boolean(p.attended),
            attendedAt: p.attended_at || null,
            giftCollected: Boolean(p.gift_collected),
            giftCollectedAt: p.gift_collected_at || null
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
  const { headId, payerType, payerCategory, payerId, payerName, payerMobile, payerEmail, payerGstin, payerAddress, payerCompany } = paymentInput;
  const currentData = await fetchAllData();
  const head = currentData.heads.find((h) => h.id === headId);

  if (!head) {
    throw new Error("Payment head not found.");
  }

  const basePrice = getHeadPriceForCategory(head, payerCategory);
  if (basePrice === undefined || basePrice === null) {
    throw new Error("No price configured for this category.");
  }

  if (head.activeUntil && new Date(head.activeUntil) < new Date()) {
    throw new Error("This payment head has closed/expired.");
  }

  if (head.status === "deactivated" || head.status === "inactive" || head.status === "deleted" || head.isDeleted) {
    throw new Error("This payment head is deactivated or deleted and cannot accept registrations.");
  }

  const fy = getFinancialYearCode();

  // RULE: Guard against duplicate Annual Membership payment for the same financial year
  const isMembershipPayment = head.code === "MEM" || head.type === "membership" || (head.title && head.title.toLowerCase().includes("membership"));
  if (isMembershipPayment && (payerId || payerMobile || payerEmail)) {
    const payerQuery = { id: payerId, mobile: payerMobile, email: payerEmail };
    const existingMemPayment = (currentData.payments || []).find((p) =>
      isPaymentForMemberOrPayer(p, payerQuery) &&
      (p.headCode === "MEM" || (p.headTitle && p.headTitle.toLowerCase().includes("membership")) || (p.invoiceNo && p.invoiceNo.includes("/MEM/"))) &&
      p.status === "success" &&
      (p.invoiceNo?.includes(`/${fy}/`) || (p.date && new Date(p.date) >= new Date('2026-04-01')))
    );
    if (existingMemPayment) {
      throw new Error(`CREA(I) Annual Membership for FY ${fy} has already been paid (Tax Invoice: ${existingMemPayment.invoiceNo}). A member can only pay annual membership once per financial year.`);
    }

    const existingActiveMem = (currentData.members || []).find((m) =>
      (payerId && m.id === payerId) ||
      (cleanMobile(payerMobile) && cleanMobile(m.mobile) === cleanMobile(payerMobile)) ||
      (payerEmail && m.email && m.email.trim().toLowerCase() === String(payerEmail).trim().toLowerCase())
    );
    if (existingActiveMem && (existingActiveMem.lastPaidFY === fy || existingActiveMem.status === "active") && (currentData.payments || []).some(p => isPaymentForMemberOrPayer(p, existingActiveMem) && (p.headCode === "MEM" || (p.invoiceNo && p.invoiceNo.includes("/MEM/"))) && p.status === "success")) {
      throw new Error(`Member '${existingActiveMem.name}' has already paid annual membership dues for FY ${fy}. Duplicate payment is not allowed.`);
    }
  }

  // RULE: Guard against duplicate Event / Training / Conclave payment for the same payer
  if (!isMembershipPayment && (payerId || payerMobile || payerEmail)) {
    const payerQuery = { id: payerId, mobile: payerMobile, email: payerEmail };
    const existingProgPayment = (currentData.payments || []).find((p) =>
      isPaymentForMemberOrPayer(p, payerQuery) &&
      (p.headId === head.id || p.headCode === head.code) &&
      p.status === "success"
    );
    if (existingProgPayment) {
      throw new Error(`Registration and payment for "${head.title}" has already been completed (Tax Invoice: ${existingProgPayment.invoiceNo}). Duplicate payment is not allowed.`);
    }
  }

  // 18% GST Calculations
  const base = Number(basePrice);
  const cgst = Math.round(base * 0.09 * 100) / 100;
  const sgst = Math.round(base * 0.09 * 100) / 100;
  const totalGst = Math.round((cgst + sgst) * 100) / 100;
  const total = Math.round((base + totalGst) * 100) / 100;
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

  let resolvedCompany = (payerCompany || "").trim();
  if (!resolvedCompany) {
    const memLookup = currentData.members.find((m) => m.id === payerId || m.mobile === payerMobile);
    if (memLookup && memLookup.company && memLookup.company !== "Independent Realtor") {
      resolvedCompany = memLookup.company;
    }
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
    payerCompany: resolvedCompany || "",
    payerGstin: (payerGstin || "").trim().toUpperCase(),
    payerAddress: (payerAddress || "").trim(),
    attended: false,
    giftCollected: false,
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
          payer_company: paymentRecord.payerCompany || "",
          payer_gstin: paymentRecord.payerGstin,
          payer_address: paymentRecord.payerAddress,
          attended: false,
          gift_collected: false,
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

  // If payment is for membership, automatically activate the member
  if (isMembershipPayment && (payerId || payerMobile)) {
    if (supabase) {
      try {
        const updatePayload = {
          status: "active",
          last_paid_fy: fy,
          payment_means: paymentRecord.method,
          activation_note: (payerCategory === 'associate_member') ? `Associate Fee Paid (FY ${fy}) - Online (Invoice ${invoiceNo})` : `Paid online (Invoice ${invoiceNo})`,
          deactivation_reason: null
        };
        if (resolvedCompany && resolvedCompany !== "Independent Realtor" && resolvedCompany !== "Independent Broker") {
          updatePayload.company = resolvedCompany;
        }
        await supabase
          .from("members")
          .update(updatePayload)
          .or(`id.eq.${payerId},mobile.eq.${payerMobile}`);
      } catch (err) {
        console.warn("Supabase member auto-activation error:", err.message);
      }
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

    if (isMembershipPayment) {
      const mem = (local.members || []).find((m) => m.id === payerId || m.mobile === payerMobile);
      if (mem) {
        mem.status = "active";
        mem.lastPaidFY = fy;
        mem.paymentMeans = paymentRecord.method;
        mem.activationNote = (mem.category === 'associate_member') ? `Associate Fee Paid (FY ${fy}) - Online (Invoice ${invoiceNo})` : `Paid online (Invoice ${invoiceNo})`;
        mem.deactivationReason = null;
        if (resolvedCompany && resolvedCompany !== "Independent Realtor" && resolvedCompany !== "Independent Broker") {
          mem.company = resolvedCompany;
        }
      }
    }

    writeLocalData(local);
  } catch (e) {}

  return paymentRecord;
}

// 3. Upsert Payment Head
export async function upsertHead(headInput) {
  const { id, code, title, type, status, isLive, giftEnabled, eventDate, eventTime, venue, activeUntil, prices, writeup, priority } = headInput;

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
        priority: priority != null ? Number(priority) : 3,
        prices: {
          associate_member: prices?.associate_member !== null && prices?.associate_member !== undefined && prices?.associate_member !== "" ? Number(prices.associate_member) : (prices?.new_member !== null && prices?.new_member !== undefined && prices?.new_member !== "" ? Number(prices.new_member) : null),
          member: prices?.member !== null && prices?.member !== undefined && prices?.member !== "" ? Number(prices.member) : null,
          non_member: prices?.non_member !== null && prices?.non_member !== undefined && prices?.non_member !== "" ? Number(prices.non_member) : null
        },
        writeup: writeup || ""
      };

      if (isLive !== undefined) {
        payload.prices.is_live = Boolean(isLive);
        payload.is_live = Boolean(isLive);
      }
      if (giftEnabled !== undefined) {
        payload.prices.gift_enabled = Boolean(giftEnabled);
        payload.gift_enabled = Boolean(giftEnabled);
      }

      if (id) {
        payload.id = id;
        let { data, error } = await supabase.from("payment_heads").upsert(payload).select().single();
        if (error && error.message && (error.message.includes("is_live") || error.message.includes("gift_enabled"))) {
          delete payload.is_live;
          delete payload.gift_enabled;
          const retry = await supabase.from("payment_heads").upsert(payload).select().single();
          data = retry.data;
          error = retry.error;
        }
        if (!error && data) headObj = data;
      } else {
        payload.id = `head-${Date.now()}`;
        let { data, error } = await supabase.from("payment_heads").insert(payload).select().single();
        if (error && error.message && (error.message.includes("is_live") || error.message.includes("gift_enabled"))) {
          delete payload.is_live;
          delete payload.gift_enabled;
          const retry = await supabase.from("payment_heads").insert(payload).select().single();
          data = retry.data;
          error = retry.error;
        }
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
      if (isLive !== undefined) existing.isLive = Boolean(isLive);
      if (giftEnabled !== undefined) existing.giftEnabled = Boolean(giftEnabled);
      if (priority !== undefined) existing.priority = Number(priority) || 3;
      if (eventDate) existing.eventDate = eventDate;
      if (eventTime !== undefined) existing.eventTime = eventTime;
      if (venue !== undefined) existing.venue = venue.trim();
      if (activeUntil) existing.activeUntil = activeUntil;
      if (prices) {
        existing.prices = {
          associate_member: prices.associate_member !== null && prices.associate_member !== undefined && prices.associate_member !== "" ? Number(prices.associate_member) : (prices.new_member !== null && prices.new_member !== undefined && prices.new_member !== "" ? Number(prices.new_member) : null),
          member: prices.member !== null && prices.member !== undefined && prices.member !== "" ? Number(prices.member) : null,
          non_member: prices.non_member !== null && prices.non_member !== undefined && prices.non_member !== "" ? Number(prices.non_member) : null
        };
        if (existing.isLive !== undefined) existing.prices.is_live = existing.isLive;
        if (existing.giftEnabled !== undefined) existing.prices.gift_enabled = existing.giftEnabled;
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
    isLive: Boolean(isLive || false),
    giftEnabled: Boolean(giftEnabled || false),
    priority: priority != null ? Number(priority) : 3,
    prices: {
      associate_member: prices?.associate_member !== null && prices?.associate_member !== undefined && prices?.associate_member !== "" ? Number(prices.associate_member) : (prices?.new_member !== null && prices?.new_member !== undefined && prices?.new_member !== "" ? Number(prices.new_member) : null),
      member: prices?.member !== null && prices?.member !== undefined && prices?.member !== "" ? Number(prices.member) : null,
      non_member: prices?.non_member !== null && prices?.non_member !== undefined && prices?.non_member !== "" ? Number(prices.non_member) : null,
      is_live: Boolean(isLive || false),
      gift_enabled: Boolean(giftEnabled || false)
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

// 4A. Update Head Live Status (true / false)
export async function setHeadLive(id, isLive) {
  const flag = Boolean(isLive);
  if (supabase) {
    try {
      // 1. Update prices JSONB in Supabase (100% reliable across all schema versions)
      const { data: row } = await supabase.from("payment_heads").select("prices").eq("id", id).single();
      const updatedPrices = { ...(row?.prices || {}), is_live: flag };
      await supabase.from("payment_heads").update({ prices: updatedPrices }).eq("id", id);

      // 2. Also try updating is_live column if it exists in the Supabase schema
      try {
        await supabase.from("payment_heads").update({ is_live: flag }).eq("id", id);
      } catch (colErr) {}
    } catch (e) {
      console.warn("Supabase setHeadLive error:", e.message);
    }
  }
  const local = readLocalData();
  const head = (local.heads || []).find((h) => h.id === id);
  if (head) {
    head.isLive = flag;
    head.prices = head.prices || {};
    head.prices.is_live = flag;
    writeLocalData(local);
  }
  return head;
}

// 4A-2. Update Head Gift Enabled Status (true / false)
export async function setHeadGiftEnabled(id, giftEnabled) {
  const flag = Boolean(giftEnabled);
  if (supabase) {
    try {
      // 1. Update prices JSONB in Supabase (100% reliable across all schema versions)
      const { data: row } = await supabase.from("payment_heads").select("prices").eq("id", id).single();
      const updatedPrices = { ...(row?.prices || {}), gift_enabled: flag };
      await supabase.from("payment_heads").update({ prices: updatedPrices }).eq("id", id);

      // 2. Also try updating gift_enabled column if it exists in the Supabase schema
      try {
        await supabase.from("payment_heads").update({ gift_enabled: flag }).eq("id", id);
      } catch (colErr) {}
    } catch (e) {
      console.warn("Supabase setHeadGiftEnabled error:", e.message);
    }
  }
  const local = readLocalData();
  const head = (local.heads || []).find((h) => h.id === id);
  if (head) {
    head.giftEnabled = flag;
    head.prices = head.prices || {};
    head.prices.gift_enabled = flag;
    writeLocalData(local);
  }
  return head;
}

// 4B. Delete Head (Soft-delete if payments exist, or remove)
export async function deleteHead(id) {
  const local = readLocalData();
  const head = (local.heads || []).find((h) => h.id === id);
  if (!head) return null;

  const hasPayments = (local.payments || []).some((p) => p.headId === id || p.headCode === head.code);
  if (hasPayments) {
    head.status = "deleted";
    if (supabase) {
      try {
        await supabase.from("payment_heads").update({ status: "deleted" }).eq("id", id);
      } catch (e) {}
    }
  } else {
    local.heads = (local.heads || []).filter((h) => h.id !== id);
    if (supabase) {
      try {
        await supabase.from("payment_heads").delete().eq("id", id);
      } catch (e) {}
    }
  }
  writeLocalData(local);
  return head;
}

// 5. Update Member Status (active / deactivated)
export async function setMemberStatus(memberId, status) {
  if (supabase) {
    try {
      await supabase.from("members").update({ status }).eq("id", memberId);
    } catch (e) {
      console.warn("Supabase setMemberStatus error:", e.message);
    }
  }
  const local = readLocalData();
  const mem = (local.members || []).find((m) => m.id === memberId);
  if (mem) {
    mem.status = status;
    writeLocalData(local);
  }
  return mem;
}

// 6. Manual Member Activation with Payment Means and Description
export async function manualActivateMember({ id, paymentMeans, description, createInvoice, headId }) {
  const fy = getFinancialYearCode();
  const local = readLocalData();
  const mem = (local.members || []).find((m) => m.id === id);
  if (!mem) {
    throw new Error("Member not found");
  }

  mem.status = "active";
  mem.lastPaidFY = fy;
  mem.paymentMeans = paymentMeans || "Manual Verification";
  mem.activationNote = description || "Admin activated membership";
  mem.deactivationReason = null;

  if (supabase) {
    try {
      await supabase.from("members").update({
        status: "active",
        last_paid_fy: fy,
        payment_means: mem.paymentMeans,
        activation_note: mem.activationNote,
        deactivation_reason: null
      }).eq("id", id);
    } catch (e) {
      console.warn("Supabase manualActivateMember error:", e.message);
    }
  }

  let paymentRecord = null;
  if (createInvoice) {
    const existingInvoice = (local.payments || []).find((p) =>
      isPaymentForMemberOrPayer(p, mem) &&
      (p.headCode === "MEM" || (p.headTitle && p.headTitle.toLowerCase().includes("membership")) || (p.invoiceNo && p.invoiceNo.includes("/MEM/"))) &&
      p.status === "success"
    );
    if (existingInvoice) {
      paymentRecord = existingInvoice;
    } else {
      const head = (local.heads || []).find((h) => h.id === headId || h.code === "MEM") || (local.heads || [])[0];
      if (head) {
        const base = Number(getHeadPriceForCategory(head, mem.category) || (mem.category === 'associate_member' ? 5000 : 10000));
        const cgst = Math.round(base * 0.09 * 100) / 100;
        const sgst = Math.round(base * 0.09 * 100) / 100;
        const totalGst = Math.round((cgst + sgst) * 100) / 100;
        const total = Math.round((base + totalGst) * 100) / 100;
        const now = new Date().toISOString();

        const nextSerial = (local.invoiceCounter || 0) + 1;
        local.invoiceCounter = nextSerial;
        const serialStr = String(nextSerial).padStart(4, "0");
        const invoiceNo = `CREA/${fy}/${head.code.toUpperCase()}/${serialStr}`;

        paymentRecord = {
          id: `pay-${Date.now()}`,
          invoiceNo,
        serial: nextSerial,
        date: now,
        headId: head.id,
        headCode: head.code,
        headTitle: head.title,
        payerType: "member",
        payerCategory: mem.category,
        payerId: mem.id,
        payerName: mem.name,
        payerMobile: mem.mobile,
        payerEmail: mem.email,
        baseAmount: base,
        cgst,
        sgst,
        totalGst,
        totalAmount: total,
        status: "success",
        method: `Manual Admin (${paymentMeans}): ${description}`
      };

      local.payments = local.payments || [];
      local.payments.unshift(paymentRecord);

      if (supabase) {
        try {
          await supabase.from("payments").insert({
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
          });
        } catch (e) {
          console.warn("Supabase payment record insert error:", e.message);
        }
      }
    }
  }
}

  writeLocalData(local);
  return { member: mem, payment: paymentRecord };
}

// 7. Verify & Record Conference Attendance or Welcome Gift Collection
export async function recordAttendanceOrGift({ invoiceNo, headId, mode, action, forceToggle }) {
  const local = readLocalData();
  const cleanInv = (invoiceNo || "").trim().toUpperCase();

  const payment = (local.payments || []).find((p) =>
    p.invoiceNo.toUpperCase() === cleanInv ||
    (p.id && p.id.toUpperCase() === cleanInv) ||
    cleanInv.includes(p.invoiceNo.toUpperCase())
  );

  if (!payment) {
    return {
      success: false,
      error: `Invalid Ticket / Invoice: No registration found for "${cleanInv}".`
    };
  }

  if (headId && payment.headId && payment.headId !== headId && payment.headCode !== headId) {
    return {
      success: false,
      error: `Wrong Event Ticket: This pass is for "${payment.headTitle}", not the selected event.`,
      payment
    };
  }

  // Find the associated head for this payment
  const head = (local.heads || []).find((h) =>
    h.id === payment.headId ||
    h.code === payment.headCode ||
    (headId && (h.id === headId || h.code === headId))
  );

  // RULE: Attendance and gift collection are allowed if Live mode is active in the database OR on the scheduled event date
  const isHeadLive = Boolean(head && (head.isLive || head.is_live || head.prices?.is_live));
  if (!isHeadLive && head && head.eventDate) {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const eventDateStr = String(head.eventDate).split("T")[0].trim();

    if (eventDateStr !== todayStr) {
      const isEarly = eventDateStr > todayStr;
      return {
        success: false,
        error: isEarly
          ? `Check-in locked: "${head.title}" is scheduled for ${eventDateStr}. Admin can activate check-in and gifts anytime by enabling 'Live Mode' on this program in the Admin dashboard.`
          : `Check-in closed: "${head.title}" was held on ${eventDateStr}. Attendance and gifts cannot be marked after the event date.`
      };
    }
  }

  // RULE: Takeaway kit / Gift distribution must be explicitly approved/enabled by Admin for this event
  const isGiftApproved = Boolean(head && (head.giftEnabled || head.gift_enabled || head.prices?.gift_enabled));
  if ((mode === "gift" || mode === "kit") && !isGiftApproved) {
    return {
      success: false,
      error: `🎁 Takeaway kit / Gift distribution is currently disabled for "${head ? head.title : 'this event'}". Admin approval is required in the Admin Portal before gifts can be issued.`,
      payment
    };
  }

  const now = new Date().toISOString();
  const isToggle = Boolean(action === "toggle" || forceToggle);

  if (isToggle) {
    if (mode === "attendance" || mode === "entry") {
      const nextAttended = !payment.attended;
      payment.attended = nextAttended;
      payment.attendedAt = nextAttended ? now : null;
      if (supabase) {
        try {
          await supabase.from("payments").update({ attended: nextAttended, attended_at: payment.attendedAt }).eq("invoice_no", payment.invoiceNo);
        } catch (e) {}
      }
      writeLocalData(local);
      return {
        success: true,
        type: "attendance",
        status: nextAttended ? "first_entry" : "undone",
        message: nextAttended ? "✓ Check-in marked" : "Entry check-in undone",
        payment
      };
    } else if (mode === "gift" || mode === "kit") {
      const nextGift = !payment.giftCollected;
      payment.giftCollected = nextGift;
      payment.giftCollectedAt = nextGift ? now : null;
      if (supabase) {
        try {
          await supabase.from("payments").update({ gift_collected: nextGift, gift_collected_at: payment.giftCollectedAt }).eq("invoice_no", payment.invoiceNo);
        } catch (e) {}
      }
      writeLocalData(local);
      return {
        success: true,
        type: "gift",
        status: nextGift ? "gift_dispatched" : "undone",
        message: nextGift ? "🎁 Gift handover marked" : "Gift collection undone",
        payment
      };
    }
  }

  if (mode === "attendance" || mode === "entry") {
    const isFirstEntry = !payment.attended;
    if (isFirstEntry) {
      payment.attended = true;
      payment.attendedAt = now;
      if (supabase) {
        try {
          await supabase.from("payments").update({ attended: true, attended_at: now }).eq("invoice_no", payment.invoiceNo);
        } catch (e) {}
      }
      writeLocalData(local);
      return {
        success: true,
        type: "attendance",
        status: "first_entry",
        message: "✓ ENTRY GRANTED (First Check-In)",
        payment
      };
    } else {
      return {
        success: true,
        type: "attendance",
        status: "re_entry",
        message: `ℹ️ RE-ENTRY PERMITTED (Checked in at ${new Date(payment.attendedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})`,
        payment
      };
    }
  } else if (mode === "gift" || mode === "kit") {
    const isFirstClaim = !payment.giftCollected;
    if (isFirstClaim) {
      payment.giftCollected = true;
      payment.giftCollectedAt = now;
      if (supabase) {
        try {
          await supabase.from("payments").update({ gift_collected: true, gift_collected_at: now }).eq("invoice_no", payment.invoiceNo);
        } catch (e) {}
      }
      writeLocalData(local);
      return {
        success: true,
        type: "gift",
        status: "gift_dispatched",
        message: "🎁 GIFT / DELEGATE KIT DISPATCHED",
        payment
      };
    } else {
      return {
        success: false,
        type: "gift",
        status: "already_claimed",
        message: `⚠️ ALREADY CLAIMED: Gift kit was already received at ${new Date(payment.giftCollectedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}. Duplicate collection prohibited!`,
        payment
      };
    }
  }

  return { success: false, error: "Invalid scanning mode. Must be 'attendance' or 'gift'." };
}

