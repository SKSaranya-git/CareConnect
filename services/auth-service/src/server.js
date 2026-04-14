require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["PATIENT", "DOCTOR", "ADMIN"], required: true },
    doctorApproval: { type: String, enum: ["PENDING", "ACTIVE"], default: "PENDING" }
  },
  { timestamps: true }
);

const User = mongoose.model("AuthUser", userSchema);

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

app.get("/health", (_req, res) => res.json({ service: "auth-service", status: "ok" }));

app.post("/auth/register", async (req, res) => {
  const { fullName, email, password, role } = req.body;
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ message: "fullName, email, password, role are required." });
  }
  if (!["PATIENT", "DOCTOR"].includes(role)) {
    return res.status(400).json({ message: "Only PATIENT/DOCTOR self registration allowed." });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "Email already registered." });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    password: hashed,
    role,
    doctorApproval: role === "DOCTOR" ? "PENDING" : "ACTIVE"
  });

  if (role === "DOCTOR" && process.env.DOCTOR_SERVICE_URL && process.env.INTERNAL_API_SECRET) {
    try {
      const r = await fetch(`${process.env.DOCTOR_SERVICE_URL}/internal/doctors/bootstrap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET
        },
        body: JSON.stringify({ userId: user._id.toString(), fullName })
      });
      if (!r.ok) {
        console.error("doctor-service bootstrap failed:", r.status, await r.text());
      }
    } catch (err) {
      console.error("doctor-service bootstrap error:", err.message);
    }
  }

  const token = signToken(user);
  return res.status(201).json({
    accessToken: token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      doctorApproval: user.doctorApproval
    }
  });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || "").toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }
  const ok = await bcrypt.compare(password || "", user.password);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials." });
  }
  if (user.role === "DOCTOR" && user.doctorApproval !== "ACTIVE") {
    return res.status(403).json({ message: "Doctor account is pending admin approval." });
  }
  const token = signToken(user);
  return res.json({
    accessToken: token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      doctorApproval: user.doctorApproval
    }
  });
});

app.get("/auth/me", async (req, res) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ user });
  } catch (_err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
});

app.get("/auth/users", async (_req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json({ users });
});

app.patch("/auth/doctors/:id/approval", async (req, res) => {
  const { status } = req.body;
  if (!["PENDING", "ACTIVE"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const user = await User.findById(req.params.id);
  if (!user || user.role !== "DOCTOR") {
    return res.status(404).json({ message: "Doctor not found." });
  }
  user.doctorApproval = status;
  await user.save();
  res.json({ message: "Doctor approval updated.", user: { id: user._id, doctorApproval: user.doctorApproval } });
});

async function bootstrapAdmin() {
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return;
  const hashed = await bcrypt.hash(password, 10);
  await User.create({
    fullName: "System Admin",
    email: email.toLowerCase(),
    password: hashed,
    role: "ADMIN",
    doctorApproval: "ACTIVE"
  });
}

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  await bootstrapAdmin();
  app.listen(process.env.PORT || 4001, () => {
    console.log(`auth-service running on ${process.env.PORT || 4001}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
