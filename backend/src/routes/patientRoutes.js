const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { ROLES } = require("../constants/roles");
const {
  getMyProfile,
  upsertMyProfile,
  addReport,
  getMyReports,
  getMyAppointments,
  getMyPrescriptions
} = require("../controllers/patientController");

const router = express.Router();

router.use(requireAuth, requireRole(ROLES.PATIENT));
router.get("/me", getMyProfile);
router.put("/me", upsertMyProfile);
router.post("/me/reports", addReport);
router.get("/me/reports", getMyReports);
router.get("/me/appointments", getMyAppointments);
router.get("/me/prescriptions", getMyPrescriptions);

module.exports = router;
