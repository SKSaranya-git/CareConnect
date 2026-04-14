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

const prescriptionSchema = new mongoose.Schema(
  {
    appointmentId: String,
    doctorId: String,
    diagnosis: String,
    medicines: [{ name: String, dosage: String, frequency: String, duration: String }],
    notes: String
  },
  { timestamps: true }
);

const reportSchema = new mongoose.Schema(
  {
    title: String,
    fileUrl: String,
    notes: String
  },
  { timestamps: true }
);

const patientSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true, index: true },
    avatarUrl: String,
    profession: String,
    phone: String,
    dateOfBirth: Date,
    gender: String,
    address: String,
    bloodGroup: String,
    medicalHistory: [String],
    reports: [reportSchema],
    prescriptions: [prescriptionSchema]
  },
  { timestamps: true }
);

const Patient = mongoose.model("PatientProfile", patientSchema);

app.get("/health", (_req, res) => res.json({ service: "patient-service", status: "ok" }));

app.get("/patients/me", requireAuth, async (req, res) => {
  const profile = await Patient.findOne({ userId: req.user.sub });
  if (!profile) return res.status(404).json({ message: "Profile not found." });
  return res.json({ profile });
});

app.put("/patients/me", requireAuth, async (req, res) => {
  const payload = req.body;
  const profile = await Patient.findOneAndUpdate(
    { userId: req.user.sub },
    { $set: { ...payload, userId: req.user.sub } },
    { upsert: true, new: true }
  );
  res.json({ message: "Patient profile saved.", profile });
});

app.get("/patients/me/reports", requireAuth, async (req, res) => {
  const profile = await Patient.findOne({ userId: req.user.sub });
  res.json({ reports: profile?.reports || [] });
});

app.post("/patients/me/reports", requireAuth, async (req, res) => {
  const { title, fileUrl, notes } = req.body;
  if (!title || !fileUrl) return res.status(400).json({ message: "title and fileUrl required." });
  const profile = await Patient.findOneAndUpdate(
    { userId: req.user.sub },
    { $push: { reports: { title, fileUrl, notes } }, $setOnInsert: { userId: req.user.sub } },
    { upsert: true, new: true }
  );
  res.status(201).json({ message: "Report uploaded.", reports: profile.reports });
});

app.get("/patients/:patientUserId/reports", requireAuth, async (req, res) => {
  if (!["DOCTOR", "ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const profile = await Patient.findOne({ userId: req.params.patientUserId });
  res.json({ reports: profile?.reports || [] });
});

app.get("/patients/me/prescriptions", requireAuth, async (req, res) => {
  const profile = await Patient.findOne({ userId: req.user.sub });
  res.json({ prescriptions: profile?.prescriptions || [] });
});

app.post("/patients/:patientUserId/prescriptions", requireAuth, async (req, res) => {
  if (!["DOCTOR", "ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const { patientUserId } = req.params;
  const profile = await Patient.findOneAndUpdate(
    { userId: patientUserId },
    { $push: { prescriptions: req.body }, $setOnInsert: { userId: patientUserId } },
    { upsert: true, new: true }
  );
  res.status(201).json({ message: "Prescription stored.", prescriptions: profile.prescriptions });
});

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  app.listen(process.env.PORT || 4002, () => {
    console.log(`patient-service running on ${process.env.PORT || 4002}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
