require("express-async-errors");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const telemedicineRoutes = require("./routes/telemedicineRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

// Default Helmet CSP breaks Chrome / IDE "Simple Browser" JSON rendering (blank page).
// COOP/CORP defaults can also confuse embedded preview clients on localhost.
// HSTS on http://localhost makes browsers retry https:// → TLS mismatch / "invalid response".
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    originAgentCluster: false,
    strictTransportSecurity: false
  })
);
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

function wantsHtml(req) {
  return /\btext\/html\b/i.test(req.get("accept") || "");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sendJsonOrHtml(req, res, payload, statusCode = 200) {
  res.status(statusCode);
  if (wantsHtml(req)) {
    const body = JSON.stringify(payload, null, 2);
    res.type("html").send(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Healthcare API</title></head><body><pre style="font:14px/1.5 ui-monospace,monospace;margin:16px;white-space:pre-wrap;word-break:break-word">${escapeHtml(
        body
      )}</pre></body></html>`
    );
    return;
  }
  res.json(payload);
}

const apiIndex = {
  service: "healthcare-backend",
  message: "API routes (JSON). Use an API client or Accept: application/json.",
  routes: [
    "/api/auth",
    "/api/patients",
    "/api/doctors",
    "/api/appointments",
    "/api/admin",
    "/api/telemedicine",
    "/api/payments",
    "/api/notifications"
  ]
};

app.get("/api", (req, res) => sendJsonOrHtml(req, res, apiIndex));
app.get("/api/", (req, res) => sendJsonOrHtml(req, res, apiIndex));

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/telemedicine", telemedicineRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  sendJsonOrHtml(req, res, {
    service: "healthcare-backend",
    message: "API is running.",
    health: "/health",
    api: "/api"
  });
});

app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "connected" : "disconnected";

  sendJsonOrHtml(req, res, {
    service: "backend-bootstrap",
    status: "ok",
    dbStatus
  });
});

app.use((req, res) => {
  sendJsonOrHtml(req, res, { message: "Not found", path: req.originalUrl }, 404);
});

app.use((err, req, res, _next) => {
  console.error(err);
  sendJsonOrHtml(req, res, { message: "Internal server error." }, 500);
});

module.exports = app;
