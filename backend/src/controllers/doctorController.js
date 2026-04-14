const DoctorProfile = require("../models/DoctorProfile");
const PatientProfile = require("../models/PatientProfile");
const Prescription = require("../models/Prescription");
const { Appointment, APPOINTMENT_STATUS } = require("../models/Appointment");
const { notifyConsultationCompleted } = require("../services/notificationService");

async function getDoctors(req, res) {
  const query = { isVerified: true };
  if (req.query.specialty) {
    query.specialty = new RegExp(req.query.specialty, "i");
  }

  const doctors = await DoctorProfile.find(query)
    .populate("user", "fullName email")
    .select("-__v")
    .sort({ createdAt: -1 });

  return res.status(200).json({ doctors });
}

async function getDoctorByUserId(req, res) {
  const profile = await DoctorProfile.findOne({ user: req.params.userId }).populate(
    "user",
    "fullName email"
  );
  if (!profile) {
    return res.status(404).json({ message: "Doctor profile not found." });
  }
  return res.status(200).json({ profile });
}

async function getMyDoctorProfile(req, res) {
  const profile = await DoctorProfile.findOne({ user: req.user._id }).populate("user", "fullName email");
  if (!profile) {
    return res.status(404).json({ message: "Doctor profile not found." });
  }
  return res.status(200).json({ profile });
}

async function upsertMyDoctorProfile(req, res) {
  const { specialty, licenseNumber, experienceYears, consultationFee, bio } = req.body;

  if (!specialty || !licenseNumber) {
    return res.status(400).json({ message: "specialty and licenseNumber are required." });
  }

  const profile = await DoctorProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: { specialty, licenseNumber, experienceYears, consultationFee, bio },
      $setOnInsert: { user: req.user._id }
    },
    { new: true, upsert: true, runValidators: true }
  );

  return res.status(200).json({
    message: "Doctor profile saved. Waiting for admin verification.",
    profile
  });
}

async function updateAvailability(req, res) {
  const { availability } = req.body;
  if (!Array.isArray(availability)) {
    return res.status(400).json({ message: "availability must be an array." });
  }

  const profile = await DoctorProfile.findOne({ user: req.user._id });
  if (!profile) {
    return res.status(404).json({ message: "Create doctor profile first." });
  }

  profile.availability = availability;
  await profile.save();

  return res.status(200).json({ message: "Availability updated.", availability: profile.availability });
}

async function getMyAppointments(req, res) {
  const appointments = await Appointment.find({ doctorUser: req.user._id })
    .populate("patientUser", "fullName email")
    .sort({ appointmentDateTime: -1 });

  return res.status(200).json({ appointments });
}

async function updateAppointmentStatus(req, res) {
  const { appointmentId } = req.params;
  const { status } = req.body;
  const allowed = [APPOINTMENT_STATUS.ACCEPTED, APPOINTMENT_STATUS.REJECTED, APPOINTMENT_STATUS.COMPLETED];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found." });
  }
  if (String(appointment.doctorUser) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only update your own appointments." });
  }

  appointment.status = status;
  await appointment.save();

  if (status === APPOINTMENT_STATUS.COMPLETED) {
    await notifyConsultationCompleted({
      patientUserId: appointment.patientUser,
      doctorUserId: appointment.doctorUser,
      appointmentId: appointment._id
    });
  }

  return res.status(200).json({ message: "Appointment status updated.", appointment });
}

async function issuePrescription(req, res) {
  const { appointmentId } = req.params;
  const { diagnosis, medicines, notes } = req.body;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found." });
  }
  if (String(appointment.doctorUser) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only issue prescriptions for your appointments." });
  }
  if (appointment.status !== APPOINTMENT_STATUS.COMPLETED && appointment.status !== APPOINTMENT_STATUS.ACCEPTED) {
    return res.status(400).json({ message: "Prescription can be issued only for accepted/completed appointments." });
  }

  const prescription = await Prescription.findOneAndUpdate(
    { appointment: appointment._id },
    {
      $set: {
        patientUser: appointment.patientUser,
        doctorUser: appointment.doctorUser,
        diagnosis,
        medicines: Array.isArray(medicines) ? medicines : [],
        notes
      },
      $setOnInsert: { appointment: appointment._id }
    },
    { new: true, upsert: true, runValidators: true }
  );

  return res.status(200).json({ message: "Prescription saved.", prescription });
}

async function getPatientReports(req, res) {
  const { patientUserId } = req.params;
  const profile = await PatientProfile.findOne({ user: patientUserId });
  if (!profile) {
    return res.status(404).json({ message: "Patient profile not found." });
  }
  return res.status(200).json({ reports: profile.reports || [] });
}

module.exports = {
  getDoctors,
  getDoctorByUserId,
  getMyDoctorProfile,
  upsertMyDoctorProfile,
  updateAvailability,
  getMyAppointments,
  updateAppointmentStatus,
  issuePrescription,
  getPatientReports
};
