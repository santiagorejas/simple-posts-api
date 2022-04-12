const express = require("express");
const router = express.Router();

const usersController = require("../controllers/users-controller");

router.get("/user", (req, res, next) => {
  res.json({ mess: "Hola desde el router" });
});

router.post("/login", usersController.login);

router.post("/signup", usersController.signup);

module.exports = router;
