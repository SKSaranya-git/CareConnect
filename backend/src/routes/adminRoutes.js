const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { ROLES } = require("../constants/roles");
const { getPendingDoctors, verifyDoctor, getUsers } = require("../controllers/adminController");

const router = express.Router();

router.use(requireAuth, requireRole(ROLES.ADMIN));
router.get("/doctors/pending", getPendingDoctors);
router.patch("/doctors/:userId/verify", verifyDoctor);
router.get("/users", getUsers);

module.exports = router;
