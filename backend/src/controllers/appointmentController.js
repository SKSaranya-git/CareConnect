const DoctorProfile = require("../models/DoctorProfile");
const { Appointment, APPOINTMENT_STATUS } = require("../models/Appointment");
const { ROLES } = require("../constants/roles");
const { notifyAppointmentBooked } = require("../services/notificationService");

async function createAppointment(req, res) {
  const { doctorUserId, appointmentDateTime, reason } = req.body;
  if (!doctorUserId || !appointmentDateTime) {
    return res.status(400).json({ message: "doctorUserId and appointmentDateTime are required." });
  }

  const doctor = await DoctorProfile.findOne({ user: doctorUserId });
  if (!doctor) {
    return res.status(404).json({ message: "Doctor profile not found." });
  }
  if (!doctor.isVerified) {
    return res.status(400).json({ message: "Doctor is not verified by admin yet." });
  }

  const appointmentDate = new Date(appointmentDateTime);
  if (Number.isNaN(appointmentDate.getTime())) {
    return res.status(400).json({ message: "Invalid appointmentDateTime." });
  }

  const appointment = await Appointment.create({
    patientUser: req.user._id,
    doctorUser: doctorUserId,
    appointmentDateTime: appointmentDate,
    reason
  });

  await notifyAppointmentBooked({
    patientUserId: appointment.patientUser,
    doctorUserId: appointment.doctorUser,
    appointmentId: appointment._id
  });

  return res.status(201).json({ message: "Appointment booked successfully.", appointment });
}

async function getMyAppointments(req, res) {
  const filter = {};
  if (req.user.role === ROLES.PATIENT) {
    filter.patientUser = req.user._id;
  } else if (req.user.role === ROLES.DOCTOR) {
    filter.doctorUser = req.user._id;
  } else {
    return res.status(403).json({ message: "Only patient or doctor can use this endpoint." });
  }

  const appointments = await Appointment.find(filter)
    .populate("patientUser", "fullName email")
    .populate("doctorUser", "fullName email")
    .sort({ appointmentDateTime: -1 });

  return res.status(200).json({ appointments });
}

async function cancelAppointment(req, res) {
  const { appointmentId } = req.params;
  const { cancellationReason } = req.body;
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found." });
  }
  if (String(appointment.patientUser) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only cancel your own appointments." });
  }
  if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
    return res.status(400).json({ message: "Completed appointment cannot be cancelled." });
  }

  appointment.status = APPOINTMENT_STATUS.CANCELLED;
  appointment.cancellationReason = cancellationReason;
  await appointment.save();

  return res.status(200).json({ message: "Appointment cancelled.", appointment });
}

async function rescheduleAppointment(req, res) {
  const { appointmentId } = req.params;
  const { appointmentDateTime } = req.body;
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found." });
  }
  if (String(appointment.patientUser) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only reschedule your own appointments." });
  }

  const newDate = new Date(appointmentDateTime);
  if (Number.isNaN(newDate.getTime())) {
    return res.status(400).json({ message: "Invalid appointmentDateTime." });
  }

  appointment.appointmentDateTime = newDate;
  appointment.status = APPOINTMENT_STATUS.PENDING;
  await appointment.save();

  return res.status(200).json({ message: "Appointment rescheduled.", appointment });
}

module.exports = {
  createAppointment,
  getMyAppointments,
  cancelAppointment,
  rescheduleAppointment
};
