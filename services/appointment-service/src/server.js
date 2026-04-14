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

let channel;

async function initRabbit() {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await conn.createChannel();
    await channel.assertExchange("hospital.events", "topic", { durable: true });
  } catch (_err) {
    channel = null;
  }
}

function publishEvent(routingKey, payload) {
  if (!channel) return;
  channel.publish("hospital.events", routingKey, Buffer.from(JSON.stringify(payload)));
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

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: String, index: true },
    doctorId: { type: String, index: true },
    appointmentDateTime: Date,
    reason: String,
    status: { type: String, enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "COMPLETED"], default: "PENDING" },
    paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED"], default: "PENDING" }
  },
  { timestamps: true }
);

const Appointment = mongoose.model("AppointmentV2", appointmentSchema);

app.get("/health", (_req, res) => res.json({ service: "appointment-service", status: "ok" }));

app.post("/appointments", requireAuth, async (req, res) => {
  if (req.user.role !== "PATIENT") return res.status(403).json({ message: "Only patient can book." });
  const { doctorId, appointmentDateTime, reason } = req.body;
  const appointment = await Appointment.create({
    patientId: req.user.sub,
    doctorId,
    appointmentDateTime,
    reason
  });
  publishEvent("appointment.booked", {
    appointmentId: appointment._id.toString(),
    patientId: appointment.patientId,
    doctorId: appointment.doctorId
  });
  res.status(201).json({ message: "Appointment booked.", appointment });
});

app.get("/appointments/me", requireAuth, async (req, res) => {
  const query = req.user.role === "DOCTOR" ? { doctorId: req.user.sub } : { patientId: req.user.sub };
  const appointments = await Appointment.find(query).sort({ appointmentDateTime: -1 });
  res.json({ appointments });
});

app.patch("/appointments/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  if (req.user.role === "DOCTOR" && appointment.doctorId !== req.user.sub) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (req.user.role === "PATIENT" && appointment.patientId !== req.user.sub) {
    return res.status(403).json({ message: "Forbidden" });
  }
  appointment.status = status;
  await appointment.save();
  if (status === "COMPLETED") {
    publishEvent("appointment.completed", {
      appointmentId: appointment._id.toString(),
      patientId: appointment.patientId,
      doctorId: appointment.doctorId
    });
  }
  res.json({ message: "Appointment status updated.", appointment });
});

app.patch("/appointments/:id/payment-status", requireAuth, async (req, res) => {
  const { paymentStatus } = req.body;
  if (!["PENDING", "PAID", "FAILED"].includes(paymentStatus)) {
    return res.status(400).json({ message: "Invalid paymentStatus." });
  }
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  const canUpdate =
    req.user.role === "ADMIN" ||
    (req.user.role === "PATIENT" && appointment.patientId === req.user.sub) ||
    (req.user.role === "DOCTOR" && appointment.doctorId === req.user.sub);
  if (!canUpdate) return res.status(403).json({ message: "Forbidden" });

  appointment.paymentStatus = paymentStatus;
  await appointment.save();
  res.json({ appointment });
});

app.patch("/appointments/:id/reschedule", requireAuth, async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });

  const canReschedule =
    req.user.role === "ADMIN" || (req.user.role === "PATIENT" && appointment.patientId === req.user.sub);
  if (!canReschedule) return res.status(403).json({ message: "Forbidden" });

  if (["REJECTED", "CANCELLED", "COMPLETED"].includes(appointment.status)) {
    return res.status(400).json({ message: "This appointment cannot be rescheduled." });
  }

  const nextDate = new Date(req.body.appointmentDateTime);
  if (Number.isNaN(nextDate.getTime())) {
    return res.status(400).json({ message: "Valid appointmentDateTime is required." });
  }
  if (nextDate.getTime() <= Date.now()) {
    return res.status(400).json({ message: "Please select a future date and time." });
  }

  appointment.appointmentDateTime = nextDate;
  if (appointment.status === "ACCEPTED") {
    appointment.status = "PENDING";
  }
  await appointment.save();
  publishEvent("appointment.booked", {
    appointmentId: appointment._id.toString(),
    patientId: appointment.patientId,
    doctorId: appointment.doctorId
  });
  res.json({ message: "Appointment rescheduled.", appointment });
});

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  await initRabbit();
  app.listen(process.env.PORT || 4004, () => {
    console.log(`appointment-service running on ${process.env.PORT || 4004}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
