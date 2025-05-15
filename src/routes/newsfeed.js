const express = require("express");
const router = express.Router();
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");
const NewsFeedSchema = require("../models/newsfeed");

// Configure multer storage (store files in 'uploads/' folder)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // make sure this folder exists or create it
  },
  filename: function (req, file, cb) {
    // Use timestamp + original name to avoid collisions
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage: storage });

router.post("/", upload.single("media"), async (req, res) => {
  try {
    // Extract fields from req.body
    const {
      userID,
      content,
      confirmationRequired,
      commentsEnabled,
      // add other fields if needed
    } = req.body;

    if (!userID || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Build newsfeed document
    const newsfeedData = {
      type: "main_post", // or adjust if you have multiple types
      content: content,
      author: userID,
      requireConfirm: confirmationRequired === "true",
      allowComment: commentsEnabled === "true",
    };

    // If file uploaded, set attachment fields
    if (req.file) {
      newsfeedData.attachementType = req.file.mimetype; // e.g. 'image/jpeg'
      // You can store relative or absolute URL/path to file
      newsfeedData.attachementUrl = `/uploads/${req.file.filename}`;
    }

    const newNewsFeed = new NewsFeedSchema(newsfeedData);

    await newNewsFeed.save();

    return res.json({
      success: true,
      message: "Newsfeed created successfully!",
    });
  } catch (err) {
    console.error("Newsfeed Creating Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/confirm", async (req, res) => {
  try {
    let newsfeedId = req.body.newsfeedId;

    await NewsFeedSchema.findOneAndUpdate(
      newsfeedId,
      { $push: { confirmedUsers: req.body.user } },
      { new: true }
    );

    res.send({ success: true, message: "User confirmed newsfeed!" });
  } catch (err) {
    console.log("User Confirmation Error: ", err);
    res.send({ success: false, message: "Failed to confirm newsfeed." });
  }
});

router.post("/comment", async (req, res) => {
  console.log(req.body);

  try {
    let comment = new NewsFeedSchema(req.body);
    await comment.save();

    comment = await comment.populate("author", "preferredName email");

    res.send({
      success: true,
      comment,
    });
  } catch (err) {
    console.log("💥 Comment Error: ", err);
    res.send({
      success: false,
      err,
    });
  }
});

router.post("/list", async (req, res) => {
  try {
    let feeds = await NewsFeedSchema.find({
      ...req.body,
    }).populate("author", "preferredName email");

    res.send({
      success: true,
      feeds,
    });
  } catch (err) {
    console.log("💥 Feed List Error: ", err);
    res.send({
      success: false,
      err,
    });
  }
});

router.delete("/:id", async (req, res) => {
  const newsfeedId = req.params.id;

  NewsFeedSchema.findByIdAndDelete(newsfeedId)
    .then(() => {
      res.send({ success: true, message: "Newsfeed deleted successfully!" });
    })
    .catch((err) => {
      console.log("Newsfeed Deletion Error: ", err);
    });
});

router.put("/:id", async (req, res) => {
  const newsfeedId = req.params.id;
  const updatedData = req.body;
  try {
    const updatedNewsfeed = await NewsFeedSchema.findByIdAndUpdate(
      newsfeedId,
      updatedData,
      { new: true }
    );
    res.send({
      success: true,
      message: "Newsfeed updated successfully!",
      updatedNewsfeed: updatedNewsfeed,
    });
  } catch (err) {
    console.log("Newsfeed Updating Error: ", err);
  }
});

router.get("/", async (req, res) => {
  NewsFeedSchema.find({ type: "main_post" })
    .populate("author", "preferredName")
    .populate("locations", "name")
    .populate("users", "preferredName")
    .then((newsfeeds) => {
      res.send({ success: true, newsfeeds: newsfeeds });
    });
});

module.exports = router;
