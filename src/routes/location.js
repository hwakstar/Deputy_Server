const express = require("express");
const router = express.Router();

const Locations = require("../models/location");

router.post("/", async (req, res) => {
  console.log(req.body);

  try {
    let newLocation = new Locations({
      ...req.body,
    });

    await newLocation.save();

    res.send({
      success: true,
      message: "Location created successfully!",
    });
  } catch (err) {
    console.log("💥 Location Creating Error: ", err);
  }
});

router.get("/", (req, res) => {
  Locations.find({}).then((lcs) => {
    res.send({
      locations: lcs,
    });
  });
});

module.exports = router;
