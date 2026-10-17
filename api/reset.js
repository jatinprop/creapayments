import { supabase, readLocalData, writeLocalData } from "../lib/supabase.js";

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
    if (supabase) {
      try {
        await Promise.all([
          supabase.from("payments").delete().neq("id", "0"),
          supabase.from("email_logs").delete().neq("id", "0"),
          supabase.from("invoice_counters").update({ last_serial: 0 }).neq("fy_code", "")
        ]);
      } catch (err) {
        console.warn("Supabase reset error:", err.message);
      }
    }

    const local = readLocalData();
    local.payments = [];
    local.emailLogs = [];
    local.invoiceCounter = 0;
    writeLocalData(local);

    return res.status(200).json({
      success: true,
      message: "All simulated payments cleared. Invoice serial reset to 0001."
    });
  } catch (error) {
    console.error("API /reset error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
