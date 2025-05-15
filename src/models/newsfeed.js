const mongoose = require("mongoose");

const NewsFeedSchema = new mongoose.Schema(
  {
    // * main_post => main article
    // * comment => comment
    type: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Types.ObjectId, ref: "Users" },
    attachementType: { type: String },
    attachementUrl: { type: String },
    requireConfirm: { type: Boolean, default: false },
    allowComment: { type: Boolean, default: true },
    locations: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Locations" }],
    },
    users: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
    },
    confirmedUsers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
    },
    parentID: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("NewsFeed", NewsFeedSchema, "newsfeed");
