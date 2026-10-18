import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import dataHandler from "./api/data.js";
import paymentHandler from "./api/payment.js";
import headHandler from "./api/head.js";
import headStatusHandler from "./api/head-status.js";
import headDeleteHandler from "./api/head-delete.js";
import membersHandler from "./api/members.js";
import renewHandler from "./api/renew.js";
import resetHandler from "./api/reset.js";
import attendanceHandler from "./api/attendance.js";
import certificateHandler from "./api/certificate.js";
import gstHandler from "./api/gst.js";
import otpHandler from "./api/otp.js";
import indexHandler from "./api/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (.env.local, .env)
dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = process.env.PORT || 4000;

function enhanceResponse(res) {
  if (!res.status) {
    res.status = function (code) {
      this.statusCode = code;
      return this;
    };
  }
  if (!res.json) {
    res.json = function (data) {
      if (!this.getHeader("Content-Type")) {
        this.setHeader("Content-Type", "application/json");
      }
      this.end(JSON.stringify(data));
      return this;
    };
  }
  if (!res.send) {
    res.send = function (data) {
      this.end(data);
      return this;
    };
  }
  return res;
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return resolve({});
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  enhanceResponse(res);

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Populate req.query
  req.query = {};
  parsedUrl.searchParams.forEach((val, key) => {
    req.query[key] = val;
  });

  // API Route Handling
  if (pathname.startsWith("/api")) {
    req.body = await parseJsonBody(req);

    try {
      if (pathname === "/api" || pathname === "/api/") {
        return await indexHandler(req, res);
      }
      if (pathname === "/api/data") {
        return await dataHandler(req, res);
      }
      if (pathname === "/api/payment") {
        return await paymentHandler(req, res);
      }
      if (pathname === "/api/head" || pathname === "/api/head/update") {
        return await headHandler(req, res);
      }
      if (pathname === "/api/head/status" || pathname === "/api/head-status") {
        return await headStatusHandler(req, res);
      }
      if (pathname === "/api/head/delete" || pathname === "/api/head-delete") {
        return await headDeleteHandler(req, res);
      }
      if (
        pathname === "/api/members" ||
        pathname === "/api/member/status" ||
        pathname === "/api/member/activate-manual"
      ) {
        return await membersHandler(req, res);
      }
      if (pathname === "/api/renew") {
        return await renewHandler(req, res);
      }
      if (pathname === "/api/reset") {
        return await resetHandler(req, res);
      }
      if (pathname === "/api/attendance") {
        return await attendanceHandler(req, res);
      }
      if (pathname === "/api/certificate") {
        return await certificateHandler(req, res);
      }
      if (pathname === "/api/gst" || pathname.startsWith("/api/gst/")) {
        if (pathname.startsWith("/api/gst/")) {
          req.query.gstin = pathname.replace("/api/gst/", "").trim();
        }
        return await gstHandler(req, res);
      }
      if (
        pathname === "/api/otp" ||
        pathname === "/api/otp/send" ||
        pathname === "/api/otp/verify" ||
        pathname === "/api/get-otp" ||
        pathname === "/api/verify-otp"
      ) {
        return await otpHandler(req, res);
      }

      // If unknown API route
      return res.status(404).json({ success: false, error: `API route ${pathname} not found.` });
    } catch (err) {
      console.error(`Error in ${pathname}:`, err);
      if (!res.writableEnded) {
        return res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
      }
      return;
    }
  }

  // Static File Serving
  let relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  let filePath = path.join(__dirname, relativePath);

  // Security check: ensure filePath is within __dirname
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback: Serve index.html for unknown client routes
      const indexPath = path.join(__dirname, "index.html");
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          return res.end("Not Found");
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".ttf": "font/ttf",
      ".ico": "image/x-icon",
      ".webp": "image/webp",
      ".woff": "font/woff",
      ".woff2": "font/woff2"
    };

    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🏛️ CREA(I) Payment & Membership Management Suite Live`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Unified Backend: Supabase Database Integration Active`);
    console.log(`Admin PIN: crea-admin`);
    console.log(`======================================================\n`);
  });
}

export default server;
