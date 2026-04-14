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
app.use(express.json({ limit: "8mb" }));

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

const doctorSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true, index: true },
    fullName: String,
    specialty: { type: String, index: true },
    licenseNumber: String,
    experienceYears: Number,
    consultationFee: Number,
    avatarUrl: String,
    hospital: String,
    location: String,
    bio: String,
    status: { type: String, enum: ["PENDING", "ACTIVE"], default: "PENDING" },
    availability: [{ day: String, startTime: String, endTime: String, isAvailable: Boolean }]
  },
  { timestamps: true }
);

const Doctor = mongoose.model("DoctorProfileV2", doctorSchema);

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

function requireInternal(req, res, next) {
  if (!INTERNAL_SECRET || req.headers["x-internal-secret"] !== INTERNAL_SECRET) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

/** Called by auth-service on register and by gateway to heal legacy pending doctors without a profile. */
app.post("/internal/doctors/bootstrap", requireInternal, async (req, res) => {
  const { userId, fullName } = req.body || {};
  if (!userId) return res.status(400).json({ message: "userId is required." });
  const profile = await Doctor.findOneAndUpdate(
    { userId: String(userId) },
    {
      $setOnInsert: {
        userId: String(userId),
        fullName: fullName || "Doctor",
        specialty: "—",
        licenseNumber: "",
        experienceYears: 0,
        consultationFee: 0,
        avatarUrl: "",
        hospital: "",
        location: "",
        bio: "",
        status: "PENDING"
      }
    },
    { upsert: true, new: true }
  );
  res.json({ profile });
});

app.get("/health", (_req, res) => res.json({ service: "doctor-service", status: "ok" }));

app.get("/doctors", async (req, res) => {
  const query = { status: "ACTIVE" };
  if (req.query.specialty) query.specialty = new RegExp(req.query.specialty, "i");
  const doctors = await Doctor.find(query).sort({ createdAt: -1 });
  res.json({ doctors });
});

app.get("/doctors/me", requireAuth, async (req, res) => {
  const profile = await Doctor.findOne({ userId: req.user.sub });
  if (!profile) return res.status(404).json({ message: "Doctor profile not found." });
  res.json({ profile });
});

app.put("/doctors/me", requireAuth, async (req, res) => {
  if (req.user.role !== "DOCTOR") return res.status(403).json({ message: "Forbidden" });
  const profile = await Doctor.findOneAndUpdate(
    { userId: req.user.sub },
    {
      $set: {
        userId: req.user.sub,
        fullName: req.body.fullName,
        specialty: req.body.specialty,
        licenseNumber: req.body.licenseNumber,
        experienceYears: req.body.experienceYears || 0,
        consultationFee: req.body.consultationFee || 0,
        avatarUrl: req.body.avatarUrl || "",
        hospital: req.body.hospital || "",
        location: req.body.location || "",
        bio: req.body.bio || ""
      }
    },
    { upsert: true, new: true }
  );
  res.json({ message: "Doctor profile saved.", profile });
});

app.put("/doctors/me/availability", requireAuth, async (req, res) => {
  if (req.user.role !== "DOCTOR") return res.status(403).json({ message: "Forbidden" });
  const profile = await Doctor.findOneAndUpdate(
    { userId: req.user.sub },
    { $set: { availability: req.body.availability || [] }, $setOnInsert: { userId: req.user.sub } },
    { upsert: true, new: true }
  );
  res.json({ message: "Availability updated.", availability: profile.availability });
});

app.get("/doctors/pending", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const doctors = await Doctor.find({ status: "PENDING" }).sort({ createdAt: -1 });
  res.json({ doctors });
});

app.patch("/doctors/:userId/status", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  if (!["PENDING", "ACTIVE"].includes(req.body.status)) return res.status(400).json({ message: "Invalid status." });
  const profile = await Doctor.findOneAndUpdate({ userId: req.params.userId }, { $set: { status: req.body.status } }, { new: true });
  if (!profile) return res.status(404).json({ message: "Doctor not found." });
  res.json({ message: "Doctor status updated.", profile });
});

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  app.listen(process.env.PORT || 4003, () => {
    console.log(`doctor-service running on ${process.env.PORT || 4003}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
