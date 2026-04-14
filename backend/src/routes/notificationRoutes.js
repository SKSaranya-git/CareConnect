const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { ROLES } = require("../constants/roles");
const {
  sendEmail,
  sendSms,
  getMyNotifications,
  getAllNotifications
} = require("../controllers/notificationController");

const router = express.Router();

router.use(requireAuth);
router.get("/me", requireRole(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN), getMyNotifications);
router.post("/email", requireRole(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN), sendEmail);
router.post("/sms", requireRole(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN), sendSms);
router.get("/all", requireRole(ROLES.ADMIN), getAllNotifications);

module.exports = router;
