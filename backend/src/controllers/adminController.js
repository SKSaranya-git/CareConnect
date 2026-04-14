const User = require("../models/User");
const DoctorProfile = require("../models/DoctorProfile");

async function getPendingDoctors(_req, res) {
  const doctors = await DoctorProfile.find({ isVerified: false })
    .populate("user", "fullName email role")
    .sort({ createdAt: -1 });
  return res.status(200).json({ doctors });
}

async function verifyDoctor(req, res) {
  const { userId } = req.params;
  const { isVerified } = req.body;
  if (typeof isVerified !== "boolean") {
    return res.status(400).json({ message: "isVerified must be boolean." });
  }

  const profile = await DoctorProfile.findOne({ user: userId });
  if (!profile) {
    return res.status(404).json({ message: "Doctor profile not found." });
  }

  profile.isVerified = Boolean(isVerified);
  await profile.save();

  return res.status(200).json({ message: "Doctor verification status updated.", profile });
}

async function getUsers(_req, res) {
  const users = await User.find({}).select("-password").sort({ createdAt: -1 });
  return res.status(200).json({ users });
}

module.exports = {
  getPendingDoctors,
  verifyDoctor,
  getUsers
};
