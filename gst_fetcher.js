import { fetchGstDetails as fetchGstCore } from "./lib/gst.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to fetch GST details with fallback and user API key
export async function fetchGstDetails(gstin) {
  let members = [];
  try {
    const dataFile = path.join(__dirname, "data.json");
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
      members = data.members || [];
    }
  } catch (e) {}

  return await fetchGstCore(gstin, members);
}

// Direct test CLI usage: node gst_fetcher.js 29AABCR1234F1Z5
if (process.argv[1] && process.argv[1].endsWith("gst_fetcher.js")) {
  const argGst = process.argv[2] || "29AABCR1234F1Z5";
  console.log(`Fetching details for GSTIN: ${argGst}...`);
  fetchGstDetails(argGst).then((res) => {
    console.log("Result:", JSON.stringify(res, null, 2));
  });
}