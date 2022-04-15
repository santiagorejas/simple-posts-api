const express = require("express");
const router = express.Router();

const checkAuth = require("../middlewares/check-auth");
const fileUpload = require("../middlewares/file-upload");

const usersController = require("../controllers/users-controller");

router.get("/user", (req, res, next) => {
  res.json({ mess: "Hola desde el router" });
});

router.post("/login", usersController.login);

router.post("/signup", fileUpload.single("image"), usersController.signup);

router.get("/profile", checkAuth, usersController.getProfileData);

module.exports = router;
