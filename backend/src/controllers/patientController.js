const PatientProfile = require("../models/PatientProfile");
const Prescription = require("../models/Prescription");
const { Appointment } = require("../models/Appointment");

async function getMyProfile(req, res) {
  const profile = await PatientProfile.findOne({ user: req.user._id });
  if (!profile) {
    return res.status(404).json({ message: "Patient profile not found." });
  }
  return res.status(200).json({ profile });
}

async function upsertMyProfile(req, res) {
  const update = {
    phone: req.body.phone,
    dateOfBirth: req.body.dateOfBirth,
    gender: req.body.gender,
    address: req.body.address,
    bloodGroup: req.body.bloodGroup,
    medicalHistory: Array.isArray(req.body.medicalHistory) ? req.body.medicalHistory : undefined
  };

  Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);

  const profile = await PatientProfile.findOneAndUpdate(
    { user: req.user._id },
    { $set: update, $setOnInsert: { user: req.user._id } },
    { new: true, upsert: true, runValidators: true }
  );

  return res.status(200).json({ message: "Patient profile saved.", profile });
}

async function addReport(req, res) {
  const { title, fileUrl, notes } = req.body;
  if (!title || !fileUrl) {
    return res.status(400).json({ message: "title and fileUrl are required." });
  }

  const profile = await PatientProfile.findOneAndUpdate(
    { user: req.user._id },
    { $push: { reports: { title, fileUrl, notes } }, $setOnInsert: { user: req.user._id } },
    { new: true, upsert: true, runValidators: true }
  );

  return res.status(201).json({ message: "Medical report added.", reports: profile.reports });
}

async function getMyReports(req, res) {
  const profile = await PatientProfile.findOne({ user: req.user._id });
  return res.status(200).json({ reports: profile?.reports || [] });
}

async function getMyAppointments(req, res) {
  const appointments = await Appointment.find({ patientUser: req.user._id })
    .populate("doctorUser", "fullName email")
    .sort({ appointmentDateTime: -1 });

  return res.status(200).json({ appointments });
}

async function getMyPrescriptions(req, res) {
  const prescriptions = await Prescription.find({ patientUser: req.user._id })
    .populate("doctorUser", "fullName email")
    .populate("appointment", "appointmentDateTime status")
    .sort({ createdAt: -1 });

  return res.status(200).json({ prescriptions });
}

module.exports = {
  getMyProfile,
  upsertMyProfile,
  addReport,
  getMyReports,
  getMyAppointments,
  getMyPrescriptions
};
