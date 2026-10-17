import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.join(__dirname, "../assets/certificate/template_clean.pdf");
const SCRIPT_FONT_PATH = path.join(__dirname, "../assets/certificate/fonts/script_bold.ttf");
const TIMES_BOLD_PATH = path.join(__dirname, "../assets/certificate/fonts/times_bold.ttf");

let cachedTemplateBytes = null;
let cachedScriptFontBytes = null;
let cachedTimesBoldBytes = null;

/**
 * Generate official CREA(I) Membership Certificate PDF with member's name and firm name
 * @param {Object} options
 * @param {string} options.memberName - Full name of the member (e.g., "Jatin Jain")
 * @param {string} options.companyName - Firm / Brokerage name (e.g., "J J Properties")
 * @param {string} [options.validFrom] - Validity start date
 * @param {string} [options.validTo] - Validity end date
 * @param {string} [options.certId] - Certificate / Invoice ID
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export async function generateMembershipCertificate({ memberName, companyName, validFrom, validTo, certId }) {
  if (!cachedTemplateBytes) {
    if (!fs.existsSync(TEMPLATE_PATH)) {
      throw new Error(`Template not found at: ${TEMPLATE_PATH}`);
    }
    cachedTemplateBytes = fs.readFileSync(TEMPLATE_PATH);
  }
  if (!cachedScriptFontBytes) {
    cachedScriptFontBytes = fs.readFileSync(SCRIPT_FONT_PATH);
  }
  if (!cachedTimesBoldBytes) {
    cachedTimesBoldBytes = fs.readFileSync(TIMES_BOLD_PATH);
  }

  const pdfDoc = await PDFDocument.load(cachedTemplateBytes);
  pdfDoc.registerFontkit(fontkit);

  const scriptFont = await pdfDoc.embedFont(cachedScriptFontBytes);
  const timesBoldFont = await pdfDoc.embedFont(cachedTimesBoldBytes);

  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();

  const cleanName = (memberName || "Accredited Member").trim();
  let cleanCompany = (companyName || "").trim();

  let firmText = "";
  if (cleanCompany) {
    if (!cleanCompany.toLowerCase().startsWith("m/s")) {
      cleanCompany = "M/s. " + cleanCompany;
    }
    firmText = "(" + cleanCompany + ")";
  }

  // Draw Member Name in script font above underline at Y = 297.78
  let nameFontSize = 32;
  let nameWidth = scriptFont.widthOfTextAtSize(cleanName, nameFontSize);

  // Auto-scale if name is exceptionally long
  if (nameWidth > 220) {
    nameFontSize = Math.max(22, Math.round(nameFontSize * (220 / nameWidth)));
    nameWidth = scriptFont.widthOfTextAtSize(cleanName, nameFontSize);
  }

  const nameX = 345;
  const nameY = 304;

  page.drawText(cleanName, {
    x: nameX,
    y: nameY,
    size: nameFontSize,
    font: scriptFont,
    color: rgb(0.1, 0.1, 0.1)
  });

  // Draw Firm Name in bold serif font
  if (firmText) {
    let firmFontSize = 13.5;
    let firmWidth = timesBoldFont.widthOfTextAtSize(firmText, firmFontSize);
    if (firmWidth > 200) {
      firmFontSize = Math.max(10, Math.round(firmFontSize * (200 / firmWidth)));
    }
    const firmX = 565;
    const firmY = 302;

    page.drawText(firmText, {
      x: firmX,
      y: firmY,
      size: firmFontSize,
      font: timesBoldFont,
      color: rgb(0.12, 0.12, 0.12)
    });
  }

  return await pdfDoc.save();
}
