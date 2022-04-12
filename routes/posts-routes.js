const express = require("express");
const router = express.Router();

const checkAuth = require("../middlewares/check-auth");
const fileUpload = require("../middlewares/file-upload");

const postsController = require("../controllers/posts-controller");

router.get("/", postsController.getPosts);

router.post(
  "/",
  checkAuth,
  fileUpload.single("image"),
  postsController.createPost
);

// router.delete("/:pid", checkAuth);

// router.patch("/:pid", checkAuth);

// router.get("/user/:uid");

// router.get("/:pid");

module.exports = router;
