const mongoose = require("mongoose");

const PAYMENT_PROVIDER = {
  PAYHERE: "PAYHERE",
  STRIPE: "STRIPE",
  PAYPAL: "PAYPAL"
};

const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED"
};

const paymentSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true
    },
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
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "LKR"
    },
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      default: PAYMENT_PROVIDER.PAYHERE
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING
    },
    paymentRef: {
      type: String,
      trim: true
    },
    paidAt: Date
  },
  { timestamps: true }
);

module.exports = {
  Payment: mongoose.model("Payment", paymentSchema),
  PAYMENT_PROVIDER,
  PAYMENT_STATUS
};
