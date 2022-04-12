const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-errors");
const User = require("../models/user");

const generateToken = (id, nickname, email) => {
  let token;
  try {
    token = jwt.sign(
      {
        id,
        nickname,
        email,
      },
      process.env.JWT_KEY,
      {
        expiresIn: "1h",
      }
    );
  } catch (err) {
    return next(HttpError("JWT sign failed.", 500));
  }
  return token;
};

const signup = async (req, res, next) => {
  const { nickname, email, password } = req.body;

  let existingUser;
  try {
    await User.find({ nickname });
  } catch (err) {
    return next(new HttpError("Signing up failed, please try again.", 500));
  }

  if (existingUser)
    return next(
      new HttpError("Signing up failed, nickname already in use", 422)
    );

  try {
    await User.find({ email });
  } catch (err) {
    return next(new HttpError("Signing up failed, please try again", 500));
  }

  if (existingUser)
    return next(new HttpError("Signing up failed, email already in use.", 422));

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(
      new HttpError("Password hashing failed, please try again.", 500)
    );
  }

  const createdUser = new User({
    nickname,
    email,
    password: hashedPassword,
    posts: [],
    likes: [],
  });

  if (req.file) {
    createdUser.image = req.file.path;
  }

  try {
    await createdUser.save();
  } catch (err) {
    return next(new HttpError("Saving created user failed.", 500));
  }

  const token = generateToken(createdUser.id, nickname, email);

  res.json({
    nickname: createdUser.nickname,
    email: createdUser.email,
    token,
  });
};

const login = async (req, res, next) => {
  const { nickname, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ nickname });
  } catch (err) {
    return next(new HttpError("Finding user by nickname failed.", 500));
  }

  if (!existingUser) {
    return next(new HttpError("User not found.", 404));
  }

  try {
    const match = await bcrypt.compare(password, existingUser.password);
    if (!match) return next(new HttpError("Incorrect password.", 401));
  } catch (err) {
    return next(new HttpError("Password verification failed.", 500));
  }

  const token = generateToken(existingUser.id, nickname, existingUser.email);

  res.json({
    nickname: existingUser.nickname,
    email: existingUser.email,
    token,
  });
};

exports.signup = signup;
exports.login = login;
