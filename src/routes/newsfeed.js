const express = require("express");
const router = express.Router();

const NewsFeedSchema = require("../models/newsfeed");

router.post("/", async (req, res) => {
  console.log(req.body);

  let newNewsFeed = new NewsFeedSchema(req.body);
  try {
    await newNewsFeed.save();
    res.send({ success: true, message: "Newsfeed created successfully!" });
  } catch (err) {
    console.log("Newsfeed Creating Error: ", err);
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
  NewsFeedSchema.find({})
    .populate("author", "preferredName")
    .populate("locations", "name")
    .populate("users", "preferredName")
    .then((newsfeeds) => {
      res.send({ success: true, newsfeeds: newsfeeds });
    });
});

module.exports = router;
