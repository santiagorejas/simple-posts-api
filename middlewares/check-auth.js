const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-errors");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const token = req.headers.authorization.split(" ")[1];

    if (!token) {
      return next(new HttpError("Authentication failed!", 401));
    }

    const decodedToken = jwt.verify(token, process.env.JWT_KEY);

    req.userData = {
      nickname: decodedToken.nickname,
    };

    next();
  } catch (err) {
    return next(new HttpError("Authentication failed!", 401));
  }
};
