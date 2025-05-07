const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();

// * Define DB Models
const Users = require("../../models/user");
const PayRates = require("../../models/payrate");

const generateRandomCode = (length = 8) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let randomCode = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * letters.length);
    randomCode += letters[randomIndex];
  }
  return randomCode;
};

router.post("/register", async (req, res) => {
  const { firstName, email, lastName, phone, password } = req.body;

  try {
    const isEmailExist = await Users.findOne({ email: email });
    if (isEmailExist) {
      return res.send({ status: 0, msg: "exsitEmail" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new Users({
      firstName: firstName,
      lastName: lastName,
      preferredName: `${firstName.charAt(0)}. ${lastName}`,
      phone: phone,
      email: email,
      hashedPass: hashedPassword,
    });

    await newUser.save();

    console.log(`👨 NEW USER: ${newUser.email} REGISRED`);

    res.send({ status: 1, msg: "successRegistered" });
  } catch (error) {
    console.log("💥 Register Error: ", error);
    res.send({ status: 0, msg: "failedReq" });
  }
});

router.post("/add", async (req, res) => {
  const { firstName, lastName, phone, deputyAccessLevel, email } = req.body;

  try {
    const isEmailExist = await Users.findOne({ email: email });
    if (isEmailExist) {
      return res.send({ status: 0, msg: "exsitEmail" });
    }

    let password = "123456";

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new Users({
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      deputyAccessLevel: deputyAccessLevel,
      preferredName: `${firstName.charAt(0)}. ${lastName}`,

      email: email,
      hashPass: hashedPassword,
    });

    await newUser.save();

    console.log(`👨 NEW USER: ${newUser.email} REGISRED`);

    res.send({ success: true, message: "Success Added" });
  } catch (error) {
    console.log("💥 Register Error: ", error);
    res.send({ status: 0, msg: "failedReq" });
  }
});

router.post("/login", async (req, res) => {
  console.log("✅ Login Attempt: ", req.body.email);

  const { email, password } = req.body;

  try {
    const user = await Users.findOne({ email: email });
    if (!user) return res.send({ success: false, message: "invalidLoginInfo" });

    console.log(password, user.hashPass);

    const checkPass = await bcrypt.compare(password, user.hashPass);
    if (!checkPass)
      return res.send({ success: false, message: "invalidLoginInfo" });

    const userData = {
      _id: user._id,
      name: user.preferredName,
      username: user.username,
      email: user.email,
      deputyAccessLevel: user.deputyAccessLevel,
    };

    const token = jwt.sign(userData, "RANDOM-TOKEN", { expiresIn: "60d" });
    res.send({ success: true, msg: "successLogin", user: userData, token });
  } catch (error) {
    console.log("💥 Login Error", error);
    res.send({ success: false, msg: "failedReq", err: error });
  }
});

router.post("/update", async (req, res) => {
  const { _id, updatedData } = req.body;

  try {
    const updatedUser = await Users.findByIdAndUpdate(
      _id,
      {
        ...updatedData,
      },
      { new: true }
    );

    console.log(`👨 USER: ${updatedUser.email} UPDATED`);

    res.send({ success: true, msg: "successUpdated" });
  } catch (error) {
    console.log("💥 Update Error: ", error);
    res.send({ status: 0, msg: "failedReq" });
  }
});

router.post("/change_password", async (req, res) => {
  const { _id, currentPassword, newPassword } = req.body;
  try {
    const user = await Users.findById(_id);
    if (!user) return res.send({ status: 0, msg: "invalidUser" });
    const checkPass = await bcrypt.compare(currentPassword, user.hashPass);
    if (!checkPass) return res.send({ status: 0, msg: "invalidPassword" });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await Users.findByIdAndUpdate(
      _id,
      {
        hashPass: hashedPassword,
      },
      { new: true }
    );
    console.log(`👨 USER: ${updatedUser.email} UPDATED PASSWORD`);
    res.send({ status: 1, msg: "successUpdated" });
  } catch (error) {
    console.log("💥 Change Password Error: ", error);
    res.send({ status: 0, msg: "failedReq" });
  }
});

router.get("/", async (req, res) => {
  Users.find({}).then((users) => {
    res.send({
      users: users,
    });
  });
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  Users.findById(id)
    .populate("payratesID")
    .then((user) => {
      if (!user) return res.status(404).send({ message: "User not found" });
      res.send({
        user: user,
        success: true,
      });
    })
    .catch((err) => res.status(500).send({ message: "Error retrieving user" }));
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    firstName,
    lastName,
    phone,
    email,
    locationID,
    preferredName,
    deputyAccessLevel,
  } = req.body;
  try {
    const updatedUser = await Users.findByIdAndUpdate(
      id,
      {
        firstName,
        lastName,
        phone,
        email,
        locationID,
        preferredName,
        deputyAccessLevel,
      },
      { new: true }
    );
    console.log(`👨 USER: ${updatedUser.email} UPDATED`);
    res.send({ success: true, message: "successUpdated" });
  } catch (error) {
    console.log("💥 Update Error: ", error);
    res.send({ success: false, message: "failedReq" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await Users.findByIdAndDelete(id);
    console.log(`🚮 USER: ${id} DELETED`);
    res.send({ success: true, message: "successDeleted" });
  } catch (error) {
    console.log("💥 Delete Error: ", error);
    res.send({ success: false, message: "failedReq" });
  }
});

// * Pay Rates Routes
router.post("/payrate/add", async (req, res) => {
  try {
    let user = await Users.findOne({ _id: req.body.userID });

    let newPayrates = new PayRates(req.body);
    await newPayrates.save();

    user.payratesID = newPayrates._id;
    await user.save();
    res.send({ success: true, message: "successAdded" });
  } catch (err) {
    console.log("💥 Pay Rate Error: ", err);
    res.send({ success: false, message: "failedReq" });
  }
});

router.post("/payrates/update", async (req, res) => {
  try {
    let payrate = await PayRates.findByIdAndUpdate(req.body.payrateID, {
      ...req.body.updatedData,
    });
    res.send({ success: true, message: "Succesfully Updated!" });
  } catch (err) {
    console.log("💥 Payrate Update Error: ", err);
    res.send({ success: false, message: "Failed to Updated" });
  }
});

module.exports = router;
