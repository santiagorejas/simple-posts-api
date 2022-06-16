const fs = require("fs");
const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();
const { getFileStream } = require("./s3");

const app = express();

const cors = require("./middlewares/cors");

const usersRoutes = require("./routes/users-routes");
const postsRoutes = require("./routes/posts-routes");
const commentsRoutes = require("./routes/comments-routes");
const HttpError = require("./models/http-errors");

app.use(cors);
app.use(bodyParser.json());
app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.get("/", (req, res, next) => {
    res.json({
        message: "Hello World!",
    });
});

app.use("/api/user", usersRoutes);
app.use("/api/post", postsRoutes);
app.use("/api/comment", commentsRoutes);

app.get("/api/images/:key", (req, res, next) => {
    const key = req.params.key;
    const readStream = getFileStream(key);

    onError = () => {
        return next(new HttpError("Fetching image failed.", 500));
    };

    readStream.on("error", onError).pipe(res);
});

app.use((err, req, res, next) => {
    if (req.file) {
        fs.unlink(req.file.path, (err) => console.log(err));
    }

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
        app.listen(process.env.PORT || 5000);
    })
    .catch((err) => {
        console.log(err);
    });
