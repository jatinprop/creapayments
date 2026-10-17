import { fetchGstDetails } from "../lib/gst.js";
import { fetchAllData, readLocalData } from "../lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    let gstin = req.query?.gstin;
    if (!gstin && req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      gstin = body.gstin;
    }

    if (!gstin) {
      return res.status(400).json({ success: false, error: "Missing GSTIN query parameter or body." });
    }

    // Load existing members for caching / directory lookup
    let members = [];
    try {
      const db = await fetchAllData();
      members = db?.members || [];
    } catch (e) {
      const local = readLocalData();
      members = local?.members || [];
    }

    const result = await fetchGstDetails(gstin, members);
    return res.status(200).json(result);
  } catch (error) {
    console.error("API /api/gst error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
