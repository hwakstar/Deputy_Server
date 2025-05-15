const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // * User Personal Information
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    preferredName: { type: String },
    birthday: { type: Date },
    pronouns: { type: String },
    gender: { type: String },

    // * User Contact Information
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    country: { type: String },
    postCode: { type: String },

    // * Emergency Contact Information
    emergencyContactName: { type: String },
    emergencyContactNumber: { type: String },

    // * Login Information
    kisokPin: { type: Number },
    hashPass: { type: String },
    device: { type: String },
    twoFactor: { type: Boolean, default: false },

    // * Employment Information
    deputyAccessLevel: {
      type: String,
      enum: ["employee", "employer", "admin"],
      default: "employee",
    },
    locationID: { type: mongoose.Types.ObjectId, ref: "Locations" },
    hiredOn: { type: Date },
    training: { type: String },
    preferredArea: { type: String },

    // * Pay Details
    payRollId: { type: String },
    payratesID: { type: mongoose.Types.ObjectId, ref: "PayRates" },

    // * Regular Working Hours
    workPeriod: { type: String },
    hoursPerPeriod: { type: Number },
    daysPerPeriod: { type: Number },
    stressProfie: { type: String },

    // * Basic Access
    allowed: { type: Boolean, default: false },
    work_available: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Users = mongoose.model("Users", UserSchema, "users");
module.exports = mongoose.model.Users || Users;
