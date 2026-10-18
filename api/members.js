import { supabase, readLocalData, writeLocalData, setMemberStatus, manualActivateMember } from "../lib/supabase.js";

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
    const { action, id, status, paymentMeans, description, createInvoice, headId, member, bulkText } = body;

    // 1. Toggle member status
    if (action === "toggle_status" || (id && status && !member && !bulkText && paymentMeans === undefined && description === undefined)) {
      const updated = await setMemberStatus(id, status);
      return res.status(200).json({ success: true, member: updated });
    }

    // 2. Manual activation with payment means and description
    if (action === "manual_activate" || (id && (paymentMeans !== undefined || description !== undefined))) {
      const result = await manualActivateMember({ id, paymentMeans, description, createInvoice, headId });
      return res.status(200).json({ success: true, ...result });
    }

    // 2B. Update existing member details (Company Name, contact, category, GSTIN, RERA, etc.)
    if (action === "update_member" && member && member.id) {
      const cat = (member.category === "board_member" || member.category === "member") ? "member" : (member.category === "associate_member" || member.category === "new_member") ? "associate_member" : "member";
      member.category = cat;
      member.reraNumber = (member.reraNumber || member.rera_number || "").trim().toUpperCase() || null;

      const local = readLocalData();
      local.members = local.members || [];
      const idx = local.members.findIndex((m) => m.id === member.id);
      if (idx !== -1) {
        local.members[idx] = { ...local.members[idx], ...member };
      } else {
        local.members.push(member);
      }
      writeLocalData(local);

      if (supabase) {
        try {
          const payload = {
            id: member.id,
            name: member.name,
            mobile: member.mobile,
            email: member.email,
            category: member.category,
            parent_member_id: member.parentMemberId || null,
            parent_member_name: member.parentMemberName || null,
            parent_member_mobile: member.parentMemberMobile || null,
            gstin: member.gstin || null,
            rera_number: member.reraNumber || null,
            address: member.address || null,
            company: member.company || "CREA Member Brokerage",
            city: member.city || "Bangalore",
            status: member.status || "active",
            last_paid_fy: member.lastPaidFY || null,
            payment_means: member.paymentMeans || null,
            activation_note: member.activationNote || null,
            joined_date: member.joinedDate || new Date().toISOString().split("T")[0]
          };
          const { error } = await supabase.from("members").upsert(payload);
          if (error && error.message && error.message.includes("rera_number")) {
            delete payload.rera_number;
            await supabase.from("members").upsert(payload);
          }
        } catch (err) {
          console.warn("Supabase member update failed:", err.message);
        }
      }
      return res.status(200).json({ success: true, member });
    }

    // 3. Add individual or bulk members
    const newMembers = [];

    if (member) {
      const cat = (member.category === "board_member" || member.category === "member") ? "member" : (member.category === "associate_member" || member.category === "new_member") ? "associate_member" : "member";
      newMembers.push({
        id: member.id || `mem-${Date.now()}`,
        name: (member.name || "Member").trim(),
        mobile: (member.mobile || "").trim(),
        email: (member.email || "").trim(),
        category: cat,
        parentMemberId: member.parentMemberId || null,
        parentMemberName: member.parentMemberName || null,
        parentMemberMobile: member.parentMemberMobile || null,
        gstin: member.gstin ? member.gstin.trim().toUpperCase() : null,
        reraNumber: (member.reraNumber || member.rera_number || "").trim().toUpperCase() || null,
        address: member.address ? member.address.trim() : null,
        company: (member.company || "").trim() || "CREA Member Brokerage",
        city: member.city || "Bangalore",
        status: member.status || "deactivated",
        lastPaidFY: member.lastPaidFY !== undefined ? member.lastPaidFY : null,
        paymentMeans: member.paymentMeans || null,
        activationNote: member.activationNote || "Pending Annual Membership Payment",
        joinedDate: new Date().toISOString().split("T")[0]
      });
    } else if (bulkText) {
      const lines = bulkText.split("\n");
      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 3 && parts[1]) {
          const rawCat = parts[3] ? parts[3].toLowerCase().replace(/\s+/g, "_") : "member";
          const cat = (rawCat === "board_member" || rawCat === "member") ? "member" : (rawCat === "associate_member" || rawCat === "new_member") ? "associate_member" : "member";
          newMembers.push({
            id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: parts[0] || "Member",
            mobile: parts[1],
            email: parts[2] || "",
            category: cat,
            company: parts[4] || "Real Estate Broker",
            city: "Bangalore",
            status: "deactivated",
            lastPaidFY: null,
            paymentMeans: null,
            activationNote: "Pending Annual Membership Payment",
            joinedDate: new Date().toISOString().split("T")[0]
          });
        }
      }
    }

    if (supabase && newMembers.length > 0) {
      try {
        const payload = newMembers.map((m) => ({
          id: m.id,
          name: m.name,
          mobile: m.mobile,
          email: m.email,
          category: m.category,
          parent_member_id: m.parentMemberId,
          parent_member_name: m.parentMemberName,
          parent_member_mobile: m.parentMemberMobile,
          gstin: m.gstin,
          rera_number: m.reraNumber || null,
          address: m.address,
          company: m.company,
          city: m.city,
          status: m.status,
          last_paid_fy: m.lastPaidFY,
          payment_means: m.paymentMeans,
          activation_note: m.activationNote,
          joined_date: m.joinedDate
        }));
        const { error } = await supabase.from("members").upsert(payload);
        if (error && error.message && error.message.includes("rera_number")) {
          const fallback = payload.map(row => {
            const copy = { ...row };
            delete copy.rera_number;
            return copy;
          });
          await supabase.from("members").upsert(fallback);
        }
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
