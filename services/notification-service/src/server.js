require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const amqp = require("amqplib");

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

const logSchema = new mongoose.Schema(
  {
    userId: String,
    channel: { type: String, enum: ["EMAIL", "SMS"], required: true },
    type: String,
    message: String,
    status: { type: String, enum: ["QUEUED", "SENT", "FAILED"], default: "SENT" }
  },
  { timestamps: true }
);

const NotificationLog = mongoose.model("NotificationLogV2", logSchema);

async function connectMongoWithRetry(uri) {
  const delayMs = 5000;
  const maxAttempts = 150;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(uri);
      return;
    } catch (err) {
      lastErr = err;
      console.error(
        `MongoDB unavailable (${attempt}/${maxAttempts}), retry in ${delayMs}ms:`,
        err && err.message ? err.message : err
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ message: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (_err) {
    res.status(401).json({ message: "Unauthorized" });
  }
}

async function writeDualChannel(userId, type, message) {
  await NotificationLog.create({ userId, channel: "EMAIL", type, message });
  await NotificationLog.create({ userId, channel: "SMS", type, message });
}

function hasEmailProvider() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function hasSmsProvider() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

async function sendEmailProvider({ to, subject, message }) {
  if (!hasEmailProvider()) {
    return { ok: false, reason: "Email provider not configured." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [to],
        subject,
        html: `<p>${String(message || "").replace(/\n/g, "<br/>")}</p>`
      })
    });
    if (!res.ok) {
      return { ok: false, reason: `Email provider error (${res.status}).` };
    }
    return { ok: true };
  } catch (_err) {
    return { ok: false, reason: "Email provider request failed." };
  }
}

async function sendSmsProvider({ to, message }) {
  if (!hasSmsProvider()) {
    return { ok: false, reason: "SMS provider not configured." };
  }
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const body = new URLSearchParams({
      To: to,
      From: process.env.TWILIO_FROM_NUMBER,
      Body: message
    });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
    if (!res.ok) {
      return { ok: false, reason: `SMS provider error (${res.status}).` };
    }
    return { ok: true };
  } catch (_err) {
    return { ok: false, reason: "SMS provider request failed." };
  }
}

async function initRabbit() {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    const ch = await conn.createChannel();
    await ch.assertExchange("hospital.events", "topic", { durable: true });
    const q = await ch.assertQueue("notification.events", { durable: true });
    await ch.bindQueue(q.queue, "hospital.events", "appointment.*");

    ch.consume(q.queue, async (msg) => {
      if (!msg) return;
      try {
        const routingKey = msg.fields.routingKey;
        const payload = JSON.parse(msg.content.toString());
        if (routingKey === "appointment.booked") {
          await writeDualChannel(payload.patientId, "APPOINTMENT_BOOKED", `Appointment ${payload.appointmentId} booked.`);
          await writeDualChannel(payload.doctorId, "APPOINTMENT_BOOKED", `New appointment ${payload.appointmentId} received.`);
        } else if (routingKey === "appointment.completed") {
          await writeDualChannel(payload.patientId, "CONSULTATION_COMPLETED", `Consultation ${payload.appointmentId} completed.`);
          await writeDualChannel(payload.doctorId, "CONSULTATION_COMPLETED", `Consultation ${payload.appointmentId} completed.`);
        }
        ch.ack(msg);
      } catch (_err) {
        ch.nack(msg, false, false);
      }
    });
  } catch (_err) {
    // Service still works without RabbitMQ consumer in local fallback mode.
  }
}

app.get("/health", (_req, res) => res.json({ service: "notification-service", status: "ok" }));

app.get("/notifications/me", requireAuth, async (req, res) => {
  const notifications = await NotificationLog.find({ userId: req.user.sub }).sort({ createdAt: -1 });
  res.json({ notifications });
});

app.get("/notifications/all", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const notifications = await NotificationLog.find().sort({ createdAt: -1 }).limit(300);
  res.json({ notifications });
});

app.post("/notifications/email", requireAuth, async (req, res) => {
  const to = String(req.body.to || "").trim();
  const message = String(req.body.message || "");
  const type = req.body.type || "CUSTOM_EMAIL";
  if (!message) return res.status(400).json({ message: "message is required." });
  if (hasEmailProvider() && !to) {
    return res.status(400).json({ message: "Recipient email (to) is required when provider is enabled." });
  }

  const provider = await sendEmailProvider({
    to,
    subject: req.body.subject || "CareConnect Notification",
    message
  });
  const log = await NotificationLog.create({
    userId: req.body.userId || req.user.sub,
    channel: "EMAIL",
    type,
    message,
    status: provider.ok ? "SENT" : "QUEUED"
  });
  res.status(201).json({ log, delivery: provider });
});

app.post("/notifications/sms", requireAuth, async (req, res) => {
  const to = String(req.body.to || "").trim();
  const message = String(req.body.message || "");
  const type = req.body.type || "CUSTOM_SMS";
  if (!message) return res.status(400).json({ message: "message is required." });
  if (hasSmsProvider() && !to) {
    return res.status(400).json({ message: "Recipient phone (to) is required when provider is enabled." });
  }

  const provider = await sendSmsProvider({ to, message });
  const log = await NotificationLog.create({
    userId: req.body.userId || req.user.sub,
    channel: "SMS",
    type,
    message,
    status: provider.ok ? "SENT" : "QUEUED"
  });
  res.status(201).json({ log, delivery: provider });
});

async function start() {
  await connectMongoWithRetry(process.env.MONGO_URI);
  await initRabbit();
  app.listen(process.env.PORT || 4007, () => {
    console.log(`notification-service running on ${process.env.PORT || 4007}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
