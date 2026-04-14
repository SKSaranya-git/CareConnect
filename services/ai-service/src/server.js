require("dotenv").config();
const express = require("express");
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

const rules = [
  {
    keywords: ["fever", "cough", "headache", "body pain", "sore throat"],
    condition: "Viral flu pattern",
    specialty: "General Physician",
    priority: "medium"
  },
  {
    keywords: ["chest pain", "breathless", "shortness of breath", "left arm pain", "palpitations"],
    condition: "Cardiac risk pattern",
    specialty: "Cardiologist",
    priority: "high"
  },
  {
    keywords: ["rash", "itching", "hives", "skin irritation", "red patches"],
    condition: "Dermatologic allergy pattern",
    specialty: "Dermatologist",
    priority: "low"
  },
  {
    keywords: ["anxiety", "stress", "panic", "sleep problem", "insomnia"],
    condition: "Anxiety-related pattern",
    specialty: "Psychiatrist",
    priority: "medium"
  },
  {
    keywords: ["stomach pain", "nausea", "vomiting", "diarrhea", "acidity"],
    condition: "Gastrointestinal irritation pattern",
    specialty: "Gastroenterologist",
    priority: "medium"
  }
];

function confidenceFromScore(score) {
  if (score >= 3) return "high";
  if (score === 2) return "medium";
  return "low";
}

app.get("/health", (_req, res) => res.json({ service: "ai-service", status: "ok" }));

app.post("/ai/symptom-checker", requireAuth, (req, res) => {
  const text = (req.body.symptoms || "").toLowerCase();
  if (!text.trim()) {
    return res.status(400).json({ message: "symptoms is required." });
  }
  const scored = rules
    .map((rule) => {
      const matchedKeywords = rule.keywords.filter((k) => text.includes(k));
      return { ...rule, score: matchedKeywords.length, matchedKeywords };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (!best || best.score === 0) {
    return res.json({
      possibleCondition: "Insufficient data",
      recommendedSpecialty: "General Physician",
      confidence: "low",
      triagePriority: "low",
      note: "Describe symptoms with duration and severity for a stronger suggestion.",
      matchedKeywords: []
    });
  }

  const confidence = confidenceFromScore(best.score);
  return res.json({
    possibleCondition: best.condition,
    recommendedSpecialty: best.specialty,
    confidence,
    triagePriority: best.priority,
    matchedKeywords: best.matchedKeywords,
    note: "AI suggestion is preliminary and not a medical diagnosis.",
    suggestions: [
      "Seek urgent care immediately for severe or worsening symptoms.",
      "Book a doctor visit for proper clinical evaluation.",
      "Keep hydration and rest while awaiting medical advice."
    ]
  });
});

app.listen(process.env.PORT || 4008, () => {
  console.log(`ai-service running on ${process.env.PORT || 4008}`);
});
