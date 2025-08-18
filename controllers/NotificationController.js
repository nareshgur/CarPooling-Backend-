const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");

// Get user's notifications
router.get("/my", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { unreadOnly, limit = 50 } = req.query;

    let query = { recipientId: userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('senderId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).send(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).send({ error: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.put("/:notificationId/read", auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).send({ error: "Notification not found" });
    }

    if (notification.recipientId.toString() !== userId.toString()) {
      return res.status(403).send({ error: "Unauthorized access" });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).send({ message: "Notification marked as read" });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).send({ error: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read
router.put("/read-all", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).send({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).send({ error: "Failed to mark notifications as read" });
  }
});

// Delete notification
router.delete("/:notificationId", auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).send({ error: "Notification not found" });
    }

    if (notification.recipientId.toString() !== userId.toString()) {
      return res.status(403).send({ error: "Unauthorized access" });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.status(200).send({ message: "Notification deleted successfully" });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).send({ error: "Failed to delete notification" });
  }
});

module.exports = router;