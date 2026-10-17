export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({ status: "ok", app: "CREA Payment Suite API", version: "1.0.0" });
}
