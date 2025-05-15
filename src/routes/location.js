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

router.post("/update", async (req, res) => {
  try {
    await Locations.updateOne(
      {
        _id: req.body.id,
      },
      {
        $set: {
          ...req.body.updatedLocation,
        },
      }
    );

    res.send({
      success: true,
      message: "updated",
    });
  } catch (err) {
    console.log(err);
    res.send({
      success: false,
      message: err,
    });
  }
});

router.post("/update", async (req, res) => {
  try {
    await Locations.updateOne(
      {
        _id: req.body.id,
      },
      {
        $set: {
          archive: true,
        },
      }
    );

    res.send({
      success: true,
      message: "updated",
    });
  } catch (err) {
    console.log(err);
    res.send({
      success: false,
      message: err,
    });
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
