const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema(
  {
    // * Schedule Main Information
    userID: { type: mongoose.Types.ObjectId, ref: "Users" },
    locationID: { type: mongoose.Types.ObjectId, ref: "Locations" },
    startTime: { type: Date },
    endTime: { type: Date },
    note: { type: String },
    clockIn: { type: Date },
    clockOut: { type: Date },
    totalHours: { type: Number },
    overtimeHours: { type: Number },
    payRate: { type: Number },
    payAmount: { type: Number },

    // * started, pending, approved, started, discard
    status: {
      type: String,
    },
    progress: { type: String },

    // ? Break Time -> Minutes
    break: { type: Number },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Schedules = mongoose.model("Schedules", ScheduleSchema, "schedules");
module.exports = mongoose.model.Schedules || Schedules;
