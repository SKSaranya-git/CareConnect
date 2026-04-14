const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    channel: {
      type: String,
      enum: ["EMAIL", "SMS"],
      required: true
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    recipient: {
      type: String,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["QUEUED", "SENT", "FAILED"],
      default: "SENT"
    },
    meta: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationLog", notificationLogSchema);
