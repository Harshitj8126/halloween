const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const url = require("url");

const PORT = 5173;
const HOST = "127.0.0.1";
const ROOT_DIR = __dirname;
const DATA_FILE = path.join(ROOT_DIR, "data", "bookings.json");

const WICKED_WHATSAPP_NUMBER = "+919999999999";

const TIERS = {
  male_stag: { name: "Male Stag", price: 1999, soulsPerUnit: 1, maxQty: 20 },
  female_stag: { name: "Female Stag", price: 1799, soulsPerUnit: 1, maxQty: 20 },
  couple: { name: "Couple Pass", price: 3599, soulsPerUnit: 2, maxQty: 10 },
};

// Ensure data directory and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
}

function loadBookings() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading bookings database:", err);
    return [];
  }
}

function saveBookings(bookings) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error saving bookings database:", err);
    return false;
  }
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Route: Create Booking
  if (method === "POST" && pathname === "/api/bookings") {
    let bodyStr = "";
    req.on("data", (chunk) => {
      bodyStr += chunk;
      if (bodyStr.length > 1e6) {
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        const body = JSON.parse(bodyStr || "{}");
        const { name, phone, email, instagram, costume, tierId, quantity } = body;

        // Server-side Validation
        const errors = [];
        const cleanName = (name || "").trim();
        const cleanPhone = (phone || "").trim().replace(/\D/g, "");
        const cleanEmail = (email || "").trim().toLowerCase();
        const cleanInsta = (instagram || "").trim();
        const cleanCostume = (costume || "").trim();
        const qty = parseInt(quantity, 10);

        if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
          errors.push("Full Name is required.");
        }

        if (!cleanPhone || (cleanPhone.length !== 10 && cleanPhone.length !== 12)) {
          errors.push("A valid 10-digit WhatsApp number is required.");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
          errors.push("A valid email address is required.");
        }

        if (!cleanInsta || cleanInsta.length < 2) {
          errors.push("Instagram Username is required.");
        }

        if (!tierId || !TIERS[tierId]) {
          errors.push("Invalid pass type selected.");
        }

        const tierObj = TIERS[tierId];
        if (isNaN(qty) || qty < 1 || qty > (tierObj ? tierObj.maxQty : 20)) {
          errors.push(`Quantity must be between 1 and ${tierObj ? tierObj.maxQty : 20}.`);
        }

        if (errors.length > 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, errors }));
          return;
        }

        const formattedPhone = cleanPhone.length === 10 ? cleanPhone : cleanPhone.slice(-10);

        // Anti-Duplicate Check
        const bookings = loadBookings();
        const now = Date.now();
        const existing = bookings.find((b) => {
          const isSameContact = (b.phone === formattedPhone || b.email === cleanEmail);
          const isRecent = (now - new Date(b.createdAt).getTime()) < 60000;
          const isSameTier = (b.tierId === tierId);
          return isSameContact && isSameTier && isRecent;
        });

        if (existing) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            success: true,
            isDuplicate: true,
            bookingId: existing.id,
            booking: existing,
            whatsappNumber: WICKED_WHATSAPP_NUMBER
          }));
          return;
        }

        // Generate Unique Non-Guessable Booking Reference Number
        // Format: WK-XXXXXXXXXXXX (12 uppercase hex characters)
        const randomHex = crypto.randomBytes(6).toString("hex").toUpperCase();
        const bookingId = `WK-${randomHex}`;

        const totalAmount = tierObj.price * qty;
        const totalSouls = tierObj.soulsPerUnit * qty;

        const newBooking = {
          id: bookingId,
          name: cleanName,
          phone: formattedPhone,
          email: cleanEmail,
          instagram: cleanInsta.startsWith("@") ? cleanInsta : `@${cleanInsta}`,
          costume: cleanCostume || "N/A",
          tierId: tierId,
          tierName: tierObj.name,
          quantity: qty,
          souls: totalSouls,
          pricePerUnit: tierObj.price,
          totalAmount: totalAmount,
          status: "Pending Payment",
          createdAt: new Date().toISOString()
        };

        bookings.unshift(newBooking);
        saveBookings(bookings);

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          bookingId: bookingId,
          booking: newBooking,
          whatsappNumber: WICKED_WHATSAPP_NUMBER
        }));
      } catch (err) {
        console.error("Booking API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, errors: ["Internal server error processing booking."] }));
      }
    });
    return;
  }

  // API Route: Get Booking Details
  if (method === "GET" && pathname.startsWith("/api/bookings")) {
    let bookingId = parsedUrl.query.id || parsedUrl.query.bookingId;
    if (!bookingId && pathname.split("/").length > 3) {
      bookingId = pathname.split("/")[3];
    }

    if (!bookingId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Booking ID parameter is required." }));
      return;
    }

    const bookings = loadBookings();
    const found = bookings.find((b) => b.id === bookingId);

    if (!found) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Booking reference not found." }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, booking: found, whatsappNumber: WICKED_WHATSAPP_NUMBER }));
    return;
  }

  // Static File Serving & Clean Routing
  let reqPath = pathname;
  if (reqPath === "/book" || reqPath === "/book/" || reqPath === "/book/index.html") {
    res.writeHead(302, { Location: "https://docs.google.com/forms/d/e/1FAIpQLSeXS6mU0rY-cD9t0apjZM64JMEDByA7uD5p3L_xqXxXEoZ9Dg/viewform" });
    return res.end();
  }

  let filePath = path.join(ROOT_DIR, reqPath);

  // Prevent Directory Traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      if (fs.existsSync(filePath + ".html")) {
        filePath = filePath + ".html";
      } else if (fs.existsSync(path.join(filePath, "index.html"))) {
        filePath = path.join(filePath, "index.html");
      } else {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<h1>404 Not Found</h1>");
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Server Error loading file");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`WICKED Server running live at http://${HOST}:${PORT}/`);
});
