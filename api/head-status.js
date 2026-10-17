import { setHeadStatus } from "../lib/supabase.js";

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
    if (!body.id || !body.status) {
      return res.status(400).json({ success: false, error: "Head ID and target status are required." });
    }
    const head = await setHeadStatus(body.id, body.status);
    return res.status(200).json({
      success: true,
      head,
      message: `Program '${head?.title || body.id}' is now ${body.status.toUpperCase()}.`
    });
  } catch (error) {
    console.error("API /head/status error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}
