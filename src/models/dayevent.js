const mongoose = require("mongoose");

const DayEventSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    block_timeoff: { type: Boolean, default: false },
    public_holiday: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const DayEvent = mongoose.model("dayevents", DayEventSchema, "dayevents");
module.exports = mongoose.model.DayEvent || DayEvent;
