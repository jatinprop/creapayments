import { generateMembershipCertificate } from "../lib/certificate.js";
import { readLocalData } from "../lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    let memberName = "";
    let companyName = "";
    let isPreview = false;
    let certId = "";

    const data = readLocalData();

    if (req.method === "GET") {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const invoiceNo = url.searchParams.get("invoiceNo");
      const memberId = url.searchParams.get("memberId");
      const nameParam = url.searchParams.get("name");
      const companyParam = url.searchParams.get("company");
      isPreview = url.searchParams.get("preview") === "true" || url.searchParams.get("preview") === "1";

      if (invoiceNo) {
        certId = invoiceNo;
        const payment = (data.payments || []).find((p) =>
          p.invoiceNo.toUpperCase() === invoiceNo.trim().toUpperCase()
        );
        if (payment) {
          memberName = payment.payerName;
          const mem = (data.members || []).find((m) =>
            m.id === payment.payerId || m.mobile === payment.payerMobile || m.name.toLowerCase() === payment.payerName.toLowerCase()
          );
          if (mem) {
            companyName = mem.company || "";
          }
        }
      }

      if (!memberName && memberId) {
        const mem = (data.members || []).find((m) => m.id === memberId);
        if (mem) {
          memberName = mem.name;
          companyName = mem.company || "";
          certId = mem.id;
        }
      }

      if (!memberName && nameParam) {
        memberName = nameParam;
        companyName = companyParam || "";
      }
    } else if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      memberName = body.memberName || "";
      companyName = body.companyName || "";
      certId = body.invoiceNo || body.certId || "";
      isPreview = Boolean(body.preview);

      if (!memberName && body.invoiceNo) {
        const payment = (data.payments || []).find((p) =>
          p.invoiceNo.toUpperCase() === body.invoiceNo.trim().toUpperCase()
        );
        if (payment) {
          memberName = payment.payerName;
          const mem = (data.members || []).find((m) =>
            m.id === payment.payerId || m.mobile === payment.payerMobile || m.name.toLowerCase() === payment.payerName.toLowerCase()
          );
          if (mem) {
            companyName = mem.company || "";
          }
        }
      }
    }

    if (!memberName) {
      memberName = "Jatin Jain";
      companyName = "J J Properties";
    }

    const pdfBytes = await generateMembershipCertificate({
      memberName,
      companyName,
      certId
    });

    const safeName = memberName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `CREA_Membership_Certificate_2026-27_${safeName}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      isPreview ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`
    );
    res.setHeader("Content-Length", pdfBytes.length);

    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Certificate generation error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
