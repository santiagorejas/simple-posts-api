const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

app.use(bodyParser.json());

app.get("/", (req, res, next) => {
  res.json({
    message: "Hello World!",
  });
});

app.use((err, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }

  res.status(error.code || 500).json({
    message: error.message || "An unknow error ocurred!",
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
