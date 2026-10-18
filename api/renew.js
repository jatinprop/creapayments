import { supabase, readLocalData, writeLocalData, findHeadCodeConflict, upsertHead } from "../lib/supabase.js";

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
    const nextYear = new Date().getFullYear() + 1;
    const renewalDate = `${nextYear}-04-01`;

    const local = readLocalData();
    local.heads = local.heads || [];

    const existingConflict = findHeadCodeConflict(local.heads, "MEM", renewalDate);
    if (existingConflict) {
      return res.status(200).json({
        success: true,
        message: `Annual Renewal head already active for upcoming cycle: '${existingConflict.title}'`,
        head: existingConflict
      });
    }

    const renewalHead = {
      id: `head-mem-${Date.now()}`,
      code: "MEM",
      title: `Annual CREA(I) Membership Renewal ${nextYear}-${nextYear + 1}`,
      type: "membership",
      eventDate: renewalDate,
      eventTime: "Full Year Access",
      venue: "All Chapters",
      activeUntil: `${nextYear + 1}-03-31T23:59:59`,
      status: "active",
      prices: {
        associate_member: 5000,
        member: 10000,
        non_member: null
      },
      giftEnabled: false,
      writeup: `Annual membership renewal for CREA(I) accredited brokerages for the session ${nextYear}-${nextYear + 1}. All members enjoy uninterrupted access to CREA MLS, legal escrow mediation, and certified broker masterclasses.`
    };

    if (supabase) {
      try {
        await supabase.rpc("fn_yearly_renewal", { p_next_year: nextYear });
      } catch (err) {
        console.warn("RPC fn_yearly_renewal error:", err.message);
      }
    }

    local.members = local.members || [];
    local.members.forEach((m) => {
      if (m.category === "board_member" || m.category === "new_member") m.category = "member";
      m.status = "deactivated";
      m.lastPaidFY = null;
      m.deactivationReason = `Pending Annual Renewal for FY ${nextYear}-${nextYear + 1}`;
    });

    writeLocalData(local);

    // Save renewal head via upsertHead
    const savedHead = await upsertHead(renewalHead);

    return res.status(200).json({
      success: true,
      message: `Annual Renewal successfully activated for all members! Head '${savedHead.title}' created for dues settlement.`,
      head: savedHead
    });
  } catch (error) {
    console.error("API /renew error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
