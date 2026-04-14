require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

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

const paymentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, unique: true },
    patientId: String,
    doctorId: String,
    amount: Number,
    provider: { type: String, default: "PAYHERE" },
    status: { type: String, enum: ["PENDING", "PAID", "FAILED"], default: "PENDING" },
    paymentRef: String
  },
  { timestamps: true }
);

const Payment = mongoose.model("PaymentV2", paymentSchema);

app.get("/health", (_req, res) => res.json({ service: "payment-service", status: "ok" }));

async function resolveAppointmentForUser(req, appointmentId) {
  if (!process.env.APPOINTMENT_SERVICE_URL) {
    throw new Error("APPOINTMENT_SERVICE_URL is not configured.");
  }
  const res = await axios.get(`${process.env.APPOINTMENT_SERVICE_URL}/appointments/me`, {
    headers: { Authorization: req.headers.authorization }
  });
  return (res.data.appointments || []).find((a) => String(a._id) === String(appointmentId)) || null;
}

app.post("/payments/checkout", requireAuth, async (req, res) => {
  if (req.user.role !== "PATIENT") {
    return res.status(403).json({ message: "Only patients can initiate checkout." });
  }
  const { appointmentId, amount } = req.body;
  if (!appointmentId) return res.status(400).json({ message: "appointmentId is required." });

  let appointment;
  try {
    appointment = await resolveAppointmentForUser(req, appointmentId);
  } catch (err) {
    return res.status(502).json({ message: "Unable to validate appointment for checkout." });
  }
  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found for current patient." });
  }
  if (!["ACCEPTED", "COMPLETED"].includes(appointment.status)) {
    return res.status(400).json({ message: "Only ACCEPTED/COMPLETED appointments can be paid." });
  }

  const finalAmount = Number(amount) > 0 ? Number(amount) : 2500;
  const paymentRef = `PAY-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
  const payment = await Payment.findOneAndUpdate(
    { appointmentId },
    {
      $set: {
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        amount: finalAmount,
        paymentRef,
        status: "PENDING"
      }
    },
    { upsert: true, new: true }
  );
  res.status(201).json({
    message: "Checkout initialized (mock).",
    payment,
    checkoutUrl: `https://sandbox.payhere.lk/pay/${paymentRef}`
  });
});

app.patch("/payments/:paymentId/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!["PENDING", "PAID", "FAILED"].includes(status)) {
    return res.status(400).json({ message: "Invalid payment status." });
  }
  const payment = await Payment.findById(req.params.paymentId);
  if (!payment) return res.status(404).json({ message: "Payment not found." });

  const canUpdate =
    req.user.role === "ADMIN" || String(payment.patientId) === String(req.user.sub) || String(payment.doctorId) === String(req.user.sub);
  if (!canUpdate) return res.status(403).json({ message: "Forbidden" });

  payment.status = status;
  await payment.save();

  if (process.env.APPOINTMENT_SERVICE_URL) {
    try {
      await axios.patch(
        `${process.env.APPOINTMENT_SERVICE_URL}/appointments/${payment.appointmentId}/payment-status`,
        { paymentStatus: status },
        { headers: { Authorization: req.headers.authorization } }
      );
    } catch (_err) {
      // Keep payment state but signal partial failure to caller.
      return res.status(502).json({ message: "Payment updated but failed to sync appointment payment status.", payment });
    }
  }

  res.json({ message: "Payment status updated.", payment });
});

app.get("/payments/appointment/:appointmentId", requireAuth, async (req, res) => {
  const payment = await Payment.findOne({ appointmentId: req.params.appointmentId });
  if (!payment) return res.status(404).json({ message: "Payment not found." });
  const canView =
    req.user.role === "ADMIN" || String(payment.patientId) === String(req.user.sub) || String(payment.doctorId) === String(req.user.sub);
  if (!canView) return res.status(403).json({ message: "Forbidden" });
  res.json({ payment });
});

app.get("/payments", requireAuth, async (req, res) => {
  const status = req.query.status ? String(req.query.status).toUpperCase() : "";
  const query = {};
  if (status && ["PENDING", "PAID", "FAILED"].includes(status)) {
    query.status = status;
  }
  if (req.user.role === "PATIENT") {
    query.patientId = req.user.sub;
  } else if (req.user.role === "DOCTOR") {
    query.doctorId = req.user.sub;
  } else if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const payments = await Payment.find(query).sort({ createdAt: -1 }).limit(500);
  const totals = payments.reduce(
    (acc, p) => {
      const amount = Number(p.amount || 0);
      acc.total += amount;
      if (p.status === "PAID") acc.paid += amount;
      if (p.status === "PENDING") acc.pending += amount;
      if (p.status === "FAILED") acc.failed += amount;
      return acc;
    },
    { total: 0, paid: 0, pending: 0, failed: 0 }
  );

  res.json({ payments, totals });
});

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  app.listen(process.env.PORT || 4006, () => {
    console.log(`payment-service running on ${process.env.PORT || 4006}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
