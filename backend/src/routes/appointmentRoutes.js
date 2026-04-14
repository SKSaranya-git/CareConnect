const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { ROLES } = require("../constants/roles");
const {
  createAppointment,
  getMyAppointments,
  cancelAppointment,
  rescheduleAppointment
} = require("../controllers/appointmentController");

const router = express.Router();

router.use(requireAuth);
router.post("/", requireRole(ROLES.PATIENT), createAppointment);
router.get("/me", requireRole(ROLES.PATIENT, ROLES.DOCTOR), getMyAppointments);
router.patch("/:appointmentId/cancel", requireRole(ROLES.PATIENT), cancelAppointment);
router.patch("/:appointmentId/reschedule", requireRole(ROLES.PATIENT), rescheduleAppointment);

module.exports = router;
