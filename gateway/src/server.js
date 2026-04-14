require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { createProxyMiddleware, fixRequestBody } = require("http-proxy-middleware");

const app = express();

// Match backend: avoid HSTS/CSP breaking http://localhost in browsers / IDE preview.
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
app.use(morgan("dev"));
app.use(express.json({ limit: "8mb" }));

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
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>API Gateway</title></head><body><pre style="font:14px/1.5 ui-monospace,monospace;margin:16px;white-space:pre-wrap;word-break:break-word">${escapeHtml(
        body
      )}</pre></body></html>`
    );
    return;
  }
  res.json(payload);
}

const PORT = Number(process.env.PORT || 8080);

const serviceMap = {
  auth: process.env.AUTH_SERVICE_URL,
  patients: process.env.PATIENT_SERVICE_URL,
  doctors: process.env.DOCTOR_SERVICE_URL,
  appointments: process.env.APPOINTMENT_SERVICE_URL,
  telemedicine: process.env.TELEMEDICINE_SERVICE_URL,
  payments: process.env.PAYMENT_SERVICE_URL,
  notifications: process.env.NOTIFICATION_SERVICE_URL,
  ai: process.env.AI_SERVICE_URL
};

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing token" });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

app.get("/", (req, res) => {
  sendJsonOrHtml(req, res, { service: "api-gateway", status: "ok", health: "/health" });
});

app.get("/health", (req, res) => {
  sendJsonOrHtml(req, res, { service: "api-gateway", status: "ok" });
});

// HPM v3 + Express mount: req.url is only the suffix (e.g. "/login"), not "/api/auth/login".
// Rewrite suffix → upstream path (auth-service expects /auth/...).
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: serviceMap.auth,
    changeOrigin: true,
    pathRewrite: (path) => "/auth" + path,
    on: { proxyReq: fixRequestBody }
  })
);

["patients", "doctors", "appointments", "telemedicine", "payments", "notifications", "ai"].forEach((route) => {
  app.use(
    `/api/${route}`,
    requireAuth,
    createProxyMiddleware({
      target: serviceMap[route],
      changeOrigin: true,
      pathRewrite: (path) => `/${route}` + path,
      on: { proxyReq: fixRequestBody }
    })
  );
});

app.get("/api/admin/users", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  try {
    const response = await axios.get(`${serviceMap.auth}/auth/users`);
    return res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 502;
    return res.status(status).json({ message: err.response?.data?.message || "Auth service error." });
  }
});

app.get("/api/admin/doctors/pending", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const internalSecret = process.env.INTERNAL_API_SECRET;
  try {
    // Heal: auth may mark DOCTOR as PENDING before a doctor-service row exists (e.g. user never kept post-register JWT).
    if (internalSecret) {
      const usersRes = await axios.get(`${serviceMap.auth}/auth/users`);
      const users = usersRes.data.users || [];
      const pendingAuth = users.filter((u) => u.role === "DOCTOR" && u.doctorApproval === "PENDING");
      const firstPending = await axios.get(`${serviceMap.doctors}/doctors/pending`, {
        headers: { Authorization: req.headers.authorization }
      });
      const existingIds = new Set((firstPending.data.doctors || []).map((d) => String(d.userId)));
      for (const u of pendingAuth) {
        const uid = String(u._id);
        if (!existingIds.has(uid)) {
          await axios.post(
            `${serviceMap.doctors}/internal/doctors/bootstrap`,
            { userId: uid, fullName: u.fullName },
            { headers: { "x-internal-secret": internalSecret } }
          );
          existingIds.add(uid);
        }
      }
    }
    const response = await axios.get(`${serviceMap.doctors}/doctors/pending`, {
      headers: { Authorization: req.headers.authorization }
    });
    return res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 502;
    return res.status(status).json({ message: err.response?.data?.message || "Doctor service error." });
  }
});

app.patch("/api/admin/doctors/:id/verify", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const isVerified = Boolean(req.body.isVerified);
  const status = isVerified ? "ACTIVE" : "PENDING";

  try {
    await axios.patch(
      `${serviceMap.doctors}/doctors/${req.params.id}/status`,
      { status },
      { headers: { Authorization: req.headers.authorization } }
    );
    await axios.patch(`${serviceMap.auth}/auth/doctors/${req.params.id}/approval`, { status });
    return res.json({ message: "Doctor verification updated." });
  } catch (err) {
    const code = err.response?.status || 502;
    return res.status(code).json({ message: err.response?.data?.message || "Verification failed." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
});
