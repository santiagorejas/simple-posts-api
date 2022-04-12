const mongoose = require("mongoose");
const HttpError = require("../models/http-errors");

const Post = require("../models/post");
const User = require("../models/user");

const POSTS_PER_PAGE = 2;

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

const getPosts = async (req, res, next) => {
  const page = req.query.page;

  let totalItems = 0;
  let posts = [];
  try {
    totalItems = await Post.find().count();
    posts = await Post.find()
      .select("title creator image")
      .skip((page - 1) * POSTS_PER_PAGE)
      .limit(POSTS_PER_PAGE);
  } catch (err) {
    return next(new HttpError("Could not fetch posts, please try later.", 500));
  }

  res.json({
    message: `Page number:  ${page}`,
    posts,
    totalPosts: totalItems,
    hasPreviousPage: page > 1,
    hasNextPage: POSTS_PER_PAGE * page < totalItems,
    previousPage: page - 1,
    nextPage: +page + 1,
  });
};

exports.createPost = createPost;
exports.getPosts = getPosts;
