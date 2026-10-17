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

  if (cat === "board_member") {
    if (head.prices.member !== null && head.prices.member !== undefined && head.prices.member !== "") {
      return Number(head.prices.member);
    }
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

// Supabase Client Initialization
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

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
            category: m.category === "new_member" ? "associate_member" : m.category,
            parentMemberId: m.parent_member_id || null,
            parentMemberName: m.parent_member_name || null,
            parentMemberMobile: m.parent_member_mobile || null,
            company: m.company,
            city: m.city,
            gstin: m.gstin || "",
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
            prices: {
              associate_member: h.prices?.associate_member ?? h.prices?.new_member ?? ((h.type !== 'membership' && h.code !== 'MEM') ? h.prices?.member : null),
              member: h.prices?.member ?? null,
              board_member: h.prices?.board_member ?? null,
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
            payerCategory: p.payer_category === "new_member" ? "associate_member" : p.payer_category,
            payerId: p.payer_id,
            payerName: p.payer_name,
            payerMobile: p.payer_mobile,
            payerEmail: p.payer_email,
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
  const { headId, payerType, payerCategory, payerId, payerName, payerMobile, payerEmail, payerGstin, payerAddress } = paymentInput;
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
  const isMembershipPayment = head.code === "MEM" || head.type === "membership" || (head.title && head.title.toLowerCase().includes("membership"));
  if (isMembershipPayment && (payerId || payerMobile)) {
    if (supabase) {
      try {
        await supabase
          .from("members")
          .update({
            status: "active",
            last_paid_fy: fy,
            payment_means: paymentRecord.method,
            activation_note: (payerCategory === 'associate_member') ? `Associate Fee Paid (FY ${fy}) - Online (Invoice ${invoiceNo})` : `Paid online (Invoice ${invoiceNo})`,
            deactivation_reason: null
          })
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
      }
    }

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

  writeLocalData(local);
  return { member: mem, payment: paymentRecord };
}

// 7. Verify & Record Conference Attendance or Welcome Gift Collection
export async function recordAttendanceOrGift({ invoiceNo, headId, mode }) {
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

  const now = new Date().toISOString();

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

