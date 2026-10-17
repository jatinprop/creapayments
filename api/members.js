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
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { member, bulkText } = body;
    const newMembers = [];

    if (member) {
      newMembers.push({
        id: `mem-${Date.now()}`,
        name: (member.name || "Member").trim(),
        mobile: (member.mobile || "").trim(),
        email: (member.email || "").trim(),
        category: member.category || "member",
        company: member.company || "Independent Broker",
        city: member.city || "Bangalore",
        joinedDate: new Date().toISOString().split("T")[0]
      });
    } else if (bulkText) {
      const lines = bulkText.split("\n");
      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 3 && parts[1]) {
          newMembers.push({
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

    if (supabase && newMembers.length > 0) {
      try {
        await supabase.from("members").upsert(
          newMembers.map((m) => ({
            id: m.id,
            name: m.name,
            mobile: m.mobile,
            email: m.email,
            category: m.category,
            company: m.company,
            city: m.city,
            joined_date: m.joinedDate
          }))
        );
      } catch (err) {
        console.warn("Supabase member insert failed:", err.message);
      }
    }

    const local = readLocalData();
    local.members = local.members || [];
    local.members.push(...newMembers);
    writeLocalData(local);

    return res.status(200).json({ success: true, members: local.members });
  } catch (error) {
    console.error("API /members error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}
