const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true },
    frequency: { type: String, trim: true },
    duration: { type: String, trim: true }
  },
  { _id: true }
);

const prescriptionSchema = new mongoose.Schema(
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
    diagnosis: { type: String, trim: true },
    medicines: [medicineSchema],
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

prescriptionSchema.index({ patientUser: 1, createdAt: -1 });

module.exports = mongoose.model("Prescription", prescriptionSchema);
