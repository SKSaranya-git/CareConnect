require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
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

const sessionSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, unique: true },
    patientId: String,
    doctorId: String,
    provider: { type: String, default: "JITSI" },
    joinUrl: String,
    status: { type: String, enum: ["SCHEDULED", "LIVE", "COMPLETED"], default: "SCHEDULED" }
  },
  { timestamps: true }
);

const Session = mongoose.model("TelemedicineSessionV2", sessionSchema);

app.get("/health", (_req, res) => res.json({ service: "telemedicine-service", status: "ok" }));

app.post("/telemedicine/sessions", requireAuth, async (req, res) => {
  const { appointmentId, patientId, doctorId } = req.body;
  let session = await Session.findOne({ appointmentId });
  if (!session) {
    const room = `hospital-${appointmentId}`;
    const joinUrl = `${(process.env.JITSI_BASE_URL || "https://meet.jit.si").replace(/\/+$/, "")}/${room}`;
    session = await Session.create({ appointmentId, patientId, doctorId, joinUrl, status: "LIVE" });
  }
  res.status(201).json({ session });
});

app.get("/telemedicine/sessions/:appointmentId", requireAuth, async (req, res) => {
  const session = await Session.findOne({ appointmentId: req.params.appointmentId });
  if (!session) return res.status(404).json({ message: "Session not found." });
  res.json({ session });
});

app.patch("/telemedicine/sessions/:appointmentId/end", requireAuth, async (req, res) => {
  const session = await Session.findOneAndUpdate(
    { appointmentId: req.params.appointmentId },
    { $set: { status: "COMPLETED" } },
    { new: true }
  );
  if (!session) return res.status(404).json({ message: "Session not found." });
  res.json({ session });
});

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  app.listen(process.env.PORT || 4005, () => {
    console.log(`telemedicine-service running on ${process.env.PORT || 4005}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
