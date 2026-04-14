const NotificationLog = require("../models/NotificationLog");

async function logNotification({ user, channel, type, recipient, message, status = "SENT", meta }) {
  return NotificationLog.create({
    user,
    channel,
    type,
    recipient,
    message,
    status,
    meta
  });
}

async function notifyAppointmentBooked({ patientUserId, doctorUserId, appointmentId }) {
  const patientMessage = `Your appointment (${appointmentId}) was booked successfully.`;
  const doctorMessage = `A new appointment (${appointmentId}) is waiting for your confirmation.`;

  await Promise.all([
    logNotification({
      user: patientUserId,
      channel: "EMAIL",
      type: "APPOINTMENT_BOOKED",
      message: patientMessage,
      meta: { appointmentId }
    }),
    logNotification({
      user: patientUserId,
      channel: "SMS",
      type: "APPOINTMENT_BOOKED",
      message: patientMessage,
      meta: { appointmentId }
    }),
    logNotification({
      user: doctorUserId,
      channel: "EMAIL",
      type: "APPOINTMENT_BOOKED",
      message: doctorMessage,
      meta: { appointmentId }
    }),
    logNotification({
      user: doctorUserId,
      channel: "SMS",
      type: "APPOINTMENT_BOOKED",
      message: doctorMessage,
      meta: { appointmentId }
    })
  ]);
}

async function notifyConsultationCompleted({ patientUserId, doctorUserId, appointmentId }) {
  const patientMessage = `Your consultation (${appointmentId}) is completed. Prescription is now available.`;
  const doctorMessage = `Consultation (${appointmentId}) is marked as completed.`;

  await Promise.all([
    logNotification({
      user: patientUserId,
      channel: "EMAIL",
      type: "CONSULTATION_COMPLETED",
      message: patientMessage,
      meta: { appointmentId }
    }),
    logNotification({
      user: patientUserId,
      channel: "SMS",
      type: "CONSULTATION_COMPLETED",
      message: patientMessage,
      meta: { appointmentId }
    }),
    logNotification({
      user: doctorUserId,
      channel: "EMAIL",
      type: "CONSULTATION_COMPLETED",
      message: doctorMessage,
      meta: { appointmentId }
    }),
    logNotification({
      user: doctorUserId,
      channel: "SMS",
      type: "CONSULTATION_COMPLETED",
      message: doctorMessage,
      meta: { appointmentId }
    })
  ]);
}

module.exports = {
  logNotification,
  notifyAppointmentBooked,
  notifyConsultationCompleted
};
