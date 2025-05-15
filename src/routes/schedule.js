const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Schedule = require("../models/schedule");
const Users = require("../models/user");
const Leave = require("../models/leave");
const Unavailable = require("../models/unavailable");
const DayEvent = require("../models/dayevent");
const PayRate = require("../models/payrate");

router.get("/", (req, res) => {
  Schedule.find({}).then((schedules) => {
    res.send({
      schedules: schedules,
    });
  });
});

router.post("/", async (req, res) => {
  console.log(req.body);

  let conflict;

  if (mongoose.isValidObjectId(req.body.userID)) {
    conflict = await Schedule.findOne({
      userID: req.body.userID,
      $or: [
        {
          startTime: { $lt: req.body.endTime },
          endTime: { $gt: req.body.startTime },
        },
      ],
    });
  }
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

router.post("/clock_in_out", async (req, res) => {
  console.log(req.body);

  try {
    let schedule = await Schedule.findOne({
      _id: req.body.scheduleID,
    });

    schedule[req.body.type] = Date.now();

    if (req.body.type == "clockIn") schedule.status = "started";
    if (req.body.type == "clockOut") schedule.status = "pending";

    await schedule.save();

    res.send({
      success: true,
      schedule,
    });
  } catch (err) {
    console.log("Error Clock_IN_OUT ", err);
    res.send({
      success: false,
      err,
    });
  }
});

router.post("/update", async (req, res) => {
  console.log(req.body);

  let conflict;

  if (
    mongoose.isValidObjectId(req.body.updatedData.userID) &&
    req.body.manual
  ) {
    conflict = await Schedule.findOne({
      userID: req.body.updatedData.userID,
      locationID: req.body.updatedData.locationID,
      $or: [
        {
          startTime: { $lt: req.body.updatedData.endTime },
          endTime: { $gt: req.body.updatedData.startTime },
        },
      ],
    });
  }

  console.log("💥 Conflict");
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

      if (mongoose.isValidObjectId(req.body.updatedData.userID)) {
        target.userID = req.body.updatedData.userID;
      } else {
        target.userID = null;
        target.type = req.body.updatedData.userID;
      }

      target.locationID = req.body.updatedData.locationID;
      target.startTime = req.body.updatedData.startTime;
      target.endTime = req.body.updatedData.endTime;
      target.breakStartTime = req.body.updatedData.breakStartTime;
      target.breakEndTime = req.body.updatedData.breakEndTime;

      const excluded = [null, "", "empty", "open", "open_claim"];

      if (!excluded.includes(target.userID)) target.type = "shift";
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

router.post("/update_manual", async (req, res) => {
  try {
    await Schedule.updateByIdAndUpdate(req.body._id, {
      $set: {
        ...req.body.updatedData,
      },
    });
  } catch (err) {
    console.log("💥 Updating Manual Error: ", err);
  }
});

router.post("/check_today_shift", async (req, res) => {
  console.log("✅ Check Today Shift: ", req.body.userID);

  try {
    const ONE_HOUR_MS = 3600 * 1000;
    const ONE_DAY_MS = 86400 * 1000;

    const now = Date.now();
    const gap = ONE_HOUR_MS; // 1 hour gap

    const startTime = new Date(now + gap);
    const endTime = new Date(now + ONE_DAY_MS + gap);

    const schedules = await Schedule.find({
      startTime: {
        $gte: startTime,
        $lte: endTime,
      },
      userID: req.body.userID,
    }).populate("locationID", "area name");

    res.send({
      success: true,
      schedules,
    });
  } catch (err) {
    console.error("💥 Check Today Shift Error: ", err);
    res.status(500).send({
      success: false,
      error: err.message || "Internal Server Error",
    });
  }
});

// * Schedule List (For Admin => Web)
// ! Web -> Server
// ! not required userID, period is flexible
router.post("/list", async (req, res) => {
  console.log(req.body);
  console.log("dddddddddd");

  const { startTime, endTime, userID, admin } = req.body;

  try {
    let schedules = [];
    let leaves = [];
    let unavailabes = [];

    console.log(endTime);
    console.log(startTime);

    if (userID !== undefined) {
      schedules = await Schedule.find({
        startTime: {
          $gte: startTime,
          $lt: endTime,
        },
        userID: userID,
      })
        .populate("userID", "preferredName email")
        .populate("locationID", "area name");

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
        .populate("locationID", "area")
        .populate("userID", "preferredName");
    } else {
      console.log("2222");
      if (!admin) {
        schedules = await Schedule.find({
          startTime: {
            $gte: startTime,
            $lt: endTime,
          },
          userID: {
            $ne: null,
          },
        })
          .populate("userID", "preferredName email")
          .populate("locationID", "area name")
          .sort({ startTime: 1 });
      } else {
        schedules = await Schedule.find({
          startTime: {
            $gte: startTime,
            $lt: endTime,
          },
        })
          .populate("userID", "preferredName email")
          .populate("locationID", "area name")
          .sort({ startTime: 1 });

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
    }

    const schedulesWithType = [];
    for (const item of schedules) {
      schedulesWithType.push({
        ...item.toObject(),
        type: item.type ?? "shift",
      });
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

// * Schedule List (For User => Mobile)
// ! Flutter -> Server
// ! @required userID, period is FIXED => 7
router.post("/user_list", async (req, res) => {
  try {
    const now = new Date();

    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    let shifts = await Schedule.find({
      userID: req.body.userID,
      startTime: {
        $gte: now,
        $lte: endOfWeek,
      },
    })
      .populate("userID", "preferredName email")
      .populate("locationID", "name area");

    const shiftsWithType = [];
    for (const item of shifts) {
      shiftsWithType.push({
        ...item.toObject(),
        type: item.type ?? "shift",
      });
    }

    let noworks = await Schedule.find({
      $and: [
        {
          $or: [
            { status: { $in: ["shift_offer", "shift_swap"] } },
            { type: { $in: ["open", "open_claim"] } },
          ],
        },
        {
          $or: [
            // condition for shift_offer / shift_swap OR open (must include userID)
            {
              $and: [
                {
                  $or: [
                    { status: { $in: ["shift_offer", "shift_swap"] } },
                    { type: "open" },
                  ],
                },
                { userID: req.body.userID },
              ],
            },
            // condition for open_claim (must NOT include userID)
            {
              type: "open_claim",
            },
          ],
        },
      ],
    })
      .populate("userID", "preferredName email")
      .populate("locationID", "area name");

    const noworksWithType = [];
    for (const item of noworks) {
      noworksWithType.push({
        ...item.toObject(),
        type: item.type ?? "nowork",
      });
    }

    let timesheets = await Schedule.find({
      userID: req.body.userID,
      startTime: {
        $lt: now,
      },
    })
      .populate("userID", "preferredName email")
      .populate("locationID", "name area");

    const timesheetsWithType = [];
    for (const item of timesheets) {
      timesheetsWithType.push({
        ...item.toObject(),
        type: item.type ?? "nowork",
      });
    }

    res.send({
      success: true,
      shifts: shiftsWithType,
      noworks: noworksWithType,
      timesheets: timesheetsWithType,
    });
  } catch (err) {
    console.log("💥 Userlist Error: ", err);
    res.send({
      success: false,
      err,
    });
  }
});

router.post("/user_timesheets", async (req, res) => {
  try {
    const now = new Date();

    let timesheets = await Schedule.find({
      userID: req.body.userID,
      startTime: {
        $lt: now,
      },
    })
      .populate("userID", "preferredName email")
      .populate("locationID", "name area");
    res.send({
      success: true,
      timesheets,
    });
  } catch (err) {
    console.log("💥 Userlist Error: ", err);
    res.send({
      success: false,
      err,
    });
  }
});

// * Swap, Offer Available Shifts
// ! After current time
router.post("/swap_and_offer_available", async (req, res) => {
  const { startTime, endTime, userID, scheduleID } = req.body;

  try {
    let currentTime = Date.now();

    const user_candidates = await Schedule.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(scheduleID) } },
      {
        $unwind: "$candidates", // deconstruct the array
      },
      {
        $lookup: {
          from: "users",
          localField: "candidates.user",
          foreignField: "_id",
          as: "userDetails",
        },
      },

      {
        $unwind: "$userDetails",
      },
      {
        $project: {
          _id: 0,
          id: "$candidates._id",
          agreed: "$candidates.agreed",
          user: {
            _id: "$userDetails._id",
            preferredName: "$userDetails.preferredName",
            email: "$userDetails.email",
            id: "$userDetails._id",
          },
        },
      },
    ]);

    const schedule = await Schedule.findOne({
      _id: scheduleID,
    });

    console.log(schedule);

    const schedule_candidate_ids = schedule.candidates.map(
      (item) => item.scheduleID
    );
    const schedule_candidates = await Schedule.find({
      _id: { $in: schedule_candidate_ids },
    })
      .populate("userID", "preferredName email")
      .populate("locationID", "area name");

    let swap_availables = await Schedule.find({
      startTime: { $gte: currentTime },
      type: "shift",
      userID: { $ne: userID },
      $or: [
        { startTime: { $gt: endTime } }, // shifts starting after the interval
        { endTime: { $lt: startTime } }, // shifts ending before the interval
      ],
    })
      .populate("userID", "preferredName email")
      .populate("locationID", "name area");
    res.send({
      success: true,
      swap_availables,
      candidates: user_candidates,
      schedules: schedule_candidates,
    });
  } catch (err) {
    console.log("💥 Swapble LIst Getting Error: ", err);
  }
});

// * Events List
// ! Block Timeoff
// ! Public Holiday
router.post("/events_list", async (req, res) => {
  let events = await DayEvent.find({
    date: {
      $gte: req.body.startDate,
      $lte: req.body.endDate,
    },
  });

  res.send({
    success: true,
    events,
  });
});

router.post("/events_update", async (req, res) => {
  try {
    let result = await DayEvent.updateOne(
      { date: req.body.date },
      {
        $set: {
          date: req.body.date,
          block_timeoff: req.body.block_timeoff,
          public_holiday: req.body.public_holiday,
        },
      },
      {
        upsert: true,
      }
    );

    res.send({
      success: true,
      result,
    });
  } catch (err) {
    console.log("💥 Timeoff Error: ", err);
  }
});

// * Start Shift
router.post("/start", async (req, res) => {
  try {
    await Schedule.findByIdAndUpdate(req.body.id, {
      clockIn: Date.now(),
    });

    res.send({
      success: true,
    });
  } catch (err) {
    console.log("💥 Start Error: ", err);
  }
});

// * End Shift
router.post("/end", async (req, res) => {
  try {
    await Schedule.findByIdAndUpdate(req.body.id, {
      clockOut: Date.now(),
    });

    res.send({
      success: true,
    });
  } catch (err) {
    console.log("💥 Start Error: ", err);
  }
});

// * Manager approve schedule
router.post("/approve", async (req, res) => {
  console.log(req.body);
  try {
    await Schedule.findByIdAndUpdate(req.body.id, {
      $set: {
        status: "approved",
      },
    });

    res.send({
      success: true,
    });
  } catch (err) {
    console.log("💥 Approve Error: ", err);
    res.send({
      success: false,
      err,
    });
  }
});

// * Manager reject schedule
router.post("/reject", async (req, res) => {
  try {
    await Schedule.findByIdAndUpdate(req.body.id, {
      $set: {
        status: "rejected",
      },
    });

    res.send({
      success: true,
    });
  } catch (err) {
    console.log("💥 Reject Error:", err);
    res.send({
      success: false,
      err,
    });
  }
});

// * Employee offer his shift
// ! Owner -> Others
// ? req.body.type => "shift_offer", "shift_swap"

router.post("/nowork_post", async (req, res) => {
  console.log(req.body);

  try {
    let schedule = await Schedule.findOne({
      _id: req.body.scheduleID,
    });

    let schedule_candidates = await Schedule.find({
      _id: {
        $in: req.body.candidates.map((item) => item.scheduleID),
      },
    })
      .populate("userID", "preferredName email")
      .populate("locationID", "name area");

    let user_candidates = await Users.find({
      _id: { $in: req.body.candidates.map((item) => item.user) },
    }).select("preferredName email");

    schedule.candidates = req.body.candidates;
    schedule.type = req.body.type;

    await schedule.save();

    console.log(user_candidates);

    res.send({
      success: true,
      schedules: schedule_candidates,
      candidates: user_candidates,
    });
  } catch (err) {
    console.log("💥 Offer Error: ", err);
    res.send({
      success: false,
      err,
    });
  }
});

// * Get Offer list for user
// ! Other <- Server(List)
router.post("/nowork_list", async (req, res) => {
  try {
    let offers = await Schedule.find({
      "candidates.user": req.body.userID,
    });

    res.send({
      success: true,
      offers,
    });
  } catch (err) {
    console.log("💥 Offer Get Error: ", err);
  }
});

// * Agree Other's Shift Offer
// ! Other -> Owner
router.post("/nowork_agree", async (req, res) => {
  try {
    await Schedule.updateOne(
      {
        "candidates.user": req.body.userID,
        _id: req.body.scheduleID,
      },
      {
        $set: { "candidates.$.agreed": true },
      }
    );
  } catch (err) {
    console.log("💥 Offer Agree Error: ", err);
  }
});

// * Offer Shift to Others
// ! Owner -> Other
// TODO Manager Approval Need?
router.post("/nowork_send", async (req, res) => {
  try {
    let schedule = await Schedule.findbyId(req.body.id);

    if (schedule.type == "shift_offer") {
      schedule.userID = req.body.userID; // * Swap UserID
      schedule.candidates = []; // * Clear Candidates
    }

    if (schedule.type == "shift_swap") {
      let targetSchedule = await Schedule.findbyId(
        req.body.candidateScheduleID
      );
      let candidateID = targetSchedule.userID;

      targetSchedule.userID = req.body.userID;
      schedule.userID = candidateID;
      schedule.candidates = [];

      await schedule.save();
      await targetSchedule.save();
    }

    await schedule.save();

    res.send({
      success: true,
      schedule,
    });
  } catch (err) {
    res.send({
      success: true,
      err,
    });
    console.log("💥 Offer Shift to Others Error: ", err);
  }
});

// * Swap offer his shift
router.post("/swap", async (req, res) => {
  try {
    await Schedule.findByIdAndUpdate(req.body.id, {
      $set: {
        status: "swap",
        candidates: candidates,
      },
    });

    res.send({
      success: true,
    });
  } catch (err) {
    console.log("💥 Swap Error: ", err);
    res.send({
      success: false,
      err,
    });
  }
});

// * *********************
// *  ~~    APPROVE    ~~
// * *********************

router.post("/time_approve", async (req, res) => {
  try {
    await Schedule.findByIdAndUpdate(req.body.id, {
      $set: {
        status: "approved",
      },
    });

    res.send({
      success: true,
    });
  } catch (err) {
    console.log("💥 Time Approve Error: ", err);
    res.send({
      success: false,
      err,
    });
  }
});

router.post("/pay_approve", async (req, res) => {
  try {
    const [payRate, schedule] = await Promise.all([
      PayRate.findOne({ userID: req.body.userID }),
      Schedule.findById(req.body.scheduleID),
    ]);

    if (!payRate || !schedule) {
      return res.send({
        success: false,
        message: "Pay rate or schedule not found",
      });
    }

    // Normalize date (remove time) to compare with DayEvent
    const scheduleDate = new Date(schedule.startTime);
    scheduleDate.setHours(0, 0, 0, 0);

    // Check if the schedule date is a public holiday
    const holidayEvent = await DayEvent.findOne({
      date: scheduleDate,
      public_holiday: true,
    });

    let rate;
    if (holidayEvent) {
      rate = payRate.holiday;
    } else {
      const day = schedule.startTime.getDay(); // 0 = Sunday, 6 = Saturday
      if (day === 0) {
        rate = payRate.sunday;
      } else if (day === 6) {
        rate = payRate.saturday;
      } else {
        rate = payRate.weekday;
      }
    }

    // Calculate working hours
    let totalHours;
    if (schedule.clockIn && schedule.clockOut) {
      const workedMs = schedule.clockOut - schedule.clockIn;
      const workedHours = workedMs / (1000 * 60 * 60);
      const breakHours = (schedule.break || 0) / 60;

      console.log(workedMs);
      console.log(workedHours);
      console.log(breakHours);

      totalHours = Math.max(0, workedHours - breakHours);
    } else {
      totalHours = schedule.totalHours || 0;
    }

    const totalPay = rate * totalHours;

    console.log(rate);
    console.log(totalHours);

    // Update schedule
    schedule.status = "approved";
    schedule.payRate = rate;
    schedule.payAmount = Math.floor(totalPay);
    schedule.totalHours = totalHours;
    schedule.payApproved = true;

    await schedule.save();

    res.send({
      success: true,
      message: `$${Math.floor(schedule.payAmount)} Approved!`,
    });
  } catch (err) {
    console.log(err);
    res.send({
      success: true,
      err,
    });
  }
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
