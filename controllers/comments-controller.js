const { default: mongoose } = require("mongoose");

const Comment = require("../models/comment");
const User = require("../models/user");
const Post = require("../models/post");
const HttpError = require("../models/http-errors");

const createComment = async (req, res, next) => {
  const { content, post } = req.body;
  const creator = req.userData.id;
  const date = new Date();

  let fetchedUser;
  try {
    fetchedUser = await User.findById(creator).select("nickname image");
    if (!fetchedUser) return next(new HttpError("User doesn't exist.", 404));
  } catch (err) {
    return next(new HttpError("Fetching user failed.", 500));
  }

  let fetchedPost;
  try {
    fetchedPost = await Post.findById(post);
    if (!fetchedPost) return next(new HttpError("Post doesn't exist.", 404));
  } catch (err) {
    return next(new HttpError("Fetching post failed.", 500));
  }

  const createdComment = new Comment({
    content,
    author: creator,
    date,
    post,
  });

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await createdComment.save({ session, validateModifiedOnly: true });
    fetchedPost.comments.push(createdComment);
    await fetchedPost.save({ session, validateModifiedOnly: true });
    session.commitTransaction();
  } catch (err) {
    console.log(err);
    return next(new HttpError("Saving comment failed.", 500));
  }

  createdComment.author = fetchedUser;

  res.json({
    comment: createdComment,
  });
};

const deleteComment = async (req, res, next) => {
  const commentId = req.params.cid;

  let comment;
  try {
    comment = await Comment.findById(commentId);
  } catch (err) {
    return next(new HttpError("Fetching comment failed.", 500));
  }

  if (!comment) {
    return next(new HttpError("Comment doesn't exist.", 404));
  }

  if (req.userData.id !== comment.author.toString()) {
    return next(new HttpError("You can't delete this comment.", 401));
  }

  try {
    const post = await Post.findById(comment.post);
    const session = await mongoose.startSession();
    session.startTransaction();
    post.comments.pull(comment);
    await post.save({ session, validateModifiedOnly: true });
    await comment.remove({ session, validateModifiedOnly: true });
    session.commitTransaction();
  } catch (err) {
    return next(new HttpError("Deleting comment failed.", 500));
  }

  res.json({
    message: "Comment deleted successfully!",
  });
};

exports.createComment = createComment;
exports.deleteComment = deleteComment;
