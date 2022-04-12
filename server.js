const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

const usersRoutes = require("./routes/users-routes");

app.use(bodyParser.json());

app.use(usersRoutes);

app.get("/", (req, res, next) => {
  res.json({
    message: "Hello World!",
  });
});

app.use("/api/user", usersRoutes);

app.use((err, req, res, next) => {
  if (res.headerSent) {
    return next(err);
  }

  res.status(err.code || 500).json({
    message: err.message || "An unknow error ocurred!",
  });
});

mongoose
  .connect(process.env.MONGODB_SRV)
  .then(() => {
    app.listen(5000);
  })
  .catch((err) => {
    console.log(err);
  });
