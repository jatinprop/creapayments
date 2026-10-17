import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateMembershipCertificate } from "./lib/certificate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "data.json");
const PORT = process.env.PORT || 4000;

// Helper: Calculate Indian Financial Year (e.g. Oct 2026 -> 2627, Feb 2027 -> 2627)
function getFinancialYearCode(date = new Date()) {
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

function cleanMobile(mob) {
  if (!mob) return "";
  const digits = String(mob).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function isPaymentForMemberOrPayer(p, { id, mobile, email } = {}) {
  if (!p) return false;
  if (id && p.payerId && String(p.payerId).trim() === String(id).trim()) return true;
  const pMob = cleanMobile(p.payerMobile);
  const targetMob = cleanMobile(mobile);
  if (pMob && targetMob && pMob === targetMob) return true;
  if (email && p.payerEmail && p.payerEmail.trim().toLowerCase() === String(email).trim().toLowerCase()) return true;
  return false;
}

// Initial Sample Seed Data
function getInitialData() {
  const fy = getFinancialYearCode();
  return {
    invoiceCounter: 14,
    members: [
      {
        id: "mem-001",
        name: "Ramesh Gupta",
        mobile: "9800000001",
        email: "ramesh.gupta@crea-realty.in",
        category: "member", // member | new_member | board_member
        company: "Apex Prime Realty",
        city: "Bangalore",
        joinedDate: "2024-04-10"
      },
      {
        id: "mem-002",
        name: "Sneha Patel",
        mobile: "9800000002",
        email: "sneha.p@lotushomes.co",
        category: "new_member",
        company: "Lotus Property Consultants",
        city: "Bangalore",
        joinedDate: "2026-06-15"
      },
      {
        id: "mem-003",
        name: "Vikramaditya Rao",
        mobile: "9800000003",
        email: "v.rao@deccanproperties.com",
        category: "board_member",
        company: "Deccan Realtors & Estates",
        city: "Bangalore",
        joinedDate: "2021-01-20"
      },
      {
        id: "mem-004",
        name: "Anand Murthy",
        mobile: "9845999000",
        email: "anand.m@staypolis.com",
        category: "member",
        company: "Staypolis Brokerage",
        city: "Bangalore",
        joinedDate: "2023-08-01"
      },
      {
        id: "mem-005",
        name: "Kavita Reddy",
        mobile: "9711288901",
        email: "kavita.r@reddyrealty.in",
        category: "new_member",
        company: "Reddy Associates",
        city: "Bangalore",
        joinedDate: "2026-08-12"
      }
    ],
    heads: [
      {
        id: "head-mem",
        code: "MEM",
        title: "Annual CREA(I) Membership 2026-2027",
        type: "membership", // membership | training | event
        eventDate: "2026-04-01",
        eventTime: "Full Year Access",
        venue: "CREA(I) Headquarters & All Chapters",
        activeUntil: "2027-03-31T23:59:59",
        status: "active",
        prices: {
          new_member: 12000,
          member: 10000,
          board_member: 8000,
          non_member: null // Not visible to non-members
        },
        writeup: `The Confederation of Real Estate Associates (India) — CREA(I) is the premier self-regulatory association of professional real estate brokers, property managers, and valuation experts in South India. 

Your annual membership subscription for FY 2026-2027 entitles your firm to comprehensive professional standing, legal assistance on brokerage covenant disputes, and direct integration into the CREA Multi-Listing Exchange (MLE). Over the past twelve months, CREA(I) mediated over 140 commercial leasing transactions and spearheaded ethical commission standardization benchmarks across residential corridors.

Key Member Privileges:
1. Official CREA(I) Certified Realtor Certificate and verified digital credentials for client trust.
2. Direct access to our monthly Legal & Notary clinic for RERA complaints, draft scrutiny, and deposit escrow guidance.
3. Preferential registration rates on all accredited broker mastery certifications and quarterly state symposia.
4. Comprehensive arbitration board access in the event of client or fellow broker commission evasion.
5. Complimentary entry to the bi-annual Property Showcase networking breakfasts with tier-1 developers including Prestige, Sobha, and Brigade.

Members are requested to complete renewal promptly to prevent de-listing from the public verified realtor register.`
      },
      {
        id: "head-trn1",
        code: "TRN1",
        title: "Masterclass: RERA Compliance, Title Verification & Escrows",
        type: "training",
        eventDate: "2026-10-28",
        eventTime: "10:00 AM - 4:00 PM IST",
        venue: "The Lalit Hotel, High Grounds, Bangalore",
        activeUntil: "2026-10-28T09:00:00",
        status: "active",
        prices: {
          new_member: 1500,
          member: 1200,
          board_member: 0,
          non_member: 2500
        },
        writeup: `RERA litigation and title verification scrutiny have transformed real estate transactions into rigorous legal engagements. This full-day intensive masterclass is curated specifically for practicing real estate brokers, leasing executives, and independent agents seeking to eliminate liability and elevate deal closings.

Led by Senior Advocate & Real Estate Arbitrator Mr. Ajay Venkatesh along with seasoned land revenue experts, this masterclass delves into practical title search methodologies across Karnataka land records including RTC (Pahani), Encumbrance Certificates (Form 15 & 16), Katha extract nuances (e-Katha vs A-Katha vs B-Katha), and BDA/BMRDA layout approval checks.

Key Highlights of the Syllabus:
1. Identifying encumbrances, litigation flags, and revenue dispute caveats before listing properties.
2. Formulating watertight rental and sale agreements that safeguard broker commissions against client circumvention.
3. RERA Section 9 and 10 agent compliance mandates, annual filings, and advertising dos and don'ts.
4. Managing client advance tokens and escrow protocol to safeguard earnest deposits.
5. Interactive case studies on 5 high-profile land title defects resolved in Bangalore courts.

Includes accredited certification, comprehensive take-home legal draft toolkit on pendrive, gourmet lunch, and high-tea networking with senior legal professionals.`
      },
      {
        id: "head-trn2",
        code: "TRN2",
        title: "Executive Training: Digital Lead Generation & NRI Client Acquisition",
        type: "training",
        eventDate: "2026-11-18",
        eventTime: "02:00 PM - 06:00 PM IST",
        venue: "Virtual Live Interactive Studio (Zoom HD)",
        activeUntil: "2026-11-18T13:30:00",
        status: "active",
        prices: {
          new_member: 1000,
          member: 800,
          board_member: 0,
          non_member: 1800
        },
        writeup: `High-net-worth individuals and Non-Resident Indians (NRIs) represent over 38% of luxury real estate purchases and premium commercial leasing volume in metropolitan Bangalore. Reaching and qualifying these diaspora investors requires sophisticated digital acquisition funnels beyond conventional classifieds.

This intensive interactive webinar equips real estate professionals with automated lead generation systems, WhatsApp Business automation workflows, and high-converting performance marketing campaigns on Google Search and Meta Ads.

Workshop Outline:
1. Setting up geo-targeted campaigns targeting NRI hubs in the UAE, United States, United Kingdom, and Singapore.
2. Crafting video walkthrough presentations that convert remote NRI buyers without requiring physical property visits.
3. Automated WhatsApp CRM workflows for immediate lead engagement within 90 seconds of portal inquiry.
4. Navigating FEMA regulations, NRE/NRO bank accounts, repatriation covenants, and Power of Attorney (PoA) stamping.
5. Live demonstration of AI tools for generating property inspection reports and personalized investor pitch decks.

Participants will receive ready-to-deploy ad copy templates, email sequences, and a recording valid for 12 months.`
      },
      {
        id: "head-evt1",
        code: "EVT1",
        title: "CREA(I) Annual Realty Conclave & Networking Gala 2026",
        type: "event",
        eventDate: "2026-12-12",
        eventTime: "06:00 PM - 10:30 PM IST",
        venue: "Grand Ballroom, ITC Windsor, Golf Course Road, Bangalore",
        activeUntil: "2026-12-12T17:00:00",
        status: "active",
        prices: {
          new_member: 3500,
          member: 2800,
          board_member: 2000,
          non_member: 5000
        },
        writeup: `The Confederation of Real Estate Associates (India) cordially invites you to our flagship annual gathering — the CREA(I) Annual Realty Conclave & Networking Gala 2026. This landmark evening brings together over 400 distinguished real estate brokers, developers, legal luminaries, and government dignitaries under one roof.

Theme for 2026: 'The Next Decade of Urban Mobility & PropTech Growth in Bangalore'.

Evening Itinerary:
- 06:00 PM - Registration & Welcome High Tea
- 06:45 PM - Keynote Address by Hon'ble Minister for Housing & Urban Infrastructure
- 07:30 PM - Panel Discussion: Infrastructure corridors (Metro Phase 3, PRR & STRR) shaping high-yield residential clusters
- 08:30 PM - Presentation of the CREA(I) Excellence Awards recognizing top brokerages across South India
- 09:15 PM - Cocktail Reception, Gala Dinner & Unveiling of the CREA Property Research Whitepaper 2027

Dress Code: Formal Western / Indian Traditional Formal.
Complimentary valet parking available at the venue.`
      }
    ],
    payments: [
      {
        id: "pay-101",
        invoiceNo: `CREA/${fy}/MEM/0001`,
        serial: 1,
        date: "2026-08-05T10:15:00.000Z",
        headId: "head-mem",
        headCode: "MEM",
        headTitle: "Annual CREA(I) Membership 2026-2027",
        payerType: "member",
        payerCategory: "member",
        payerId: "mem-001",
        payerName: "Ramesh Gupta",
        payerMobile: "9800000001",
        payerEmail: "ramesh.gupta@crea-realty.in",
        baseAmount: 10000,
        cgst: 900,
        sgst: 900,
        totalGst: 1800,
        totalAmount: 11800,
        status: "success",
        method: "Simulated Gateway (Card / NetBanking)"
      },
      {
        id: "pay-102",
        invoiceNo: `CREA/${fy}/MEM/0002`,
        serial: 2,
        date: "2026-08-07T14:20:00.000Z",
        headId: "head-mem",
        headCode: "MEM",
        headTitle: "Annual CREA(I) Membership 2026-2027",
        payerType: "member",
        payerCategory: "board_member",
        payerId: "mem-003",
        payerName: "Vikramaditya Rao",
        payerMobile: "9800000003",
        payerEmail: "v.rao@deccanproperties.com",
        baseAmount: 8000,
        cgst: 720,
        sgst: 720,
        totalGst: 1440,
        totalAmount: 9440,
        status: "success",
        method: "Simulated Gateway (UPI)"
      },
      {
        id: "pay-103",
        invoiceNo: `CREA/${fy}/MEM/0003`,
        serial: 3,
        date: "2026-08-14T11:05:00.000Z",
        headId: "head-mem",
        headCode: "MEM",
        headTitle: "Annual CREA(I) Membership 2026-2027",
        payerType: "member",
        payerCategory: "new_member",
        payerId: "mem-002",
        payerName: "Sneha Patel",
        payerMobile: "9800000002",
        payerEmail: "sneha.p@lotushomes.co",
        baseAmount: 12000,
        cgst: 1080,
        sgst: 1080,
        totalGst: 2160,
        totalAmount: 14160,
        status: "success",
        method: "Simulated Gateway (NetBanking)"
      },
      {
        id: "pay-104",
        invoiceNo: `CREA/${fy}/TRN1/0004`,
        serial: 4,
        date: "2026-08-20T09:40:00.000Z",
        headId: "head-trn1",
        headCode: "TRN1",
        headTitle: "Masterclass: RERA Compliance, Title Verification & Escrows",
        payerType: "member",
        payerCategory: "member",
        payerId: "mem-001",
        payerName: "Ramesh Gupta",
        payerMobile: "9800000001",
        payerEmail: "ramesh.gupta@crea-realty.in",
        baseAmount: 1200,
        cgst: 108,
        sgst: 108,
        totalGst: 216,
        totalAmount: 1416,
        status: "success",
        method: "Simulated Gateway (UPI)"
      },
      {
        id: "pay-105",
        invoiceNo: `CREA/${fy}/TRN1/0005`,
        serial: 5,
        date: "2026-08-22T16:15:00.000Z",
        headId: "head-trn1",
        headCode: "TRN1",
        headTitle: "Masterclass: RERA Compliance, Title Verification & Escrows",
        payerType: "non_member",
        payerCategory: "non_member",
        payerId: null,
        payerName: "Siddharth Joshi",
        payerMobile: "9845112233",
        payerEmail: "sid.joshi@urbanestates.in",
        baseAmount: 2500,
        cgst: 225,
        sgst: 225,
        totalGst: 450,
        totalAmount: 2950,
        status: "success",
        method: "Simulated Gateway (Credit Card)"
      },
      {
        id: "pay-106",
        invoiceNo: `CREA/${fy}/MEM/0006`,
        serial: 6,
        date: "2026-09-01T10:00:00.000Z",
        headId: "head-mem",
        headCode: "MEM",
        headTitle: "Annual CREA(I) Membership 2026-2027",
        payerType: "member",
        payerCategory: "member",
        payerId: "mem-004",
        payerName: "Anand Murthy",
        payerMobile: "9845999000",
        payerEmail: "anand.m@staypolis.com",
        baseAmount: 10000,
        cgst: 900,
        sgst: 900,
        totalGst: 1800,
        totalAmount: 11800,
        status: "success",
        method: "Simulated Gateway (UPI)"
      },
      {
        id: "pay-107",
        invoiceNo: `CREA/${fy}/TRN1/0007`,
        serial: 7,
        date: "2026-09-04T12:30:00.000Z",
        headId: "head-trn1",
        headCode: "TRN1",
        headTitle: "Masterclass: RERA Compliance, Title Verification & Escrows",
        payerType: "member",
        payerCategory: "new_member",
        payerId: "mem-002",
        payerName: "Sneha Patel",
        payerMobile: "9800000002",
        payerEmail: "sneha.p@lotushomes.co",
        baseAmount: 1500,
        cgst: 135,
        sgst: 135,
        totalGst: 270,
        totalAmount: 1770,
        status: "success",
        method: "Simulated Gateway (UPI)"
      },
      {
        id: "pay-108",
        invoiceNo: `CREA/${fy}/TRN1/0008`,
        serial: 8,
        date: "2026-09-06T15:45:00.000Z",
        headId: "head-trn1",
        headCode: "TRN1",
        headTitle: "Masterclass: RERA Compliance, Title Verification & Escrows",
        payerType: "non_member",
        payerCategory: "non_member",
        payerId: null,
        payerName: "Deepak Mehra",
        payerMobile: "9820011223",
        payerEmail: "deepak@mehraproperty.com",
        baseAmount: 2500,
        cgst: 225,
        sgst: 225,
        totalGst: 450,
        totalAmount: 2950,
        status: "success",
        method: "Simulated Gateway (Debit Card)"
      },
      {
        id: "pay-109",
        invoiceNo: `CREA/${fy}/TRN2/0009`,
        serial: 9,
        date: "2026-09-12T11:20:00.000Z",
        headId: "head-trn2",
        headCode: "TRN2",
        headTitle: "Executive Training: Digital Lead Generation & NRI Client Acquisition",
        payerType: "member",
        payerCategory: "member",
        payerId: "mem-001",
        payerName: "Ramesh Gupta",
        payerMobile: "9800000001",
        payerEmail: "ramesh.gupta@crea-realty.in",
        baseAmount: 800,
        cgst: 72,
        sgst: 72,
        totalGst: 144,
        totalAmount: 944,
        status: "success",
        method: "Simulated Gateway (UPI)"
      },
      {
        id: "pay-110",
        invoiceNo: `CREA/${fy}/TRN2/0010`,
        serial: 10,
        date: "2026-09-15T17:10:00.000Z",
        headId: "head-trn2",
        headCode: "TRN2",
        headTitle: "Executive Training: Digital Lead Generation & NRI Client Acquisition",
        payerType: "non_member",
        payerCategory: "non_member",
        payerId: null,
        payerName: "Harish Bhatia",
        payerMobile: "9876543210",
        payerEmail: "harish@bhatiarealtors.in",
        baseAmount: 1800,
        cgst: 162,
        sgst: 162,
        totalGst: 324,
        totalAmount: 2124,
        status: "success",
        method: "Simulated Gateway (Card)"
      },
      {
        id: "pay-111",
        invoiceNo: `CREA/${fy}/EVT1/0011`,
        serial: 11,
        date: "2026-09-22T14:00:00.000Z",
        headId: "head-evt1",
        headCode: "EVT1",
        headTitle: "CREA(I) Annual Realty Conclave & Networking Gala 2026",
        payerType: "member",
        payerCategory: "board_member",
        payerId: "mem-003",
        payerName: "Vikramaditya Rao",
        payerMobile: "9800000003",
        payerEmail: "v.rao@deccanproperties.com",
        baseAmount: 2000,
        cgst: 180,
        sgst: 180,
        totalGst: 360,
        totalAmount: 2360,
        status: "success",
        method: "Simulated Gateway (Corporate Card)"
      },
      {
        id: "pay-112",
        invoiceNo: `CREA/${fy}/EVT1/0012`,
        serial: 12,
        date: "2026-09-28T18:30:00.000Z",
        headId: "head-evt1",
        headCode: "EVT1",
        headTitle: "CREA(I) Annual Realty Conclave & Networking Gala 2026",
        payerType: "member",
        payerCategory: "member",
        payerId: "mem-001",
        payerName: "Ramesh Gupta",
        payerMobile: "9800000001",
        payerEmail: "ramesh.gupta@crea-realty.in",
        baseAmount: 2800,
        cgst: 252,
        sgst: 252,
        totalGst: 504,
        totalAmount: 3304,
        status: "success",
        method: "Simulated Gateway (UPI)"
      },
      {
        id: "pay-113",
        invoiceNo: `CREA/${fy}/EVT1/0013`,
        serial: 13,
        date: "2026-10-02T10:45:00.000Z",
        headId: "head-evt1",
        headCode: "EVT1",
        headTitle: "CREA(I) Annual Realty Conclave & Networking Gala 2026",
        payerType: "non_member",
        payerCategory: "non_member",
        payerId: null,
        payerName: "Pooja Venkatesh",
        payerMobile: "9900112233",
        payerEmail: "pooja.v@greenviewbuilders.com",
        baseAmount: 5000,
        cgst: 450,
        sgst: 450,
        totalGst: 900,
        totalAmount: 5900,
        status: "success",
        method: "Simulated Gateway (NetBanking)"
      },
      {
        id: "pay-114",
        invoiceNo: `CREA/${fy}/TRN2/0014`,
        serial: 14,
        date: "2026-10-10T16:20:00.000Z",
        headId: "head-trn2",
        headCode: "TRN2",
        headTitle: "Executive Training: Digital Lead Generation & NRI Client Acquisition",
        payerType: "member",
        payerCategory: "new_member",
        payerId: "mem-005",
        payerName: "Kavita Reddy",
        payerMobile: "9711288901",
        payerEmail: "kavita.r@reddyrealty.in",
        baseAmount: 1000,
        cgst: 90,
        sgst: 90,
        totalGst: 180,
        totalAmount: 1180,
        status: "success",
        method: "Simulated Gateway (UPI)"
      }
    ],
    emailLogs: [
      {
        id: "log-1",
        timestamp: "2026-08-05T10:15:02.000Z",
        recipient: "ramesh.gupta@crea-realty.in",
        recipientName: "Ramesh Gupta",
        subject: `CREA(I) Tax Invoice CREA/${fy}/MEM/0001 - Annual Membership 2026-2027`,
        invoiceNo: `CREA/${fy}/MEM/0001`,
        amount: 11800,
        status: "Dispatched (Simulated SMTP)"
      },
      {
        id: "log-14",
        timestamp: "2026-10-10T16:20:05.000Z",
        recipient: "kavita.r@reddyrealty.in",
        recipientName: "Kavita Reddy",
        subject: `CREA(I) Tax Invoice CREA/${fy}/TRN2/0014 - Executive Training`,
        invoiceNo: `CREA/${fy}/TRN2/0014`,
        amount: 1180,
        status: "Dispatched (Simulated SMTP)"
      }
    ]
  };
}

// Load or initialize state
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const init = getInitialData();
      fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2), "utf8");
      return init;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading data file:", err);
    return getInitialData();
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing data file:", err);
  }
}

// Ensure data file exists
readData();

// HTTP Server
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // JSON Body Parser helper
  const readBody = (callback) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const json = body ? JSON.parse(body) : {};
        callback(null, json);
      } catch (err) {
        callback(err);
      }
    });
  };

  // API ROUTE 1: GET /api/data
  if (req.method === "GET" && pathname === "/api/data") {
    const data = readData();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data }));
  }

  // API ROUTE 2: POST /api/payment
  if (req.method === "POST" && pathname === "/api/payment") {
    return readBody((err, body) => {
      if (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
      }

      const { headId, payerType, payerCategory, payerId, payerName, payerMobile, payerEmail, payerGstin, payerAddress } = body;
      const data = readData();
      const head = data.heads.find((h) => h.id === headId);

      if (!head) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Payment head not found." }));
      }

      const basePrice = head.prices[payerCategory];
      if (basePrice === undefined || basePrice === null) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "No price configured for this category." }));
      }

      // Check closing date
      if (head.activeUntil && new Date(head.activeUntil) < new Date()) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "This payment head has closed/expired." }));
      }

      // Check active / deactivated / deleted status
      if (head.status === "deactivated" || head.status === "inactive" || head.status === "deleted" || head.isDeleted) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "This payment head is deactivated or deleted and cannot accept registrations." }));
      }

      const fy = getFinancialYearCode();

      // RULE: Guard against duplicate Annual Membership payment for the same financial year
      const isMembershipPayment = head.code === "MEM" || head.type === "membership" || (head.title && head.title.toLowerCase().includes("membership"));
      if (isMembershipPayment && (body.payerId || body.payerMobile || body.payerEmail)) {
        const payerQuery = { id: body.payerId, mobile: body.payerMobile, email: body.payerEmail };
        const existingMemPay = (data.payments || []).find((p) =>
          isPaymentForMemberOrPayer(p, payerQuery) &&
          (p.headCode === "MEM" || (p.headTitle && p.headTitle.toLowerCase().includes("membership")) || (p.invoiceNo && p.invoiceNo.includes("/MEM/"))) &&
          p.status === "success" &&
          (p.invoiceNo?.includes(`/${fy}/`) || (p.date && new Date(p.date) >= new Date('2026-04-01')))
        );
        if (existingMemPay) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            success: false,
            error: `Annual Membership for financial year ${fy} has already been paid (Tax Invoice: ${existingMemPay.invoiceNo}). A member can only pay annual membership once per financial year.`
          }));
        }

        const existingActiveMem = (data.members || []).find((m) =>
          (body.payerId && m.id === body.payerId) ||
          (cleanMobile(body.payerMobile) && cleanMobile(m.mobile) === cleanMobile(body.payerMobile)) ||
          (body.payerEmail && m.email && m.email.trim().toLowerCase() === String(body.payerEmail).trim().toLowerCase())
        );
        if (existingActiveMem && (existingActiveMem.lastPaidFY === fy || existingActiveMem.status === "active") && (data.payments || []).some(p => isPaymentForMemberOrPayer(p, existingActiveMem) && (p.headCode === "MEM" || (p.invoiceNo && p.invoiceNo.includes("/MEM/"))) && p.status === "success")) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            success: false,
            error: `Member '${existingActiveMem.name}' has already paid annual membership dues for FY ${fy}. Duplicate payment is not allowed.`
          }));
        }
      }

      // 18% GST Calculations
      const base = Number(basePrice);
      const cgst = Math.round(base * 0.09 * 100) / 100;
      const sgst = Math.round(base * 0.09 * 100) / 100;
      const totalGst = Math.round((cgst + sgst) * 100) / 100;
      const total = Math.round((base + totalGst) * 100) / 100;

      // Sequential Invoice Number: CREA/YYZZ/<CODE>/<0001>
      const nextSerial = (data.invoiceCounter || 0) + 1;
      data.invoiceCounter = nextSerial;
      const serialStr = String(nextSerial).padStart(4, "0");
      const invoiceNo = `CREA/${fy}/${head.code.toUpperCase()}/${serialStr}`;

      const now = new Date().toISOString();
      const newPayment = {
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

      data.payments.unshift(newPayment);

      // Auto-activate member if payment is for membership
      if (isMembershipPayment && (payerId || payerMobile || payerEmail)) {
        const mem = data.members.find((m) =>
          (payerId && m.id === payerId) ||
          (cleanMobile(payerMobile) && cleanMobile(m.mobile) === cleanMobile(payerMobile)) ||
          (payerEmail && m.email && m.email.trim().toLowerCase() === String(payerEmail).trim().toLowerCase())
        );
        if (mem) {
          mem.status = "active";
          mem.lastPaidFY = fy;
          mem.paymentMeans = "Online Gateway";
          mem.activationNote = (mem.category === 'associate_member') ? `Associate Fee Paid (Invoice ${invoiceNo})` : `Online Payment (Invoice ${invoiceNo})`;
          mem.deactivationReason = null;
        }
      }

      // Email dispatch record
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
      data.emailLogs.unshift(emailRecord);

      writeData(data);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        success: true,
        payment: newPayment,
        message: `Payment successful! Tax Invoice ${invoiceNo} generated.`
      }));
    });
  }

  // API ROUTE 3: POST /api/head and POST /api/head/update (Create / Modify Head)
  if (req.method === "POST" && (pathname === "/api/head" || pathname === "/api/head/update")) {
    return readBody((err, body) => {
      if (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
      }

      const { id, code, title, type, status, eventDate, eventTime, venue, activeUntil, prices, writeup } = body;
      const data = readData();

      // If updating an existing head
      if (id) {
        const existing = data.heads.find((h) => h.id === id);
        if (existing) {
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
              new_member: (prices.new_member !== null && prices.new_member !== undefined && prices.new_member !== "") ? Number(prices.new_member) : null,
              member: (prices.member !== null && prices.member !== undefined && prices.member !== "") ? Number(prices.member) : null,
              board_member: (prices.board_member !== null && prices.board_member !== undefined && prices.board_member !== "") ? Number(prices.board_member) : null,
              non_member: (prices.non_member !== null && prices.non_member !== undefined && prices.non_member !== "") ? Number(prices.non_member) : null
            };
          }
          if (writeup !== undefined) existing.writeup = writeup;

          writeData(data);
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: true, head: existing, message: `Program '${existing.title}' updated successfully.` }));
        }
      }

      // Otherwise create a new head
      if (!code || !title || !activeUntil) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Title, Code, and Active Until date are mandatory." }));
      }

      const newHead = {
        id: `head-${Date.now()}`,
        code: code.trim().toUpperCase(),
        title: title.trim(),
        type: type || "training",
        eventDate: eventDate || new Date().toISOString().split("T")[0],
        eventTime: eventTime || "Full Day",
        venue: venue || "CREA(I) Centre, Bangalore",
        activeUntil,
        status: status || "active",
        prices: {
          new_member: (prices?.new_member !== null && prices?.new_member !== undefined && prices?.new_member !== "") ? Number(prices.new_member) : null,
          member: (prices?.member !== null && prices?.member !== undefined && prices?.member !== "") ? Number(prices.member) : null,
          board_member: (prices?.board_member !== null && prices?.board_member !== undefined && prices?.board_member !== "") ? Number(prices.board_member) : null,
          non_member: (prices?.non_member !== null && prices?.non_member !== undefined && prices?.non_member !== "") ? Number(prices.non_member) : null
        },
        writeup: writeup || ""
      };

      data.heads.unshift(newHead);
      writeData(data);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: true, head: newHead }));
    });
  }

  // API ROUTE 3B: POST /api/head/status (Activate / Deactivate Head)
  if (req.method === "POST" && pathname === "/api/head/status") {
    return readBody((err, body) => {
      if (err || !body.id || !body.status) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Head ID and target status are required." }));
      }

      const data = readData();
      const head = data.heads.find((h) => h.id === body.id);
      if (!head) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Payment head not found." }));
      }

      head.status = body.status;
      writeData(data);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        success: true,
        head,
        message: `Program '${head.title}' is now ${body.status.toUpperCase()}.`
      }));
    });
  }

  // API ROUTE 3C: POST /api/head/delete (Delete / Archive Program)
  if (req.method === "POST" && pathname === "/api/head/delete") {
    return readBody((err, body) => {
      if (err || !body.id) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Head ID is required." }));
      }

      const data = readData();
      const head = data.heads.find((h) => h.id === body.id);
      if (!head) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Payment head not found." }));
      }

      const hasPayments = (data.payments || []).some((p) => p.headId === body.id || p.headCode === head.code);
      if (hasPayments) {
        // Soft delete to protect audit records, tax invoices, and delegate passes
        head.status = "deleted";
      } else {
        data.heads = data.heads.filter((h) => h.id !== body.id);
      }
      writeData(data);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        success: true,
        head,
        message: `Program '${head.title}' has been deleted and removed from payment pages.`
      }));
    });
  }

  // API ROUTE 4: POST /api/members (Add / Bulk Import)
  if (req.method === "POST" && pathname === "/api/members") {
    return readBody((err, body) => {
      if (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
      }

      const { action, member, bulkText } = body;
      const data = readData();

      // Update existing member
      if (action === "update_member" && member && member.id) {
        data.members = data.members || [];
        const idx = data.members.findIndex((m) => m.id === member.id);
        if (idx !== -1) {
          data.members[idx] = { ...data.members[idx], ...member };
        } else {
          data.members.push(member);
        }
        writeData(data);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: true, member }));
      }

      if (member) {
        const newMem = {
          id: member.id || `mem-${Date.now()}`,
          name: member.name.trim(),
          mobile: member.mobile.trim(),
          email: member.email.trim(),
          category: member.category || "member",
          parentMemberId: member.parentMemberId || null,
          parentMemberName: member.parentMemberName || null,
          parentMemberMobile: member.parentMemberMobile || null,
          gstin: member.gstin ? member.gstin.trim().toUpperCase() : null,
          address: member.address ? member.address.trim() : null,
          company: (member.company || "").trim() || "CREA Member Brokerage",
          city: member.city || "Bangalore",
          status: member.status || "active",
          lastPaidFY: member.lastPaidFY || "2627",
          paymentMeans: member.paymentMeans || null,
          activationNote: member.activationNote || null,
          joinedDate: new Date().toISOString().split("T")[0]
        };
        data.members.push(newMem);
      } else if (bulkText) {
        // Parse CSV or lines: Name, Mobile, Email, Category
        const lines = bulkText.split("\n");
        for (const line of lines) {
          const parts = line.split(",").map((p) => p.trim());
          if (parts.length >= 3 && parts[1]) {
            data.members.push({
              id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: parts[0] || "Member",
              mobile: parts[1],
              email: parts[2] || "",
              category: parts[3] ? parts[3].toLowerCase().replace(/\s+/g, "_") : "member",
              company: parts[4] || "Real Estate Broker",
              city: "Bangalore",
              joinedDate: new Date().toISOString().split("T")[0]
            });
          }
        }
      }

      writeData(data);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: true, members: data.members }));
    });
  }

  // API ROUTE 4B: POST /api/member/status (Toggle Activate / Deactivate)
  if (req.method === "POST" && pathname === "/api/member/status") {
    return readBody((err, body) => {
      if (err || !body.id || !body.status) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Member ID and status are required." }));
      }
      const data = readData();
      const mem = data.members.find((m) => m.id === body.id);
      if (!mem) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Member not found." }));
      }
      mem.status = body.status;
      writeData(data);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: true, member: mem }));
    });
  }

  // API ROUTE 4C: POST /api/member/activate-manual (Admin manual activation with payment means & note)
  if (req.method === "POST" && pathname === "/api/member/activate-manual") {
    return readBody((err, body) => {
      if (err || !body.id) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Member ID is required." }));
      }
      const data = readData();
      const mem = data.members.find((m) => m.id === body.id);
      if (!mem) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Member not found." }));
      }

      const fy = getFinancialYearCode();
      mem.status = "active";
      mem.lastPaidFY = fy;
      mem.paymentMeans = body.paymentMeans || "Manual Verification";
      mem.activationNote = body.description || "Admin activated membership";

      let paymentRecord = null;
      if (body.createInvoice) {
        // Prevent duplicate invoice generation if member already has a tax invoice for this FY
        const existingInvoice = (data.payments || []).find((p) =>
          isPaymentForMemberOrPayer(p, mem) &&
          (p.headCode === "MEM" || (p.headTitle && p.headTitle.toLowerCase().includes("membership")) || (p.invoiceNo && p.invoiceNo.includes("/MEM/"))) &&
          p.status === "success"
        );
        if (existingInvoice) {
          paymentRecord = existingInvoice;
        } else {
          const head = data.heads.find((h) => h.id === body.headId || h.code === "MEM") || data.heads[0];
          if (head) {
            const base = Number(head.prices[mem.category] || 10000);
            const cgst = Math.round(base * 0.09 * 100) / 100;
            const sgst = Math.round(base * 0.09 * 100) / 100;
            const totalGst = Math.round((cgst + sgst) * 100) / 100;
            const total = Math.round((base + totalGst) * 100) / 100;
            const now = new Date().toISOString();

            const nextSerial = (data.invoiceCounter || 0) + 1;
            data.invoiceCounter = nextSerial;
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
              method: `Manual Admin (${mem.paymentMeans}): ${mem.activationNote}`
            };
            data.payments.unshift(paymentRecord);
          }
        }
      }

      writeData(data);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: true, member: mem, payment: paymentRecord }));
    });
  }

  // API ROUTE 5: POST /api/renew (1-Click Yearly Renewal)
  if (req.method === "POST" && pathname === "/api/renew") {
    const data = readData();
    const nextYear = new Date().getFullYear() + 1;
    const fyCode = `${String(nextYear).slice(-2)}${String(nextYear + 1).slice(-2)}`;

    // Convert new_member to member and deactivate members for the new cycle
    data.members.forEach((m) => {
      if (m.category === "new_member") {
        m.category = "member";
      }
      m.status = "deactivated";
      m.lastPaidFY = null;
      m.activationNote = `Pending Annual Renewal for FY ${nextYear}-${nextYear + 1}`;
    });

    // Create a new membership head
    const renewalHead = {
      id: `head-mem-${Date.now()}`,
      code: "MEM",
      title: `Annual CREA(I) Membership Renewal ${nextYear}-${nextYear + 1}`,
      type: "membership",
      eventDate: `${nextYear}-04-01`,
      eventTime: "Full Year Access",
      venue: "All Chapters",
      activeUntil: `${nextYear + 1}-03-31T23:59:59`,
      status: "active",
      prices: {
        associate_member: 5000,
        member: 10000,
        board_member: 8000,
        non_member: null
      },
      writeup: `Annual membership renewal for CREA(I) accredited brokerages for the session ${nextYear}-${nextYear + 1}. All members enjoy uninterrupted access to CREA MLS, legal escrow mediation, and certified broker masterclasses.`
    };

    data.heads.unshift(renewalHead);
    writeData(data);

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      success: true,
      message: `Annual Renewal successfully activated! Head '${renewalHead.title}' created and members queued for renewal.`,
      head: renewalHead
    }));
  }

  // API ROUTE 5B: POST /api/attendance (Mark Attendance or Gift Claim)
  if (req.method === "POST" && pathname === "/api/attendance") {
    return readBody((err, body) => {
      if (err || !body.invoiceNo) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Invoice number or QR data required." }));
      }
      const data = readData();
      const cleanInv = (body.invoiceNo || "").trim().toUpperCase();
      const payment = data.payments.find((p) =>
        p.invoiceNo.toUpperCase() === cleanInv ||
        (p.id && p.id.toUpperCase() === cleanInv) ||
        cleanInv.includes(p.invoiceNo.toUpperCase())
      );

      if (!payment) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: `Invalid Ticket: No registration found for "${cleanInv}".` }));
      }

      if (body.headId && payment.headId && payment.headId !== body.headId && payment.headCode !== body.headId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: `Wrong Event Ticket: This ticket is for "${payment.headTitle}".`, payment }));
      }

      // Find the associated head for this payment
      const head = (data.heads || []).find((h) =>
        h.id === payment.headId ||
        h.code === payment.headCode ||
        (body.headId && (h.id === body.headId || h.code === body.headId))
      );

      // RULE: Attendance and gift collection are strictly allowed ONLY on the day of the training / event held
      if (head && head.eventDate) {
        const today = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        const eventDateStr = String(head.eventDate).split("T")[0].trim();

        if (eventDateStr !== todayStr) {
          const isEarly = eventDateStr > todayStr;
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            success: false,
            error: isEarly
              ? `Check-in prohibited: "${head.title}" is scheduled for ${eventDateStr}. Attendance and gifts can strictly only be marked on the day of the event held (not early).`
              : `Check-in closed: "${head.title}" took place on ${eventDateStr}. Attendance and gifts cannot be marked after the event date.`
          }));
        }
      }

      const mode = body.mode || "attendance";
      const now = new Date().toISOString();

      if (mode === "attendance" || mode === "entry") {
        if (!payment.attended) {
          payment.attended = true;
          payment.attendedAt = now;
          writeData(data);
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            success: true,
            type: "attendance",
            status: "first_entry",
            message: "✓ ENTRY GRANTED (First Check-In)",
            payment
          }));
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            success: true,
            type: "attendance",
            status: "re_entry",
            message: `ℹ️ RE-ENTRY PERMITTED (Checked in at ${new Date(payment.attendedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})`,
            payment
          }));
        }
      } else if (mode === "gift" || mode === "kit") {
        if (!payment.giftCollected) {
          payment.giftCollected = true;
          payment.giftCollectedAt = now;
          writeData(data);
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            success: true,
            type: "gift",
            status: "gift_dispatched",
            message: "🎁 GIFT / DELEGATE KIT DISPATCHED",
            payment
          }));
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            success: false,
            type: "gift",
            status: "already_claimed",
            message: `⚠️ ALREADY CLAIMED: Gift was already collected at ${new Date(payment.giftCollectedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`,
            payment
          }));
        }
      }

      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "Invalid mode." }));
    });
  }

  // API ROUTE 6: POST /api/reset (Clear All Demo Payments)
  if (req.method === "POST" && pathname === "/api/reset") {
    const data = readData();
    data.payments = [];
    data.emailLogs = [];
    data.invoiceCounter = 0;
    writeData(data);

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      success: true,
      message: "All simulated payments cleared. Invoice serial reset to 0001."
    }));
  }

  // API ROUTE 7: GET & POST /api/certificate (Dynamic Official CREA(I) Membership Certificate)
  if (pathname === "/api/certificate") {
    let memberName = "";
    let companyName = "";
    let isPreview = false;
    let certId = "";

    const data = readData();

    if (req.method === "GET") {
      const invoiceNo = parsedUrl.query.invoiceNo;
      const memberId = parsedUrl.query.memberId;
      const nameParam = parsedUrl.query.name;
      const companyParam = parsedUrl.query.company;
      isPreview = parsedUrl.query.preview === "true" || parsedUrl.query.preview === "1";

      if (invoiceNo) {
        certId = invoiceNo;
        const payment = data.payments.find((p) => p.invoiceNo.toUpperCase() === invoiceNo.trim().toUpperCase());
        if (payment) {
          memberName = payment.payerName;
          const mem = data.members.find((m) => m.id === payment.payerId || m.mobile === payment.payerMobile || m.name.toLowerCase() === payment.payerName.toLowerCase());
          if (mem && mem.company && mem.company !== "Independent Realtor") {
            companyName = mem.company;
          } else if (payment.payerCompany && payment.payerCompany !== "Independent Realtor") {
            companyName = payment.payerCompany;
          } else if (mem && mem.company) {
            companyName = mem.company;
          }
        }
      }

      if (!memberName && memberId) {
        const mem = data.members.find((m) => m.id === memberId);
        if (mem) {
          memberName = mem.name;
          if (mem.company && mem.company !== "Independent Realtor") {
            companyName = mem.company;
          }
          certId = mem.id;
        }
      }

      if (!memberName && nameParam) {
        memberName = nameParam;
      }
      if (companyParam && companyParam.trim()) {
        companyName = companyParam.trim();
      }
    } else if (req.method === "POST") {
      return readBody(async (err, body) => {
        if (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
        }
        memberName = body.memberName || "";
        companyName = body.companyName || "";
        certId = body.invoiceNo || body.certId || "";
        isPreview = Boolean(body.preview);

        if (!memberName && body.invoiceNo) {
          const payment = data.payments.find((p) => p.invoiceNo.toUpperCase() === body.invoiceNo.trim().toUpperCase());
          if (payment) {
            memberName = payment.payerName;
            const mem = data.members.find((m) => m.id === payment.payerId || m.mobile === payment.payerMobile || m.name.toLowerCase() === payment.payerName.toLowerCase());
            if (!companyName) {
              if (mem && mem.company && mem.company !== "Independent Realtor") {
                companyName = mem.company;
              } else if (payment.payerCompany && payment.payerCompany !== "Independent Realtor") {
                companyName = payment.payerCompany;
              } else if (mem && mem.company) {
                companyName = mem.company;
              }
            }
          }
        }

        try {
          if (!memberName) {
            memberName = "Jatin Jain";
          }
          if (!companyName || companyName === "Independent Realtor") {
            companyName = "J J Properties";
          }
          const pdfBytes = await generateMembershipCertificate({ memberName, companyName, certId });
          const safeName = memberName.replace(/[^a-zA-Z0-9_-]/g, "_");
          const filename = `CREA_Membership_Certificate_2026-27_${safeName}.pdf`;

          res.writeHead(200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": isPreview ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`,
            "Content-Length": pdfBytes.length
          });
          return res.end(Buffer.from(pdfBytes));
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
    }

    try {
      if (!memberName) {
        memberName = "Jatin Jain";
      }
      if (!companyName || companyName === "Independent Realtor") {
        companyName = "J J Properties";
      }
      return (async () => {
        const pdfBytes = await generateMembershipCertificate({ memberName, companyName, certId });
        const safeName = memberName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const filename = `CREA_Membership_Certificate_2026-27_${safeName}.pdf`;

        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": isPreview ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`,
          "Content-Length": pdfBytes.length
        });
        return res.end(Buffer.from(pdfBytes));
      })().catch((e) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: e.message }));
      });
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }

  // Serve Static index.html or files
  let filePath = path.join(__dirname, pathname === "/" ? "index.html" : pathname);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        // Fallback to index.html for SPA routing
        fs.readFile(path.join(__dirname, "index.html"), (err2, fallbackContent) => {
          if (err2) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            return res.end("Not Found");
          }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          return res.end(fallbackContent);
        });
        return;
      }
      res.writeHead(500);
      return res.end(`Server Error: ${err.code}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".ttf": "font/ttf"
    };

    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🏛️ CREA(I) Payment & Membership Management Suite Live`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Root Path: ${__dirname}`);
  console.log(`Admin PIN: crea-admin`);
  console.log(`======================================================\n`);
});
