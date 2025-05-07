const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    reason: { type: String },
    type: { type: String },
    startTime: { type: Date },
    endTime: { type: Date },
    locationID: { type: mongoose.Types.ObjectId, ref: "Locations" },

    userID: { type: mongoose.Types.ObjectId, ref: "Users" },
    status: { type: String, default: "pending" },
    duration: { type: Number },
  },
  { timestamps: true }
);

const Leave = mongoose.model("Leaves", leaveSchema, "leaves");

module.exports = Leave;
