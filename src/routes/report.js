const express = require("express");
const router = express.Router();
const Schedule = require("../models/schedule");
const Leave = require("../models/leave");
const Unavailable = require("../models/unavailable");
const User = require("../models/user");

// Tolerance in milliseconds (15 minutes)
const TOLERANCE_MS = 15 * 60 * 1000;

// Helper: Calculate pay amount for a shift
function getPayAmountForShift(shift, payrates, isActual = false) {
  if (!payrates) return 0;

  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);

  let intervalStart = start;
  let intervalEnd = end;

  if (isActual) {
    if (!(shift.clockIn && shift.clockOut)) return 0;
    intervalStart = new Date(shift.clockIn);
    intervalEnd = new Date(shift.clockOut);
  }

  let totalMs = intervalEnd - intervalStart;
  if (totalMs <= 0) return 0;

  if (isActual) {
    if (shift.breakClockIn && shift.breakClockOut) {
      const breakMs =
        new Date(shift.breakClockOut) - new Date(shift.breakClockIn);
      if (breakMs > 0 && breakMs < totalMs) totalMs -= breakMs;
    }
  } else {
    if (shift.breakStartTime && shift.breakEndTime) {
      const breakMs =
        new Date(shift.breakEndTime) - new Date(shift.breakStartTime);
      if (breakMs > 0 && breakMs < totalMs) totalMs -= breakMs;
    }
  }

  const getDayType = (date) => {
    const day = date.getUTCDay();
    if (day === 6) return "saturday";
    if (day === 0) return "sunday";
    return "weekday";
  };

  let payAmount = 0;
  let current = new Date(intervalStart);
  while (current < intervalEnd) {
    const nextDay = new Date(
      Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDate() + 1
      )
    );
    const segmentEnd = nextDay < intervalEnd ? nextDay : intervalEnd;
    const segmentMs = segmentEnd - current;
    const segmentHours = segmentMs / (1000 * 60 * 60);

    const dayType = getDayType(current);
    const rate = payrates[dayType] || 0;

    payAmount += segmentHours * rate;

    current = segmentEnd;
  }

  return payAmount;
}

// Helper: Get period boundaries (current ± 15 days)
function getPeriod() {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 15);
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + 15);
  return { startDate, endDate };
}

// Helper to get date string like "Mon", "Tue", etc.
function getDayShortName(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function getTodayBounds() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return { start, end };
}

// API 1: Individual user summaries
router.get("/summary", async (req, res) => {
  try {
    const { startDate, endDate } = getPeriod();

    // Double populate: userID, then payratesID from user
    const schedules = await Schedule.find({
      startTime: { $gte: startDate },
      endTime: { $lte: endDate },
    })
      .populate({
        path: "userID",
        populate: { path: "payratesID" },
      })
      .lean();

    const userMap = new Map();

    schedules.forEach((shift) => {
      if (!shift.userID) return;
      const userId = shift.userID._id.toString();
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          preferredName: shift.userID.preferredName || "Unknown",
          payrates: shift.userID.payratesID || null,
          schedules: [],
        });
      }
      userMap.get(userId).schedules.push(shift);
    });

    const users = [];

    for (const [userId, userData] of userMap.entries()) {
      const { schedules, payrates } = userData;

      let totalScheduledMs = 0;
      let totalActualMs = 0;
      let totalScheduledPay = 0;
      let totalActualPay = 0;

      schedules.forEach((shift) => {
        const scheduledStart = new Date(shift.startTime);
        const scheduledEnd = new Date(shift.endTime);
        let scheduledDurationMs = scheduledEnd - scheduledStart;

        if (shift.breakStartTime && shift.breakEndTime) {
          const breakMs =
            new Date(shift.breakEndTime) - new Date(shift.breakStartTime);
          if (breakMs > 0 && breakMs < scheduledDurationMs)
            scheduledDurationMs -= breakMs;
        }
        totalScheduledMs += scheduledDurationMs;

        if (
          shift.clockIn &&
          shift.clockOut &&
          shift.breakClockIn &&
          shift.breakClockOut
        ) {
          const actualStart = new Date(shift.clockIn);
          const actualEnd = new Date(shift.clockOut);
          let actualDurationMs = actualEnd - actualStart;

          const breakMs =
            new Date(shift.breakClockOut) - new Date(shift.breakClockIn);
          if (breakMs > 0 && breakMs < actualDurationMs)
            actualDurationMs -= breakMs;

          if (actualDurationMs > 0) {
            totalActualMs += actualDurationMs;
          }
        }

        totalScheduledPay += getPayAmountForShift(shift, payrates, false);

        if (shift.payApproved) {
          totalActualPay += getPayAmountForShift(shift, payrates, true);
        }
      });

      const scheduledHours = totalScheduledMs / (1000 * 60 * 60);
      const actualHours = totalActualMs / (1000 * 60 * 60);

      const hourVariance =
        scheduledHours === 0
          ? 0
          : ((actualHours - scheduledHours) / scheduledHours) * 100;
      const costVariance =
        totalScheduledPay === 0
          ? 0
          : ((totalActualPay - totalScheduledPay) / totalScheduledPay) * 100;

      users.push({
        userId,
        preferredName: userData.preferredName,
        metrics: [
          {
            label: "Scheduled Hours",
            value: Math.round(scheduledHours),
            displayValue: `${Math.round(scheduledHours)}h`,
            color: "bg-sky-100 text-sky-700",
          },
          {
            label: "Actual Hours",
            value: Math.round(actualHours),
            displayValue: `${Math.round(actualHours)}h`,
            color: "bg-blue-100 text-blue-700",
          },
          {
            label: "Hour Variance (%)",
            value: Number(hourVariance.toFixed(1)),
            displayValue: `${hourVariance.toFixed(1)}%`,
            color: "bg-indigo-100 text-indigo-700",
          },
          {
            label: "Scheduled Costs",
            value: totalScheduledPay,
            displayValue: `$${totalScheduledPay.toFixed(2)}`,
            color: "bg-teal-100 text-teal-700",
          },
          {
            label: "Actual Costs",
            value: totalActualPay,
            displayValue: `$${totalActualPay.toFixed(2)}`,
            color: "bg-green-100 text-green-700",
          },
          {
            label: "Cost Variance (%)",
            value: Number(costVariance.toFixed(1)),
            displayValue: `${costVariance.toFixed(1)}%`,
            color: "bg-emerald-100 text-emerald-700",
          },
        ],
      });
    }

    res.json({
      period: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      },
      users,
    });
  } catch (error) {
    console.error("Error in /report/summary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API 2: Total summary for all users combined
router.get("/summary/total", async (req, res) => {
  try {
    const { startDate, endDate } = getPeriod();

    // Double populate: userID, then payratesID from user
    const schedules = await Schedule.find({
      startTime: { $gte: startDate },
      endTime: { $lte: endDate },
    })
      .populate({
        path: "userID",
        populate: { path: "payratesID" },
      })
      .lean();

    let totalScheduledMsAll = 0;
    let totalActualMsAll = 0;
    let totalScheduledPayAll = 0;
    let totalActualPayAll = 0;

    schedules.forEach((shift) => {
      const payrates =
        shift.userID && shift.userID.payratesID
          ? shift.userID.payratesID
          : null;

      const scheduledStart = new Date(shift.startTime);
      const scheduledEnd = new Date(shift.endTime);
      let scheduledDurationMs = scheduledEnd - scheduledStart;

      if (shift.breakStartTime && shift.breakEndTime) {
        const breakMs =
          new Date(shift.breakEndTime) - new Date(shift.breakStartTime);
        if (breakMs > 0 && breakMs < scheduledDurationMs)
          scheduledDurationMs -= breakMs;
      }
      totalScheduledMsAll += scheduledDurationMs;

      if (
        shift.clockIn &&
        shift.clockOut &&
        shift.breakClockIn &&
        shift.breakClockOut
      ) {
        const actualStart = new Date(shift.clockIn);
        const actualEnd = new Date(shift.clockOut);
        let actualDurationMs = actualEnd - actualStart;

        const breakMs =
          new Date(shift.breakClockOut) - new Date(shift.breakClockIn);
        if (breakMs > 0 && breakMs < actualDurationMs)
          actualDurationMs -= breakMs;

        if (actualDurationMs > 0) {
          totalActualMsAll += actualDurationMs;
        }
      }

      totalScheduledPayAll += getPayAmountForShift(shift, payrates, false);

      if (shift.payApproved) {
        totalActualPayAll += getPayAmountForShift(shift, payrates, true);
      }
    });

    const totalScheduledHoursAll = totalScheduledMsAll / (1000 * 60 * 60);
    const totalActualHoursAll = totalActualMsAll / (1000 * 60 * 60);
    const hourVarianceAll =
      totalScheduledHoursAll === 0
        ? 0
        : ((totalActualHoursAll - totalScheduledHoursAll) /
            totalScheduledHoursAll) *
          100;
    const costVarianceAll =
      totalScheduledPayAll === 0
        ? 0
        : ((totalActualPayAll - totalScheduledPayAll) / totalScheduledPayAll) *
          100;

    const totals = [
      {
        label: "Scheduled Hours",
        value: Math.round(totalScheduledHoursAll),
        displayValue: `${Math.round(totalScheduledHoursAll)}h`,
        color: "bg-sky-100 text-sky-700",
      },
      {
        label: "Actual Hours",
        value: Math.round(totalActualHoursAll),
        displayValue: `${Math.round(totalActualHoursAll)}h`,
        color: "bg-blue-100 text-blue-700",
      },
      {
        label: "Hour Variance (%)",
        value: Number(hourVarianceAll.toFixed(1)),
        displayValue: `${hourVarianceAll.toFixed(1)}%`,
        color: "bg-indigo-100 text-indigo-700",
      },
      {
        label: "Scheduled Costs",
        value: `$${totalScheduledPayAll.toFixed(2)}`,
        displayValue: `$${totalScheduledPayAll.toFixed(2)}`,
        color: "bg-teal-100 text-teal-700",
      },
      {
        label: "Actual Costs",
        value: `$${totalActualPayAll.toFixed(2)}`,
        displayValue: `$${totalActualPayAll.toFixed(2)}`,
        color: "bg-green-100 text-green-700",
      },
      {
        label: "Cost Variance (%)",
        value: Number(costVarianceAll.toFixed(1)),
        displayValue: `${costVarianceAll.toFixed(1)}%`,
        color: "bg-emerald-100 text-emerald-700",
      },
    ];

    res.json({
      period: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      },
      totals,
    });
  } catch (error) {
    console.error("Error in /report/summary/total:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/attendance/daily-summary", async (req, res) => {
  try {
    // Define the date range you want to analyze, e.g. last 7 days or current week
    // Here, for example, last 7 days from today
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 6); // last 7 days including today

    // Fetch schedules within date range
    const schedules = await Schedule.find({
      startTime: { $gte: startDate, $lte: now },
      type: "shift", // consider only shifts for attendance
    }).lean();

    // Initialize daily counters
    const dailyCounts = {};

    // Initialize days in range with zero counts
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dayKey = getDayShortName(new Date(d));
      dailyCounts[dayKey] = { Absent: 0, Late: 0, Early: 0 };
    }

    schedules.forEach((shift) => {
      const startTime = new Date(shift.startTime);
      const clockIn = shift.clockIn ? new Date(shift.clockIn) : null;
      const dayKey = getDayShortName(startTime);

      // If dayKey not initialized (unlikely), initialize
      if (!dailyCounts[dayKey]) {
        dailyCounts[dayKey] = { Absent: 0, Late: 0, Early: 0 };
      }

      const toleranceEarlyLimit = new Date(startTime.getTime() - TOLERANCE_MS);
      const toleranceLateLimit = new Date(startTime.getTime() + TOLERANCE_MS);
      const nowTime = new Date();

      if (!clockIn) {
        // If current time is past startTime + tolerance, mark absent
        if (nowTime > toleranceLateLimit) {
          dailyCounts[dayKey].Absent += 1;
        }
      } else {
        if (clockIn < toleranceEarlyLimit) {
          dailyCounts[dayKey].Early += 1;
        } else if (clockIn > toleranceLateLimit) {
          dailyCounts[dayKey].Late += 1;
        }
        // If clockIn within tolerance window, neither early nor late
      }
    });

    // Convert dailyCounts object to array for response
    const response = Object.entries(dailyCounts).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    res.json(response);
  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/schedule/counts", async (req, res) => {
  try {
    const now = new Date();

    // Build aggregation pipeline to count schedule types after current time
    const scheduleCounts = await Schedule.aggregate([
      {
        $match: {
          startTime: { $gte: now }, // Only schedules after now
          type: { $in: ["open", "open_claim", "shift_offer", "shift_swap"] },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    // Sum the counts to get the totals
    const totalOpen =
      scheduleCounts.find((item) => item._id === "open")?.count || 0;
    const totalOpenClaim =
      scheduleCounts.find((item) => item._id === "open_claim")?.count || 0;
    const totalShiftOffer =
      scheduleCounts.find((item) => item._id === "shift_offer")?.count || 0;
    const totalShiftSwap =
      scheduleCounts.find((item) => item._id === "shift_swap")?.count || 0;

    // Build aggregation pipeline for counting leave types after current time
    const leaveCounts = await Leave.aggregate([
      {
        $match: {
          startTime: { $gte: now }, // Only leave after now
        },
      },
      {
        $count: "count",
      },
    ]);
    const totalLeave = leaveCounts[0]?.count || 0;

    // Build aggregation pipeline for counting unavailable types after current time
    const unavailableCounts = await Unavailable.aggregate([
      {
        $match: {
          startTime: { $gte: now }, // Only unavailable after now
        },
      },
      {
        $count: "count",
      },
    ]);
    const totalUnavailable = unavailableCounts[0]?.count || 0;

    // Construct the response
    const response = {
      open: totalOpen,
      open_claim: totalOpenClaim,
      shift_offer: totalShiftOffer,
      shift_swap: totalShiftSwap,
      leave: totalLeave,
      unavailable: totalUnavailable,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching schedule counts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/today-info", async (req, res) => {
  try {
    const { start, end } = getTodayBounds();

    // 15 minutes tolerance in ms
    const TOLERANCE_MS = 15 * 60 * 1000;

    // 1. Running Late Today
    // Find schedules starting today where clockIn is later than startTime + 15min
    const runningLateCount = await Schedule.countDocuments({
      startTime: { $gte: start, $lt: end },
      clockIn: { $exists: true },
      $expr: {
        $gt: [
          "$clockIn",
          { $add: ["$startTime", TOLERANCE_MS] }, // clockIn > startTime + 15min
        ],
      },
    });

    // 2. People on Leave Today
    // Count leaves that cover today and are approved
    const leaveCount = await Leave.countDocuments({
      startTime: { $lte: end },
      endTime: { $gte: start },
      status: "approved",
    });

    // 3. Birthdays Today
    // Match users whose birthday month and day equals today's month and day
    const now = new Date();
    const month = now.getUTCMonth() + 1; // getUTCMonth is 0-based
    const day = now.getUTCDate();

    const birthdayCount = await User.countDocuments({
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: "$birthday" }, day] },
          { $eq: [{ $month: "$birthday" }, month] },
        ],
      },
    });

    res.json({
      runningLateCount,
      leaveCount,
      birthdayCount,
    });
  } catch (error) {
    console.error("Error fetching today's dashboard info:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
