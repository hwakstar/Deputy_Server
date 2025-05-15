const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    // * Location Main Information
    name: { type: String, required: true },
    address: { type: String, required: true },
    area: { type: String, required: true },
    allow_offer: { type: Boolean, default: false },
    allow_swap: { type: Boolean, default: false },
    allow_approved: { type: Boolean, default: false },
    archive: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Locations = mongoose.model("Locations", LocationSchema, "locations");
module.exports = mongoose.model.Locations || Locations;
