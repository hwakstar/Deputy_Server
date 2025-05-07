const express = require("express");
const router = express.Router();

const Schedule = require("../models/schedule");
const Leave = require("../models/leave");
const Unavailable = require("../models/unavailable");
router.post("/", async (req, res) => {
  console.log(req.body);

  let conflict = await Schedule.findOne({
    userID: req.body.userID,
    $or: [
      {
        startTime: { $lt: req.body.endTime },
        endTime: { $gt: req.body.startTime },
      },
    ],
  });

  if (conflict) {
    return res.send({
      status: "warn",
      message: "Schedule conflict!",
    });
  }

  try {
    let newSchedule = new Schedule({
      ...req.body,
    });

    newSchedule.save();

    res.send({
      success: true,
      message: "Schedule created successfully!",
    });
  } catch (err) {
    console.log("💥 Schedule Creating Error: ", err);
  }
});

router.post("/update", async (req, res) => {
  console.log(req.body);

  let conflict = await Schedule.findOne({
    userID: req.body.updatedData.userID,
    locationID: req.body.updatedData.locationID,
    $or: [
      {
        startTime: { $lt: req.body.updatedData.endTime },
        endTime: { $gt: req.body.updatedData.startTime },
      },
    ],
  });

  console.log("=========================");
  console.log(conflict);

  if (conflict) {
    return res.send({
      success: false,
      message: "Schedule conflict!",
    });
  }

  try {
    if (req.body._id !== "") {
      console.log(req.body._id);

      let target = await Schedule.findOne({
        _id: req.body._id,
      });

      console.log(target);

      target.userID = req.body.updatedData.userID;
      target.locationID = req.body.updatedData.locationID;
      target.startTime = req.body.updatedData.startTime;
      target.endTime = req.body.updatedData.endTime;
      await target.save();

      res.send({
        success: true,
        message: "Schedule Updated successfully!",
      });
    } else {
      let newTarget = new Schedule(req.body.updatedData);
      await newTarget.save();
      await newTarget.save();

      res.send({
        success: true,
        message: "Schedule Created successfully!",
      });
    }
  } catch (err) {
    console.log("💥 Schedule Updating Error: ", err);
  }
});

router.post("/list", async (req, res) => {
  console.log(req.body);
  const { startTime, period, userID } = req.body;

  const getEndDate = (startTime, period) => {
    console.log(startTime);
    // Remove microseconds from the startTime string
    const startTimeStr = new Date(startTime).toISOString().split(".")[0];

    const start = new Date(startTimeStr); // Now the date string is compatible with the Date constructor

    if (isNaN(start.getTime())) {
      throw new Error("Invalid startTime format");
    }
    // Return the calculated end date
    return new Date(start.getTime() + Number(period) * 24 * 60 * 60 * 1000);
  };

  try {
    const endDate = getEndDate(startTime, period);
    let schedules = [];
    let leaves = [];
    let unavailabes = [];

    if (userID !== undefined) {
      schedules = await Schedule.find({
        startTime: {
          $gte: new Date(startTime),
          $lt: endDate,
        },
        userID: userID,
      })
        .populate("userID", "preferredName")
        .populate("locationID", "area");

      leaves = await Leave.find({
        startTime: {
          $gte: new Date(startTime),
        },
        userID: userID,
      })
        .populate("userID", "preferredName")
        .populate("locationID", "area");

      unavailabes = await Unavailable.find({
        startTime: {
          $gte: new Date(startTime),
        },
        userID: userID,
      })
        .populate("userID", "preferredName")
        .populate("locationID", "area");
    } else {
      schedules = await Schedule.find({
        startTime: {
          $gte: new Date(startTime),
          $lt: endDate,
        },
      })
        .populate("userID", "preferredName")
        .populate("locationID", "area");

      leaves = await Leave.find({
        startTime: {
          $gte: new Date(startTime),
        },
      })
        .populate("userID", "preferredName")
        .populate("locationID", "area");

      unavailabes = await Unavailable.find({
        startTime: {
          $gte: new Date(startTime),
        },
      })
        .populate("locationID", "area")
        .populate("userID", "preferredName");
    }

    const schedulesWithType = [];
    for (const item of schedules) {
      schedulesWithType.push({ ...item.toObject(), type: "shift" });
    }

    const leavesWithType = [];
    for (const item of leaves) {
      leavesWithType.push({ ...item.toObject(), type: "leave" });
    }

    const unavailablesWithType = [];
    for (const item of unavailabes) {
      unavailablesWithType.push({ ...item.toObject(), type: "unavailable" });
    }

    res.send({
      success: true,
      schedules: schedulesWithType,
      leaves: leavesWithType,
      unavailables: unavailablesWithType,
    });
  } catch (err) {
    console.log("🔥 Schedule Listing Error: ", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", (req, res) => {
  Schedule.find({}).then((schedules) => {
    res.send({
      schedules: schedules,
    });
  });
});

router.delete("/:id", (req, res) => {
  const scheduleId = req.params.id;

  Schedule.findByIdAndDelete(scheduleId)
    .then(() => {
      res.send({
        success: true,
        message: "Schedule deleted successfully!",
      });
    })
    .catch((err) => {
      console.log("💥 Schedule Deleting Error: ", err);
    });
});

module.exports = router;
