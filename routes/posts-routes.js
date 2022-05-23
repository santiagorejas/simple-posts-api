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

router.delete("/:pid", checkAuth, postsController.deletePost);

router.patch("/:pid", checkAuth, postsController.updatePost);

router.get("/user/:uid", postsController.getPostsByNickname);

router.post("/like/:pid", checkAuth, postsController.likePost);

router.get("/:pid", postsController.getPostDetails);

module.exports = router;
