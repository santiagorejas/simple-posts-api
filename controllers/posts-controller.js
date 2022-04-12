const mongoose = require("mongoose");
const HttpError = require("../models/http-errors");

const Post = require("../models/post");
const User = require("../models/user");

const createPost = async (req, res, next) => {
  let user;
  try {
    user = await User.findById(req.userData.id);
  } catch (err) {
    return next(new HttpError("Fetching user failed.", 500));
  }

  if (!user) {
    return next(new HttpError("User not found.", 404));
  }

  const { title, description } = req.body;

  const createdPost = new Post({
    title,
    image: req.file.path,
    description,
    creator: req.userData.id,
    likes: [],
    comments: [],
  });

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await createdPost.save({ session, validateModifiedOnly: true });
    user.posts.push(createdPost);
    await user.save({ session, validateModifiedOnly: true });
    session.commitTransaction();
  } catch (err) {
    return next("Saving post failed.", 500);
  }

  res.json({
    post: createdPost,
  });
};

exports.createPost = createPost;
