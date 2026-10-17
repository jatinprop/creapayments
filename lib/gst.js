const GST_STATE_CODES = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
  "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
  "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
  "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
  "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
  "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar",
  "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
};

const PAN_ENTITY_TYPES = {
  'C': 'Company / Corporate',
  'P': 'Individual / Proprietorship',
  'H': 'Hindu Undivided Family (HUF)',
  'F': 'Partnership Firm / LLP',
  'A': 'Association of Persons (AOP)',
  'T': 'Trust',
  'B': 'Body of Individuals (BOI)',
  'L': 'Local Authority',
  'J': 'Artificial Juridical Person',
  'G': 'Government Agency'
};

export async function fetchGstDetails(rawGstin, existingMembers = []) {
  if (!rawGstin || typeof rawGstin !== 'string') {
    return { success: false, error: 'GSTIN is required' };
  }

  const cleanGstin = rawGstin.trim().toUpperCase();
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstRegex.test(cleanGstin)) {
    return { 
      success: false, 
      error: 'Invalid GSTIN format. A valid GSTIN must be 15 alphanumeric characters (e.g. 29AAAAA0000A1Z5).' 
    };
  }

  const stateCode = cleanGstin.substring(0, 2);
  const state = GST_STATE_CODES[stateCode] || 'India';
  const pan = cleanGstin.substring(2, 12);
  const entityType = PAN_ENTITY_TYPES[cleanGstin[5]] || 'Registered Business';

  const API_KEY = process.env.SANDBOX_API_KEY || 'OQK1FJS4jUZDMOyy5oHo0Amf';
  const SECRET_KEY = process.env.SANDBOX_SECRET_KEY || '';
  const ACCESS_TOKEN = process.env.SANDBOX_ACCESS_TOKEN || '';

  // 1. Live Sandbox GSP endpoint check
  try {
    const headers = {
      'accept': 'application/json'
    };
    if (ACCESS_TOKEN) {
      headers['Authorization'] = `Bearer ${ACCESS_TOKEN}`;
    } else if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
      headers['x-api-key'] = API_KEY;
    }
    if (SECRET_KEY) {
      headers['x-api-secret'] = SECRET_KEY;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`https://api.sandbox.co.in/gsp/public/gstin/${cleanGstin}`, {
      headers,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const json = await response.json();
      const gstData = json.data || json;
      if (gstData && (gstData.lgnm || gstData.tradeNam || gstData.txn)) {
        const legalName = gstData.lgnm || '';
        const tradeName = gstData.txn || gstData.tradeNam || legalName;
        const addrObj = gstData.pradr?.addr || gstData.address || {};
        let fullAddress = '';
        if (typeof addrObj === 'string') {
          fullAddress = addrObj;
        } else {
          fullAddress = [
            addrObj.bno,
            addrObj.st,
            addrObj.loc,
            addrObj.dst,
            gstData.pradr?.state || state,
            addrObj.pncd ? `- ${addrObj.pncd}` : ''
          ].filter(Boolean).join(' ').trim();
        }

        return {
          success: true,
          gstin: cleanGstin,
          tradeName,
          legalName,
          company: tradeName || legalName,
          address: fullAddress || `${state}, India`,
          state,
          pan,
          entityType,
          source: 'live_gsp'
        };
      }
    }
  } catch (err) {
    // Graceful fallback on network/API failure
  }

  // 2. Directory & Member Cache Lookup
  if (Array.isArray(existingMembers)) {
    const match = existingMembers.find(m => m.gstin && m.gstin.trim().toUpperCase() === cleanGstin);
    if (match) {
      return {
        success: true,
        gstin: cleanGstin,
        tradeName: match.company,
        legalName: match.company,
        company: match.company,
        address: match.address || `${state}, India`,
        state,
        pan,
        entityType,
        source: 'directory'
      };
    }
  }

  // 3. Structured Fallback with Verified State and PAN Breakdown
  return {
    success: true,
    partial: true,
    gstin: cleanGstin,
    tradeName: '',
    legalName: '',
    company: '',
    address: `${state}, India`,
    state,
    pan,
    entityType,
    message: `State verified: ${state} (${entityType}). Enter firm name and complete address.`
  };
}
