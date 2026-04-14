const crypto = require("crypto");
const { Appointment, APPOINTMENT_STATUS } = require("../models/Appointment");
const { TelemedicineSession, SESSION_STATUS } = require("../models/TelemedicineSession");
const { ROLES } = require("../constants/roles");

function canAccessSession(user, appointment) {
  if (user.role === ROLES.ADMIN) {
    return true;
  }
  return (
    String(appointment.patientUser) === String(user._id) ||
    String(appointment.doctorUser) === String(user._id)
  );
}

function buildJitsiJoinUrl(roomName) {
  const baseDomain = (process.env.JITSI_BASE_URL || "https://meet.jit.si").replace(/\/+$/, "");
  return `${baseDomain}/${roomName}`;
}

async function createSession(req, res) {
  const { appointmentId } = req.body;
  if (!appointmentId) {
    return res.status(400).json({ message: "appointmentId is required." });
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found." });
  }
  if (!canAccessSession(req.user, appointment)) {
    return res.status(403).json({ message: "Not allowed for this appointment." });
  }
  if (![APPOINTMENT_STATUS.ACCEPTED, APPOINTMENT_STATUS.COMPLETED].includes(appointment.status)) {
    return res.status(400).json({ message: "Session can be created only for accepted/completed appointments." });
  }

  let session = await TelemedicineSession.findOne({ appointment: appointment._id });
  if (!session) {
    const roomName = `hospital-${appointment._id}-${crypto.randomBytes(3).toString("hex")}`;
    session = await TelemedicineSession.create({
      appointment: appointment._id,
      doctorUser: appointment.doctorUser,
      patientUser: appointment.patientUser,
      provider: "JITSI",
      roomName,
      joinUrl: buildJitsiJoinUrl(roomName),
      status: SESSION_STATUS.SCHEDULED
    });
  }

  if (session.status === SESSION_STATUS.SCHEDULED) {
    session.status = SESSION_STATUS.LIVE;
    session.startedAt = new Date();
    await session.save();
  }

  return res.status(201).json({ message: "Telemedicine session ready.", session });
}

async function getSessionByAppointment(req, res) {
  const { appointmentId } = req.params;
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found." });
  }
  if (!canAccessSession(req.user, appointment)) {
    return res.status(403).json({ message: "Not allowed for this appointment." });
  }

  const session = await TelemedicineSession.findOne({ appointment: appointment._id });
  if (!session) {
    return res.status(404).json({ message: "No telemedicine session found for this appointment." });
  }
  return res.status(200).json({ session });
}

async function endSession(req, res) {
  const { sessionId } = req.params;
  const session = await TelemedicineSession.findById(sessionId).populate("appointment");
  if (!session) {
    return res.status(404).json({ message: "Session not found." });
  }
  if (
    req.user.role !== ROLES.ADMIN &&
    String(session.doctorUser) !== String(req.user._id)
  ) {
    return res.status(403).json({ message: "Only assigned doctor/admin can end this session." });
  }

  session.status = SESSION_STATUS.COMPLETED;
  session.endedAt = new Date();
  await session.save();

  return res.status(200).json({ message: "Telemedicine session ended.", session });
}

module.exports = {
  createSession,
  getSessionByAppointment,
  endSession
};
