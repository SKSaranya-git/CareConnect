const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { ROLES } = require("../constants/roles");
const {
  getDoctors,
  getDoctorByUserId,
  getMyDoctorProfile,
  upsertMyDoctorProfile,
  updateAvailability,
  getMyAppointments,
  updateAppointmentStatus,
  issuePrescription,
  getPatientReports
} = require("../controllers/doctorController");

const router = express.Router();

router.get("/", getDoctors);
router.get("/:userId", getDoctorByUserId);

router.use(requireAuth, requireRole(ROLES.DOCTOR));
router.get("/me/profile", getMyDoctorProfile);
router.put("/me/profile", upsertMyDoctorProfile);
router.put("/me/availability", updateAvailability);
router.get("/me/appointments", getMyAppointments);
router.patch("/appointments/:appointmentId/status", updateAppointmentStatus);
router.post("/appointments/:appointmentId/prescriptions", issuePrescription);
router.get("/patients/:patientUserId/reports", getPatientReports);

module.exports = router;
