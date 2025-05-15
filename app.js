const express = require("express");
const DbConnect = require("./src/config/db");
const cors = require("cors");
const http = require("http");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3001;

// // Load SSL certificate and key
// const options = {
//   key: fs.readFileSync("server.key"),
//   cert: fs.readFileSync("server.cert"),
// };

const corsOptions = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  optionSuccessStatus: 200,
};

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "50mb",
    parameterLimit: 100000,
  })
);

app.use(
  bodyParser.json({
    limit: "50mb",
    parameterLimit: 100000,
  })
);

app.use(cors(corsOptions));

app.use(express.static(path.join(__dirname, "public")));

const user = require("./src/routes/user");
const location = require("./src/routes/location");
const schedule = require("./src/routes/schedule");
const task = require("./src/routes/task");
const newsfeed = require("./src/routes/newsfeed");
const leave = require("./src/routes/leave");
const unavailable = require("./src/routes/unavailable");
const report = require("./src/routes/report");

// Admin business router
// User task router
app.use("/user", user);
app.use("/location", location);
app.use("/schedule", schedule);
app.use("/task", task);
app.use("/newsfeed", newsfeed);
app.use("/leave", leave);
app.use("/unavailable", unavailable);
app.use("/report", report);

// Deputy Frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Catch-all handler for any other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`💻 Server Running On: ${port}`);
});
DbConnect();
