const mongoose = require("mongoose");

const APPOINTMENT_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED"
};

const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED"
};

const appointmentSchema = new mongoose.Schema(
  {
    patientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    doctorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    appointmentDateTime: {
      type: Date,
      required: true
    },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.PENDING
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING
    },
    cancellationReason: { type: String, trim: true }
  },
  { timestamps: true }
);

appointmentSchema.index({ doctorUser: 1, appointmentDateTime: 1 });
appointmentSchema.index({ patientUser: 1, appointmentDateTime: -1 });

module.exports = {
  Appointment: mongoose.model("Appointment", appointmentSchema),
  APPOINTMENT_STATUS,
  PAYMENT_STATUS
};
