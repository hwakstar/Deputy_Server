const express = require("express");
const router = express.Router();

const Unavailable = require("../models/unavailable");

router.get("/", async (req, res) => {
  try {
    const result = await Unavailable.find({});
    res.send({
      success: true,
      message: "Retrieved unavailable times successfully",
      data: result,
    });
  } catch (err) {
    console.log("💥 Error retrieving unavailable times: ", err);
    res.status(500).send({
      message: "Error retrieving unavailable times",
    });
  }
});

router.post("/list", async (req, res) => {
  try {
    const result = await Unavailable.find({ userID: req.body.userID });

    res.send({
      success: true,
      message: "Retrieved unavailable times successfully",
      data: result,
    });
  } catch (err) {
    console.log("💥 Error fetching items: ", err);
    res.status(500).send({
      message: "Error creating unavailable time",
    });
  }
});

router.post("/", async (req, res) => {
  console.log("🔏 Creating unavailable time: ", req.body);

  try {
    const { start, end, reason, userID, duration } = req.body;
    const startTime = new Date(start);
    const endTime = new Date(end);

    // Basic validation
    if (!startTime || !endTime || !userID) {
      return res
        .status(409)
        .json({ success: false, message: "Missing required fields" });
    }
    if (startTime > endTime) {
      return res.status(409).json({
        success: false,
        message: "Start date must be before end date",
      });
    }

    // Overlap check
    const overlap = await Unavailable.find({
      serID: userID,
      $or: [
        {
          startTime: { $lte: endTime },
          endTime: { $gte: startTime },
        },
      ],
    });

    console.log(overlap);

    if (overlap.length > 0) {
      return res.status(409).json({
        success: false,
        message: "The provided time range overlaps!",
      });
    }

    const newUnavailable = new Unavailable({
      startTime,
      endTime,
      reason,
      userID,
      duration,
    });
    await newUnavailable.save();
    res.send({
      success: true,
      message: "Created unavailable time successfully",
      data: newUnavailable,
    });
  } catch (err) {
    console.log("💥 Error creating unavailable time: ", err);
    res.status(500).send({
      message: "Error creating unavailable time",
    });
  }
});

module.exports = router;
