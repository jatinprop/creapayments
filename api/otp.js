import { sendOtp, verifyOtp } from "../lib/otp.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    let action, mobile, email, otp;

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      action = body.action || (body.otp ? "verify" : "send");
      mobile = body.mobile || body.number;
      email = body.email;
      otp = body.otp;
    } else if (req.method === "GET") {
      const q = req.query || {};
      action = q.action || (q.otp ? "verify" : "send");
      mobile = q.mobile || q.number;
      email = q.email;
      otp = q.otp;
    } else {
      return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    if (action === "send") {
      const result = await sendOtp({ mobile, email });
      return res.status(200).json(result);
    }

    if (action === "verify") {
      const result = await verifyOtp({ mobile, email, otp });
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.status(200).json(result);
    }

    return res.status(400).json({ success: false, error: `Unsupported action: ${action}` });
  } catch (err) {
    console.error("API /api/otp error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}
