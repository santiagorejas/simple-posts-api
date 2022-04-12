const Comment = require("../models/comment");
const HttpError = require("../models/http-errors");

const createComment = async (req, res, next) => {
  const { content, post } = req.body;
  const creator = req.userData.id;
  const date = new Date();

  const createdComment = new Comment({
    content,
    author: creator,
    date,
    post,
  });

  try {
    await createdComment.save();
  } catch (err) {
    return next(new HttpError("Saving comment failed.", 500));
  }

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
    await comment.remove();
  } catch (err) {
    return next(new HttpError("Deleting comment failed.", 500));
  }

  res.json({
    message: "Comment deleted successfully!",
  });
};

exports.createComment = createComment;
exports.deleteComment = deleteComment;
