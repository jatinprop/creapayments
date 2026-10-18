import { upsertHead, setHeadLive } from "../lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    // 1. Dedicated Live Toggle
    if (body.action === "toggle_live" || (body.id && body.isLive !== undefined && !body.title)) {
      const head = await setHeadLive(body.id, body.isLive);
      return res.status(200).json({
        success: true,
        head,
        message: `Program '${head?.title || body.id}' Live mode is now ${Boolean(body.isLive) ? 'ACTIVE' : 'OFF'}.`
      });
    }

    // 2. Full Head Create / Update
    const head = await upsertHead(body);
    return res.status(200).json({
      success: true,
      head,
      message: `Program '${head.title}' saved successfully.`
    });
  } catch (error) {
    console.error("API /head error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}
