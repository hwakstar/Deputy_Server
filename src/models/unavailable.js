const mongoose = require("mongoose");

const unavailableSchema = new mongoose.Schema(
  {
    userID: { type: mongoose.Types.ObjectId, ref: "Users" },
    locationID: { type: mongoose.Types.ObjectId, ref: "Locations" },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, default: "pending" },
    duration: { type: Number },
  },
  { timestamps: true }
);

const Unavailable = mongoose.model(
  "Unavailable",
  unavailableSchema,
  "unavailable"
);

module.exports = Unavailable;
