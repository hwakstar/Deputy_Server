const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },

    completedDate: {
      type: Date,
    },

    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },

    assignTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);
