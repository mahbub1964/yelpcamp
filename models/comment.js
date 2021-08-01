const mongoose = require("mongoose");

// COMMENT SCHEMA
const commentSchema = new mongoose.Schema({
  text: String,
  createdAt: { type: Date, default: Date.now },
  author: { //String
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: String
  }
});

module.exports = mongoose.model("Comment", commentSchema);
