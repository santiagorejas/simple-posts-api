const mongoose = require("mongoose");
const HttpError = require("../models/http-errors");

const Post = require("../models/post");
const User = require("../models/user");

const POSTS_PER_PAGE = 2;

const getPosts = async (req, res, next) => {
  const page = req.query.page;

  let totalItems = 0;
  let posts = [];
  try {
    totalItems = await Post.find().count();
    posts = await Post.find()
      .skip((page - 1) * POSTS_PER_PAGE)
      .limit(POSTS_PER_PAGE)
      .populate("creator", "nickname image")
      .select("title creator image");
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

const deletePost = async (req, res, next) => {
  const postId = req.params.pid;

  let fetchedPost;
  try {
    fetchedPost = await Post.findById(postId).populate("creator");
  } catch (err) {
    return next(new HttpError(err.message));
  }

  if (!fetchedPost) {
    return next(new HttpError("Post doesn't exist.", 404));
  }

  if (req.userData.id !== fetchedPost.creator.id.toString()) {
    console.log(req.userData.id);
    console.log(fetchedPost.creator);
    return next(new HttpError("You can't delete this post.", 401));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    fetchedPost.creator.posts.pull(fetchedPost);
    await fetchedPost.creator.save({ session, validateModifiedOnly: true });
    await fetchedPost.remove({ session, validateModifiedOnly: true });
    session.commitTransaction();
  } catch (err) {
    return next(new HttpError(err.message));
  }

  res.json({
    message: "Post deleted successfully.",
  });
};

const updatePost = async (req, res, next) => {
  const postId = req.params.pid;

  const { title, description } = req.body;

  let fetchedPost;
  try {
    fetchedPost = await Post.findById(postId);
  } catch (err) {
    return next(new HttpError("Failed to fetch post.", 500));
  }

  if (!fetchedPost) return next(new HttpError("Post doesn't exist.", 404));

  if (req.userData.id !== fetchedPost.creator.toString())
    return next(
      new HttpError("You don't have access to update this post.", 401)
    );

  if (title) fetchedPost.title = title;

  if (description) fetchedPost.description = description;

  try {
    fetchedPost.save();
  } catch (err) {
    return next(new HttpError("Failed to update the post.", 500));
  }

  res.json({
    post: fetchedPost,
  });
};

exports.createPost = createPost;
exports.getPosts = getPosts;
exports.deletePost = deletePost;
exports.updatePost = updatePost;
