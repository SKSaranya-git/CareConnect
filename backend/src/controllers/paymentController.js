const crypto = require("crypto");
const { Appointment } = require("../models/Appointment");
const DoctorProfile = require("../models/DoctorProfile");
const { Payment, PAYMENT_PROVIDER, PAYMENT_STATUS } = require("../models/Payment");
const { ROLES } = require("../constants/roles");

async function createCheckout(req, res) {
  const { appointmentId, amount, currency = "LKR", provider = PAYMENT_PROVIDER.PAYHERE } = req.body;
  if (!appointmentId) {
    return res.status(400).json({ message: "appointmentId is required." });
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found." });
  }
  if (String(appointment.patientUser) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only pay for your own appointments." });
  }

  const doctorProfile = await DoctorProfile.findOne({ user: appointment.doctorUser });
  const finalAmount = Number(amount || doctorProfile?.consultationFee || 0);
  if (finalAmount <= 0) {
    return res.status(400).json({ message: "Consultation amount is invalid. Set doctor consultationFee first." });
  }

  const paymentRef = `PAY-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

  const payment = await Payment.findOneAndUpdate(
    { appointment: appointment._id },
    {
      $set: {
        patientUser: appointment.patientUser,
        doctorUser: appointment.doctorUser,
        amount: finalAmount,
        currency,
        provider,
        paymentRef,
        status: PAYMENT_STATUS.PENDING
      },
      $setOnInsert: { appointment: appointment._id }
    },
    { new: true, upsert: true, runValidators: true }
  );

  return res.status(201).json({
    message: "Checkout initialized (sandbox/mock).",
    payment,
    checkoutUrl: `https://sandbox.payhere.lk/pay/${payment.paymentRef}`
  });
}

async function updatePaymentStatus(req, res) {
  const { paymentId } = req.params;
  const { status, paymentRef } = req.body;
  if (!Object.values(PAYMENT_STATUS).includes(status)) {
    return res.status(400).json({ message: `status must be one of ${Object.values(PAYMENT_STATUS).join(", ")}` });
  }

  const payment = await Payment.findById(paymentId).populate("appointment");
  if (!payment) {
    return res.status(404).json({ message: "Payment not found." });
  }

  const canUpdate =
    req.user.role === ROLES.ADMIN ||
    String(payment.patientUser) === String(req.user._id) ||
    String(payment.doctorUser) === String(req.user._id);

  if (!canUpdate) {
    return res.status(403).json({ message: "Not allowed to update this payment." });
  }

  payment.status = status;
  if (paymentRef) {
    payment.paymentRef = paymentRef;
  }
  if (status === PAYMENT_STATUS.PAID) {
    payment.paidAt = new Date();
    payment.appointment.paymentStatus = "PAID";
    await payment.appointment.save();
  } else if (status === PAYMENT_STATUS.FAILED) {
    payment.appointment.paymentStatus = "FAILED";
    await payment.appointment.save();
  }

  await payment.save();
  return res.status(200).json({ message: "Payment status updated.", payment });
}

async function getPaymentByAppointment(req, res) {
  const { appointmentId } = req.params;
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found." });
  }

  const canView =
    req.user.role === ROLES.ADMIN ||
    String(appointment.patientUser) === String(req.user._id) ||
    String(appointment.doctorUser) === String(req.user._id);

  if (!canView) {
    return res.status(403).json({ message: "Not allowed to view this payment." });
  }

  const payment = await Payment.findOne({ appointment: appointment._id });
  if (!payment) {
    return res.status(404).json({ message: "Payment record not found for this appointment." });
  }

  return res.status(200).json({ payment });
}

module.exports = {
  createCheckout,
  updatePaymentStatus,
  getPaymentByAppointment
};
