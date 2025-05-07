const express = require("express");
const router = express.Router();

const Leave = require("../models/leave");

router.get("/", async (req, res) => {
  try {
    const result = await Leave.find({});
    res.send({
      success: true,
      message: "Leaves fetched successfully!",
      leaves: result,
    });
  } catch (err) {
    console.log("💥 Error fetching leaves: ", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/list", async (req, res) => {
  try {
    const result = await Leave.find({ userID: req.body.userID });

    res.send({
      success: true,
      message: "Leaves fetched successfully!",
      leaves: result,
    });
  } catch (err) {
    console.log("💥 Error fetching leaves: ", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    // Parse dates from request (assume ISO 8601, so JS Date is safe)
    const { start, end, leaveType, leaveReason, userID, duration } = req.body;
    const startTime = new Date(start);
    const endTime = new Date(end);

    // Basic validation
    if (!startTime || !endTime || !userID) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    if (startTime > endTime) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before end date",
      });
    }

    // Overlap check: (startA <= endB) && (endA >= startB)
    const overlap = await Leave.findOne({
      userID: userID,
      $or: [
        {
          startTime: { $lte: endTime },
          endTime: { $gte: startTime },
        },
      ],
    });

    if (overlap) {
      return res.status(409).json({
        success: false,
        message: "Overlapping leave request!",
      });
    }

    // Create and save new leave
    let newLeave = new Leave({
      startTime,
      endTime,
      type: leaveType,
      reason: leaveReason,
      duration: Number(duration),
      userID,
    });

    await newLeave.save();

    res.json({
      success: true,
      message: "Leave request sent successfully!",
    });
  } catch (err) {
    console.log("💥 Error creating leave request: ", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to send leave request" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const rr = await Leave.findByIdAndUpdate(id, req.body, { new: true });
    if (!rr)
      return res
        .status(404)
        .send({ success: false, message: "Leave not found" });
    res.send({
      success: true,
      message: "Leave updated successfully!",
      leave: rr,
    });
  } catch (err) {
    console.log("💥 Error updating leave: ", err);
    res.status(500).send({ success: false, message: "Failed to update leave" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Leave.findByIdAndDelete(id);
    if (!result)
      return res
        .status(404)
        .send({ success: false, message: "Leave not found" });
    res.send({
      success: true,
      message: "Leave deleted successfully!",
    });
  } catch (err) {
    console.log("💥 Error deleting leave: ", err);
    res.status(500).send({ success: false, message: "Failed to delete leave" });
  }
});

module.exports = router;
