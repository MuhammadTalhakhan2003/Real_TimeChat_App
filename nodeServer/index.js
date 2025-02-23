require("dotenv").config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose");
const io = require("socket.io")(8000, {
  cors: {
    origin: "http://127.0.0.1:5500",
    methods: ["GET", "POST"],
  },
});

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define Message Schema
const messageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// ✅ Create Model
const Message = mongoose.model("Message", messageSchema);
// Add to index.js
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  });
  
  const User = mongoose.model('User', userSchema);
const users = {};

// ✅ Socket.io Connection
io.on("connection", (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);

  // ✅ When a new user joins
  socket.on("new-user-joined", async (name) => {
    if (!name || name.trim() === "") {
      console.error("❌ Error: Received an empty username. Ignoring user.");
      return;
    }

    users[socket.id] = name;
    console.log(`✅ ${name} joined the chat`);

    socket.broadcast.emit("user-joined", name);

    try {
      // ✅ Fetch chat history, sort by `timestamp`
      const chatHistory = await Message.find().sort({ timestamp: 1 }).limit(20);

      // ✅ Convert timestamps to readable format
      const formattedHistory = chatHistory.map((msg) => ({
        name: msg.name,
        message: msg.message,
        timestamp: msg.timestamp.toLocaleTimeString(),
      }));

      socket.emit("chat-history", formattedHistory);
    } catch (error) {
      console.error("❌ Error fetching chat history:", error);
    }
  });

  // ✅ When a user sends a message
  socket.on("send", async (data) => {
    const { message } = data;
    const timestamp = new Date();

    // ✅ Ensure username exists before saving
    const userName = users[socket.id] || "Unknown User";

    if (!message || message.trim() === "") {
      console.error("❌ Error: Empty message received. Ignoring message.");
      return;
    }

    console.log(`📩 Message from ${userName}: ${message}`);

    try {
      // ✅ Store message in MongoDB
      const msg = new Message({
        name: userName,
        message: message.toString(),
        timestamp: timestamp,
      });

      await msg.save(); // ✅ Save message

      // ✅ Send message to all clients
      socket.broadcast.emit("receive", {
        name: userName,
        message: message,
        timestamp: timestamp.toLocaleTimeString(),
      });
    } catch (error) {
      console.error("❌ Error saving message to MongoDB:", error);
    }
  });

  // ✅ When a user disconnects
  socket.on("disconnect", () => {
    if (users[socket.id]) {
      console.log(`❌ User disconnected: ${users[socket.id]} (${socket.id})`);
      socket.broadcast.emit("user-left", users[socket.id]);
      delete users[socket.id]; // ✅ Remove user from list
    }
  });
});
