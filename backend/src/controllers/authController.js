const User = require("../models/User");
const { PUBLIC_REGISTRATION_ROLES } = require("../constants/roles");
const { signAccessToken } = require("../utils/token");

function sanitizeUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

async function register(req, res) {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "fullName, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    if (role && !PUBLIC_REGISTRATION_ROLES.includes(role)) {
      return res
        .status(400)
        .json({ message: "Invalid role. Registration allows only PATIENT or DOCTOR." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
      role: role || "PATIENT"
    });

    const accessToken = signAccessToken(user);

    return res.status(201).json({
      message: "Registration successful.",
      accessToken,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register user." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const accessToken = signAccessToken(user);

    return res.status(200).json({
      message: "Login successful.",
      accessToken,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login." });
  }
}

function me(req, res) {
  return res.status(200).json({
    user: sanitizeUser(req.user)
  });
}

module.exports = {
  register,
  login,
  me
};
