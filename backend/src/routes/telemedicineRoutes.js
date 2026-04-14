const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { ROLES } = require("../constants/roles");
const {
  createSession,
  getSessionByAppointment,
  endSession
} = require("../controllers/telemedicineController");

const router = express.Router();

router.use(requireAuth);
router.post("/sessions", requireRole(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN), createSession);
router.get(
  "/sessions/appointment/:appointmentId",
  requireRole(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN),
  getSessionByAppointment
);
router.patch("/sessions/:sessionId/end", requireRole(ROLES.DOCTOR, ROLES.ADMIN), endSession);

module.exports = router;
