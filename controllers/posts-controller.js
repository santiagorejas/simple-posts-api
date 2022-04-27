const mongoose = require("mongoose");
const HttpError = require("../models/http-errors");

const Post = require("../models/post");
const User = require("../models/user");
const Comment = require("../models/comment");
const Categories = require("../constant/categories");

const POSTS_PER_PAGE = 12;

const getPosts = async (req, res, next) => {
  let { page, name, category } = req.query;

  if (!page) {
    page = 1;
  }

  const findOptions = {};

  if (name) {
    findOptions.title = {
      $regex: name,
      $options: "i",
    };
  }

  if (category) {
    findOptions.category = category;
  }

  let totalItems = 0;
  let posts = [];
  try {
    totalItems = await Post.find(findOptions).count();
    posts = await Post.find(findOptions)
      .sort({ date: -1 })
      .skip((page - 1) * POSTS_PER_PAGE)
      .limit(POSTS_PER_PAGE)
      .populate("creator", "nickname image")
      .select("title creator image");
  } catch (err) {
    return next(new HttpError("Could not fetch posts, please try later.", 500));
  }

  res.json({
    message: `Page number:  ${page}`,
    posts: posts.map((post) => post.toObject({ getters: true })),
    totalPosts: totalItems,
    hasPreviousPage: page > 1,
    hasNextPage: POSTS_PER_PAGE * page < totalItems,
    previousPage: page - 1,
    nextPage: +page + 1,
    totalPages: Math.ceil(totalItems / POSTS_PER_PAGE),
    currentPage: +page,
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

  const { title, description, category } = req.body;

  if (!Categories.includes(category)) {
    return next(new HttpError("Category doesn't exist.", 406));
  }

  const date = new Date();

  const createdPost = new Post({
    title,
    image: req.file.path,
    description,
    creator: req.userData.id,
    category,
    date,
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
    return next(new HttpError("You can't delete this post.", 401));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    fetchedPost.creator.posts.pull(fetchedPost);
    await fetchedPost.creator.save({ session, validateModifiedOnly: true });
    await fetchedPost.remove({ session, validateModifiedOnly: true });
    await Comment.deleteMany({ _id: { $in: fetchedPost.comments } });
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

const getPostsByNickname = async (req, res, next) => {
  const nickname = req.params.uid;
  let { page, name, category } = req.query;

  let fetchedUser;
  try {
    fetchedUser = await User.findOne({ nickname });
  } catch (err) {
    return next(new HttpError("Fetching user failed.", 500));
  }

  if (!fetchedUser) {
    return next(new HttpError("User doesn't exist.", 400));
  }

  if (!page) {
    page = 1;
  }

  const findOptions = { creator: fetchedUser._id };

  if (name) {
    findOptions.title = {
      $regex: name,
      $options: "i",
    };
  }

  if (category) {
    findOptions.category = category;
  }

  console.log(findOptions);

  let totalItems = 0;
  let fetchedPosts;
  try {
    totalItems = await Post.find(findOptions).count();
    fetchedPosts = await Post.find(findOptions)
      .sort({ date: -1 })
      .skip((page - 1) * POSTS_PER_PAGE)
      .limit(POSTS_PER_PAGE)
      .populate("creator", "nickname image")
      .select("title creator image");
  } catch (err) {
    return next(new HttpError("Fetching posts failed.", 500));
  }

  res.json({
    posts: fetchedPosts.map((post) => post.toObject({ getters: true })),
    totalPosts: totalItems,
    hasPreviousPage: page > 1,
    hasNextPage: POSTS_PER_PAGE * page < totalItems,
    previousPage: page - 1,
    nextPage: +page + 1,
    totalPages: Math.ceil(totalItems / POSTS_PER_PAGE),
    currentPage: +page,
  });
};

const getPostDetails = async (req, res, next) => {
  const postId = req.params.pid;

  let post;
  try {
    post = await Post.findById(postId)
      .populate("likes")
      .populate("creator", "nickname image");
    // await Promise.all(
    //   post.comments.map((comment) =>
    //     comment.populate("author", "nickname image")
    //   )
    // );
  } catch (err) {
    return next(new HttpError("Fetching post failed.", 500));
  }

  res.json({
    post,
  });
};

const likePost = async (req, res, next) => {
  const { like } = req.body;

  const postId = req.params.pid;

  let fetchedPost;
  try {
    fetchedPost = await Post.findById(postId);
  } catch (err) {
    return next(new HttpError("Fetching post failed.", 500));
  }

  if (!fetchedPost) {
    return next(new HttpError("Post doesn't exist", 404));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    const user = await User.findById(req.userData.id);

    if (like) {
      fetchedPost.likes.push(req.userData.id);
      user.likes.push(fetchedPost);
    } else {
      fetchedPost.likes.pull(req.userData.id);
      user.likes.pull(fetchedPost);
    }

    await user.save({ session, validateModifiedOnly: true });
    await fetchedPost.save({ session, validateModifiedOnly: true });

    session.commitTransaction();
  } catch (err) {
    return next(new HttpError("Saving like failed.", 500));
  }

  res.json({ message: "Like saved successfully!" });
};

exports.createPost = createPost;
exports.getPosts = getPosts;
exports.deletePost = deletePost;
exports.updatePost = updatePost;
exports.getPostsByNickname = getPostsByNickname;
exports.getPostDetails = getPostDetails;
exports.likePost = likePost;
