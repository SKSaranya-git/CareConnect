const mongoose = require("mongoose");

const SESSION_STATUS = {
  SCHEDULED: "SCHEDULED",
  LIVE: "LIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED"
};

const telemedicineSessionSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true
    },
    doctorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    patientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    provider: {
      type: String,
      enum: ["JITSI", "TWILIO", "AGORA"],
      default: "JITSI"
    },
    roomName: {
      type: String,
      required: true,
      trim: true
    },
    joinUrl: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.SCHEDULED
    },
    startedAt: Date,
    endedAt: Date
  },
  { timestamps: true }
);

module.exports = {
  TelemedicineSession: mongoose.model("TelemedicineSession", telemedicineSessionSchema),
  SESSION_STATUS
};
