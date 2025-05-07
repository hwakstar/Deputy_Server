const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    // * Location Main Information
    name: { type: String, required: true },
    address: { type: String, required: true },
    area: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Locations = mongoose.model("Locations", LocationSchema, "locations");
module.exports = mongoose.model.Locations || Locations;
