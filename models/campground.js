const mongoose = require("mongoose");

// CAMPGROUND SCHEMA
const campgroundSchema = new mongoose.Schema({
  name: String, price: String, description: String,
  image: String, location: String, lat: Number, lng: Number,
  cloudinaryId: String, cloudinaryImage: String,
  s3Id: String, s3Image: String, gcsId: String, gcsImage: String,
  author: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: String
  },
  createdAt: { type: Date, default: Date.now },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }]
}); //, Campground = mongoose.model("Campground", campgroundSchema);

module.exports = mongoose.model("Campground", campgroundSchema);
