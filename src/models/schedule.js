const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema(
  {
    // * Schedule Main Information
    userID: { type: mongoose.Types.ObjectId, ref: "Users" },
    locationID: { type: mongoose.Types.ObjectId, ref: "Locations" },
    note: { type: String },

    // start, end time
    startTime: { type: Date },
    endTime: { type: Date },

    clockIn: { type: Date },
    clockOut: { type: Date },

    // start, end time
    breakStartTime: { type: Date },
    breakEndTime: { type: Date },

    breakClockIn: { type: Date },
    breakClockOut: { type: Date },

    totalHours: { type: Number },
    payRate: { type: Number },
    payAmount: { type: Number },
    payApproved: { type: Boolean, default: false },

    // * empty, open, open_claim, leave, unavialable, warning
    type: { type: String, default: "shift" },

    // * created => started => pending => approved
    status: {
      type: String,
      default: "created",
    },
    progress: { type: String },

    // ? Break Time -> Minutes
    break: { type: Number },
    candidates: [
      {
        user: { type: mongoose.Types.ObjectId, ref: "Users" },
        agreed: { type: Boolean, default: false },
        scheduleID: { type: mongoose.Types.ObjectId, ref: "Schedules" },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Schedules = mongoose.model("Schedules", ScheduleSchema, "schedules");
module.exports = mongoose.model.Schedules || Schedules;
