const mongoose = require("mongoose");

const CreatedChannelSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: false },
  channelId: { type: String, required: true, unique: true },
  createdAt: { type: Date, required: true, default: Date.now },
  lastMovedAt: { type: Date, required: true, default: Date.now },
});

module.exports = mongoose.model("CreatedChannels", CreatedChannelSchema);
