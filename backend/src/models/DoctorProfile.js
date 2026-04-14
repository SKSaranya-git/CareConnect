const mongoose = require("mongoose");

const availabilitySlotSchema = new mongoose.Schema(
  {
    day: { type: String, required: true, trim: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    isAvailable: { type: Boolean, default: true }
  },
  { _id: true }
);

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    specialty: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, trim: true },
    experienceYears: { type: Number, min: 0, default: 0 },
    consultationFee: { type: Number, min: 0, default: 0 },
    bio: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    availability: [availabilitySlotSchema]
  },
  { timestamps: true }
);

doctorProfileSchema.index({ specialty: 1 });

module.exports = mongoose.model("DoctorProfile", doctorProfileSchema);
