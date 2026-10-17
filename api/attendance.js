import { recordAttendanceOrGift, readLocalData } from "../lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { invoiceNo, headId, mode } = body;

    if (!invoiceNo) {
      return res.status(400).json({ success: false, error: "Invoice number or QR payload is required." });
    }

    const result = await recordAttendanceOrGift({ invoiceNo, headId, mode: mode || "attendance" });
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("API /attendance error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
