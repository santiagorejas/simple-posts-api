const express = require("express");
const router = express.Router();

const checkAuth = require("../middlewares/check-auth");

const commentsController = require("../controllers/comments-controller");

router.post("/", checkAuth, commentsController.createComment);

router.delete("/", commentsController.deleteComment);

module.exports = router;
