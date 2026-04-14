const NotificationLog = require("../models/NotificationLog");
const { logNotification } = require("../services/notificationService");

async function sendEmail(req, res) {
  const { userId, recipient, type = "CUSTOM_EMAIL", message } = req.body;
  if (!message || !recipient) {
    return res.status(400).json({ message: "recipient and message are required." });
  }

  const log = await logNotification({
    user: userId || req.user._id,
    channel: "EMAIL",
    type,
    recipient,
    message
  });

  return res.status(201).json({ message: "Email notification queued (mock).", log });
}

async function sendSms(req, res) {
  const { userId, recipient, type = "CUSTOM_SMS", message } = req.body;
  if (!message || !recipient) {
    return res.status(400).json({ message: "recipient and message are required." });
  }

  const log = await logNotification({
    user: userId || req.user._id,
    channel: "SMS",
    type,
    recipient,
    message
  });

  return res.status(201).json({ message: "SMS notification queued (mock).", log });
}

async function getMyNotifications(req, res) {
  const logs = await NotificationLog.find({ user: req.user._id }).sort({ createdAt: -1 });
  return res.status(200).json({ notifications: logs });
}

async function getAllNotifications(_req, res) {
  const logs = await NotificationLog.find({}).sort({ createdAt: -1 }).limit(200);
  return res.status(200).json({ notifications: logs });
}

module.exports = {
  sendEmail,
  sendSms,
  getMyNotifications,
  getAllNotifications
};
