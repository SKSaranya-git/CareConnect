const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { ROLES } = require("../constants/roles");
const {
  createCheckout,
  updatePaymentStatus,
  getPaymentByAppointment
} = require("../controllers/paymentController");

const router = express.Router();

router.use(requireAuth);
router.post("/checkout", requireRole(ROLES.PATIENT), createCheckout);
router.patch("/:paymentId/status", requireRole(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN), updatePaymentStatus);
router.get(
  "/appointment/:appointmentId",
  requireRole(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN),
  getPaymentByAppointment
);

module.exports = router;
