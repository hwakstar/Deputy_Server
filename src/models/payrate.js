const mongoose = require("mongoose");

const PayRateSchema = new mongoose.Schema(
  {
    userID: { type: mongoose.Types.ObjectId, ref: "Users" },
    weekday: { type: Number, required: true },
    saturday: { type: Number, required: true },
    sunday: { type: Number, required: true },
    holiday: { type: Number, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const PayRates = mongoose.model("PayRates", PayRateSchema, "pay_rates");
module.exports = mongoose.model.PayRates || PayRates;
