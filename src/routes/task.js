const express = require("express");
const router = express.Router();

const TaskSchema = require("../models/task");

router.get("/", async (req, res) => {
  try {
    let tasks = await TaskSchema.find()
      .populate("userID", "email preferredName")
      .populate("assignTo", "email preferredName");
    res.send({ success: true, tasks });
  } catch (err) {
    console.log("Task Fetching Error: ", err);
    res.status(500).send({
      message: "Error fetching tasks",
    });
  }
});

router.post("/", async (req, res) => {
  console.log(req.body);

  try {
    let newTask = new TaskSchema({
      title: req.body.title,
      notes: req.body.notes,
      dueDate: req.body.dueDate,
      userID: req.body.userID,
      assignTo: req.body.assignTo,
    });

    await newTask.save();

    res.send({
      success: true,
      message: "Task created successfully!",
    });
  } catch (err) {
    console.log("🧾 Task Creating Error: ", err);
  }
});

router.post("/list", async (req, res) => {
  try {
    let tasks = await TaskSchema.find({
      $or: [
        {
          assignTo: req.body.userID,
        },
        {
          userID: req.body.userID,
        },
      ],
    })
      .populate("userID")
      .populate("assignTo");
    res.send({ success: true, tasks });
  } catch (err) {
    console.log("Task Fetching Error: ", err);
    res.status(500).send({
      message: "Error fetching tasks",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    let task = await TaskSchema.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.send({
      success: true,
      message: "Task updated successfully!",
    });
  } catch (err) {
    console.log("Task Updating Error: ", err);
    res.status(500).send({
      message: "Error updating the task",
    });
  }
});

router.post("/complete", async (req, res) => {
  try {
    let task = await TaskSchema.findByIdAndUpdate(
      req.body.id,
      [
        {
          $set: {
            completed: { $not: "$completed" },
            completedDate: Date.now(),
          },
        },
      ],
      { new: true }
    );

    res.send({
      success: true,
      task: task,
      message: "Success!",
    });
  } catch (err) {
    res.status(500).send({
      message: "Error Completing Task",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await TaskSchema.findByIdAndDelete(req.params.id);
    res.send({
      success: true,
      message: "Task deleted successfully!",
    });
  } catch (err) {
    console.log("Task Deleting Error: ", err);
    res.status(500).send({
      message: "Error deleting the task",
    });
  }

  // res.send("Task deleted successfully!");
});

module.exports = router;
