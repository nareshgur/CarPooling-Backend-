const express = require("express");
const router = express.Router();
const ChatLog = require("../models/ChatLog");
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");

// GET /api/chats/ride/:rideId – get chat for ride that includes current user
router.get("/ride/:rideId", auth, async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      rideId,
      participants: { $in: [userId] },
    })
      .populate("participants", "name email")
      .populate("rideId", "origin destination dateTime");

    if (!chat) return res.status(404).send({ error: "Chat not found" });

    // sort messages ascending by timestamp for UI
    chat.messages.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    res.status(200).send(chat);
  } catch (err) {
    console.error("Error fetching chat:", err);
    res.status(500).send({ error: "Failed to fetch chat" });
  }
});

// POST /api/chats/:chatId/message – send message (realtime)
router.post("/:chatId/message", auth, async (req, res) => {
  
  console.log("The message controller ",req.body)
  try {
    
    const { chatId } = req.params;
    const { content, messageType = "text" } = req.body;
    const senderId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).send({ error: "Message content is required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).send({ error: "Chat not found" });

    // auth: must be participant
    const isParticipant = chat.participants.some(
      (id) => id.toString() === senderId.toString()
    );
    if (!isParticipant) {
      return res.status(403).send({ error: "Unauthorized access to chat" });
    }

    // find receiver = any participant != sender
    const receiverId =
      chat.participants.find((id) => id.toString() !== senderId.toString()) ||
      null;

    // persist message
    const msg = {
      senderId,
      receiverId,
      content: content.trim(),
      messageType,
      timestamp: new Date(),
      isRead: false,
    };

    chat.messages.push(msg);
    chat.lastMessage = msg.timestamp;
    await chat.save();

    // realtime: to ride room
    global.socketService?.sendToRide(chat.rideId.toString(), "newMessage", {
      chatId: chat._id,
      ...msg,
    });

    // DB notification for receiver (if any) + realtime to that user
    if (receiverId) {
      const notification = await Notification.create({
        recipientId: receiverId,
        senderId,
        type: "message",
        title: "New Message",
        message: `You have a new message`,
        data: {
          chatId: chat._id,
          rideId: chat.rideId,
        },
      });

      global.socketService?.sendToUser(
        receiverId.toString(),
        "notification",
        {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          createdAt: notification.createdAt,
        }
      );
    }

    res.status(201).send({
      message: "Message sent successfully",
      chatId: chat._id,
      sent: msg,
    });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).send({ error: "Failed to send message" });
  }
});

// PUT /api/chats/:chatId/read – mark messages as read for current user
router.put("/:chatId/read", auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).send({ error: "Chat not found" });

    const updated = chat.messages.reduce((acc, m) => {
      if (m.receiverId?.toString() === userId.toString() && !m.isRead) {
        m.isRead = true;
        acc += 1;
      }
      return acc;
    }, 0);

    if (updated > 0) await chat.save();

    // Optional: realtime read-receipt to sender
    global.socketService?.sendToRide(chat.rideId.toString(), "readReceipt", {
      chatId: chat._id,
      readerId: userId,
      count: updated,
    });

    res.status(200).send({ message: "Messages marked as read", count: updated });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    res.status(500).send({ error: "Failed to mark messages as read" });
  }
});

// GET /api/chats/my – list user’s chats, sorted by last activity
router.get("/my", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      participants: { $in: [userId] },
    })
      .populate("participants", "name email")
      .populate("rideId", "origin destination dateTime")
      .sort({ lastMessage: -1, updatedAt: -1 });

    // (Optional) trim messages in listing to reduce payload
    const trimmed = chats.map((c) => ({
      _id: c._id,
      rideId: c.rideId,
      participants: c.participants,
      lastMessage: c.lastMessage,
      // return only the last message preview
      lastMessagePreview:
        c.messages?.length
          ? {
              content: c.messages[c.messages.length - 1].content,
              timestamp: c.messages[c.messages.length - 1].timestamp,
              senderId: c.messages[c.messages.length - 1].senderId,
            }
          : null,
    }));

    res.status(200).send(trimmed);
  } catch (err) {
    console.error("Error fetching user chats:", err);
    res.status(500).send({ error: "Failed to fetch chats" });
  }
});


router.post("/initiate", async (req, res) => {
  try {
    const { rideId, senderId, receiverId, initiatedAt } = req.body;

    const chat = new ChatLog({
      rideId,
      senderId,
      receiverId,
      initiatedAt,
    });

    await chat.save();

    res.status(201).json({ message: "Chat initiation logged", chat });
  } catch (error) {
    console.error("Error saving chat:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
