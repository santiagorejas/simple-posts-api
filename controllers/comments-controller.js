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

const deleteComment = (req, res, next) => {};

exports.createComment = createComment;
exports.deleteComment = deleteComment;
